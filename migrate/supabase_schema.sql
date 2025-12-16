-- Supabase schema for BigDeckAppV3
-- Generated from server/db/init.js
-- Run this in the Supabase SQL Editor (Project -> SQL Editor)

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  profile_image_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  sid VARCHAR(255) PRIMARY KEY,
  sess JSONB NOT NULL,
  expire TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_expire ON sessions(expire);

-- Purchase lots (needed before inventory references lot_id)
CREATE TABLE IF NOT EXISTS purchase_lots (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  total_cost REAL,
  card_count INTEGER,
  per_card_cost REAL,
  purchase_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Inventory table (finalized columns)
CREATE TABLE IF NOT EXISTS inventory (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  set VARCHAR(20),
  set_name VARCHAR(255),
  quantity INTEGER DEFAULT 1,
  purchase_price REAL,
  purchase_date TEXT,
  reorder_type VARCHAR(20) DEFAULT 'Normal',
  image_url TEXT,
  scryfall_id VARCHAR(255),
  folder VARCHAR(255) DEFAULT 'Uncategorized',
  low_inventory_alert BOOLEAN DEFAULT false,
  low_inventory_threshold INTEGER DEFAULT 0,
  foil BOOLEAN DEFAULT false,
  quality VARCHAR(10) DEFAULT 'NM',
  lot_id INTEGER REFERENCES purchase_lots(id) ON DELETE SET NULL,
  lot_name TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_inventory_name_lower ON inventory(LOWER(TRIM(name)));
CREATE INDEX IF NOT EXISTS idx_inventory_user_id ON inventory(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_folder ON inventory(folder);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
  key VARCHAR(255) PRIMARY KEY,
  value TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Decklists table
CREATE TABLE IF NOT EXISTS decklists (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  decklist TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Containers table
CREATE TABLE IF NOT EXISTS containers (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  cards JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Container items
CREATE TABLE IF NOT EXISTS container_items (
  id SERIAL PRIMARY KEY,
  container_id INTEGER REFERENCES containers(id) ON DELETE CASCADE,
  inventory_id INTEGER REFERENCES inventory(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Sales
CREATE TABLE IF NOT EXISTS sales (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
  container_id INTEGER REFERENCES containers(id) ON DELETE SET NULL,
  sale_price REAL,
  sale_date TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Imports
CREATE TABLE IF NOT EXISTS imports (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  card_list TEXT,
  source VARCHAR(50),
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Usage history
CREATE TABLE IF NOT EXISTS usage_history (
  id SERIAL PRIMARY KEY,
  action VARCHAR(255) NOT NULL,
  details TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Purchase history
CREATE TABLE IF NOT EXISTS purchase_history (
  id SERIAL PRIMARY KEY,
  inventory_id INTEGER REFERENCES inventory(id) ON DELETE RESTRICT,
  purchase_date TEXT NOT NULL,
  purchase_price REAL NOT NULL,
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Decks
CREATE TABLE IF NOT EXISTS decks (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  format VARCHAR(50) DEFAULT 'Casual',
  description TEXT,
  cards JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_deck_instance BOOLEAN DEFAULT FALSE,
  archidekt_url TEXT,
  last_synced TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_decks_user_id ON decks(user_id);
CREATE INDEX IF NOT EXISTS idx_decks_is_instance ON decks(is_deck_instance);

-- Deck reservations
CREATE TABLE IF NOT EXISTS deck_reservations (
  id SERIAL PRIMARY KEY,
  deck_id INTEGER REFERENCES decks(id) ON DELETE CASCADE,
  inventory_item_id INTEGER REFERENCES inventory(id) ON DELETE CASCADE,
  quantity_reserved INTEGER NOT NULL,
  original_folder VARCHAR(255),
  reserved_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_deck_reservations_deck_id ON deck_reservations(deck_id);
CREATE INDEX IF NOT EXISTS idx_deck_reservations_inventory_id ON deck_reservations(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_deck_reservations_composite ON deck_reservations(deck_id, inventory_item_id);

-- Deck missing cards
CREATE TABLE IF NOT EXISTS deck_missing_cards (
  id SERIAL PRIMARY KEY,
  deck_id INTEGER REFERENCES decks(id) ON DELETE CASCADE,
  card_name VARCHAR(255) NOT NULL,
  set_code VARCHAR(20),
  quantity_needed INTEGER NOT NULL
);

-- Folders
CREATE TABLE IF NOT EXISTS folders (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- Inventory transactions
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id SERIAL PRIMARY KEY,
  card_name VARCHAR(255) NOT NULL,
  transaction_type VARCHAR(20) NOT NULL,
  quantity INTEGER DEFAULT 1,
  purchase_price REAL,
  sale_price REAL,
  transaction_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  user_id VARCHAR(255)
);

-- Sales history
CREATE TABLE IF NOT EXISTS sales_history (
  id SERIAL PRIMARY KEY,
  item_type VARCHAR(50) NOT NULL,
  item_id INTEGER,
  item_name VARCHAR(255) NOT NULL,
  purchase_price REAL NOT NULL,
  sell_price REAL NOT NULL,
  profit REAL,
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  user_id VARCHAR(255)
);

-- Change history
CREATE TABLE IF NOT EXISTS change_history (
  id SERIAL PRIMARY KEY,
  card_id INTEGER REFERENCES inventory(id) ON DELETE SET NULL,
  card_name VARCHAR(255) NOT NULL,
  field_changed VARCHAR(50) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_at TIMESTAMP DEFAULT NOW(),
  user_id VARCHAR(255)
);

-- Audit log
CREATE TABLE IF NOT EXISTS audit_log (
  id SERIAL PRIMARY KEY,
  action_type VARCHAR(50) NOT NULL,
  description TEXT,
  entity_type VARCHAR(50),
  entity_id INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  user_id VARCHAR(255)
);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action_type ON audit_log(action_type);

-- Activity feed
CREATE TABLE IF NOT EXISTS activity_feed (
  id SERIAL PRIMARY KEY,
  activity_type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  entity_type VARCHAR(50),
  entity_id INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  user_id VARCHAR(255)
);
CREATE INDEX IF NOT EXISTS idx_activity_feed_created_at ON activity_feed(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_feed_activity_type ON activity_feed(activity_type);

-- End of schema
