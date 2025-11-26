# Migration Checklist

**Project:** BigDeck.app Database Normalization  
**Date:** 2025-11-26  
**Status:** Ready for Review

---

## Pre-Migration Checklist

### Environment Preparation

- [ ] **Database backup created**
  - Location: `backup_20251126` schema
  - Tables backed up: inventory, containers, container_items, decklists, sales, purchase_history
  - Verified by: _________________
  - Date: _________________

- [ ] **Test environment validated**
  - [ ] Can connect to database
  - [ ] All existing tests pass
  - [ ] Application starts successfully
  - [ ] Current functionality works end-to-end

- [ ] **Team notified**
  - [ ] Development team aware of migration timeline
  - [ ] Stakeholders informed of potential downtime
  - [ ] Rollback plan reviewed and approved

---

## Phase 2: Reference Tables

### Create Tables

- [ ] **cards table created**
  - Row count: ________
  - Indexes verified: ________

- [ ] **printings table created**
  - Row count: ________
  - Foreign keys verified: ________

- [ ] **price_snapshots table created**
  - Ready for price history tracking

- [ ] **Prisma migration generated**
  - Migration file: `prisma/migrations/YYYYMMDDHHMMSS_init_reference_tables/`
  - Reviewed by: _________________

### Verification

- [ ] New tables exist in database
- [ ] Constraints are correct
- [ ] Indexes are created
- [ ] Application still works (no breaking changes yet)

**Phase 2 Sign-off:**
- Approved by: _________________
- Date: _________________

---

## Phase 3: Domain Migration

### Step 3.1: Backup Verification

- [ ] **Backup tables exist**
  ```sql
  SELECT table_name FROM information_schema.tables 
  WHERE table_schema = 'backup_20251126';
  ```

- [ ] **Row counts match**
  | Table | Original | Backup | Match? |
  |-------|----------|--------|--------|
  | inventory | ______ | ______ | [ ] |
  | containers | ______ | ______ | [ ] |
  | decklists | ______ | ______ | [ ] |

### Step 3.2: Populate Cards

- [ ] **Cards populated from Scryfall**
  - Total cards created: ________
  - Unmapped cards: ________ (manual review required)

- [ ] **Mappings exported**
  - File: `migrate/mappings/cards_created.csv`

### Step 3.3: Populate Printings

- [ ] **Printings populated**
  - Total printings created: ________
  - Unmapped printings: ________ (see `migrate/unmapped.csv`)

- [ ] **Ambiguous mappings reviewed**
  - [ ] All items in `unmapped.csv` reviewed
  - [ ] Manual decisions documented
  - Reviewed by: _________________

### Step 3.4: Migrate Inventory

- [ ] **Inventory migration complete**
  - Rows updated: ________
  - Rows with printing_id: ________
  - Rows without printing_id: ________ (reason documented)

- [ ] **Verification query passed**
  ```sql
  SELECT COUNT(*) as total,
         COUNT(printing_id) as with_printing,
         COUNT(*) - COUNT(printing_id) as without_printing
  FROM inventory;
  ```

### Step 3.5: Migrate Containers (JSON → Relational)

- [ ] **Container items migrated**
  - Containers processed: ________
  - Container items created: ________

- [ ] **JSON vs relational counts match**
  | Container ID | JSON Total | Items Total | Match? |
  |--------------|------------|-------------|--------|
  | ________ | ________ | ________ | [ ] |
  | ________ | ________ | ________ | [ ] |
  | ________ | ________ | ________ | [ ] |

- [ ] **JSON blob preserved** (DO NOT DELETE YET)

### Step 3.6: Migrate Decklists

- [ ] **Deck items created**
  - Decklists processed: ________
  - Deck items created: ________

- [ ] **Original decklist text preserved**

### Step 3.7: Final Verification

