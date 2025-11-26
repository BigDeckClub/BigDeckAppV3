# BigDeck.app Database Refactor Plan

**Date:** 2025-11-26  
**Status:** Phase 1 Complete - Plan Ready  
**Author:** Automated Refactor System

---

## Overview

This document outlines the step-by-step plan to normalize the BigDeck.app inventory database. The refactoring will:

1. Create a single source of truth for card data (`cards` + `printings` tables)
2. Remove JSON blob redundancy from `containers`
3. Implement proper migrations with Prisma
4. Maintain backward compatibility during transition

---

## Phase 2: Reference Tables

### 2.1 Create Prisma Schema

**Task:** Initialize Prisma and create schema for new reference tables.

**Files to Create:**
- `prisma/schema.prisma`

**Schema Definition:**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Master card catalog - one entry per unique card (by oracle_id)
model Card {
  id           Int        @id @default(autoincrement())
  oracleId     String     @unique @map("oracle_id") @db.VarChar(36)
  name         String     @db.VarChar(255)
  normalizedName String   @map("normalized_name") @db.VarChar(255)
  typeLine     String?    @map("type_line") @db.VarChar(255)
  manaCost     String?    @map("mana_cost") @db.VarChar(100)
  cmc          Decimal?   @db.Decimal(4, 1)
  colors       String[]   @default([])
  colorIdentity String[]  @map("color_identity") @default([])
  keywords     String[]   @default([])
  oracleText   String?    @map("oracle_text") @db.Text
  createdAt    DateTime   @default(now()) @map("created_at")
  updatedAt    DateTime   @updatedAt @map("updated_at")
  
  printings    Printing[]
  
  @@index([normalizedName])
  @@index([name])
  @@map("cards")
}

// Set-specific card printings
model Printing {
  id              Int      @id @default(autoincrement())
  cardId          Int      @map("card_id")
  scryfallId      String   @unique @map("scryfall_id") @db.VarChar(36)
  setCode         String   @map("set_code") @db.VarChar(10)
  setName         String   @map("set_name") @db.VarChar(255)
  collectorNumber String?  @map("collector_number") @db.VarChar(20)
  rarity          String?  @db.VarChar(20)
  finish          String?  @db.VarChar(20) // normal, foil, etched
  imageUriSmall   String?  @map("image_uri_small") @db.Text
  imageUriNormal  String?  @map("image_uri_normal") @db.Text
  imageUriLarge   String?  @map("image_uri_large") @db.Text
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")
  
  card            Card     @relation(fields: [cardId], references: [id])
  priceSnapshots  PriceSnapshot[]
  inventoryItems  Inventory[]
  containerItems  ContainerItem[]
  deckItems       DeckItem[]
  
  @@index([cardId])
  @@index([setCode])
  @@index([setCode, collectorNumber])
  @@map("printings")
}

// Price history tracking
model PriceSnapshot {
  id          Int      @id @default(autoincrement())
  printingId  Int      @map("printing_id")
  priceTcg    Decimal? @map("price_tcg") @db.Decimal(10, 2)
  priceCk     Decimal? @map("price_ck") @db.Decimal(10, 2)
  priceScryfall Decimal? @map("price_scryfall") @db.Decimal(10, 2)
  snapshotDate DateTime @default(now()) @map("snapshot_date")
  
  printing    Printing @relation(fields: [printingId], references: [id])
  
  @@index([printingId])
  @@index([snapshotDate])
  @@map("price_snapshots")
}

// Existing tables with new relationships
model Inventory {
  id             Int       @id @default(autoincrement())
  printingId     Int?      @map("printing_id")
  // Legacy fields (keep during migration, remove after)
  name           String?   @db.VarChar(255)
  set            String?   @db.VarChar(20)
  setName        String?   @map("set_name") @db.VarChar(255)
  imageUrl       String?   @map("image_url") @db.Text
  scryfallId     String?   @map("scryfall_id") @db.VarChar(255)
  // Core fields
  quantity       Int       @default(1)
  purchasePrice  Decimal?  @map("purchase_price") @db.Real
  purchaseDate   String?   @map("purchase_date")
  reorderType    String?   @map("reorder_type") @default("Normal") @db.VarChar(20)
  createdAt      DateTime  @default(now()) @map("created_at")
  
  printing       Printing? @relation(fields: [printingId], references: [id])
  containerItems ContainerItem[]
  purchaseHistory PurchaseHistory[]
  
  @@index([printingId])
  @@index([name])
  @@map("inventory")
}

