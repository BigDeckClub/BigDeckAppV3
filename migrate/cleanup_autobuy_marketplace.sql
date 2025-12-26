-- Drop Autobuy Tables
DROP TABLE IF EXISTS autobuy_metrics CASCADE;
DROP TABLE IF EXISTS autobuy_run_items CASCADE;
DROP TABLE IF EXISTS autobuy_runs CASCADE;

-- Drop Substitution Group Tables
DROP TABLE IF EXISTS substitution_group_cards CASCADE;
DROP TABLE IF EXISTS substitution_groups CASCADE;

-- Clean up any related sequences if they weren't automatically dropped (CASCADE usually handles SERIALs owned by table)
