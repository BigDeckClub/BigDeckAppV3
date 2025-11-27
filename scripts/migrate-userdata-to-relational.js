#!/usr/bin/env node
/**
 * Migrate userData JSONB to Relational Tables
 * 
 * Safely migrates existing data from the old userData JSONB field into
 * new relational tables (Decks, Cards, UserProgress).
 * 
 * Features:
 * - Dry run mode (preview changes without writing)
 * - Idempotent (can run multiple times safely)
 * - Transaction wrapping (rollback on failure)
 * - Comprehensive error handling and logging
 * - Progress tracking with detailed output
 * 
 * Usage:
 *   node scripts/migrate-userdata-to-relational.js [options]
 * 
 * Options:
 *   --dry-run          Preview changes without writing to database
 *   --user-id=ID       Migrate only a specific user
 *   --batch-size=N     Process N users at a time (default: 50)
 *   --verbose          Show detailed logging
 *   --help             Show this help message
 * 
 * Environment:
 *   DATABASE_URL       PostgreSQL connection string (required)
 *   DRY_RUN=true       Alternative to --dry-run flag
 * 
 * Examples:
 *   # Dry run to preview migration
 *   node scripts/migrate-userdata-to-relational.js --dry-run
 * 
 *   # Migrate a specific user
 *   node scripts/migrate-userdata-to-relational.js --user-id=123
 * 
 *   # Migrate all users in batches of 10
 *   node scripts/migrate-userdata-to-relational.js --batch-size=10
 * 
 * @author BigDeckClub
 * @version 1.0.0
 */

import pkg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pkg;

// Parse command line arguments
function parseArgs() {
  const args = {
    dryRun: process.argv.includes('--dry-run') || process.env.DRY_RUN === 'true',
    userId: null,
    batchSize: 50,
    verbose: process.argv.includes('--verbose'),
    help: process.argv.includes('--help')
  };

  for (const arg of process.argv) {
    if (arg.startsWith('--user-id=')) {
      args.userId = parseInt(arg.split('=')[1], 10);
    }
    if (arg.startsWith('--batch-size=')) {
      args.batchSize = parseInt(arg.split('=')[1], 10);
    }
  }

  return args;
}

function showHelp() {
  console.log(`
Migrate userData JSONB to Relational Tables

Usage:
  node scripts/migrate-userdata-to-relational.js [options]

Options:
  --dry-run          Preview changes without writing to database
  --user-id=ID       Migrate only a specific user
  --batch-size=N     Process N users at a time (default: 50)
  --verbose          Show detailed logging
  --help             Show this help message

Environment:
  DATABASE_URL       PostgreSQL connection string (required)
  DRY_RUN=true       Alternative to --dry-run flag

Examples:
  # Dry run to preview migration
  node scripts/migrate-userdata-to-relational.js --dry-run

  # Migrate a specific user
  node scripts/migrate-userdata-to-relational.js --user-id=123

  # Migrate all users in batches of 10
  node scripts/migrate-userdata-to-relational.js --batch-size=10
  `);
}

/**
 * Validate userData structure before migration
 * @param {Object} userData - The userData object to validate
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateUserData(userData) {
  const errors = [];

  if (!userData || typeof userData !== 'object') {
    return { valid: false, errors: ['userData is not an object'] };
  }

  // Validate decks array if present
  if (userData.decks !== undefined) {
    if (!Array.isArray(userData.decks)) {
      errors.push('decks is not an array');
    } else {
      userData.decks.forEach((deck, index) => {
        if (!deck.name || typeof deck.name !== 'string') {
          errors.push(`decks[${index}] missing or invalid name`);
        }
        if (deck.cards !== undefined && !Array.isArray(deck.cards)) {
          errors.push(`decks[${index}].cards is not an array`);
        }
      });
    }
  }

  // Validate progress array if present
  if (userData.progress !== undefined) {
    if (!Array.isArray(userData.progress)) {
      errors.push('progress is not an array');
    } else {
      userData.progress.forEach((prog, index) => {
        if (!prog.cardId && prog.cardId !== 0) {
          errors.push(`progress[${index}] missing cardId`);
        }
      });
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Parse and normalize userData JSONB
 * @param {Object|string|null} userData - Raw userData from database
 * @returns {Object}
 */
function parseUserData(userData) {
  if (!userData) {
    return { decks: [], progress: [] };
  }

  // Handle if stored as string
  if (typeof userData === 'string') {
    try {
      userData = JSON.parse(userData);
    } catch (e) {
      return { decks: [], progress: [], parseError: e.message };
    }
  }

  return {
    decks: Array.isArray(userData.decks) ? userData.decks : [],
    progress: Array.isArray(userData.progress) ? userData.progress : [],
    raw: userData
  };
}

/**
 * Migrate a single user's data within a transaction
 * @param {Object} client - Database client
 * @param {Object} user - User record with userData
 * @param {Object} options - Migration options
 * @returns {Object} Migration result
 */