model Container {
  id          Int       @id @default(autoincrement())
  name        String    @db.VarChar(255)
  decklistId  Int?      @map("decklist_id")
  cards       Json?     @default("[]") // Legacy - remove after migration
  createdAt   DateTime  @default(now()) @map("created_at")
  
  decklist    Decklist? @relation(fields: [decklistId], references: [id])
  items       ContainerItem[]
  
  @@map("containers")
}

model ContainerItem {
  id          Int       @id @default(autoincrement())
  containerId Int       @map("container_id")
  inventoryId Int?      @map("inventory_id")
  printingId  Int?      @map("printing_id")
  quantity    Int       @default(1)
  
  container   Container  @relation(fields: [containerId], references: [id], onDelete: Cascade)
  inventory   Inventory? @relation(fields: [inventoryId], references: [id], onDelete: Cascade)
  printing    Printing?  @relation(fields: [printingId], references: [id])
  
  @@map("container_items")
}

model Decklist {
  id        Int       @id @default(autoincrement())
  name      String    @db.VarChar(255)
  decklist  String?   @db.Text // Legacy - keep for backward compat
  createdAt DateTime  @default(now()) @map("created_at")
  
  containers Container[]
  items      DeckItem[]
  sales      Sale[]
  
  @@map("decklists")
}

model DeckItem {
  id          Int       @id @default(autoincrement())
  decklistId  Int       @map("decklist_id")
  printingId  Int?      @map("printing_id")
  cardName    String?   @map("card_name") @db.VarChar(255) // Fallback if no printing match
  setCode     String?   @map("set_code") @db.VarChar(10)
  quantity    Int       @default(1)
  isSideboard Boolean   @default(false) @map("is_sideboard")
  
  decklist    Decklist  @relation(fields: [decklistId], references: [id], onDelete: Cascade)
  printing    Printing? @relation(fields: [printingId], references: [id])
  
  @@map("deck_items")
}

model Sale {
  id            Int       @id @default(autoincrement())
  containerId   Int?      @map("container_id")
  decklistId    Int?      @map("decklist_id")
  decklistName  String?   @map("decklist_name") @db.VarChar(255)
  salePrice     Decimal?  @map("sale_price") @db.Decimal(10, 2)
  costBasis     Decimal?  @map("cost_basis") @db.Decimal(10, 2)
  soldDate      DateTime  @default(now()) @map("sold_date")
  createdAt     DateTime  @default(now()) @map("created_at")
  
  decklist      Decklist? @relation(fields: [decklistId], references: [id])
  
  @@map("sales")
}

model Setting {
  key   String @id @db.VarChar(255)
  value String? @db.Text
  
  @@map("settings")
}

model UsageHistory {
  id        Int       @id @default(autoincrement())
  action    String    @db.VarChar(255)
  details   String?   @db.Text
  createdAt DateTime  @default(now()) @map("created_at")
  
  @@map("usage_history")
}

model PurchaseHistory {
  id            Int       @id @default(autoincrement())
  inventoryId   Int       @map("inventory_id")
  purchaseDate  String    @map("purchase_date")
  purchasePrice Decimal   @map("purchase_price") @db.Real
  quantity      Int       @default(1)
  createdAt     DateTime  @default(now()) @map("created_at")
  
  inventory     Inventory @relation(fields: [inventoryId], references: [id], onDelete: Restrict)
  
  @@map("purchase_history")
}
```

**Estimated Risk:** Low  
**Rollback:** Drop new tables (cards, printings, price_snapshots, deck_items)

### 2.2 Generate Initial Migration

**Commands:**
```bash
npx prisma init
npx prisma db pull  # Introspect existing schema
npx prisma migrate dev --name init_reference_tables
```

**Output Files:**
- `prisma/migrations/YYYYMMDDHHMMSS_init_reference_tables/migration.sql`

---

## Phase 3: Domain Migration

### 3.1 Create Migration Scripts Directory Structure

```
migrate/
├── scripts/
│   ├── 01_backup_tables.sql
│   ├── 02_populate_cards.js
│   ├── 03_populate_printings.js
│   ├── 04_migrate_inventory.js
│   ├── 05_migrate_containers.js
│   ├── 06_migrate_decklists.js
│   └── 07_verify_migration.js
├── rollback/
│   ├── 01_restore_inventory.sql
│   ├── 02_restore_containers.sql
│   └── 03_restore_decklists.sql
├── mappings/
│   ├── inventory_mappings.csv
│   ├── container_mappings.csv
│   └── decklist_mappings.csv
└── unmapped.csv
```

### 3.2 Step 1: Backup Tables

**Script:** `migrate/scripts/01_backup_tables.sql`

```sql
-- Create backup schema
CREATE SCHEMA IF NOT EXISTS backup_20251126;

