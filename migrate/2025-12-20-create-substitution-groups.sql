-- Migration: Create Substitution Groups tables
-- Created: 2025-12-20
-- Description: Adds tables for managing card substitution groups
--              Cards in the same group share demand pressure for IPS calculations

-- Substitution groups table
CREATE TABLE IF NOT EXISTS substitution_groups (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_substitution_groups_name ON substitution_groups(name);

-- Junction table linking cards to substitution groups (many-to-many)
-- A card can only belong to one substitution group at a time
CREATE TABLE IF NOT EXISTS substitution_group_cards (
  id SERIAL PRIMARY KEY,
  group_id INTEGER NOT NULL REFERENCES substitution_groups(id) ON DELETE CASCADE,
  scryfall_id VARCHAR(255) NOT NULL,
  card_name VARCHAR(255), -- Denormalized for convenience
  added_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(scryfall_id) -- A card can only be in one group
);

CREATE INDEX IF NOT EXISTS idx_substitution_group_cards_group_id ON substitution_group_cards(group_id);
CREATE INDEX IF NOT EXISTS idx_substitution_group_cards_scryfall_id ON substitution_group_cards(scryfall_id);

-- End of migration
