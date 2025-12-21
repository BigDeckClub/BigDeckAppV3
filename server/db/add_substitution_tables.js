
import { pool } from './pool.js';

async function runMigration() {
    try {
        console.log('Running migration: add substitution_groups tables...');

        // substitution_groups table
        await pool.query(`
      CREATE TABLE IF NOT EXISTS substitution_groups (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

        // substitution_group_cards table
        await pool.query(`
      CREATE TABLE IF NOT EXISTS substitution_group_cards (
        id SERIAL PRIMARY KEY,
        group_id INTEGER REFERENCES substitution_groups(id) ON DELETE CASCADE,
        scryfall_id VARCHAR(255) NOT NULL,
        card_name VARCHAR(255),
        added_at TIMESTAMP DEFAULT NOW()
      )
    `);

        // Indexes
        await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_substitution_group_cards_group_id 
        ON substitution_group_cards(group_id);
    `);

        await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_substitution_group_cards_scryfall_id 
        ON substitution_group_cards(scryfall_id);
    `);

        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

runMigration();
