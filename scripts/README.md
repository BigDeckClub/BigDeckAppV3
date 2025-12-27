# Scripts Directory

This directory contains utility scripts for development, testing, and maintenance.

## Directory Structure

### `/debug/`
Debugging and diagnostic scripts for troubleshooting issues:
- `debug_autocomplete.mjs` - Test autocomplete functionality
- `debug_commander_lookup.mjs` - Test commander card lookups
- `debug_fuzzy.mjs` - Test fuzzy search functionality
- `debug_scryfall_search.mjs` - Test Scryfall API integration
- `debug_scraper_dom.mjs` - Test DOM scraping functionality

### `/db/`
Database and migration scripts:
- `migrate_add_ck_price.mjs` - Add CardKingdom price data
- `populate_ck_prices.mjs` - Populate CardKingdom prices
- `run_cleanup.js` - Database cleanup utilities

### `/test/`
Testing and validation scripts:
- `check-gemini.mjs` - Test Gemini AI integration
- `list-models.mjs` - List available AI models
- `list-openai-models.mjs` - List OpenAI models
- `test-ai-generate-debug.mjs` - Debug AI generation
- `test-ai-route.js` - Test AI routes
- `test-gemini-direct.mjs` - Direct Gemini API test
- `test-profitability.mjs` - Test profitability calculations
- `test-routes.mjs` - Test API routes
- `test-server-generate.mjs` - Test server generation
- `test_api_fetch.mjs` - Test API fetching
- `verify_seed.js` - Verify database seeding

### `/utils/`
Utility and helper scripts:
- `estimate_ai_cost.mjs` - Estimate AI usage costs
- `query_ebay_logs.mjs` - Query eBay API logs

### `/api/`
API integration and testing scripts:
- `seed_avatar_inventory.js` - Seed Avatar inventory data
- `sniff_seller_api.mjs` - Test seller API endpoints
- `sniff_tcg_api.mjs` - Test TCGPlayer API endpoints

## Usage

Most scripts can be run directly with Node:
```bash
node scripts/debug/debug_fuzzy.mjs
node scripts/test/test-routes.mjs
```

Some scripts require environment variables to be set in `.env`.
