#!/usr/bin/env node
/**
 * Migrate Containers from JSON to Relational
 * 
 * Migrates data from containers.cards JSON blob to container_items rows.
 * Preserves JSON blob during migration for verification.
 * 
 * Usage: node migrate/scripts/05_migrate_containers.js [--dry-run]
 */

import pkg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pkg;

const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  console.log('\n========================================');
  console.log('   Migrate Containers (JSON → Relational)');
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
  const issues = [];

  try {
    // Get all containers with JSON cards
    const { rows: containers } = await client.query(`
      SELECT id, name, decklist_id, cards
      FROM containers
      WHERE cards IS NOT NULL AND jsonb_array_length(cards) > 0
      ORDER BY id
    `);

    console.log(`Found ${containers.length} containers with JSON cards to migrate\n`);

    let containersProcessed = 0;
    let itemsCreated = 0;
    let itemsSkipped = 0;
    let itemsFailed = 0;

    for (const container of containers) {
      process.stdout.write(`\r[${containersProcessed + 1}/${containers.length}] Processing container #${container.id}: ${(container.name || '').substring(0, 30).padEnd(30)}`);

      const cards = container.cards || [];
      
      if (!Array.isArray(cards)) {
        issues.push({
          container_id: container.id,
          reason: 'Invalid JSON structure - not an array'
        });
        continue;
      }

      // Check if container already has relational items
      const { rows: existingItems } = await client.query(
        `SELECT COUNT(*) as count FROM container_items WHERE container_id = $1`,
        [container.id]
      );

      if (parseInt(existingItems[0].count) > 0) {
        issues.push({
          container_id: container.id,
          reason: 'Container already has relational items - skipping to avoid duplicates'
        });
        itemsSkipped += cards.length;
        containersProcessed++;
        continue;
      }

      // Process each card in the JSON array
      for (const card of cards) {
        const inventoryId = card.inventoryId ? parseInt(card.inventoryId) : null;
        const quantity = parseInt(card.quantity_used) || 1;

        // Try to find printing_id from inventory
        let printingId = null;
        if (inventoryId) {
          const { rows: invItem } = await client.query(
            `SELECT printing_id FROM inventory WHERE id = $1`,
            [inventoryId]
          );
          if (invItem.length > 0) {
            printingId = invItem[0].printing_id;
          }
        }

        if (!DRY_RUN) {
          try {
            await client.query(`
              INSERT INTO container_items (container_id, inventory_id, printing_id, quantity)
              VALUES ($1, $2, $3, $4)
            `, [container.id, inventoryId, printingId, quantity]);

            mappings.push({
              container_id: container.id,
              inventory_id: inventoryId,
              printing_id: printingId,
              quantity: quantity,
              card_name: card.name,
              card_set: card.set,
              status: 'created'
            });
            itemsCreated++;
          } catch (err) {
            issues.push({
              container_id: container.id,
              inventory_id: inventoryId,
              card_name: card.name,
              reason: `Insert failed: ${err.message}`
            });
            itemsFailed++;
          }
        } else {
          mappings.push({
            container_id: container.id,
            inventory_id: inventoryId,
            printing_id: printingId,
            quantity: quantity,
            card_name: card.name,
            card_set: card.set,
            status: 'would_create'
          });
          itemsCreated++;
        }
      }

      containersProcessed++;
    }

    console.log('\n\n--- Results ---\n');
    console.log(`  Containers processed: ${containersProcessed}`);
    console.log(`  Items created:        ${itemsCreated}`);
    console.log(`  Items skipped:        ${itemsSkipped}`);
    console.log(`  Items failed:         ${itemsFailed}`);

    // Verify migration
    if (!DRY_RUN) {
      console.log('\n--- Verification ---\n');

      const { rows: verification } = await client.query(`
        SELECT 
          c.id,
          c.name,
          COALESCE(jsonb_array_length(c.cards), 0) as json_count,
          COALESCE((SELECT SUM(quantity) FROM container_items WHERE container_id = c.id), 0) as items_count
        FROM containers c
        WHERE COALESCE(jsonb_array_length(c.cards), 0) > 0
        ORDER BY c.id
        LIMIT 10
      `);

      console.log('  Sample verification (first 10 containers):');
      for (const row of verification) {
        const match = row.json_count == row.items_count ? '✓' : '⚠️';
        console.log(`    ${match} Container #${row.id} "${row.name}": JSON=${row.json_count}, Items=${row.items_count}`);
      }

      // Check for mismatches
      const { rows: mismatches } = await client.query(`
        SELECT COUNT(*) as count
        FROM containers c
        WHERE COALESCE(jsonb_array_length(c.cards), 0) != 
              COALESCE((SELECT SUM(quantity) FROM container_items WHERE container_id = c.id), 0)
          AND COALESCE(jsonb_array_length(c.cards), 0) > 0
      `);

      console.log(`\n  Total containers with mismatches: ${mismatches[0].count}`);
    }

    // Write mappings to CSV
    const mappingsPath = path.join(__dirname, '../mappings/container_mappings.csv');
    const mappingsContent = [
      'container_id,inventory_id,printing_id,quantity,card_name,card_set,status',
      ...mappings.map(m => 
        `${m.container_id},${m.inventory_id || ''},${m.printing_id || ''},${m.quantity},"${m.card_name || ''}","${m.card_set || ''}","${m.status}"`
      )
    ].join('\n');

    if (!DRY_RUN) {
      fs.writeFileSync(mappingsPath, mappingsContent);
      console.log(`\n  Mappings written to: ${mappingsPath}`);
    } else {
      console.log(`\n  [DRY RUN] Would write ${mappings.length} mappings to: ${mappingsPath}`);
    }

    // Write issues to CSV
    if (issues.length > 0) {
      const issuesPath = path.join(__dirname, '../mappings/container_issues.csv');
      const issuesContent = [
        'container_id,inventory_id,card_name,reason',
        ...issues.map(i => 
          `${i.container_id},"${i.inventory_id || ''}","${i.card_name || ''}","${i.reason}"`
        )
      ].join('\n');

      if (!DRY_RUN) {
        fs.writeFileSync(issuesPath, issuesContent);
        console.log(`  Issues written to: ${issuesPath}`);
      } else {
        console.log(`  [DRY RUN] Would write ${issues.length} issues to: ${issuesPath}`);
      }
    }

    console.log('\n========================================');
    console.log('   Container Migration Complete');
    console.log('========================================\n');
    console.log('⚠️  JSON blob preserved for verification.');
    console.log('   Run 06_remove_json_blob.sql after verifying data integrity.\n');

  } catch (err) {
    console.error('\n❌ Error:', err.message);
    console.error(err.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