-- Backup all affected tables
CREATE TABLE backup_20251126.inventory AS SELECT * FROM inventory;
CREATE TABLE backup_20251126.containers AS SELECT * FROM containers;
CREATE TABLE backup_20251126.container_items AS SELECT * FROM container_items;
CREATE TABLE backup_20251126.decklists AS SELECT * FROM decklists;
CREATE TABLE backup_20251126.sales AS SELECT * FROM sales;
CREATE TABLE backup_20251126.purchase_history AS SELECT * FROM purchase_history;

-- Verify row counts
SELECT 'inventory' as table_name, COUNT(*) as rows FROM backup_20251126.inventory
UNION ALL
SELECT 'containers', COUNT(*) FROM backup_20251126.containers
UNION ALL
SELECT 'container_items', COUNT(*) FROM backup_20251126.container_items
UNION ALL
SELECT 'decklists', COUNT(*) FROM backup_20251126.decklists
UNION ALL
SELECT 'sales', COUNT(*) FROM backup_20251126.sales
UNION ALL
SELECT 'purchase_history', COUNT(*) FROM backup_20251126.purchase_history;
```

**Rollback:** `DROP SCHEMA backup_20251126 CASCADE;`

### 3.3 Step 2: Populate Cards Table

**Script:** `migrate/scripts/02_populate_cards.js`

```javascript
// Extract unique card names from inventory
// Fetch card data from Scryfall API by oracle_id
// Insert into cards table
// Log mappings to CSV
```

**Output:** `migrate/mappings/cards_created.csv`

### 3.4 Step 3: Populate Printings Table

**Script:** `migrate/scripts/03_populate_printings.js`

```javascript
// For each unique (name, set) in inventory
// Lookup Scryfall ID
// Create printing record linked to card
// Handle ambiguous matches -> unmapped.csv
```

**Output:** 
- `migrate/mappings/printings_created.csv`
- `migrate/unmapped.csv` (for manual review)

### 3.5 Step 4: Migrate Inventory

**Script:** `migrate/scripts/04_migrate_inventory.js`

```javascript
// For each inventory row:
// 1. Find matching printing by (name, set)
// 2. Set printing_id
// 3. Keep legacy columns during transition
// 4. Log mapping
```

**Changes to `inventory` table:**
- ADD `printing_id INTEGER REFERENCES printings(id)`
- Populate `printing_id` for each row
- Verify counts match

**Rollback:** 
```sql
UPDATE inventory SET printing_id = NULL;
```

### 3.6 Step 5: Migrate Containers (JSON → Relational)

**Script:** `migrate/scripts/05_migrate_containers.js`

```javascript
// For each container:
// 1. Parse cards JSON array
// 2. For each card in JSON:
//    - Find printing_id from (name, set)
//    - Find inventory_id from inventoryId in JSON
//    - INSERT INTO container_items
// 3. Verify totals match
// 4. Log mapping
```

**Changes:**
- Populate `container_items` from JSON
- DO NOT delete JSON yet (verify first)

**Verification Query:**
```sql
-- Compare JSON totals with container_items totals
SELECT 
  c.id,
  c.name,
  COALESCE((SELECT SUM((card->>'quantity_used')::int) FROM jsonb_array_elements(c.cards) as card), 0) as json_total,
  COALESCE((SELECT SUM(quantity) FROM container_items WHERE container_id = c.id), 0) as items_total
FROM containers c
WHERE json_total != items_total;
```

**Rollback:**
```sql
DELETE FROM container_items;
```

### 3.7 Step 6: Migrate Decklists

**Script:** `migrate/scripts/06_migrate_decklists.js`

```javascript
// For each decklist:
// 1. Parse decklist text
// 2. For each line:
//    - Extract quantity, card name, set code
//    - Find or create printing
//    - INSERT INTO deck_items
// 3. Keep original text for backward compatibility
```

**Rollback:**
```sql
DELETE FROM deck_items;
```

### 3.8 Step 7: Verify Migration

**Script:** `migrate/scripts/07_verify_migration.js`

Checks:
- [ ] All inventory rows have printing_id (or documented reason why not)
- [ ] container_items row count matches JSON array totals
- [ ] deck_items count matches parsed decklist lines
- [ ] No orphaned foreign keys
- [ ] Query performance acceptable

---

## Phase 4: Backend Routes

### 4.1 Updated Endpoint Specifications

#### GET /api/inventory

**Current Response:**
```json
{
  "id": 1,
  "name": "Lightning Bolt",
  "set": "M21",
  "set_name": "Core Set 2021",
  "quantity": 4,
  "purchase_price": 0.99,
  "quantity_in_containers": 2,
  "quantity_available": 2
}
```

**New Response (joined data):**
```json
{
  "id": 1,
  "quantity": 4,
  "purchase_price": 0.99,
  "quantity_in_containers": 2,
  "quantity_available": 2,
  "printing": {
    "id": 42,
    "scryfall_id": "abc-123",
    "set_code": "M21",
    "set_name": "Core Set 2021",
    "image_uri_normal": "https://...",
    "card": {
      "id": 10,
      "name": "Lightning Bolt",
      "oracle_id": "xyz-789",
      "type_line": "Instant",
      "mana_cost": "{R}"
    }
  }
}
```

**Compatibility Wrapper:**
```javascript
// Flatten for backward compatibility
function flattenInventoryResponse(item) {
  return {
    id: item.id,
    name: item.printing?.card?.name || item.name,
    set: item.printing?.set_code || item.set,
    set_name: item.printing?.set_name || item.set_name,
    // ... other fields
  };
}
```

### 4.2 New Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/cards/search` | GET | Search cards by name (fuzzy) |
| `/api/cards/:oracleId` | GET | Get card by oracle_id |
| `/api/printings/:id` | GET | Get printing with price history |
| `/api/printings/by-card/:cardId` | GET | List all printings for a card |

