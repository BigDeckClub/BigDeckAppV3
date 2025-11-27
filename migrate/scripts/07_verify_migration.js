#!/usr/bin/env node
/**
 * Migration Verification Script
 * 
 * Runs comprehensive checks to verify the migration was successful.
 * Should be run after all migration scripts complete.
 * 
 * Usage: node migrate/scripts/07_verify_migration.js
 */

import pkg from 'pg';

const { Pool } = pkg;

async function main() {
  console.log('\n========================================');
  console.log('   Migration Verification');
  console.log('========================================\n');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable not set');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const client = await pool.connect();
  let passed = 0;
  let failed = 0;
  let warnings = 0;

  function check(name, condition, details = '') {
    if (condition) {
      console.log(`  ✓ ${name}`);
      passed++;
    } else {
      console.log(`  ✗ ${name}`);
      if (details) console.log(`    ${details}`);
      failed++;
    }
  }

  function warn(name, details = '') {
    console.log(`  ⚠️ ${name}`);
    if (details) console.log(`    ${details}`);
    warnings++;
  }

  try {
    // ============================================
    // 1. New Tables Existence
    // ============================================
    console.log('--- New Tables ---\n');

    const tables = ['cards', 'printings', 'price_snapshots', 'deck_items'];
    for (const table of tables) {
      const { rows } = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = $1
        )
      `, [table]);
      check(`Table '${table}' exists`, rows[0].exists);
    }

    // ============================================
    // 2. Reference Table Data
    // ============================================
    console.log('\n--- Reference Table Data ---\n');

    const { rows: cardsCount } = await client.query('SELECT COUNT(*) FROM cards');
    const { rows: printingsCount } = await client.query('SELECT COUNT(*) FROM printings');
    
    check(`Cards table has data`, parseInt(cardsCount[0].count) > 0, 
          `Count: ${cardsCount[0].count}`);
    check(`Printings table has data`, parseInt(printingsCount[0].count) > 0,
          `Count: ${printingsCount[0].count}`);

    // ============================================
    // 3. Inventory Migration
    // ============================================
    console.log('\n--- Inventory Migration ---\n');

    const { rows: invStats } = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(printing_id) as with_printing,
        COUNT(*) - COUNT(printing_id) as without_printing
      FROM inventory
    `);
    
    const invTotal = parseInt(invStats[0].total);
    const invWithPrinting = parseInt(invStats[0].with_printing);
    const invWithoutPrinting = parseInt(invStats[0].without_printing);
    
    console.log(`  Total inventory:      ${invTotal}`);
    console.log(`  With printing_id:     ${invWithPrinting}`);
    console.log(`  Without printing_id:  ${invWithoutPrinting}`);
    
    const invMigrationRate = invTotal > 0 ? (invWithPrinting / invTotal * 100).toFixed(1) : 100;
    check(`Inventory migration > 95%`, parseFloat(invMigrationRate) >= 95,
          `Rate: ${invMigrationRate}%`);
    
    if (invWithoutPrinting > 0 && parseFloat(invMigrationRate) >= 95) {
      warn(`${invWithoutPrinting} inventory items without printing_id`,
           'Review migrate/mappings/inventory_unmapped.csv');
    }

    // ============================================
    // 4. Container Migration
    // ============================================
    console.log('\n--- Container Migration ---\n');

    const { rows: containerStats } = await client.query(`
      SELECT 
        c.id,
        COALESCE(jsonb_array_length(c.cards), 0) as json_count,
        COALESCE((SELECT SUM(quantity) FROM container_items WHERE container_id = c.id), 0) as items_count
      FROM containers c
      WHERE COALESCE(jsonb_array_length(c.cards), 0) > 0
    `);

    let containerMatches = 0;
    let containerMismatches = 0;
    for (const row of containerStats) {
      if (row.json_count == row.items_count) {
        containerMatches++;
      } else {
        containerMismatches++;
      }
    }

    console.log(`  Containers with JSON:     ${containerStats.length}`);
    console.log(`  Matching counts:          ${containerMatches}`);
    console.log(`  Mismatched counts:        ${containerMismatches}`);
    
    check(`All container counts match`, containerMismatches === 0,
          `${containerMismatches} containers have mismatched counts`);

    // ============================================
    // 5. Foreign Key Integrity
    // ============================================
    console.log('\n--- Foreign Key Integrity ---\n');

    // Check inventory -> printings FK
    const { rows: orphanedInv } = await client.query(`
      SELECT COUNT(*) as count FROM inventory 
      WHERE printing_id IS NOT NULL 
        AND printing_id NOT IN (SELECT id FROM printings)
    `);
    check(`No orphaned inventory.printing_id`, parseInt(orphanedInv[0].count) === 0,
          `Orphaned: ${orphanedInv[0].count}`);

    // Check printings -> cards FK
    const { rows: orphanedPrint } = await client.query(`
      SELECT COUNT(*) as count FROM printings 
      WHERE card_id NOT IN (SELECT id FROM cards)
    `);
    check(`No orphaned printings.card_id`, parseInt(orphanedPrint[0].count) === 0,
          `Orphaned: ${orphanedPrint[0].count}`);

    // Check container_items -> inventory FK
    const { rows: orphanedCI } = await client.query(`
      SELECT COUNT(*) as count FROM container_items 
      WHERE inventory_id IS NOT NULL 
        AND inventory_id NOT IN (SELECT id FROM inventory)
    `);
    check(`No orphaned container_items.inventory_id`, parseInt(orphanedCI[0].count) === 0,
          `Orphaned: ${orphanedCI[0].count}`);

    // ============================================
    // 6. Index Existence
    // ============================================
    console.log('\n--- Indexes ---\n');

    const expectedIndexes = [
      'idx_cards_name',
      'idx_cards_normalized_name',
      'idx_printings_card_id',
      'idx_printings_set_code',
      'idx_inventory_printing_id',
      'idx_inventory_name'
    ];

    for (const indexName of expectedIndexes) {
      const { rows } = await client.query(`
        SELECT EXISTS (
          SELECT FROM pg_indexes 
          WHERE indexname = $1
        )
      `, [indexName]);
      check(`Index '${indexName}' exists`, rows[0].exists);
    }

    // ============================================
    // 7. Data Consistency
    // ============================================
    console.log('\n--- Data Consistency ---\n');

    // Check cards have unique oracle_ids
    const { rows: duplicateOracle } = await client.query(`
      SELECT oracle_id, COUNT(*) as count 
      FROM cards 
      GROUP BY oracle_id 
      HAVING COUNT(*) > 1
    `);
    check(`No duplicate oracle_ids in cards`, duplicateOracle.length === 0,
          `Duplicates: ${duplicateOracle.length}`);

    // Check printings have unique scryfall_ids
    const { rows: duplicateScryfall } = await client.query(`
      SELECT scryfall_id, COUNT(*) as count 
      FROM printings 
      GROUP BY scryfall_id 
      HAVING COUNT(*) > 1
    `);
    check(`No duplicate scryfall_ids in printings`, duplicateScryfall.length === 0,
          `Duplicates: ${duplicateScryfall.length}`);

    // ============================================
    // Summary
    // ============================================
    console.log('\n========================================');
    console.log('   Verification Summary');
    console.log('========================================\n');
    console.log(`  Passed:   ${passed}`);
    console.log(`  Failed:   ${failed}`);
    console.log(`  Warnings: ${warnings}`);
    console.log(`  Total:    ${passed + failed}`);
    
    if (failed === 0) {
      console.log('\n  ✓ All verification checks passed!\n');
    } else {
      console.log('\n  ✗ Some verification checks failed. Review the output above.\n');
    }

  } catch (err) {
    console.error('\n❌ Verification error:', err.message);
    console.error(err.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
