# Migration Log

This document tracks all database schema changes and migrations for the BigDeck.app inventory system.

---

## Migration History

### [In Progress] Phase 2 - Reference Tables

**Status:** Ready to Execute  
**Date Created:** 2025-11-26

**Changes:**
- Create `cards` table (master card catalog with oracle_id)
- Create `printings` table (set-specific card data with scryfall_id)
- Create `price_snapshots` table (price history tracking)
- Create `deck_items` table (parsed decklist cards)
- Add `printing_id` column to `inventory` table
- Add `printing_id` column to `container_items` table
- Add missing indexes to existing tables

**Files:**
- Schema: `prisma/schema.prisma`
- Migration SQL: `prisma/migrations/20251126_create_reference_tables.sql`
- Rollback SQL: `migrate/rollback/01_drop_reference_tables.sql`

**To Execute:**
```bash
# Option 1: Run SQL migration directly
psql $DATABASE_URL -f prisma/migrations/20251126_create_reference_tables.sql

# Option 2: Use Prisma (if configured)
npx prisma migrate deploy
```

**Rollback:**
```bash
psql $DATABASE_URL -f migrate/rollback/01_drop_reference_tables.sql
```

---

### [Planned] Phase 3a - Inventory Migration

**Status:** Not Started  
**Target Date:** TBD

**Changes:**
- Add `printing_id` column to `inventory` table
- Populate `printing_id` for existing rows
- Create index on `printing_id`

**Migration File:** `prisma/migrations/YYYYMMDDHHMMSS_inventory_printing_id/`

**Rollback:**
```sql
UPDATE inventory SET printing_id = NULL;
ALTER TABLE inventory DROP COLUMN IF EXISTS printing_id;
```

---

### [Planned] Phase 3b - Container Migration

**Status:** Not Started  
**Target Date:** TBD

**Changes:**
- Migrate data from `containers.cards` JSON to `container_items` rows
- Add `printing_id` column to `container_items`
- Remove `cards` JSON column after verification

**Migration File:** `prisma/migrations/YYYYMMDDHHMMSS_container_items_migration/`

**Rollback:**
```sql
-- Recreate JSON from container_items
-- (requires application-level script)
DELETE FROM container_items;
ALTER TABLE container_items DROP COLUMN IF EXISTS printing_id;
```

---

### [Planned] Phase 3c - Decklist Migration

**Status:** Not Started  
**Target Date:** TBD

**Changes:**
- Parse existing `decklists.decklist` text into `deck_items` rows
- Link `deck_items` to `printings` where possible
- Preserve original `decklist` text for backward compatibility

**Migration File:** `prisma/migrations/YYYYMMDDHHMMSS_deck_items_migration/`

**Rollback:**
```sql
DELETE FROM deck_items;
```

---

## Current Schema Version

**Version:** Pre-migration (ad-hoc schema management in server.js)

**Tables:**
- `inventory` - Card stock with embedded card data
- `decklists` - Deck definitions with text-based card lists
- `containers` - Physical card groupings with JSON card arrays
- `container_items` - Relational container→inventory (unused)
- `sales` - Completed sales records
- `settings` - Key-value configuration
- `usage_history` - Activity logging
- `purchase_history` - Card purchase records

---

## Migration Best Practices

### Before Migration

1. **Backup the database**
   ```bash
   pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
   ```

2. **Run preview script**
   ```bash
   node migrate/scripts/migrate_preview.js
   ```

3. **Review migration checklist**
   - See `docs/migration-checklist.md`

### During Migration

1. **Use transactions** for atomic operations
2. **Log all changes** to CSV files
3. **Verify counts** before and after
4. **Flag ambiguous mappings** for manual review

### After Migration

1. **Run verification queries**
2. **Test application functionality**
3. **Monitor for errors** in logs
4. **Keep backup** for 30 days minimum

---

## Rollback Procedures

### Full Rollback

In case of catastrophic failure:

```bash
# Restore from backup
psql $DATABASE_URL < backup_YYYYMMDD.sql
```

### Partial Rollback

For specific phase rollback, see individual migration sections above.

---

## Contact

For questions about migrations, contact the development team.
