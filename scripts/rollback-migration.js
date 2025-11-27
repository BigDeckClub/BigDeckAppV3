#!/usr/bin/env node
/**
 * Migration Rollback Script
 * 
 * Reverses the userData JSONB to relational tables migration.
 * Use this script if the migration needs to be undone.
 * 
 * WARNING: This script will DELETE data from relational tables.
 * Make sure you have a backup before running.
 * 
 * The script preserves the original userData JSONB field,
 * so no data is lost during rollback.
 * 
 * Usage:
 *   node scripts/rollback-migration.js [options]
 * 
 * Options:
 *   --dry-run          Preview changes without deleting data
 *   --user-id=ID       Rollback only a specific user
 *   --confirm          Skip confirmation prompt
 *   --verbose          Show detailed output
 *   --help             Show this help message
 * 
 * Environment:
 *   DATABASE_URL       PostgreSQL connection string (required)
 * 
 * @author BigDeckClub
 * @version 1.0.0
 */

import pkg from 'pg';
import readline from 'readline';

const { Pool } = pkg;

// Parse command line arguments
function parseArgs() {
  const args = {
    dryRun: process.argv.includes('--dry-run'),
    userId: null,
    confirm: process.argv.includes('--confirm'),
    verbose: process.argv.includes('--verbose'),
    help: process.argv.includes('--help')
  };

  for (const arg of process.argv) {
    if (arg.startsWith('--user-id=')) {
      const parsed = parseInt(arg.split('=')[1], 10);
      if (!isNaN(parsed) && parsed > 0) {
        args.userId = parsed;
      } else {
        console.error(`Invalid user ID: ${arg.split('=')[1]}`);
        process.exit(1);
      }
    }
  }

  return args;
}

function showHelp() {
  console.log(`
Migration Rollback Script

Reverses the userData JSONB to relational tables migration.
Use this script if the migration needs to be undone.

WARNING: This script will DELETE data from relational tables.
Make sure you have a backup before running.

Usage:
  node scripts/rollback-migration.js [options]

Options:
  --dry-run          Preview changes without deleting data
  --user-id=ID       Rollback only a specific user
  --confirm          Skip confirmation prompt
  --verbose          Show detailed output
  --help             Show this help message

Environment:
  DATABASE_URL       PostgreSQL connection string (required)
  `);
}

/**
 * Prompt user for confirmation
 * @param {string} message
 * @returns {Promise<boolean>}
 */
