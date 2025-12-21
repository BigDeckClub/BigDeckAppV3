-- Migration: Create Autobuy Analytics tables
-- Created: 2025-12-21
-- Description: Adds tables for tracking autobuy predictions vs actuals
--              Enables learning loop for IPS weight tuning

-- Autobuy runs table - tracks each optimizer execution
CREATE TABLE IF NOT EXISTS autobuy_runs (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  predicted_total REAL NOT NULL,
  actual_total REAL,
  status VARCHAR(50) DEFAULT 'pending',
  -- status: pending, purchased, partially_purchased, cancelled
  completed_at TIMESTAMP,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_autobuy_runs_created_at ON autobuy_runs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_autobuy_runs_status ON autobuy_runs(status);

-- Autobuy run items table - individual card predictions per run
CREATE TABLE IF NOT EXISTS autobuy_run_items (
  id SERIAL PRIMARY KEY,
  run_id INTEGER NOT NULL REFERENCES autobuy_runs(id) ON DELETE CASCADE,
  card_id VARCHAR(255) NOT NULL, -- scryfall_id
  card_name VARCHAR(255),
  predicted_price REAL NOT NULL,
  actual_price REAL, -- NULL until purchased
  quantity INTEGER NOT NULL DEFAULT 1,
  seller_id VARCHAR(255),
  marketplace VARCHAR(50),
  was_purchased BOOLEAN DEFAULT FALSE,
  purchased_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_autobuy_run_items_run_id ON autobuy_run_items(run_id);
CREATE INDEX IF NOT EXISTS idx_autobuy_run_items_card_id ON autobuy_run_items(card_id);
CREATE INDEX IF NOT EXISTS idx_autobuy_run_items_seller_id ON autobuy_run_items(seller_id);

-- Autobuy metrics table - historical metrics for analysis
CREATE TABLE IF NOT EXISTS autobuy_metrics (
  id SERIAL PRIMARY KEY,
  card_id VARCHAR(255), -- NULL for global metrics
  metric_type VARCHAR(100) NOT NULL,
  -- metric_type: ips_weight, prediction_accuracy, sell_through_rate, profit_margin
  value REAL NOT NULL,
  metadata JSONB DEFAULT '{}',
  recorded_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_autobuy_metrics_card_id ON autobuy_metrics(card_id);
CREATE INDEX IF NOT EXISTS idx_autobuy_metrics_type ON autobuy_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_autobuy_metrics_recorded_at ON autobuy_metrics(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_autobuy_metrics_card_type ON autobuy_metrics(card_id, metric_type);

-- End of migration
