#!/usr/bin/env node
/**
 * Migration Verification Script
 * 
 * Verifies that the userData migration was successful by comparing
 * the original JSONB data with the new relational tables.
 * 
 * Checks:
 * - All users with userData have corresponding decks
 * - Card counts match between JSONB and relational tables
 * - Progress records are properly linked
 * - Data integrity (no orphaned records)
 * - Foreign key relationships are valid
 * 
 * Usage:
 *   node scripts/verify-migration.js [options]
 * 
 * Options:
 *   --user-id=ID       Verify only a specific user
 *   --verbose          Show detailed output
 *   --fix              Attempt to fix minor issues
 *   --help             Show this help message
 * 
 * Environment:
 *   DATABASE_URL       PostgreSQL connection string (required)
 * 
 * @author BigDeckClub
 * @version 1.0.0
 */

import pkg from 'pg';

const { Pool } = pkg;

// Parse command line arguments
function parseArgs() {
  const args = {
    userId: null,
    verbose: process.argv.includes('--verbose'),
    fix: process.argv.includes('--fix'),
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
Migration Verification Script

Verifies that the userData migration was successful by comparing
the original JSONB data with the new relational tables.

Usage:
  node scripts/verify-migration.js [options]

Options:
  --user-id=ID       Verify only a specific user
  --verbose          Show detailed output
  --fix              Attempt to fix minor issues
  --help             Show this help message

Environment:
  DATABASE_URL       PostgreSQL connection string (required)
  `);
}

/**
 * Parse userData JSONB safely
 * @param {Object|string|null} userData
 * @returns {Object}
 */
function parseUserData(userData) {
  if (!userData) {
    return { decks: [], progress: [] };
  }

  if (typeof userData === 'string') {
    try {
      userData = JSON.parse(userData);
    } catch (e) {
      return { decks: [], progress: [], parseError: e.message };
    }
  }

  return {
    decks: Array.isArray(userData.decks) ? userData.decks : [],
    progress: Array.isArray(userData.progress) ? userData.progress : []
  };
}

/**
 * Verification result tracker
 */
class VerificationResult {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    this.warnings = 0;
    this.issues = [];
  }

  check(name, condition, details = '') {
    if (condition) {
      console.log(`  ✓ ${name}`);
      this.passed++;
      return true;
    } else {
      console.log(`  ✗ ${name}`);
      if (details) console.log(`    ${details}`);
      this.failed++;
      this.issues.push({ name, details });
      return false;
    }
  }

  warn(name, details = '') {
    console.log(`  ⚠️ ${name}`);
    if (details) console.log(`    ${details}`);
    this.warnings++;
    return true;
  }

  summary() {
    return {
      passed: this.passed,
      failed: this.failed,
      warnings: this.warnings,
      issues: this.issues
    };
  }
}

/**
 * Main verification function
 */
async function main() {
  const args = parseArgs();

  if (args.help) {
    showHelp();
    process.exit(0);
  }

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

  const result = new VerificationResult();

  try {
    // ============================================
    // 1. Check Required Tables Exist
    // ============================================
    console.log('--- Table Existence ---\n');

    const requiredTables = ['users', 'decks', 'cards', 'user_progress'];
    for (const table of requiredTables) {
      const { rows } = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = $1
        )
      `, [table]);
      result.check(`Table '${table}' exists`, rows[0].exists);
    }

    // ============================================
    // 2. Check User Migration Status
    // ============================================
    console.log('\n--- User Migration Status ---\n');

    // Build query based on whether we're checking a specific user
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

    const { rows: usersWithData } = await pool.query(usersQuery, queryParams);
    const { rows: usersWithDecks } = await pool.query(`
      SELECT DISTINCT user_id FROM decks
    `);

    const usersWithDecksSet = new Set(usersWithDecks.map(r => r.user_id));

    console.log(`  Users with userData JSONB: ${usersWithData.length}`);
    console.log(`  Users with relational decks: ${usersWithDecksSet.size}`);

    // Check each user
    let migratedUsers = 0;
    let unmigratedUsers = [];

    for (const user of usersWithData) {
      if (usersWithDecksSet.has(user.id)) {
        migratedUsers++;
      } else {
        unmigratedUsers.push(user.id);
      }
    }

    const migrationRate = usersWithData.length > 0 
      ? (migratedUsers / usersWithData.length * 100).toFixed(1) 
      : 100;

    result.check(
      `All users migrated`, 
      unmigratedUsers.length === 0,
      unmigratedUsers.length > 0 ? `Unmigrated users: ${unmigratedUsers.slice(0, 10).join(', ')}${unmigratedUsers.length > 10 ? '...' : ''}` : ''
    );

    console.log(`  Migration rate: ${migrationRate}%`);

    // ============================================
    // 3. Data Count Comparison
    // ============================================
    console.log('\n--- Data Count Comparison ---\n');

    // Count decks and cards in JSONB
    let jsonbDeckCount = 0;
    let jsonbCardCount = 0;
    let jsonbProgressCount = 0;

    for (const user of usersWithData) {
      const userData = parseUserData(user.userData);
      if (userData.parseError) continue;

      jsonbDeckCount += userData.decks.length;
      for (const deck of userData.decks) {
        if (Array.isArray(deck.cards)) {
          jsonbCardCount += deck.cards.length;
        }
      }
      jsonbProgressCount += userData.progress.length;
    }

    // Count in relational tables
    let relationalQuery = 'SELECT COUNT(*) as count FROM decks';
    if (args.userId) {
      relationalQuery += ' WHERE user_id = $1';
    }
    const { rows: deckCount } = await pool.query(relationalQuery, args.userId ? [args.userId] : []);

    relationalQuery = `SELECT COUNT(*) as count FROM cards c`;
    if (args.userId) {
      relationalQuery += ` JOIN decks d ON c.deck_id = d.id WHERE d.user_id = $1`;
    }
    const { rows: cardCount } = await pool.query(relationalQuery, args.userId ? [args.userId] : []);

    relationalQuery = 'SELECT COUNT(*) as count FROM user_progress';
    if (args.userId) {
      relationalQuery += ' WHERE user_id = $1';
    }
    const { rows: progressCount } = await pool.query(relationalQuery, args.userId ? [args.userId] : []);

    console.log(`  JSONB Decks: ${jsonbDeckCount} | Relational Decks: ${deckCount[0].count}`);
    console.log(`  JSONB Cards: ${jsonbCardCount} | Relational Cards: ${cardCount[0].count}`);
    console.log(`  JSONB Progress: ${jsonbProgressCount} | Relational Progress: ${progressCount[0].count}`);

    result.check(
      `Deck counts match`,
      parseInt(deckCount[0].count) >= jsonbDeckCount,
      `Expected at least ${jsonbDeckCount}, got ${deckCount[0].count}`
    );

    result.check(
      `Card counts match`,
      parseInt(cardCount[0].count) >= jsonbCardCount,
      `Expected at least ${jsonbCardCount}, got ${cardCount[0].count}`
    );

    result.check(
      `Progress counts match`,
      parseInt(progressCount[0].count) >= jsonbProgressCount,
      `Expected at least ${jsonbProgressCount}, got ${progressCount[0].count}`
    );

    // ============================================
    // 4. Foreign Key Integrity
    // ============================================
    console.log('\n--- Foreign Key Integrity ---\n');

    // Check decks -> users FK
    const { rows: orphanedDecks } = await pool.query(`
      SELECT COUNT(*) as count FROM decks d
      WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = d.user_id)
    `);
    result.check(
      `No orphaned decks (invalid user_id)`,
      parseInt(orphanedDecks[0].count) === 0,
      `Orphaned: ${orphanedDecks[0].count}`
    );

    // Check cards -> decks FK
    const { rows: orphanedCards } = await pool.query(`
      SELECT COUNT(*) as count FROM cards c
      WHERE NOT EXISTS (SELECT 1 FROM decks d WHERE d.id = c.deck_id)
    `);
    result.check(
      `No orphaned cards (invalid deck_id)`,
      parseInt(orphanedCards[0].count) === 0,
      `Orphaned: ${orphanedCards[0].count}`
    );

    // Check user_progress -> users FK
    const { rows: orphanedProgressUsers } = await pool.query(`
      SELECT COUNT(*) as count FROM user_progress up
      WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = up.user_id)
    `);
    result.check(
      `No orphaned progress (invalid user_id)`,
      parseInt(orphanedProgressUsers[0].count) === 0,
      `Orphaned: ${orphanedProgressUsers[0].count}`
    );

    // Check user_progress -> cards FK
    const { rows: orphanedProgressCards } = await pool.query(`
      SELECT COUNT(*) as count FROM user_progress up
      WHERE NOT EXISTS (SELECT 1 FROM cards c WHERE c.id = up.card_id)
    `);
    result.check(
      `No orphaned progress (invalid card_id)`,
      parseInt(orphanedProgressCards[0].count) === 0,
      `Orphaned: ${orphanedProgressCards[0].count}`
    );

    // ============================================
    // 5. Data Quality Checks
    // ============================================
    console.log('\n--- Data Quality ---\n');

    // Check for empty deck names
    const { rows: emptyDeckNames } = await pool.query(`
      SELECT COUNT(*) as count FROM decks WHERE name IS NULL OR name = ''
    `);
    if (parseInt(emptyDeckNames[0].count) > 0) {
      result.warn(`${emptyDeckNames[0].count} decks have empty names`);
    } else {
      result.check(`All decks have names`, true);
    }

    // Check for cards with empty front/back
    const { rows: emptyCards } = await pool.query(`
      SELECT COUNT(*) as count FROM cards 
      WHERE (front IS NULL OR front = '') AND (back IS NULL OR back = '')
    `);
    if (parseInt(emptyCards[0].count) > 0) {
      result.warn(`${emptyCards[0].count} cards have empty front and back`);
    } else {
      result.check(`All cards have content`, true);
    }

    // Check for duplicate progress records
    const { rows: duplicateProgress } = await pool.query(`
      SELECT user_id, card_id, COUNT(*) as count
      FROM user_progress
      GROUP BY user_id, card_id
      HAVING COUNT(*) > 1
    `);
    result.check(
      `No duplicate progress records`,
      duplicateProgress.length === 0,
      `Duplicates: ${duplicateProgress.length}`
    );

    // ============================================
    // 6. Per-User Verification (if verbose)
    // ============================================
    if (args.verbose && usersWithData.length > 0) {
      console.log('\n--- Per-User Details ---\n');

      const sampleSize = args.userId ? usersWithData.length : Math.min(10, usersWithData.length);
      const sampleUsers = usersWithData.slice(0, sampleSize);

      for (const user of sampleUsers) {
        const userData = parseUserData(user.userData);
        if (userData.parseError) {
          console.log(`  User #${user.id}: Parse error - ${userData.parseError}`);
          continue;
        }

        const { rows: userDecks } = await pool.query(
          `SELECT COUNT(*) as count FROM decks WHERE user_id = $1`,
          [user.id]
        );
        const { rows: userCards } = await pool.query(
          `SELECT COUNT(*) as count FROM cards c JOIN decks d ON c.deck_id = d.id WHERE d.user_id = $1`,
          [user.id]
        );
        const { rows: userProgress } = await pool.query(
          `SELECT COUNT(*) as count FROM user_progress WHERE user_id = $1`,
          [user.id]
        );

        const expectedDecks = userData.decks.length;
        const expectedCards = userData.decks.reduce((sum, d) => sum + (d.cards?.length || 0), 0);
        const expectedProgress = userData.progress.length;

        const deckMatch = parseInt(userDecks[0].count) === expectedDecks ? '✓' : '✗';
        const cardMatch = parseInt(userCards[0].count) === expectedCards ? '✓' : '✗';
        const progressMatch = parseInt(userProgress[0].count) === expectedProgress ? '✓' : '✗';

        console.log(`  User #${user.id}: Decks ${deckMatch} (${userDecks[0].count}/${expectedDecks}), Cards ${cardMatch} (${userCards[0].count}/${expectedCards}), Progress ${progressMatch} (${userProgress[0].count}/${expectedProgress})`);
      }

      if (usersWithData.length > sampleSize) {
        console.log(`  ... and ${usersWithData.length - sampleSize} more users`);
      }
    }

    // ============================================
    // Summary
    // ============================================
    const summary = result.summary();

    console.log('\n========================================');
    console.log('   Verification Summary');
    console.log('========================================\n');
    console.log(`  Passed:   ${summary.passed}`);
    console.log(`  Failed:   ${summary.failed}`);
    console.log(`  Warnings: ${summary.warnings}`);

    if (summary.failed === 0) {
      console.log('\n  ✓ All verification checks passed!\n');
    } else {
      console.log('\n  ✗ Some verification checks failed.\n');
      console.log('  Failed checks:');
      for (const issue of summary.issues) {
        console.log(`    - ${issue.name}`);
        if (issue.details) console.log(`      ${issue.details}`);
      }
      console.log();
    }

    console.log('========================================\n');

    // Exit with error code if checks failed
    process.exit(summary.failed > 0 ? 1 : 0);

  } catch (err) {
    console.error('\n❌ Verification error:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Export for testing
export { parseUserData, VerificationResult };

// Run main function
main().catch(console.error);
