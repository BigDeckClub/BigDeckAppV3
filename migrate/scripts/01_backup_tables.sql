-- Backup Tables Script
-- Purpose: Create backup copies of all tables before migration
-- Date: 2025-11-26
-- Usage: psql $DATABASE_URL -f migrate/scripts/01_backup_tables.sql

-- ============================================
-- Create backup schema
-- ============================================
CREATE SCHEMA IF NOT EXISTS backup_20251126;

-- ============================================
-- Backup all affected tables
-- ============================================

-- Backup inventory
DROP TABLE IF EXISTS backup_20251126.inventory;
CREATE TABLE backup_20251126.inventory AS SELECT * FROM inventory;

-- Backup containers
DROP TABLE IF EXISTS backup_20251126.containers;
CREATE TABLE backup_20251126.containers AS SELECT * FROM containers;

-- Backup container_items
DROP TABLE IF EXISTS backup_20251126.container_items;
CREATE TABLE backup_20251126.container_items AS SELECT * FROM container_items;

-- Backup decklists
DROP TABLE IF EXISTS backup_20251126.decklists;
CREATE TABLE backup_20251126.decklists AS SELECT * FROM decklists;

-- Backup sales
DROP TABLE IF EXISTS backup_20251126.sales;
CREATE TABLE backup_20251126.sales AS SELECT * FROM sales;

-- Backup purchase_history
DROP TABLE IF EXISTS backup_20251126.purchase_history;
CREATE TABLE backup_20251126.purchase_history AS SELECT * FROM purchase_history;

-- Backup settings
DROP TABLE IF EXISTS backup_20251126.settings;
CREATE TABLE backup_20251126.settings AS SELECT * FROM settings;

-- Backup usage_history
DROP TABLE IF EXISTS backup_20251126.usage_history;
CREATE TABLE backup_20251126.usage_history AS SELECT * FROM usage_history;

-- ============================================
-- Verify row counts
-- ============================================
SELECT 'Backup verification:' as message;
SELECT 'inventory' as table_name, 
       (SELECT COUNT(*) FROM inventory) as original,
       (SELECT COUNT(*) FROM backup_20251126.inventory) as backup
UNION ALL
SELECT 'containers',
       (SELECT COUNT(*) FROM containers),
       (SELECT COUNT(*) FROM backup_20251126.containers)
UNION ALL
SELECT 'container_items',
       (SELECT COUNT(*) FROM container_items),
       (SELECT COUNT(*) FROM backup_20251126.container_items)
UNION ALL
SELECT 'decklists',
       (SELECT COUNT(*) FROM decklists),
       (SELECT COUNT(*) FROM backup_20251126.decklists)
UNION ALL
SELECT 'sales',
       (SELECT COUNT(*) FROM sales),
       (SELECT COUNT(*) FROM backup_20251126.sales)
UNION ALL
SELECT 'purchase_history',
       (SELECT COUNT(*) FROM purchase_history),
       (SELECT COUNT(*) FROM backup_20251126.purchase_history)
UNION ALL
SELECT 'settings',
       (SELECT COUNT(*) FROM settings),
       (SELECT COUNT(*) FROM backup_20251126.settings)
UNION ALL
SELECT 'usage_history',
       (SELECT COUNT(*) FROM usage_history),
       (SELECT COUNT(*) FROM backup_20251126.usage_history);

-- ============================================
-- Backup complete
-- ============================================
SELECT 'Backup complete! Schema: backup_20251126' as status;
