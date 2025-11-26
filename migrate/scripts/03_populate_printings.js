#!/usr/bin/env node
/**
 * Populate Printings Table
 * 
 * For each unique (name, set) combination in inventory, fetches printing data
 * from Scryfall and creates entries in the printings table.
 * 
 * Usage: node migrate/scripts/03_populate_printings.js [--dry-run]
 */

import pkg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pkg;

const DRY_RUN = process.argv.includes('--dry-run');
const SCRYFALL_DELAY = 200; // ms between API calls (conservative rate limiting)

// Normalize card name for matching
function normalizeCardName(name) {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Sleep utility for rate limiting
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Fetch printing data from Scryfall API
async function fetchPrintingFromScryfall(cardName, setCode) {
  try {
    // Try exact match first
    const url = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cardName)}&set=${setCode.toLowerCase()}`;
    let response;
    
    try {
      response = await fetch(url);
    } catch (networkErr) {
      console.error(`  Network error fetching ${cardName} (${setCode}):`, networkErr.message);
      return null;
    }
    
    // Check for rate limiting
    if (response.status === 429) {
      console.warn(`  Rate limited by Scryfall - waiting 5 seconds...`);
      await sleep(5000);
      response = await fetch(url);
    }
    
    if (response.ok) {
      try {
        return await response.json();
      } catch (parseErr) {
        console.error(`  Failed to parse response for ${cardName} (${setCode}):`, parseErr.message);
        return null;
      }
    }

    // Fallback to fuzzy match
    const fuzzyUrl = `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(cardName)}&set=${setCode.toLowerCase()}`;
    let fuzzyResponse;
    
    try {
      fuzzyResponse = await fetch(fuzzyUrl);
    } catch (networkErr) {
      console.error(`  Network error in fuzzy search for ${cardName} (${setCode}):`, networkErr.message);
      return null;
    }
    
    if (fuzzyResponse.ok) {
      try {
        return await fuzzyResponse.json();
      } catch (parseErr) {
        console.error(`  Failed to parse fuzzy response for ${cardName} (${setCode}):`, parseErr.message);
        return null;
      }
    }
    
    // Handle specific HTTP errors
    if (fuzzyResponse.status === 404) {
      // Card not found - this is expected for some cards
      return null;
    }

    return null;
  } catch (err) {
    console.error(`  Unexpected error fetching ${cardName} (${setCode}):`, err.message);
    return null;
  }
}

async function main() {
  console.log('\n========================================');
  console.log('   Populate Printings Table');
  console.log('========================================\n');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no writes)' : 'LIVE'}\n`);

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable not set');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const client = await pool.connect();
  const mappings = [];
  const unmapped = [];

  try {
    // Get unique (name, set) combinations from inventory
    const { rows: uniquePrintings } = await client.query(`
      SELECT DISTINCT 
        LOWER(name) as name, 
        UPPER(set) as set_code,
        MAX(set_name) as set_name
      FROM inventory 
      WHERE name IS NOT NULL AND name != ''
        AND set IS NOT NULL AND set != ''
      GROUP BY LOWER(name), UPPER(set)
      ORDER BY name, set_code
    `);

    console.log(`Found ${uniquePrintings.length} unique (name, set) combinations\n`);

    let created = 0;
    let skipped = 0;
    let failed = 0;

    for (let i = 0; i < uniquePrintings.length; i++) {
      const { name: cardName, set_code: setCode } = uniquePrintings[i];
      
      process.stdout.write(`\r[${i + 1}/${uniquePrintings.length}] Processing: ${cardName.substring(0, 30).padEnd(30)} (${setCode})`);

      // Check if printing already exists (by set_code and card name match)
      const { rows: existing } = await client.query(`
        SELECT p.id, p.scryfall_id 
        FROM printings p
        JOIN cards c ON p.card_id = c.id
        WHERE p.set_code = $1 AND c.normalized_name = $2
      `, [setCode, normalizeCardName(cardName)]);

      if (existing.length > 0) {
        skipped++;
        mappings.push({
          original_name: cardName,
          set_code: setCode,
          printing_id: existing[0].id,
          status: 'existing'
        });
        continue;
      }

      // Find the card in our cards table
      const { rows: cardRows } = await client.query(`
        SELECT id, oracle_id FROM cards WHERE normalized_name = $1
      `, [normalizeCardName(cardName)]);

      if (cardRows.length === 0) {
        failed++;
        unmapped.push({
          original_name: cardName,
          set_code: setCode,
          reason: 'Card not found in cards table'
        });
        continue;
      }

      const card = cardRows[0];

      // Fetch from Scryfall
      await sleep(SCRYFALL_DELAY);
      const scryfallCard = await fetchPrintingFromScryfall(cardName, setCode);

      if (!scryfallCard || !scryfallCard.id) {
        failed++;
        unmapped.push({
          original_name: cardName,
          set_code: setCode,
          reason: 'Not found in Scryfall for this set'
        });
        continue;
      }

      // Check if printing exists by scryfall_id
      const { rows: existingByScryfall } = await client.query(
        `SELECT id FROM printings WHERE scryfall_id = $1`,
        [scryfallCard.id]
      );

      if (existingByScryfall.length > 0) {
        skipped++;
        mappings.push({
          original_name: cardName,
          set_code: setCode,
          printing_id: existingByScryfall[0].id,
          scryfall_id: scryfallCard.id,
          status: 'existing_scryfall'
        });
        continue;
      }

      // Insert new printing
      if (!DRY_RUN) {
        const imageUris = scryfallCard.image_uris || {};
        
        const { rows: inserted } = await client.query(`
          INSERT INTO printings (
            card_id, scryfall_id, set_code, set_name, collector_number,
            rarity, finish, image_uri_small, image_uri_normal, image_uri_large
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING id
        `, [
          card.id,
          scryfallCard.id,
          scryfallCard.set.toUpperCase(),
          scryfallCard.set_name,
          scryfallCard.collector_number || null,
          scryfallCard.rarity || null,
          scryfallCard.finishes?.[0] || 'normal',
          imageUris.small || null,
          imageUris.normal || null,
          imageUris.large || null
        ]);

        mappings.push({
          original_name: cardName,
          set_code: setCode,
          printing_id: inserted[0].id,
          scryfall_id: scryfallCard.id,
          status: 'created'
        });

        created++;
      } else {
        mappings.push({
          original_name: cardName,
          set_code: setCode,
          scryfall_id: scryfallCard.id,
          status: 'would_create'
        });
        created++;
      }
    }

    console.log('\n\n--- Results ---\n');
    console.log(`  Created:  ${created}`);
    console.log(`  Skipped:  ${skipped}`);
    console.log(`  Failed:   ${failed}`);
    console.log(`  Total:    ${uniquePrintings.length}`);

    // Write mappings to CSV
    const mappingsPath = path.join(__dirname, '../mappings/printings_created.csv');
    const mappingsContent = [
      'original_name,set_code,printing_id,scryfall_id,status',
      ...mappings.map(m => 
        `"${m.original_name}","${m.set_code}","${m.printing_id || ''}","${m.scryfall_id || ''}","${m.status}"`
      )
    ].join('\n');

    if (!DRY_RUN) {
      fs.writeFileSync(mappingsPath, mappingsContent);
      console.log(`\n  Mappings written to: ${mappingsPath}`);
    } else {
      console.log(`\n  [DRY RUN] Would write ${mappings.length} mappings to: ${mappingsPath}`);
    }

    // Write unmapped to CSV (append to existing)
    if (unmapped.length > 0) {
      const unmappedPath = path.join(__dirname, '../unmapped.csv');
      let existingUnmapped = '';
      try {
        existingUnmapped = fs.readFileSync(unmappedPath, 'utf-8');
      } catch (err) {
        existingUnmapped = 'original_name,set_code,reason\n';
      }
      
      const newUnmapped = unmapped.map(u => 
        `"${u.original_name}","${u.set_code || ''}","${u.reason}"`
      ).join('\n');

      const unmappedContent = existingUnmapped.trim() + '\n' + newUnmapped;

      if (!DRY_RUN) {
        fs.writeFileSync(unmappedPath, unmappedContent);
        console.log(`  Unmapped written to: ${unmappedPath}`);
      } else {
        console.log(`  [DRY RUN] Would write ${unmapped.length} unmapped to: ${unmappedPath}`);
      }
    }

    console.log('\n========================================');
    console.log('   Printings Population Complete');
    console.log('========================================\n');

  } catch (err) {
    console.error('\n❌ Error:', err.message);
    console.error(err.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