### 4.3 Caching Layer

```javascript
// Card lookup cache
const cardCache = new Map(); // oracle_id -> card data
const printingCache = new Map(); // scryfall_id -> printing data

async function lookupOrCreateCard(name, setCode) {
  const cacheKey = `${name.toLowerCase()}|${setCode.toUpperCase()}`;
  if (printingCache.has(cacheKey)) {
    return printingCache.get(cacheKey);
  }
  // Fetch from Scryfall, create if needed
  // Cache result
}
```

---

## Phase 5: Frontend Changes

### 5.1 Type Updates

**Current Types:**
```typescript
interface InventoryItem {
  id: number;
  name: string;
  set: string;
  set_name: string;
  quantity: number;
  purchase_price: number;
  // ...
}
```

**New Types:**
```typescript
interface Card {
  id: number;
  name: string;
  oracle_id: string;
  type_line: string;
  mana_cost: string;
}

interface Printing {
  id: number;
  card: Card;
  scryfall_id: string;
  set_code: string;
  set_name: string;
  image_uri_normal: string;
}

interface InventoryItem {
  id: number;
  printing: Printing;
  quantity: number;
  purchase_price: number;
  quantity_in_containers: number;
  quantity_available: number;
}
```

### 5.2 Component Updates

| Component | Current Access | New Access |
|-----------|----------------|------------|
| `InventoryTab` | `item.name` | `item.printing.card.name` |
| `InventoryTab` | `item.set` | `item.printing.set_code` |
| `DecklistCardPrice` | `name`, `set` props | `printing` prop |
| `App.jsx` | `inventory[].name` | `inventory[].printing.card.name` |

### 5.3 Migration Strategy

1. **Phase 5a:** Update API layer to return both old and new shapes
2. **Phase 5b:** Update components one at a time
3. **Phase 5c:** Remove old shape from API responses
4. **Phase 5d:** Remove backward-compatibility code

---

## Timeline & Milestones

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| Phase 1 | Complete | audit_report.md, refactor_plan.md |
| Phase 2 | 1 day | Prisma schema, new tables |
| Phase 3 | 2-3 days | Migration scripts, mappings CSV |
| Phase 4 | 1-2 days | Updated API endpoints |
| Phase 5 | 2-3 days | Frontend updates |
| Verification | 1 day | Full testing, cleanup |

**Total Estimated Duration:** 1-2 weeks

---

## Success Criteria

- [ ] All inventory items have `printing_id` reference
- [ ] All containers use `container_items` (JSON removed)
- [ ] All decklists have `deck_items` entries
- [ ] API returns joined card data
- [ ] Frontend displays card data from new structure
- [ ] No data loss (verified by row counts)
- [ ] Rollback scripts tested and documented
- [ ] Performance equal or better than current
- [ ] All existing tests pass
- [ ] New tests added for migration logic

---

## Appendix: Rollback Procedures

### Full Rollback (Emergency)

```sql
-- Restore from backup schema
DROP TABLE IF EXISTS inventory CASCADE;
CREATE TABLE inventory AS SELECT * FROM backup_20251126.inventory;

DROP TABLE IF EXISTS containers CASCADE;
CREATE TABLE containers AS SELECT * FROM backup_20251126.containers;

-- Continue for other tables...

-- Remove new tables
DROP TABLE IF EXISTS cards CASCADE;
DROP TABLE IF EXISTS printings CASCADE;
DROP TABLE IF EXISTS price_snapshots CASCADE;
DROP TABLE IF EXISTS deck_items CASCADE;
```

### Partial Rollback (Phase-specific)

See rollback scripts in `migrate/rollback/` directory.

---

*End of Refactor Plan*