- [ ] **All foreign keys valid**
  ```sql
  -- Check for orphaned references
  SELECT 'inventory' as table, COUNT(*) as orphans 
  FROM inventory WHERE printing_id IS NOT NULL 
  AND printing_id NOT IN (SELECT id FROM printings);
  ```

- [ ] **Application tested**
  - [ ] Inventory list loads
  - [ ] Add card works
  - [ ] Edit card works
  - [ ] Delete card works
  - [ ] Container creation works
  - [ ] Container items display correctly
  - [ ] Sell container works
  - [ ] Sales history displays
  - [ ] Decklist creation works
  - [ ] Decklist parsing works

**Phase 3 Sign-off:**
- Approved by: _________________
- Date: _________________

---

## Phase 4: Backend Routes

### Endpoint Updates

- [ ] **GET /api/inventory updated**
  - Returns joined card data
  - Backward compatibility wrapper active
  - Tested: ________

- [ ] **New endpoints implemented**
  - [ ] GET /api/cards/search
  - [ ] GET /api/cards/:oracleId
  - [ ] GET /api/printings/:id

- [ ] **Caching layer added**
  - Cache hit rate: ________%

- [ ] **DEPRECATION.md created**
  - Deprecated endpoints documented
  - Removal timeline specified

**Phase 4 Sign-off:**
- Approved by: _________________
- Date: _________________

---

## Phase 5: Frontend Changes

### Component Updates

- [ ] **TypeScript types updated**
  - [ ] Card type
  - [ ] Printing type
  - [ ] InventoryItem type

- [ ] **Components updated**
  - [ ] InventoryTab
  - [ ] DecklistCardPrice
  - [ ] App.jsx price calculations
  - [ ] Container display

- [ ] **Build successful**
  ```
  npm run build
  ```

- [ ] **Tests pass**
  ```
  npm run test
  ```

- [ ] **UI manually verified**
  - [ ] Inventory displays correctly
  - [ ] Card prices load
  - [ ] Containers show card details
  - [ ] Sales analytics work

**Phase 5 Sign-off:**
- Approved by: _________________
- Date: _________________

---

## Post-Migration Cleanup

### Remove Legacy Data

**⚠️ DESTRUCTIVE - REQUIRES EXPLICIT APPROVAL**

- [ ] **JSON blob removal approved**
  - Approval by: _________________
  - Date: _________________
  
- [ ] **JSON blob removed from containers**
  ```sql
  ALTER TABLE containers DROP COLUMN cards;
  ```

- [ ] **Legacy columns removed from inventory**
  ```sql
  ALTER TABLE inventory 
    DROP COLUMN name,
    DROP COLUMN set,
    DROP COLUMN set_name,
    DROP COLUMN image_url,
    DROP COLUMN scryfall_id;
  ```

- [ ] **Backup schema retained for 30 days**
  - Scheduled deletion: _________________

### Documentation

- [ ] **API documentation updated**
- [ ] **Database schema diagram updated**
- [ ] **README updated with new architecture**

---

## Rollback Triggers

Execute rollback if ANY of the following occur:

| Trigger | Action |
|---------|--------|
| Data loss detected | Full rollback |
| Application crashes on startup | Phase rollback |
| Performance degradation >50% | Investigate, possible rollback |
| Critical bug in production | Hotfix or rollback |
| Stakeholder request | Evaluate and decide |

### Rollback Commands

```bash
# Full rollback
psql $DATABASE_URL -f migrate/rollback/full_restore.sql

# Phase-specific rollback
psql $DATABASE_URL -f migrate/rollback/01_restore_inventory.sql
```

---

## Final Sign-off

**Migration Complete:**

- [ ] All phases completed successfully
- [ ] All verification checks passed
- [ ] Production deployment completed
- [ ] Monitoring shows no issues after 24 hours

**Approved by:**

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Developer | __________ | __________ | __________ |
| Reviewer | __________ | __________ | __________ |
| Product Owner | __________ | __________ | __________ |

---

*This checklist must be completed before any destructive operations.*
