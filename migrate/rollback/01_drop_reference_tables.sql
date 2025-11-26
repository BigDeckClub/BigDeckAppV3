-- Rollback: Drop Reference Tables
-- Purpose: Revert the reference tables migration
-- Date: 2025-11-26
-- Related: prisma/migrations/20251126_create_reference_tables.sql

-- ============================================
-- 1. Remove foreign key columns from existing tables
-- ============================================

-- Remove printing_id from inventory
ALTER TABLE inventory DROP COLUMN IF EXISTS printing_id;

-- Remove printing_id from container_items
ALTER TABLE container_items DROP COLUMN IF EXISTS printing_id;

-- ============================================
-- 2. Drop new tables (in reverse dependency order)
-- ============================================

-- Drop deck_items (depends on printings, decklists)
DROP TABLE IF EXISTS deck_items CASCADE;

-- Drop price_snapshots (depends on printings)
DROP TABLE IF EXISTS price_snapshots CASCADE;

-- Drop printings (depends on cards)
DROP TABLE IF EXISTS printings CASCADE;

-- Drop cards (no dependencies)
DROP TABLE IF EXISTS cards CASCADE;

-- ============================================
-- 3. Drop new indexes (if tables still exist)
-- ============================================

-- These will be dropped automatically with tables, but include for completeness
DROP INDEX IF EXISTS idx_cards_normalized_name;
DROP INDEX IF EXISTS idx_cards_name;
DROP INDEX IF EXISTS idx_printings_card_id;
DROP INDEX IF EXISTS idx_printings_set_code;
DROP INDEX IF EXISTS idx_printings_set_collector;
DROP INDEX IF EXISTS idx_price_snapshots_printing_id;
DROP INDEX IF EXISTS idx_price_snapshots_date;
DROP INDEX IF EXISTS idx_deck_items_decklist_id;
DROP INDEX IF EXISTS idx_deck_items_printing_id;
DROP INDEX IF EXISTS idx_inventory_printing_id;
DROP INDEX IF EXISTS idx_container_items_printing_id;

-- ============================================
-- Rollback complete
-- ============================================
