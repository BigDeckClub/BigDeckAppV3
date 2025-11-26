#!/usr/bin/env node
/**
 * Populate Cards Table
 * 
 * Extracts unique card names from inventory and fetches card data from Scryfall.
 * Creates entries in the cards table with oracle_id as the unique identifier.
 * 
 * Usage: node migrate/scripts/02_populate_cards.js [--dry-run]
 */

import pkg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pkg;

const DRY_RUN = process.argv.includes('--dry-run');
const SCRYFALL_DELAY = 200; // ms between API calls (Scryfall rate limit is 50-100 req/s, being conservative)

// Normalize card name for matching
function normalizeCardName(name) {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special chars
    .replace(/\s+/g, ' ')
    .trim();
}

// Sleep utility for rate limiting
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Fetch card data from Scryfall API
async function fetchCardFromScryfall(cardName) {
  try {
    const url = `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(cardName)}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      return null;
    }
    
    return await response.json();
  } catch (err) {
    console.error(`  Error fetching ${cardName}:`, err.message);
    return null;
  }
}

async function main() {
  console.log('\n========================================');
  console.log('   Populate Cards Table');
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
    // Get unique card names from inventory
    const { rows: uniqueCards } = await client.query(`
      SELECT DISTINCT LOWER(name) as name 
      FROM inventory 
      WHERE name IS NOT NULL AND name != ''
      ORDER BY name
    `);

    console.log(`Found ${uniqueCards.length} unique card names in inventory\n`);

    let created = 0;
    let skipped = 0;
    let failed = 0;

    for (let i = 0; i < uniqueCards.length; i++) {
      const cardName = uniqueCards[i].name;
      const normalizedName = normalizeCardName(cardName);
      
      process.stdout.write(`\r[${i + 1}/${uniqueCards.length}] Processing: ${cardName.substring(0, 40).padEnd(40)}`);

      // Check if card already exists (by normalized name)
      const { rows: existing } = await client.query(
        `SELECT id FROM cards WHERE normalized_name = $1`,
        [normalizedName]
      );

      if (existing.length > 0) {
        skipped++;
        mappings.push({
          original_name: cardName,
          card_id: existing[0].id,
          status: 'existing'
        });
        continue;
      }

      // Fetch from Scryfall
      await sleep(SCRYFALL_DELAY);
      const scryfallCard = await fetchCardFromScryfall(cardName);

      if (!scryfallCard || !scryfallCard.oracle_id) {
        failed++;
        unmapped.push({
          original_name: cardName,
          reason: 'Not found in Scryfall'
        });
        continue;
      }

      // Check if card exists by oracle_id
      const { rows: existingByOracle } = await client.query(
        `SELECT id FROM cards WHERE oracle_id = $1`,
        [scryfallCard.oracle_id]
      );

      if (existingByOracle.length > 0) {
        skipped++;
        mappings.push({
          original_name: cardName,
          card_id: existingByOracle[0].id,
          oracle_id: scryfallCard.oracle_id,
          status: 'existing_oracle'
        });
        continue;
      }

      // Insert new card
      if (!DRY_RUN) {
        const { rows: inserted } = await client.query(`
          INSERT INTO cards (
            oracle_id, name, normalized_name, type_line, mana_cost, cmc,
            colors, color_identity, keywords, oracle_text
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING id
        `, [
          scryfallCard.oracle_id,
          scryfallCard.name,
          normalizeCardName(scryfallCard.name),
          scryfallCard.type_line || null,
          scryfallCard.mana_cost || null,
          scryfallCard.cmc || null,
          scryfallCard.colors || [],
          scryfallCard.color_identity || [],
          scryfallCard.keywords || [],
          scryfallCard.oracle_text || null
        ]);

        mappings.push({
          original_name: cardName,
          card_id: inserted[0].id,
          oracle_id: scryfallCard.oracle_id,
          scryfall_name: scryfallCard.name,
          status: 'created'
        });

        created++;
      } else {
        mappings.push({
          original_name: cardName,
          oracle_id: scryfallCard.oracle_id,
          scryfall_name: scryfallCard.name,
          status: 'would_create'
        });
        created++;
      }
    }

    console.log('\n\n--- Results ---\n');
    console.log(`  Created:  ${created}`);
    console.log(`  Skipped:  ${skipped}`);
    console.log(`  Failed:   ${failed}`);
    console.log(`  Total:    ${uniqueCards.length}`);

    // Write mappings to CSV
    const mappingsPath = path.join(__dirname, '../mappings/cards_created.csv');
    const mappingsContent = [
      'original_name,card_id,oracle_id,scryfall_name,status',
      ...mappings.map(m => 
        `"${m.original_name}","${m.card_id || ''}","${m.oracle_id || ''}","${m.scryfall_name || ''}","${m.status}"`
      )
    ].join('\n');

    if (!DRY_RUN) {
      fs.writeFileSync(mappingsPath, mappingsContent);
      console.log(`\n  Mappings written to: ${mappingsPath}`);
    } else {
      console.log(`\n  [DRY RUN] Would write ${mappings.length} mappings to: ${mappingsPath}`);
    }

    // Write unmapped to CSV
    if (unmapped.length > 0) {
      const unmappedPath = path.join(__dirname, '../unmapped.csv');
      const unmappedContent = [
        'original_name,reason',
        ...unmapped.map(u => `"${u.original_name}","${u.reason}"`)
      ].join('\n');

      if (!DRY_RUN) {
        fs.writeFileSync(unmappedPath, unmappedContent);
        console.log(`  Unmapped written to: ${unmappedPath}`);
      } else {
        console.log(`  [DRY RUN] Would write ${unmapped.length} unmapped to: ${unmappedPath}`);
      }
    }

    console.log('\n========================================');
    console.log('   Cards Population Complete');
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