async function migrateUser(client, user, options) {
  const { dryRun, verbose } = options;
  const result = {
    userId: user.id,
    decksCreated: 0,
    cardsCreated: 0,
    progressCreated: 0,
    skipped: false,
    errors: []
  };

  const userData = parseUserData(user.userData);

  if (userData.parseError) {
    result.errors.push(`Parse error: ${userData.parseError}`);
    return result;
  }

  // Validate data structure
  const validation = validateUserData(userData.raw);
  if (!validation.valid) {
    result.errors.push(...validation.errors);
    if (verbose) {
      console.log(`    Validation errors: ${validation.errors.join(', ')}`);
    }
    // Continue with migration but flag the errors
  }

  // Check if already migrated (idempotency)
  const { rows: existingDecks } = await client.query(
    `SELECT COUNT(*) as count FROM decks WHERE user_id = $1`,
    [user.id]
  );

  if (parseInt(existingDecks[0].count) > 0) {
    result.skipped = true;
    if (verbose) {
      console.log(`    User ${user.id} already has ${existingDecks[0].count} decks - skipping`);
    }
    return result;
  }

  // Map old card IDs to new card IDs for progress migration
  const cardIdMap = new Map();

  // Step 1: Migrate Decks and their Cards
  for (const deck of userData.decks) {
    try {
      // Create deck
      let deckId;
      if (!dryRun) {
        const { rows: deckRows } = await client.query(
          `INSERT INTO decks (user_id, name, description, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id`,
          [
            user.id,
            deck.name,
            deck.description || null,
            deck.createdAt ? new Date(deck.createdAt) : new Date(),
            deck.updatedAt ? new Date(deck.updatedAt) : new Date()
          ]
        );
        deckId = deckRows[0].id;
      } else {
        deckId = `dry-run-deck-${result.decksCreated + 1}`;
      }
      result.decksCreated++;

      // Create cards for this deck
      if (Array.isArray(deck.cards)) {
        for (const card of deck.cards) {
          try {
            let cardId;
            if (!dryRun) {
              const { rows: cardRows } = await client.query(
                `INSERT INTO cards (deck_id, front, back, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5)
                 RETURNING id`,
                [
                  deckId,
                  card.front || '',
                  card.back || '',
                  card.createdAt ? new Date(card.createdAt) : new Date(),
                  card.updatedAt ? new Date(card.updatedAt) : new Date()
                ]
              );
              cardId = cardRows[0].id;
            } else {
              cardId = `dry-run-card-${result.cardsCreated + 1}`;
            }

            // Store mapping of old card ID to new card ID
            if (card.id !== undefined) {
              cardIdMap.set(card.id, cardId);
            }
            result.cardsCreated++;
          } catch (err) {
            result.errors.push(`Card creation failed: ${err.message}`);
          }
        }
      }
    } catch (err) {
      result.errors.push(`Deck creation failed: ${err.message}`);
    }
  }

  // Step 2: Migrate Progress Data
  for (const progress of userData.progress) {
    try {
      // Find the new card ID from the mapping
      const newCardId = cardIdMap.get(progress.cardId);

      if (!newCardId && !dryRun) {
        result.errors.push(`No card mapping found for progress cardId: ${progress.cardId}`);
        continue;
      }

      if (!dryRun) {
        await client.query(
          `INSERT INTO user_progress (user_id, card_id, last_reviewed, correct_count, incorrect_count, ease_factor, interval)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            user.id,
            newCardId,
            progress.lastReviewed ? new Date(progress.lastReviewed) : null,
            progress.correctCount || 0,
            progress.incorrectCount || 0,
            progress.easeFactor !== undefined ? progress.easeFactor : 2.5,
            progress.interval || 0
          ]
        );
      }
      result.progressCreated++;
    } catch (err) {
      result.errors.push(`Progress creation failed: ${err.message}`);
    }
  }

  return result;
}

/**
 * Main migration function
 */
async function main() {
  const args = parseArgs();

  if (args.help) {
    showHelp();
    process.exit(0);
  }

  console.log('\n========================================');
  console.log('   Migrate userData to Relational Tables');
  console.log('========================================\n');
  console.log(`Mode: ${args.dryRun ? 'DRY RUN (no writes)' : 'LIVE'}`);
  console.log(`Batch Size: ${args.batchSize}`);
  if (args.userId) {
    console.log(`User ID: ${args.userId}`);
  }
  console.log();

  // Check for DATABASE_URL
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable not set');
    console.error('   Please set DATABASE_URL to your PostgreSQL connection string');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  // Track overall statistics
  const stats = {
    usersProcessed: 0,
    usersSkipped: 0,
    usersFailed: 0,
    totalDecks: 0,
    totalCards: 0,
    totalProgress: 0,
    errors: []
  };

  const startTime = Date.now();

  try {
    // Build query for users with userData
    let usersQuery = `
      SELECT id, user_data as "userData"
      FROM users
      WHERE user_data IS NOT NULL
    `;
    const queryParams = [];

    if (args.userId) {
      usersQuery += ' AND id = $1';
      queryParams.push(args.userId);
    }

    usersQuery += ' ORDER BY id';

    // Get all users to migrate
    const { rows: users } = await pool.query(usersQuery, queryParams);

    console.log(`Found ${users.length} users with userData to migrate\n`);

    if (users.length === 0) {
      console.log('No users to migrate. Exiting.\n');
      await pool.end();
      return;
    }

    // Process users in batches
    for (let i = 0; i < users.length; i += args.batchSize) {
      const batch = users.slice(i, i + args.batchSize);
      const batchNum = Math.floor(i / args.batchSize) + 1;
      const totalBatches = Math.ceil(users.length / args.batchSize);

      console.log(`--- Batch ${batchNum}/${totalBatches} (${batch.length} users) ---\n`);

      for (const user of batch) {
        // Progress indicator
        process.stdout.write(`\r  Processing user #${user.id}...`);

        // Use transaction for each user migration
        const client = await pool.connect();

        try {
          if (!args.dryRun) {
            await client.query('BEGIN');
          }

          const result = await migrateUser(client, user, args);

          if (result.skipped) {
            stats.usersSkipped++;
          } else if (result.errors.length > 0 && result.decksCreated === 0) {
            stats.usersFailed++;
            stats.errors.push({
              userId: user.id,
              errors: result.errors
            });
          } else {
            stats.usersProcessed++;
            stats.totalDecks += result.decksCreated;
            stats.totalCards += result.cardsCreated;
            stats.totalProgress += result.progressCreated;

            // Log warnings for partial errors
            if (result.errors.length > 0) {
              stats.errors.push({
                userId: user.id,
                errors: result.errors,
                partial: true
              });
            }
          }

          if (!args.dryRun) {
            await client.query('COMMIT');
          }

          if (args.verbose) {
            console.log(`\r  User #${user.id}: ${result.decksCreated} decks, ${result.cardsCreated} cards, ${result.progressCreated} progress records`);
          }
        } catch (err) {
          if (!args.dryRun) {
            await client.query('ROLLBACK');
          }
          stats.usersFailed++;
          stats.errors.push({
            userId: user.id,
            errors: [err.message]
          });

          if (args.verbose) {
            console.log(`\r  User #${user.id}: ERROR - ${err.message}`);
          }
        } finally {
          client.release();
        }
      }

      // Progress report every batch
      if (i + args.batchSize < users.length) {
        console.log(`\n  Batch complete. Total progress: ${stats.usersProcessed + stats.usersSkipped}/${users.length}\n`);
      }
    }

    // Final statistics
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n\n========================================');
    console.log('   Migration Summary');
    console.log('========================================\n');
    console.log(`  Mode:               ${args.dryRun ? 'DRY RUN' : 'LIVE'}`);
    console.log(`  Duration:           ${duration}s`);
    console.log();
    console.log(`  Users processed:    ${stats.usersProcessed}`);
    console.log(`  Users skipped:      ${stats.usersSkipped} (already migrated)`);
    console.log(`  Users failed:       ${stats.usersFailed}`);
    console.log();
    console.log(`  Decks created:      ${stats.totalDecks}`);
    console.log(`  Cards created:      ${stats.totalCards}`);
    console.log(`  Progress records:   ${stats.totalProgress}`);

    // Write error log if there were errors
    if (stats.errors.length > 0) {
      const errorLogPath = path.join(__dirname, 'migration-errors.json');
      const errorLog = {
        timestamp: new Date().toISOString(),
        dryRun: args.dryRun,
        errors: stats.errors
      };

      if (!args.dryRun) {
        fs.writeFileSync(errorLogPath, JSON.stringify(errorLog, null, 2));
        console.log(`\n  ⚠️  ${stats.errors.length} users had errors. See: ${errorLogPath}`);
      } else {
        console.log(`\n  ⚠️  ${stats.errors.length} users would have errors`);
        if (args.verbose) {
          console.log('\n  Error details:');
          for (const err of stats.errors) {
            console.log(`    User #${err.userId}: ${err.errors.join(', ')}`);
          }
        }
      }
    }

    if (args.dryRun) {
      console.log('\n  ℹ️  This was a DRY RUN. No data was written.');
      console.log('     Remove --dry-run flag to perform actual migration.');
    } else if (stats.usersFailed === 0 && stats.usersProcessed > 0) {
      console.log('\n  ✓ Migration completed successfully!');
    }

    console.log('\n========================================\n');

  } catch (err) {
    console.error('\n❌ Migration failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Export functions for testing
export {
  parseArgs,
  validateUserData,
  parseUserData,
  migrateUser
};

// Run main function
main().catch(console.error);