async function promptConfirmation(message) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(`${message} (yes/no): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

/**
 * Main rollback function
 */
async function main() {
  const args = parseArgs();

  if (args.help) {
    showHelp();
    process.exit(0);
  }

  console.log('\n========================================');
  console.log('   Migration Rollback');
  console.log('========================================\n');
  console.log(`Mode: ${args.dryRun ? 'DRY RUN (no deletions)' : 'LIVE - DATA WILL BE DELETED'}`);
  if (args.userId) {
    console.log(`User ID: ${args.userId}`);
  }
  console.log();

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable not set');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // Get counts before rollback
    console.log('--- Current Data Counts ---\n');

    let countQuery = 'SELECT COUNT(*) as count FROM decks';
    if (args.userId) {
      countQuery += ' WHERE user_id = $1';
    }
    const { rows: deckCount } = await pool.query(countQuery, args.userId ? [args.userId] : []);

    countQuery = 'SELECT COUNT(*) as count FROM cards';
    if (args.userId) {
      countQuery = `SELECT COUNT(*) as count FROM cards c JOIN decks d ON c.deck_id = d.id WHERE d.user_id = $1`;
    }
    const { rows: cardCount } = await pool.query(countQuery, args.userId ? [args.userId] : []);

    countQuery = 'SELECT COUNT(*) as count FROM user_progress';
    if (args.userId) {
      countQuery += ' WHERE user_id = $1';
    }
    const { rows: progressCount } = await pool.query(countQuery, args.userId ? [args.userId] : []);

    console.log(`  Decks to delete:           ${deckCount[0].count}`);
    console.log(`  Cards to delete:           ${cardCount[0].count}`);
    console.log(`  Progress records to delete: ${progressCount[0].count}`);
    console.log();

    const totalToDelete = parseInt(deckCount[0].count) + parseInt(cardCount[0].count) + parseInt(progressCount[0].count);

    if (totalToDelete === 0) {
      console.log('No data to rollback. Exiting.\n');
      await pool.end();
      return;
    }

    // Confirmation prompt
    if (!args.dryRun && !args.confirm) {
      console.log('⚠️  WARNING: This operation will DELETE data from the database!');
      console.log('   The original userData JSONB field will be preserved.\n');

      const confirmed = await promptConfirmation('Are you sure you want to proceed?');
      if (!confirmed) {
        console.log('\nRollback cancelled.\n');
        await pool.end();
        return;
      }
      console.log();
    }

    // Start rollback
    console.log('--- Performing Rollback ---\n');

    const client = await pool.connect();
    const stats = {
      progressDeleted: 0,
      cardsDeleted: 0,
      decksDeleted: 0
    };

    try {
      if (!args.dryRun) {
        await client.query('BEGIN');
      }

      // Step 1: Delete user_progress records
      // (must be done before cards due to foreign key)
      console.log('  Deleting user_progress records...');
      
      let deleteQuery = 'DELETE FROM user_progress';
      if (args.userId) {
        deleteQuery += ' WHERE user_id = $1';
      }
      
      if (!args.dryRun) {
        const result = await client.query(deleteQuery + ' RETURNING id', args.userId ? [args.userId] : []);
        stats.progressDeleted = result.rowCount;
      } else {
        stats.progressDeleted = parseInt(progressCount[0].count);
      }
      console.log(`    ${args.dryRun ? 'Would delete' : 'Deleted'} ${stats.progressDeleted} records`);

      // Step 2: Delete cards
      // (must be done before decks due to foreign key)
      console.log('  Deleting cards...');

      if (args.userId) {
        deleteQuery = `DELETE FROM cards WHERE deck_id IN (SELECT id FROM decks WHERE user_id = $1)`;
      } else {
        deleteQuery = 'DELETE FROM cards';
      }

      if (!args.dryRun) {
        const result = await client.query(deleteQuery + ' RETURNING id', args.userId ? [args.userId] : []);
        stats.cardsDeleted = result.rowCount;
      } else {
        stats.cardsDeleted = parseInt(cardCount[0].count);
      }
      console.log(`    ${args.dryRun ? 'Would delete' : 'Deleted'} ${stats.cardsDeleted} cards`);

      // Step 3: Delete decks
      console.log('  Deleting decks...');

      deleteQuery = 'DELETE FROM decks';
      if (args.userId) {
        deleteQuery += ' WHERE user_id = $1';
      }

      if (!args.dryRun) {
        const result = await client.query(deleteQuery + ' RETURNING id', args.userId ? [args.userId] : []);
        stats.decksDeleted = result.rowCount;
      } else {
        stats.decksDeleted = parseInt(deckCount[0].count);
      }
      console.log(`    ${args.dryRun ? 'Would delete' : 'Deleted'} ${stats.decksDeleted} decks`);

      if (!args.dryRun) {
        await client.query('COMMIT');
      }

    } catch (err) {
      if (!args.dryRun) {
        await client.query('ROLLBACK');
      }
      throw err;
    } finally {
      client.release();
    }

    // Summary
    console.log('\n========================================');
    console.log('   Rollback Summary');
    console.log('========================================\n');
    console.log(`  Mode:              ${args.dryRun ? 'DRY RUN' : 'LIVE'}`);
    console.log();
    console.log(`  Decks deleted:     ${stats.decksDeleted}`);
    console.log(`  Cards deleted:     ${stats.cardsDeleted}`);
    console.log(`  Progress deleted:  ${stats.progressDeleted}`);

    if (args.dryRun) {
      console.log('\n  ℹ️  This was a DRY RUN. No data was deleted.');
      console.log('     Remove --dry-run flag to perform actual rollback.');
    } else {
      console.log('\n  ✓ Rollback completed successfully!');
      console.log('    The original userData JSONB field is preserved.');
      console.log('    You can re-run the migration when ready.');
    }

    console.log('\n========================================\n');

  } catch (err) {
    console.error('\n❌ Rollback failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Export for testing
export { parseArgs, promptConfirmation };

// Run main function
main().catch(console.error);
