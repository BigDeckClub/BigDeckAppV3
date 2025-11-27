#!/usr/bin/env node
/**
 * Migrate Inventory to Use printing_id
 * 
 * Updates inventory rows to reference the printings table via printing_id.
 * Preserves legacy columns during migration for backward compatibility.
 * 
 * Usage: node migrate/scripts/04_migrate_inventory.js [--dry-run]
 */

import pkg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pkg;

const DRY_RUN = process.argv.includes('--dry-run');

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

async function main() {
  console.log('\n========================================');
  console.log('   Migrate Inventory to printing_id');
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
    // Get all inventory items without printing_id
    const { rows: inventoryItems } = await client.query(`
      SELECT id, name, set, set_name, scryfall_id
      FROM inventory 
      WHERE printing_id IS NULL
      ORDER BY id
    `);

    console.log(`Found ${inventoryItems.length} inventory items to migrate\n`);

    let updated = 0;
    let skipped = 0;
    let failed = 0;

    for (let i = 0; i < inventoryItems.length; i++) {
      const item = inventoryItems[i];
      
      process.stdout.write(`\r[${i + 1}/${inventoryItems.length}] Processing inventory #${item.id}: ${(item.name || '').substring(0, 30).padEnd(30)}`);

      if (!item.name || !item.set) {
        failed++;
        unmapped.push({
          inventory_id: item.id,
          name: item.name,
          set: item.set,
          reason: 'Missing name or set'
        });
        continue;
      }

      // Try to find matching printing
      // Method 1: Match by scryfall_id if available
      if (item.scryfall_id) {
        const { rows: byScryfall } = await client.query(
          `SELECT id FROM printings WHERE scryfall_id = $1`,
          [item.scryfall_id]
        );

        if (byScryfall.length > 0) {
          if (!DRY_RUN) {
            await client.query(
              `UPDATE inventory SET printing_id = $1 WHERE id = $2`,
              [byScryfall[0].id, item.id]
            );
          }
          
          mappings.push({
            inventory_id: item.id,
            name: item.name,
            set: item.set,
            printing_id: byScryfall[0].id,
            match_method: 'scryfall_id'
          });
          updated++;
          continue;
        }
      }

      // Method 2: Match by normalized name + set code
      const { rows: byNameSet } = await client.query(`
        SELECT p.id, p.set_code
        FROM printings p
        JOIN cards c ON p.card_id = c.id
        WHERE c.normalized_name = $1 AND p.set_code = $2
      `, [normalizeCardName(item.name), item.set.toUpperCase()]);

      if (byNameSet.length > 0) {
        if (!DRY_RUN) {
          await client.query(
            `UPDATE inventory SET printing_id = $1 WHERE id = $2`,
            [byNameSet[0].id, item.id]
          );
        }
        
        mappings.push({
          inventory_id: item.id,
          name: item.name,
          set: item.set,
          printing_id: byNameSet[0].id,
          match_method: 'name_set'
        });
        updated++;
        continue;
      }

      // Method 3: Match by normalized name only (any set)
      const { rows: byNameOnly } = await client.query(`
        SELECT p.id, p.set_code
        FROM printings p
        JOIN cards c ON p.card_id = c.id
        WHERE c.normalized_name = $1
        ORDER BY p.id
        LIMIT 1
      `, [normalizeCardName(item.name)]);

      if (byNameOnly.length > 0) {
        // This is ambiguous - flag for review but still link
        unmapped.push({
          inventory_id: item.id,
          name: item.name,
          set: item.set,
          matched_printing_id: byNameOnly[0].id,
          matched_set: byNameOnly[0].set_code,
          reason: 'Matched by name only - set mismatch, requires review'
        });
        
        if (!DRY_RUN) {
          await client.query(
            `UPDATE inventory SET printing_id = $1 WHERE id = $2`,
            [byNameOnly[0].id, item.id]
          );
        }
        
        mappings.push({
          inventory_id: item.id,
          name: item.name,
          set: item.set,
          printing_id: byNameOnly[0].id,
          match_method: 'name_only_ambiguous'
        });
        updated++;
        continue;
      }

      // No match found
      failed++;
      unmapped.push({
        inventory_id: item.id,
        name: item.name,
        set: item.set,
        reason: 'No matching printing found'
      });
    }

    console.log('\n\n--- Results ---\n');
    console.log(`  Updated: ${updated}`);
    console.log(`  Skipped: ${skipped}`);
    console.log(`  Failed:  ${failed}`);
    console.log(`  Total:   ${inventoryItems.length}`);

    // Verify migration
    if (!DRY_RUN) {
      const { rows: verification } = await client.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(printing_id) as with_printing,
          COUNT(*) - COUNT(printing_id) as without_printing
        FROM inventory
      `);
      
      console.log('\n--- Verification ---\n');
      console.log(`  Total inventory:      ${verification[0].total}`);
      console.log(`  With printing_id:     ${verification[0].with_printing}`);
      console.log(`  Without printing_id:  ${verification[0].without_printing}`);
    }

    // Write mappings to CSV
    const mappingsPath = path.join(__dirname, '../mappings/inventory_mappings.csv');
    const mappingsContent = [
      'inventory_id,name,set,printing_id,match_method',
      ...mappings.map(m => 
        `${m.inventory_id},"${m.name}","${m.set}",${m.printing_id},"${m.match_method}"`
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
      const unmappedPath = path.join(__dirname, '../mappings/inventory_unmapped.csv');
      const unmappedContent = [
        'inventory_id,name,set,matched_printing_id,matched_set,reason',
        ...unmapped.map(u => 
          `${u.inventory_id},"${u.name}","${u.set || ''}","${u.matched_printing_id || ''}","${u.matched_set || ''}","${u.reason}"`
        )
      ].join('\n');

      if (!DRY_RUN) {
        fs.writeFileSync(unmappedPath, unmappedContent);
        console.log(`  Unmapped written to: ${unmappedPath}`);
      } else {
        console.log(`  [DRY RUN] Would write ${unmapped.length} unmapped to: ${unmappedPath}`);
      }
    }

    console.log('\n========================================');
    console.log('   Inventory Migration Complete');
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
