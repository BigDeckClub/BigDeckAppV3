-- Backup Tables Script
-- Purpose: Create backup copies of all tables before migration
-- 
-- INSTRUCTIONS: Before running this script, replace all instances of 
-- 'backup_YYYYMMDD' with the actual date (e.g., 'backup_20251127')
-- 
-- Usage: psql $DATABASE_URL -f migrate/scripts/01_backup_tables.sql

-- ============================================
-- Create backup schema
-- ============================================
CREATE SCHEMA IF NOT EXISTS backup_YYYYMMDD;

-- ============================================
-- Backup all affected tables
-- ============================================

-- Backup inventory
DROP TABLE IF EXISTS backup_YYYYMMDD.inventory;
CREATE TABLE backup_YYYYMMDD.inventory AS SELECT * FROM inventory;

-- Backup containers
DROP TABLE IF EXISTS backup_YYYYMMDD.containers;
CREATE TABLE backup_YYYYMMDD.containers AS SELECT * FROM containers;

-- Backup container_items
DROP TABLE IF EXISTS backup_YYYYMMDD.container_items;
CREATE TABLE backup_YYYYMMDD.container_items AS SELECT * FROM container_items;

-- Backup decklists
DROP TABLE IF EXISTS backup_YYYYMMDD.decklists;
CREATE TABLE backup_YYYYMMDD.decklists AS SELECT * FROM decklists;

-- Backup sales
DROP TABLE IF EXISTS backup_YYYYMMDD.sales;
CREATE TABLE backup_YYYYMMDD.sales AS SELECT * FROM sales;

-- Backup purchase_history
DROP TABLE IF EXISTS backup_YYYYMMDD.purchase_history;
CREATE TABLE backup_YYYYMMDD.purchase_history AS SELECT * FROM purchase_history;

-- Backup settings
DROP TABLE IF EXISTS backup_YYYYMMDD.settings;
CREATE TABLE backup_YYYYMMDD.settings AS SELECT * FROM settings;

-- Backup usage_history
DROP TABLE IF EXISTS backup_YYYYMMDD.usage_history;
CREATE TABLE backup_YYYYMMDD.usage_history AS SELECT * FROM usage_history;

-- ============================================
-- Verify row counts
-- ============================================
SELECT 'Backup verification:' as message;
SELECT 'inventory' as table_name, 
       (SELECT COUNT(*) FROM inventory) as original,
       (SELECT COUNT(*) FROM backup_YYYYMMDD.inventory) as backup
UNION ALL
SELECT 'containers',
       (SELECT COUNT(*) FROM containers),
       (SELECT COUNT(*) FROM backup_YYYYMMDD.containers)
UNION ALL
SELECT 'container_items',
       (SELECT COUNT(*) FROM container_items),
       (SELECT COUNT(*) FROM backup_YYYYMMDD.container_items)
UNION ALL
SELECT 'decklists',
       (SELECT COUNT(*) FROM decklists),
       (SELECT COUNT(*) FROM backup_YYYYMMDD.decklists)
UNION ALL
SELECT 'sales',
       (SELECT COUNT(*) FROM sales),
       (SELECT COUNT(*) FROM backup_YYYYMMDD.sales)
UNION ALL
SELECT 'purchase_history',
       (SELECT COUNT(*) FROM purchase_history),
       (SELECT COUNT(*) FROM backup_YYYYMMDD.purchase_history)
UNION ALL
SELECT 'settings',
       (SELECT COUNT(*) FROM settings),
       (SELECT COUNT(*) FROM backup_YYYYMMDD.settings)
UNION ALL
SELECT 'usage_history',
       (SELECT COUNT(*) FROM usage_history),
       (SELECT COUNT(*) FROM backup_YYYYMMDD.usage_history);

-- ============================================
-- Backup complete
-- ============================================
SELECT 'Backup complete! Schema: backup_YYYYMMDD' as status;
