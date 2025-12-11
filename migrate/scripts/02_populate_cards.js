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
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { scryfallServerClient } from '../../server/utils/scryfallClient.server.js';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pkg;

const DRY_RUN = process.argv.includes('--dry-run');
const SCRYFALL_DELAY = 100; // ms between API calls (Scryfall limit: ~10 req/sec)
const MAX_RETRIES = 3;

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

// Fetch card data from Scryfall API with retry logic
async function fetchCardFromScryfall(cardName, retryCount = 0) {
  try {
    const url = `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(cardName)}`;
    let response;
    
    try {
      response = await fetch(url);
    } catch (networkErr) {
      if (retryCount < MAX_RETRIES) {
        const backoffMs = Math.pow(2, retryCount) * 1000; // Exponential backoff
        console.warn(`  Network error, retrying in ${backoffMs}ms...`);
        await sleep(backoffMs);
        return fetchCardFromScryfall(cardName, retryCount + 1);
      }
      console.error(`  Network error fetching ${cardName}:`, networkErr.message);
      return null;
    }
    
    // Handle rate limiting with exponential backoff
    if (response.status === 429) {
      if (retryCount < MAX_RETRIES) {
        const backoffMs = Math.pow(2, retryCount) * 2000; // Longer backoff for rate limits
        console.warn(`  Rate limited by Scryfall, retrying in ${backoffMs}ms...`);
        await sleep(backoffMs);
        return fetchCardFromScryfall(cardName, retryCount + 1);
      }
      console.error(`  Rate limit exceeded for ${cardName} after ${MAX_RETRIES} retries`);
      return null;
    }
    
    if (!response.ok) {
      return null;
    }
    
    try {
      return await response.json();
    } catch (parseErr) {
      console.error(`  Failed to parse response for ${cardName}:`, parseErr.message);
      return null;
    }
  } catch (err) {
    console.error(`  Unexpected error fetching ${cardName}:`, err.message);
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

  let pool = null;
  let client = null;
  const mappings = [];
  const unmapped = [];

  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    client = await pool.connect();
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

    // Process unique cards in batches using Scryfall /cards/collection
    const CHUNK = 75;
    const names = uniqueCards.map(r => r.name);

    for (let i = 0; i < names.length; i += CHUNK) {
      const chunk = names.slice(i, i + CHUNK);
      process.stdout.write(`\r[${i + 1}/${names.length}] Resolving batch ${i + 1}..${Math.min(i + CHUNK, names.length)}`);

      // Build identifiers for batchResolve (name only)
      const identifiers = chunk.map(n => ({ name: n }));
      let resolved = {};
      try {
        resolved = await scryfallServerClient.batchResolve(identifiers);
      } catch (err) {
        console.error('\n[POPULATE_CARDS] batchResolve failed:', err.message);
        resolved = {};
      }

      // Iterate through chunk and insert/skip as before
      for (let j = 0; j < chunk.length; j++) {
        const idx = i + j;
        const cardName = chunk[j];
        const normalizedName = normalizeCardName(cardName);
        process.stdout.write(`\r[${idx + 1}/${names.length}] Processing: ${cardName.substring(0, 40).padEnd(40)}`);

        // Check if card already exists (by normalized name)
        const { rows: existing } = await client.query(
          `SELECT id FROM cards WHERE normalized_name = $1`,
          [normalizedName]
        );

        if (existing.length > 0) {
          skipped++;
          mappings.push({ original_name: cardName, card_id: existing[0].id, status: 'existing' });
          continue;
        }

        const key = `${(cardName||'').toLowerCase().trim()}|`.toLowerCase();
        // batchResolve returned map keyed by name|set (set empty here)
        const cardResolved = resolved[`${(cardName||'').toLowerCase().trim()}|`];

        if (!cardResolved || !cardResolved.oracle_id) {
          failed++;
          unmapped.push({ original_name: cardName, reason: 'Not found in Scryfall' });
          continue;
        }

        const scryfallCard = cardResolved;

        // Check if card exists by oracle_id
        const { rows: existingByOracle } = await client.query(
          `SELECT id FROM cards WHERE oracle_id = $1`,
          [scryfallCard.oracle_id]
        );

        if (existingByOracle.length > 0) {
          skipped++;
          mappings.push({ original_name: cardName, card_id: existingByOracle[0].id, oracle_id: scryfallCard.oracle_id, status: 'existing_oracle' });
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

          mappings.push({ original_name: cardName, card_id: inserted[0].id, oracle_id: scryfallCard.oracle_id, scryfall_name: scryfallCard.name, status: 'created' });
          created++;
        } else {
          mappings.push({ original_name: cardName, oracle_id: scryfallCard.oracle_id, scryfall_name: scryfallCard.name, status: 'would_create' });
          created++;
        }
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
    process.exit(1);
  } finally {
    if (client) client.release();
    if (pool) await pool.end();
  }
}

main().catch(console.error);
