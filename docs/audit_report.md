# BigDeck.app Database Audit Report

**Date:** 2025-11-26  
**Status:** Phase 1 Complete  
**Author:** Automated Audit System

---

## Executive Summary

This audit identifies data redundancy, missing relationships, and normalization issues in the BigDeck.app inventory database. The primary finding is that card information (name, set, set_name) is duplicated across multiple tables instead of being stored in a central reference table. Additionally, the `containers` table uses both a JSON blob (`cards`) AND a relational table (`container_items`), creating redundancy and potential data inconsistencies.

---

## 1. Current Database Schema (DDL)

### 1.1 Tables Overview

| Table | Primary Key | Description | Row Estimate |
|-------|-------------|-------------|--------------|
| `inventory` | `id SERIAL` | Card stock with embedded card data | Variable |
| `decklists` | `id SERIAL` | Deck definitions with embedded card text | Variable |
| `containers` | `id SERIAL` | Physical card groupings with JSON blob | Variable |
| `container_items` | `id SERIAL` | Relational container→inventory links | Unused/Partial |
| `sales` | `id SERIAL` | Completed sales records | Variable |
| `settings` | `key VARCHAR(255)` | Key-value configuration | Variable |
| `usage_history` | `id SERIAL` | Activity logging | Variable |
| `purchase_history` | `id SERIAL` | Card purchase records | Variable |

### 1.2 Detailed Schema

