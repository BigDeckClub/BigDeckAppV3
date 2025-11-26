#!/usr/bin/env node
/**
 * Migration Preview Script
 * 
 * Simulates the migration process and prints counts without writing to the database.
 * Use this to estimate migration scope and identify potential issues.
 * 
 * Usage: node migrate/scripts/migrate_preview.js
 */

import pkg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env file if it exists
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, '../../.env');

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  // Try loading from project root
  dotenv.config();
}

const { Pool } = pkg;

// Dry run mode - no writes
const DRY_RUN = true;

async function main() {
  console.log('\n========================================');
  console.log('   BigDeck.app Migration Preview');
  console.log('========================================\n');
  
  // Validate environment
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable not set');
    console.error('');
    console.error('Please set DATABASE_URL in your environment or create a .env file.');
    console.error('Example: DATABASE_URL=postgresql://user:password@host:5432/database');
    process.exit(1);
  }

  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no writes)' : 'LIVE'}`);
  console.log(`Database: Configured\n`);

  let pool;
  let client;
  
  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 10000,
    });
    
    client = await pool.connect();
  } catch (err) {
    console.error('❌ Failed to connect to database:', err.message);
    console.error('');
    console.error('Please verify your DATABASE_URL is correct and the database is accessible.');
    process.exit(1);
  }

  try {
    console.log('--- Current Table Statistics ---\n');

    // Table row counts
    const tables = ['inventory', 'decklists', 'containers', 'container_items', 'sales', 'purchase_history'];
    for (const table of tables) {
      try {
        const result = await client.query(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`  ${table.padEnd(20)} ${result.rows[0].count} rows`);
      } catch (err) {
        console.log(`  ${table.padEnd(20)} ⚠️ Table does not exist - ${err.message}`);
      }
    }

    console.log('\n--- Inventory Analysis ---\n');

    // Unique card names in inventory
    const uniqueNames = await client.query(`
      SELECT COUNT(DISTINCT LOWER(name)) as count FROM inventory
    `);
    console.log(`  Unique card names:      ${uniqueNames.rows[0].count}`);

    // Unique (name, set) combinations
    const uniqueNameSet = await client.query(`
      SELECT COUNT(DISTINCT (LOWER(name), UPPER(set))) as count FROM inventory
    `);
    console.log(`  Unique (name, set):     ${uniqueNameSet.rows[0].count}`);

    // Cards with scryfall_id
    const withScryfall = await client.query(`
      SELECT COUNT(*) as count FROM inventory WHERE scryfall_id IS NOT NULL AND scryfall_id != ''
    `);
    console.log(`  Has scryfall_id:        ${withScryfall.rows[0].count}`);

    // Cards without scryfall_id
    const withoutScryfall = await client.query(`
      SELECT COUNT(*) as count FROM inventory WHERE scryfall_id IS NULL OR scryfall_id = ''
    `);
    console.log(`  Missing scryfall_id:    ${withoutScryfall.rows[0].count}`);

    console.log('\n--- Container Analysis ---\n');

    // Containers with JSON cards
    const containersWithJson = await client.query(`
      SELECT COUNT(*) as count FROM containers 
      WHERE cards IS NOT NULL AND jsonb_array_length(cards) > 0
    `);
    console.log(`  Containers with JSON:   ${containersWithJson.rows[0].count}`);

    // Total cards in JSON blobs
    const totalJsonCards = await client.query(`
      SELECT COALESCE(SUM(jsonb_array_length(cards)), 0) as count FROM containers
    `);
    console.log(`  Total JSON card entries: ${totalJsonCards.rows[0].count}`);

    // Container items (relational)
    const containerItemsCount = await client.query(`
      SELECT COUNT(*) as count FROM container_items
    `);
    console.log(`  Container items (rel):  ${containerItemsCount.rows[0].count}`);

    // Check for JSON/relational mismatch
    const mismatchCheck = await client.query(`
      SELECT 
        c.id,
        c.name,
        COALESCE(jsonb_array_length(c.cards), 0) as json_count,
        COALESCE(COUNT(ci.id), 0) as items_count
      FROM containers c
      LEFT JOIN container_items ci ON ci.container_id = c.id
      WHERE COALESCE(jsonb_array_length(c.cards), 0) > 0 
         OR ci.id IS NOT NULL
      GROUP BY c.id, c.name, c.cards
      LIMIT 10
    `);

    if (mismatchCheck.rows.length > 0) {
      console.log('\n  Sample containers (JSON vs Relational):');
      for (const row of mismatchCheck.rows) {
        const match = row.json_count === row.items_count ? '✓' : '⚠️';
        console.log(`    ${match} Container "${row.name}" (ID: ${row.id}): JSON=${row.json_count}, Relational=${row.items_count}`);
      }
    }

    console.log('\n--- Decklist Analysis ---\n');

    // Total decklists
    const decklistCount = await client.query(`
      SELECT COUNT(*) as count FROM decklists
    `);
    console.log(`  Total decklists:        ${decklistCount.rows[0].count}`);

    // Sample decklist parsing
    const sampleDecklist = await client.query(`
      SELECT id, name, decklist FROM decklists LIMIT 1
    `);

    if (sampleDecklist.rows.length > 0) {
      const deck = sampleDecklist.rows[0];
      const lines = (deck.decklist || '').split('\n').filter(l => l.trim());
      const parsedCards = [];
      
      for (const line of lines) {
        const match = line.match(/^(\d+)\s+(.+?)(?:\s+\(([A-Z0-9]+)\))?$/);
        if (match) {
          parsedCards.push({
            quantity: parseInt(match[1]),
            name: match[2].trim(),
            set: match[3] || null
          });
        }
      }

      console.log(`  Sample decklist: "${deck.name}"`);
      console.log(`    Raw lines:     ${lines.length}`);
      console.log(`    Parsed cards:  ${parsedCards.length}`);
      
      // Count cards with/without set codes
      const withSet = parsedCards.filter(c => c.set).length;
      const withoutSet = parsedCards.filter(c => !c.set).length;
      console.log(`    With set code: ${withSet}`);
      console.log(`    Without set:   ${withoutSet}`);
    }

    console.log('\n--- Potential Migration Issues ---\n');

    // Find potentially problematic card names (special characters)
    const specialChars = await client.query(`
      SELECT DISTINCT name 
      FROM inventory 
      WHERE name ~ '[^a-zA-Z0-9 ,'\\-.]'
      LIMIT 10
    `);

    if (specialChars.rows.length > 0) {
      console.log('  Cards with special characters:');
      for (const row of specialChars.rows) {
        console.log(`    - ${row.name}`);
      }
    } else {
      console.log('  ✓ No cards with special characters');
    }

    // Find duplicate card name/set combinations with different data
    const duplicates = await client.query(`
      SELECT 
        LOWER(name) as name, 
        UPPER(set) as set,
        COUNT(*) as count,
        COUNT(DISTINCT purchase_price) as unique_prices,
        COUNT(DISTINCT reorder_type) as unique_types
      FROM inventory
      GROUP BY LOWER(name), UPPER(set)
      HAVING COUNT(*) > 1
      ORDER BY COUNT(*) DESC
      LIMIT 10
    `);

    if (duplicates.rows.length > 0) {
      console.log('\n  Duplicate (name, set) combinations:');
      for (const row of duplicates.rows) {
        console.log(`    - ${row.name} (${row.set}): ${row.count} rows, ${row.unique_prices} prices, ${row.unique_types} types`);
      }
    } else {
      console.log('  ✓ No duplicate (name, set) combinations');
    }

    console.log('\n--- Migration Estimates ---\n');

    const estimates = {
      cardsToCreate: uniqueNames.rows[0].count,
      printingsToCreate: uniqueNameSet.rows[0].count,
      inventoryToUpdate: (await client.query('SELECT COUNT(*) FROM inventory')).rows[0].count,
      containerItemsToCreate: totalJsonCards.rows[0].count,
      deckItemsToCreate: 'TBD (requires parsing all decklists)',
    };

    console.log(`  New 'cards' rows:           ~${estimates.cardsToCreate}`);
    console.log(`  New 'printings' rows:       ~${estimates.printingsToCreate}`);
    console.log(`  Inventory rows to update:   ${estimates.inventoryToUpdate}`);
    console.log(`  Container items to create:  ${estimates.containerItemsToCreate}`);
    console.log(`  Deck items to create:       ${estimates.deckItemsToCreate}`);

    console.log('\n========================================');
    console.log('   Preview Complete');
    console.log('========================================\n');

    if (DRY_RUN) {
      console.log('This was a DRY RUN. No changes were made to the database.\n');
      console.log('To proceed with migration, use the actual migration scripts.\n');
    }

  } catch (err) {
    console.error('❌ Error during preview:', err.message);
    console.error(err.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
