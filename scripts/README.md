# Migration Scripts

This directory contains scripts for migrating data from the legacy `userData` JSONB field to the new relational tables (Decks, Cards, UserProgress).

## Overview

The migration process moves user data from a single JSONB column to properly normalized relational tables:

- `users.user_data` (JSONB) → `decks`, `cards`, `user_progress` tables

## Scripts

### 1. `migrate-userdata-to-relational.js`

The main migration script that reads userData JSONB and creates corresponding records in the relational tables.

**Features:**
- Dry run mode (preview changes)
- Idempotent (safe to run multiple times)
- Transaction wrapping (rollback on failure)
- Batch processing
- Comprehensive error handling
- Progress tracking

**Usage:**
```bash
# Preview migration (dry run)
node scripts/migrate-userdata-to-relational.js --dry-run

# Migrate all users
node scripts/migrate-userdata-to-relational.js

# Migrate specific user
node scripts/migrate-userdata-to-relational.js --user-id=123

# Migrate in small batches
node scripts/migrate-userdata-to-relational.js --batch-size=10

# Verbose output
node scripts/migrate-userdata-to-relational.js --verbose
```

### 2. `verify-migration.js`

Verification script that checks the migration was successful by comparing JSONB data with relational tables.

**Checks:**
- Table existence
- User migration status
- Data count comparison
- Foreign key integrity
- Data quality (empty names, duplicates)

**Usage:**
```bash
# Verify all users
node scripts/verify-migration.js

# Verify specific user
node scripts/verify-migration.js --user-id=123

# Verbose output with per-user details
node scripts/verify-migration.js --verbose
```

### 3. `rollback-migration.js`

Rollback script to reverse the migration if needed. **WARNING: This deletes data!**

**Usage:**
```bash
# Preview rollback (dry run)
node scripts/rollback-migration.js --dry-run

# Rollback all users (with confirmation)
node scripts/rollback-migration.js

# Rollback specific user
node scripts/rollback-migration.js --user-id=123

# Skip confirmation prompt
node scripts/rollback-migration.js --confirm
```

## Migration Process

### Prerequisites

1. **Backup your database** before running migration
   ```bash
   pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
   ```

2. Ensure `DATABASE_URL` environment variable is set
   ```bash
   export DATABASE_URL="postgresql://user:pass@host:5432/dbname"
   ```

3. Ensure the target tables exist:
   - `users` (with `user_data` JSONB column)
   - `decks` (new relational table)
   - `cards` (new relational table)
   - `user_progress` (new relational table)

### Step-by-Step Migration

1. **Dry run to preview changes**
   ```bash
   node scripts/migrate-userdata-to-relational.js --dry-run
   ```
   Review the output to ensure it looks correct.

2. **Migrate a test user first**
   ```bash
   node scripts/migrate-userdata-to-relational.js --user-id=<test-user-id>
   ```

3. **Verify the test migration**
   ```bash
   node scripts/verify-migration.js --user-id=<test-user-id> --verbose
   ```

4. **Test the application** with the migrated user

5. **Migrate all users in batches**
   ```bash
   node scripts/migrate-userdata-to-relational.js --batch-size=50
   ```

6. **Run full verification**
   ```bash
   node scripts/verify-migration.js
   ```

### Rollback (if needed)

If issues are found after migration:

1. **Preview rollback**
   ```bash
   node scripts/rollback-migration.js --dry-run
   ```

2. **Perform rollback**
   ```bash
   node scripts/rollback-migration.js
   ```

The original `user_data` JSONB field is preserved, so no data is lost.

## Data Structure

### Source: userData JSONB

```json
{
  "decks": [
    {
      "id": 1,
      "name": "My Deck",
      "description": "A deck for learning",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z",
      "cards": [
        {
          "id": 1,
          "front": "Question",
          "back": "Answer",
          "createdAt": "2024-01-01T00:00:00Z",
          "updatedAt": "2024-01-01T00:00:00Z"
        }
      ]
    }
  ],
  "progress": [
    {
      "cardId": 1,
      "lastReviewed": "2024-01-15T10:30:00Z",
      "correctCount": 5,
      "incorrectCount": 1,
      "easeFactor": 2.5,
      "interval": 7
    }
  ]
}
```

### Target: Relational Tables

**decks**
| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| user_id | INTEGER | Foreign key to users |
| name | VARCHAR | Deck name |
| description | TEXT | Optional description |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

**cards**
| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| deck_id | INTEGER | Foreign key to decks |
| front | TEXT | Card front content |
| back | TEXT | Card back content |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

**user_progress**
| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| user_id | INTEGER | Foreign key to users |
| card_id | INTEGER | Foreign key to cards |
| last_reviewed | TIMESTAMP | Last review date |
| correct_count | INTEGER | Times answered correctly |
| incorrect_count | INTEGER | Times answered incorrectly |
| ease_factor | DECIMAL | Spaced repetition factor |
| interval | INTEGER | Days until next review |

## Error Handling

### Migration Errors

If errors occur during migration:
- The transaction for that user is rolled back
- Errors are logged to `scripts/migration-errors.json`
- Other users continue to be processed

### Common Issues

1. **Parse error**: Invalid JSON in userData
   - Check the raw data in the database
   - Fix manually if possible

2. **Missing required fields**: userData missing expected structure
   - The script handles missing fields gracefully
   - Check the validation errors in the output

3. **Duplicate progress**: Same user/card combo already exists
   - This indicates data was partially migrated
   - Use rollback and re-run migration

## Safety Features

1. **Idempotency**: Users already migrated are skipped
2. **Dry Run**: Preview all changes without writing
3. **Transactions**: Each user migrated atomically
4. **Validation**: Data structure validated before migration
5. **Preservation**: Original JSONB data is never modified
6. **Logging**: Comprehensive output and error logs

## Testing

Test the migration logic:

```bash
npm run test -- --grep "Migration"
```

Tests are located in `tests/migration.test.js`

## Support

If you encounter issues:

1. Check the migration errors log: `scripts/migration-errors.json`
2. Run verification: `node scripts/verify-migration.js --verbose`
3. Check the database directly for data inconsistencies
4. Contact the development team with logs and error details