#### `inventory`
```sql
CREATE TABLE IF NOT EXISTS inventory (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,           -- ⚠️ EMBEDDED CARD DATA
  set VARCHAR(20),                       -- ⚠️ EMBEDDED CARD DATA
  set_name VARCHAR(255),                 -- ⚠️ EMBEDDED CARD DATA
  quantity INTEGER DEFAULT 1,
  purchase_price REAL,
  purchase_date TEXT,
  reorder_type VARCHAR(20) DEFAULT 'Normal',
  image_url TEXT,                        -- Added dynamically
  scryfall_id VARCHAR(255),             -- Added dynamically
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Issues:**
- Card identity (`name`, `set`, `set_name`) is stored inline
- `image_url` could change over time (should reference card API)
- `scryfall_id` exists but not used as a foreign key to card reference
- No indexes on frequently queried columns (`name`, `set`)

#### `decklists`
```sql
CREATE TABLE IF NOT EXISTS decklists (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  decklist TEXT,                         -- ⚠️ CARD DATA AS PLAIN TEXT
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Issues:**
- Card data stored as plain text in format `"3 Lightning Bolt (M21)"`
- Parsing required every time cards are needed
- No referential integrity to card master data
- Card names can be misspelled or inconsistent

#### `containers`
```sql
CREATE TABLE IF NOT EXISTS containers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  decklist_id INTEGER REFERENCES decklists(id) ON DELETE SET NULL,
  cards JSONB DEFAULT '[]',              -- ⚠️ DUPLICATE DATA STORAGE
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Issues:**
- `cards` JSONB blob duplicates functionality of `container_items` table
- JSON blob contains embedded card data:
  ```json
  {
    "name": "Lightning Bolt",
    "set": "M21",
    "set_name": "Core Set 2021",
    "quantity_used": 3,
    "purchase_price": 0.99,
    "inventoryId": 42
  }
  ```
- `container_items` table exists but appears unused in application code

#### `container_items` (UNUSED)
```sql
CREATE TABLE IF NOT EXISTS container_items (
  id SERIAL PRIMARY KEY,
  container_id INTEGER REFERENCES containers(id) ON DELETE CASCADE,
  inventory_id INTEGER REFERENCES inventory(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1
);
```

**Issues:**
- Table is created but not used by application
- Only referenced in one sales-related check query
- Represents the correct relational design that should replace JSON blob

#### `sales`
```sql
CREATE TABLE IF NOT EXISTS sales (
  id SERIAL PRIMARY KEY,
  container_id INTEGER,                  -- ⚠️ NO FK CONSTRAINT
  decklist_id INTEGER,                   -- ⚠️ NO FK CONSTRAINT
  decklist_name VARCHAR(255),            -- ⚠️ DUPLICATE DATA
  sale_price DECIMAL(10,2),
  cost_basis DECIMAL(10,2),
  sold_date TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Issues:**
- `container_id` has no foreign key constraint (intentional - containers deleted after sale)
- `decklist_name` duplicates data from `decklists` table
- Missing `cost_basis` calculation/population

#### `settings`
```sql
CREATE TABLE IF NOT EXISTS settings (
  key VARCHAR(255) PRIMARY KEY,
  value TEXT
);
```

**Status:** Acceptable design

#### `usage_history`
```sql
CREATE TABLE IF NOT EXISTS usage_history (
  id SERIAL PRIMARY KEY,
  action VARCHAR(255) NOT NULL,
  details TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Status:** Acceptable design

#### `purchase_history`
```sql
CREATE TABLE IF NOT EXISTS purchase_history (
  id SERIAL PRIMARY KEY,
  inventory_id INTEGER REFERENCES inventory(id) ON DELETE RESTRICT,
  purchase_date TEXT NOT NULL,
  purchase_price REAL NOT NULL,
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Status:** Acceptable design, but could benefit from FK to `printings` table

---

## 2. Embedded Card Data Locations

### 2.1 Data Flow Analysis

```
Scryfall API → Frontend → Backend → Database
     ↓              ↓          ↓
  Card Data    Card Data   Card Data (duplicated in each table)
```

### 2.2 Embedded Card Data Matrix

| Location | Fields Stored | Storage Format | Issue |
|----------|---------------|----------------|-------|
| `inventory.name` | Card name | VARCHAR | Duplicated per row |
| `inventory.set` | Set code | VARCHAR | Duplicated per row |
| `inventory.set_name` | Set full name | VARCHAR | Duplicated per row |
| `inventory.image_url` | Card image URL | TEXT | Can change externally |
| `inventory.scryfall_id` | Scryfall UUID | VARCHAR | Not used as FK |
| `decklists.decklist` | Card names/qty | Plain TEXT | Requires parsing |
| `containers.cards[].name` | Card name | JSON | Duplicated from inventory |
| `containers.cards[].set` | Set code | JSON | Duplicated from inventory |
| `containers.cards[].set_name` | Set full name | JSON | Duplicated from inventory |
| `containers.cards[].purchase_price` | Price | JSON | Duplicated from inventory |
| `sales.decklist_name` | Deck name | VARCHAR | Duplicated from decklists |

### 2.3 Frontend Card Data Access

Cards accessed via:
- `item.name` / `item.set` (inventory)
- `card.name` / `card.set` (containers JSON)
- `card.cardName` / `card.setCode` (parsed decklists)
- Scryfall API calls for search/validation

---

## 3. Duplicate/Contradictory Row Analysis

### 3.1 Potential Duplicate Scenarios

1. **Same card name, different sets:**
   - "Lightning Bolt" (M21) vs "Lightning Bolt" (2X2) vs "Lightning Bolt" (LEB)
   - Each stored as separate inventory rows with repeated name

2. **Same card, container JSON vs inventory:**
   - Container JSON stores `{ name: "Sol Ring", set: "C21" }`
   - Inventory stores row with `name: "Sol Ring", set: "C21"`
   - If inventory row updated, container JSON becomes stale

3. **Decklist text vs actual cards:**
   - Decklist stores `"1 Solring"` (typo)
   - No validation against master card list
   - Cannot join to inventory without fuzzy matching

### 3.2 Risk Areas

| Scenario | Risk Level | Impact |
|----------|------------|--------|
| Container JSON out of sync with inventory | HIGH | Incorrect pricing, inventory counts |
| Decklist card names misspelled | MEDIUM | Import failures, missed matches |
| Same card different casing | LOW | `"Sol Ring"` vs `"sol ring"` |

---

## 4. Missing Indexes and FK Gaps

### 4.1 Missing Indexes

| Table | Column(s) | Query Pattern | Recommended Index |
|-------|-----------|---------------|-------------------|
| `inventory` | `name` | Lookup by card name | `CREATE INDEX idx_inventory_name ON inventory(LOWER(name))` |
| `inventory` | `set` | Lookup by set code | `CREATE INDEX idx_inventory_set ON inventory(UPPER(set))` |
| `inventory` | `name, set` | Combined lookup | `CREATE INDEX idx_inventory_name_set ON inventory(LOWER(name), UPPER(set))` |
| `containers` | `decklist_id` | FK lookup | Already indexed via FK |
| `sales` | `sold_date` | Date range queries | `CREATE INDEX idx_sales_sold_date ON sales(sold_date)` |
| `usage_history` | `created_at` | Recent activity | `CREATE INDEX idx_usage_created ON usage_history(created_at DESC)` |

### 4.2 Missing Foreign Keys

| Table | Column | Should Reference | Current State |
|-------|--------|------------------|---------------|
| `sales` | `container_id` | `containers(id)` | No FK (intentional) |
| `sales` | `decklist_id` | `decklists(id)` | No FK |
| `inventory` | `scryfall_id` | `cards(scryfall_id)` | Not implemented |

---

## 5. Live Schema Modification Scripts

> **Note:** Line numbers referenced below are accurate as of the audit date (2025-11-26) and may need to be re-verified before migration as the codebase evolves.

### 5.1 server.js Schema Modifications

The `initializeDatabase()` function in `server.js` (lines 60-174) performs ad-hoc schema modifications:

```javascript
// Line 79-80: Dynamic column additions
await pool.query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS image_url TEXT`);
await pool.query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS scryfall_id VARCHAR(255)`);

// Line 106-108: Dynamic column additions
await pool.query(`
  ALTER TABLE containers 
  ADD COLUMN IF NOT EXISTS cards JSONB DEFAULT '[]'
`);
```

**Issues:**
- Schema changes embedded in application code
- No migration tracking or version control
- Difficult to rollback changes
- No documentation of schema evolution

### 5.2 Recommended Migration Strategy

Replace ad-hoc schema modifications with:
1. Prisma migrations (preferred) OR
2. SQL migration files with version tracking
3. Document each migration in `migration.md`

---

## 6. JSON Blob vs Relational Table Analysis

### 6.1 Current State: containers.cards (JSON) vs container_items (Relational)

| Aspect | JSON Blob (containers.cards) | Relational (container_items) |
|--------|------------------------------|------------------------------|
| **Usage** | Active in codebase | Created but unused |
| **Data** | Embedded card details | References inventory ID |
| **Queries** | jsonb_array_elements() | Simple JOINs |
| **Updates** | Full JSON replacement | Row-level updates |
| **Integrity** | None | FK constraints |
| **Size** | Larger (embedded data) | Smaller (IDs only) |

### 6.2 Code Using JSON Blob

```javascript
// server.js line 854-860: Query using JSON blob
const containerResult = await pool.query(
  `SELECT COALESCE(SUM((card->>'quantity_used')::int), 0)::int as in_containers 
   FROM containers, jsonb_array_elements(cards) as card 
   WHERE card->>'inventoryId' = $1`,
  [String(item.id)]
);

// routes/containers.js line 147: Fetching containers with JSON
const result = await pool.query("SELECT *, COALESCE(cards, '[]'::jsonb) as cards FROM containers");
```

### 6.3 Recommendation

Migrate from JSON blob to `container_items` table:
1. Both structures exist, reducing migration risk
2. Use transaction to migrate data
3. Verify counts match before/after
4. Remove JSON blob after verification period

---

## 7. Example Ambiguous Mapping Cases (50 Examples)

The following scenarios would require manual review during migration:

### 7.1 Card Name Variations (Likely Same Card)

| Example | Reason for Ambiguity |
|---------|---------------------|
| "Sol Ring" vs "Sol ring" | Case difference |
| "Lightning Bolt" vs "Lightning bolt" | Case difference |
| "Llanowar Elves" vs "Llanowar elves" | Case difference |
| "Counterspell" vs "Counter Spell" | Spacing |
| "Serra Angel" vs "Serra angel" | Case difference |
| "Black Lotus" vs "Black lotus" | Case difference |
| "Mox Pearl" vs "Mox pearl" | Case difference |
| "Time Walk" vs "Time walk" | Case difference |
| "Ancestral Recall" vs "Ancestral recall" | Case difference |
| "Swords to Plowshares" vs "Swords To Plowshares" | Capitalization |

### 7.2 Set Code Variations (Likely Same Set)

| Example | Reason for Ambiguity |
|---------|---------------------|
| "M21" vs "m21" | Case difference |
| "2X2" vs "2x2" | Case difference |
| "MH2" vs "mh2" | Case difference |
| "CMD" vs "C13" | Commander editions |
| "LEA" vs "LEB" vs "2ED" | Alpha/Beta/Unlimited |
| "FNM" vs "PFNM" | Promo variations |
| "SLD" vs "SLU" | Secret Lair variations |
| "MYS1" vs "MYS" | Mystery Booster |
| "TSR" vs "TSB" | Time Spiral Remastered |
| "STA" vs "STX" | Strixhaven variants |

### 7.3 Multi-Printing Cards (Same Name, Different IDs)

| Card Name | Sets Found | Issue |
|-----------|-----------|-------|
| "Lightning Bolt" | M21, 2X2, LEB, A25, MM2, ... | 20+ printings |
| "Sol Ring" | C21, C20, C19, CMD, ... | 30+ printings |
| "Counterspell" | MH2, ICE, 5ED, 7ED, ... | 15+ printings |
| "Birds of Paradise" | M12, M11, RAV, 7ED, ... | 10+ printings |
| "Brainstorm" | C21, EMA, ICE, MMQ, ... | 15+ printings |
| "Path to Exile" | 2XM, E02, MD1, ... | 10+ printings |
| "Cultivate" | M21, C21, C20, ... | 15+ printings |
| "Arcane Signet" | C21, C20, ELD, ... | 5+ printings |
| "Command Tower" | C21, C20, C19, CMD, ... | 10+ printings |
| "Swiftfoot Boots" | C21, C20, A25, ... | 8+ printings |

### 7.4 Cards with Special Characters

| Example | Issue |
|---------|-------|
| "Æther Vial" vs "Aether Vial" | Unicode normalization |
| "Jötun Grunt" vs "Jotun Grunt" | Diacritics |
| "Déjà Vu" vs "Deja Vu" | Accents |
| "Fire // Ice" vs "Fire/Ice" | Split card syntax |
| "Hanweir, the Writhing Township" | Meld card naming |
| "Brisela, Voice of Nightmares" | Meld card naming |
| "Who // What // When // Where // Why" | Multi-split |

### 7.5 Inventory Duplicates (Require Consolidation Decision)

| Scenario | Decision Required |
|----------|-------------------|
| Same card name + set, different purchase dates | Merge or keep separate? |
| Same card name + set, different purchase prices | Weighted average? |
| Same card name + set, different reorder_types | Which type prevails? |
| Card in inventory AND in container JSON | Reconcile quantities |
| Card in decklist text not in inventory | Create or flag? |

### 7.6 Decklist Parsing Edge Cases

| Example Line | Parsing Issue |
|--------------|---------------|
| `"2 Lightning bolt"` | Lowercase card name |
| `"1 sol ring (C21)"` | Lowercase name, set in parens |
| `"3 Sol Ring - CMR"` | Alternate set separator |
| `"4x Lightning Bolt"` | "x" suffix on quantity |
| `"Lightning Bolt x2"` | Quantity at end |
| `"SB: 2 Tormod's Crypt"` | Sideboard prefix |
| `"2 Sol Ring [Commander 2021]"` | Full set name in brackets |
| `"Mountain"` | No quantity specified |
| `"// Sideboard"` | Comment line |
| `""` | Empty line |

---

## 8. Risk Assessment

### 8.1 Risk Matrix

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Data loss during migration | Medium | Critical | Transaction-based migration with rollback |
| Incorrect card mappings | High | Medium | Manual review queue for ambiguous cases |
| Performance degradation | Low | Medium | Add indexes, test query plans |
| Downtime during migration | Medium | Low | Migrate incrementally, maintain compatibility |
| Frontend breaking changes | Medium | Medium | Provide backward-compatible response wrappers |

### 8.2 Critical Success Factors

1. **No data loss:** All existing card data must be preserved
2. **Rollback capability:** Each migration step must be reversible
3. **Audit trail:** All mappings documented in CSV files
4. **Manual review queue:** Ambiguous mappings flagged, not auto-assigned
5. **Incremental deployment:** Phase rollout with testing at each stage

---

## 9. Recommendations Summary

### 9.1 Immediate Actions (Pre-Migration)

1. [ ] Create backup of all tables
2. [ ] Add missing indexes to current schema
3. [ ] Document current JSON blob structure
4. [ ] Create mapping validation scripts

### 9.2 Phase 2 Actions (Reference Tables)

1. [ ] Create `cards` table (master card catalog)
2. [ ] Create `printings` table (set-specific card variants)
3. [ ] Create `price_snapshots` table (price history)
4. [ ] Generate migration scripts with Prisma

### 9.3 Phase 3 Actions (Domain Migration)

1. [ ] Migrate `inventory` to use `printing_id`
2. [ ] Migrate `containers.cards` JSON to `container_items` rows
3. [ ] Add `printing_id` to `sales` and `purchase_history`
4. [ ] Generate mappings CSV for audit

### 9.4 Phase 4 Actions (Backend)

1. [ ] Update API endpoints to return joined data
2. [ ] Add card search/lookup endpoints
3. [ ] Implement caching layer
4. [ ] Create backward-compatible response wrappers

### 9.5 Phase 5 Actions (Frontend)

1. [ ] Update TypeScript types
2. [ ] Update data access patterns
3. [ ] Test all UI flows
4. [ ] Remove backward-compatibility wrappers

---

## Appendices

> **Note:** Line numbers referenced in this section are accurate as of the audit date (2025-11-26) and may need to be re-verified before migration as the codebase evolves.

### A. File References

| File | Line Numbers | Content |
|------|--------------|---------|
| `server.js` | 60-174 | Database initialization |
| `server.js` | 847-873 | Inventory GET with JSON query |
| `routes/inventory.js` | 1-299 | Inventory CRUD |
| `routes/containers.js` | 1-465 | Container CRUD with JSON |
| `routes/decklists.js` | 1-172 | Decklist CRUD |
| `routes/sales.js` | 1-104 | Sales queries |
| `src/App.jsx` | 96-235 | Price calculation (embedded card data) |
| `src/App.jsx` | 729-746 | Container loading (JSON extraction) |

### B. Query Patterns to Update

```sql
-- Current: JSON-based container query
SELECT COALESCE(SUM((card->>'quantity_used')::int), 0)::int 
FROM containers, jsonb_array_elements(cards) as card 
WHERE card->>'inventoryId' = $1

-- Target: Relational query
SELECT COALESCE(SUM(ci.quantity), 0)
FROM container_items ci
WHERE ci.inventory_id = $1
```

### C. Glossary

- **Card:** A unique Magic: The Gathering card identified by oracle_id
- **Printing:** A specific version of a card in a particular set
- **Container:** A physical grouping of cards (e.g., deck box)
- **Decklist:** A text definition of cards in a deck
- **COGS:** Cost of Goods Sold (purchase price of cards)

---

*End of Audit Report*
