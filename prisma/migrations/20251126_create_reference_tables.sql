-- Migration: Create Reference Tables
-- Purpose: Add cards, printings, price_snapshots, and deck_items tables
-- Date: 2025-11-26
-- Rollback: migrate/rollback/01_drop_reference_tables.sql

-- ============================================
-- 1. Create cards table (master card catalog)
-- ============================================
CREATE TABLE IF NOT EXISTS cards (
  id SERIAL PRIMARY KEY,
  oracle_id VARCHAR(36) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  normalized_name VARCHAR(255) NOT NULL,
  type_line VARCHAR(255),
  mana_cost VARCHAR(100),
  cmc DECIMAL(4, 1),
  colors TEXT[] DEFAULT '{}',
  color_identity TEXT[] DEFAULT '{}',
  keywords TEXT[] DEFAULT '{}',
  oracle_text TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for cards table
CREATE INDEX IF NOT EXISTS idx_cards_normalized_name ON cards(normalized_name);
CREATE INDEX IF NOT EXISTS idx_cards_name ON cards(name);

-- ============================================
-- 2. Create printings table (set-specific cards)
-- ============================================
CREATE TABLE IF NOT EXISTS printings (
  id SERIAL PRIMARY KEY,
  card_id INTEGER NOT NULL REFERENCES cards(id),
  scryfall_id VARCHAR(36) NOT NULL UNIQUE,
  set_code VARCHAR(10) NOT NULL,
  set_name VARCHAR(255) NOT NULL,
  collector_number VARCHAR(20),
  rarity VARCHAR(20),
  finish VARCHAR(20),
  image_uri_small TEXT,
  image_uri_normal TEXT,
  image_uri_large TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for printings table
CREATE INDEX IF NOT EXISTS idx_printings_card_id ON printings(card_id);
CREATE INDEX IF NOT EXISTS idx_printings_set_code ON printings(set_code);
CREATE INDEX IF NOT EXISTS idx_printings_set_collector ON printings(set_code, collector_number);

-- ============================================
-- 3. Create price_snapshots table (price history)
-- ============================================
CREATE TABLE IF NOT EXISTS price_snapshots (
  id SERIAL PRIMARY KEY,
  printing_id INTEGER NOT NULL REFERENCES printings(id),
  price_tcg DECIMAL(10, 2),
  price_ck DECIMAL(10, 2),
  price_scryfall DECIMAL(10, 2),
  snapshot_date TIMESTAMP DEFAULT NOW()
);

-- Indexes for price_snapshots table
CREATE INDEX IF NOT EXISTS idx_price_snapshots_printing_id ON price_snapshots(printing_id);
CREATE INDEX IF NOT EXISTS idx_price_snapshots_date ON price_snapshots(snapshot_date);

-- ============================================
-- 4. Create deck_items table (parsed decklists)
-- ============================================
CREATE TABLE IF NOT EXISTS deck_items (
  id SERIAL PRIMARY KEY,
  decklist_id INTEGER NOT NULL REFERENCES decklists(id) ON DELETE CASCADE,
  printing_id INTEGER REFERENCES printings(id),
  card_name VARCHAR(255),
  set_code VARCHAR(10),
  quantity INTEGER DEFAULT 1,
  is_sideboard BOOLEAN DEFAULT FALSE
);

-- Index for deck_items table
CREATE INDEX IF NOT EXISTS idx_deck_items_decklist_id ON deck_items(decklist_id);
CREATE INDEX IF NOT EXISTS idx_deck_items_printing_id ON deck_items(printing_id);

-- ============================================
-- 5. Add printing_id to existing tables
-- ============================================

-- Add printing_id to inventory (nullable during migration)
ALTER TABLE inventory 
ADD COLUMN IF NOT EXISTS printing_id INTEGER REFERENCES printings(id);

CREATE INDEX IF NOT EXISTS idx_inventory_printing_id ON inventory(printing_id);

-- Add printing_id to container_items (nullable during migration)
ALTER TABLE container_items 
ADD COLUMN IF NOT EXISTS printing_id INTEGER REFERENCES printings(id);

CREATE INDEX IF NOT EXISTS idx_container_items_printing_id ON container_items(printing_id);

-- ============================================
-- 6. Add missing indexes to existing tables
-- ============================================

-- Index on inventory.name for lookups
CREATE INDEX IF NOT EXISTS idx_inventory_name ON inventory(name);

-- Index on inventory.set for filtering
CREATE INDEX IF NOT EXISTS idx_inventory_set ON inventory(set);

-- Index on sales.sold_date for reporting
CREATE INDEX IF NOT EXISTS idx_sales_sold_date ON sales(sold_date);

-- Index on usage_history.created_at for recent activity
CREATE INDEX IF NOT EXISTS idx_usage_history_created_at ON usage_history(created_at DESC);

-- ============================================
-- Migration complete
-- ============================================
