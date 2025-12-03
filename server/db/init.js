import { pool } from './pool.js';

// ========== DATABASE INITIALIZATION ==========
export async function initializeDatabase() {
  try {
    // Users table (for Replit Auth)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        email VARCHAR(255) UNIQUE,
        first_name VARCHAR(255),
        last_name VARCHAR(255),
        profile_image_url TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Sessions table (for Replit Auth)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        sid VARCHAR(255) PRIMARY KEY,
        sess JSONB NOT NULL,
        expire TIMESTAMP NOT NULL
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_sessions_expire ON sessions(expire)`).catch(() => {});

    // Inventory table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS inventory (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255),
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
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS image_url TEXT`).catch(() => {});
    await pool.query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS scryfall_id VARCHAR(255)`).catch(() => {});
    await pool.query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE`).catch(() => {});
    await pool.query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS folder VARCHAR(255) DEFAULT 'Uncategorized'`).catch(() => {});
    await pool.query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS low_inventory_alert BOOLEAN DEFAULT false`).catch(() => {});
    await pool.query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS low_inventory_threshold INTEGER DEFAULT 0`).catch(() => {});
    await pool.query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS foil BOOLEAN DEFAULT false`).catch(() => {});
    await pool.query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS quality VARCHAR(10) DEFAULT 'NM'`).catch(() => {});
    await pool.query(`ALTER TABLE inventory DROP COLUMN IF EXISTS location`).catch(() => {});
    await pool.query(`ALTER TABLE inventory DROP COLUMN IF EXISTS is_shared_location`).catch(() => {});

    // Settings table (Step 7: Store user settings in backend)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS settings (
        key VARCHAR(255) PRIMARY KEY,
        value TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Decklists table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS decklists (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        decklist TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`ALTER TABLE decklists ADD COLUMN IF NOT EXISTS user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE`).catch(() => {});

    // Containers table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS containers (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        cards JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`ALTER TABLE containers ADD COLUMN IF NOT EXISTS user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE`).catch(() => {});
    await pool.query(`ALTER TABLE containers ADD COLUMN IF NOT EXISTS cards JSONB DEFAULT '[]'`).catch(() => {});
    await pool.query(`ALTER TABLE containers DROP COLUMN IF EXISTS decklist_id`).catch(() => {});
    await pool.query(`ALTER TABLE containers DROP COLUMN IF EXISTS location`).catch(() => {});

    // Container items table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS container_items (
        id SERIAL PRIMARY KEY,
        container_id INTEGER REFERENCES containers(id) ON DELETE CASCADE,
        inventory_id INTEGER REFERENCES inventory(id) ON DELETE CASCADE,
        quantity INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Sales table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sales (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
        container_id INTEGER REFERENCES containers(id) ON DELETE SET NULL,
        sale_price REAL,
        sale_date TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`ALTER TABLE sales ADD COLUMN IF NOT EXISTS user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE`).catch(() => {});

    // Imports table
    await pool.query(`
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
      )
    `);
    await pool.query(`ALTER TABLE imports ADD COLUMN IF NOT EXISTS user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE`).catch(() => {});
    await pool.query(`ALTER TABLE imports ADD COLUMN IF NOT EXISTS card_list TEXT`).catch(() => {});
    await pool.query(`ALTER TABLE imports ADD COLUMN IF NOT EXISTS source VARCHAR(50)`).catch(() => {});
    await pool.query(`ALTER TABLE imports ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending'`).catch(() => {});
    await pool.query(`ALTER TABLE imports ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP`).catch(() => {});

    // Usage history table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS usage_history (
        id SERIAL PRIMARY KEY,
        action VARCHAR(255) NOT NULL,
        details TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Purchase history table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS purchase_history (
        id SERIAL PRIMARY KEY,
        inventory_id INTEGER REFERENCES inventory(id) ON DELETE RESTRICT,
        purchase_date TEXT NOT NULL,
        purchase_price REAL NOT NULL,
        quantity INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Purchase lots table - for tracking bulk purchases/packs
    await pool.query(`
      CREATE TABLE IF NOT EXISTS purchase_lots (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        total_cost REAL,
        card_count INTEGER,
        per_card_cost REAL,
        purchase_date DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Add lot tracking columns to inventory table
    await pool.query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS lot_id INTEGER REFERENCES purchase_lots(id) ON DELETE SET NULL`).catch(() => {});
    await pool.query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS lot_name TEXT`).catch(() => {});

    // Decks table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS decks (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        format VARCHAR(50) DEFAULT 'Casual',
        description TEXT,
        cards JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`ALTER TABLE decks ADD COLUMN IF NOT EXISTS format VARCHAR(50) DEFAULT 'Casual'`).catch(() => {});
    await pool.query(`ALTER TABLE decks ADD COLUMN IF NOT EXISTS cards JSONB DEFAULT '[]'`).catch(() => {});
    await pool.query(`ALTER TABLE decks ADD COLUMN IF NOT EXISTS description TEXT`).catch(() => {});
    await pool.query(`ALTER TABLE decks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP`).catch(() => {});
    await pool.query(`ALTER TABLE decks ADD COLUMN IF NOT EXISTS decklist_id INTEGER`).catch(() => {});
    await pool.query(`ALTER TABLE decks ADD COLUMN IF NOT EXISTS is_deck_instance BOOLEAN DEFAULT FALSE`).catch(() => {});

    // Deck reservations table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS deck_reservations (
        id SERIAL PRIMARY KEY,
        deck_id INTEGER REFERENCES decks(id) ON DELETE CASCADE,
        inventory_item_id INTEGER REFERENCES inventory(id) ON DELETE CASCADE,
        quantity_reserved INTEGER NOT NULL,
        original_folder VARCHAR(255),
        reserved_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Deck missing cards table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS deck_missing_cards (
        id SERIAL PRIMARY KEY,
        deck_id INTEGER REFERENCES decks(id) ON DELETE CASCADE,
        card_name VARCHAR(255) NOT NULL,
        set_code VARCHAR(20),
        quantity_needed INTEGER NOT NULL
      )
    `);

    // Folders table - server-side storage
    await pool.query(`
      CREATE TABLE IF NOT EXISTS folders (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Inventory transactions table - tracks purchases and sales for analytics
    await pool.query(`
      CREATE TABLE IF NOT EXISTS inventory_transactions (
        id SERIAL PRIMARY KEY,
        card_name VARCHAR(255) NOT NULL,
        transaction_type VARCHAR(20) NOT NULL,
        quantity INTEGER DEFAULT 1,
        purchase_price REAL,
        sale_price REAL,
        transaction_date DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Sales history table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sales_history (
        id SERIAL PRIMARY KEY,
        item_type VARCHAR(50) NOT NULL,
        item_id INTEGER,
        item_name VARCHAR(255) NOT NULL,
        purchase_price REAL NOT NULL,
        sell_price REAL NOT NULL,
        profit REAL,
        quantity INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Change history table - tracks card edits
    await pool.query(`
      CREATE TABLE IF NOT EXISTS change_history (
        id SERIAL PRIMARY KEY,
        card_id INTEGER REFERENCES inventory(id) ON DELETE SET NULL,
        card_name VARCHAR(255) NOT NULL,
        field_changed VARCHAR(50) NOT NULL,
        old_value TEXT,
        new_value TEXT,
        changed_at TIMESTAMP DEFAULT NOW(),
        user_id VARCHAR(255)
      )
    `);

    // Audit log table - tracks major system actions
    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id SERIAL PRIMARY KEY,
        action_type VARCHAR(50) NOT NULL,
        description TEXT,
        entity_type VARCHAR(50),
        entity_id INTEGER,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW(),
        user_id VARCHAR(255)
      )
    `);

    // Activity feed table - tracks recent user activity
    await pool.query(`
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
      )
    `);

    // ========== PERFORMANCE INDEXES ==========
    // Note: .catch() logs all errors for debugging - CREATE INDEX IF NOT EXISTS rarely fails
    // Index for case-insensitive card name lookups
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_inventory_name_lower 
      ON inventory(LOWER(TRIM(name)));
    `).catch(() => {});

    // Index for deck reservation lookups by deck
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_deck_reservations_deck_id 
      ON deck_reservations(deck_id);
    `).catch(() => {});

    // Index for deck reservation lookups by inventory item
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_deck_reservations_inventory_id 
      ON deck_reservations(inventory_item_id);
    `).catch(() => {});

    // Index for inventory folder filtering
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_inventory_folder 
      ON inventory(folder);
    `).catch(() => {});

    // Index for deck instances lookup
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_decks_is_instance 
      ON decks(is_deck_instance);
    `).catch(() => {});

    // Indexes for change history
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_change_history_card_id 
      ON change_history(card_id);
    `).catch(() => {});
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_change_history_changed_at 
      ON change_history(changed_at DESC);
    `).catch(() => {});

    // Indexes for audit log
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_log_created_at 
      ON audit_log(created_at DESC);
    `).catch(() => {});
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_log_action_type 
      ON audit_log(action_type);
    `).catch(() => {});

    // Indexes for activity feed
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_activity_feed_created_at 
      ON activity_feed(created_at DESC);
    `).catch(() => {});
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_activity_feed_activity_type 
      ON activity_feed(activity_type);
    `).catch(() => {});

    console.log('[DB] ✓ Database initialized successfully');
  } catch (err) {
    console.error('[DB] ✗ Failed to initialize database:', err);
  }
}
