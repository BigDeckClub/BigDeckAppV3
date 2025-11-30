# BigDeck.app - MTG Card Manager

## Overview
BigDeck.app is a streamlined Magic: The Gathering inventory management system. It enables users to track card inventory organized into custom folders with real-time market pricing from Scryfall. Clean, modern interface with no authentication required.

## Current Status
✅ **PRODUCTION READY** - Lean, focused core features
- **Two-tab interface**: Inventory (view/organize cards) and Imports (add cards)
- **Folder-based organization** - Custom card grouping (Modern, Standard, Casual, etc.)
- **Real-time pricing** - Scryfall API integration for TCG market data
- **Responsive design** - Mobile-optimized bottom navigation, desktop tabs
- **PostgreSQL backend** - Clean schema with only active tables
- **Zero authentication** - Fully accessible without login
- **Cleaned codebase** - No dead code, only essential features

## Architecture
- **Frontend**: React 18 + Vite with Tailwind CSS (CDN), glassmorphism UI, cyan/teal palette
- **Backend**: Express.js + PostgreSQL (native pg driver)
- **Database**: PostgreSQL with folder-based card tracking + deck reservation system
- **Icons**: Lucide React (minimal icon set)
- **Search**: Debounced Scryfall search (300ms) with smart ranking algorithm
- **Pricing**: Real-time market prices from Scryfall API
- **Two-tier Decks**: Decklists (templates) vs Deck Instances (inventory folders with reservations)

## Latest Changes (November 30, 2025 - Sell Functionality Complete)
- ✅ **Sell buttons on folders & decks** - Green "Sell Folder" buttons below each folder, green dollar icon on deck headers
- ✅ **Sell Modal with profit calculation** - Input sell price, auto-calculates profit (sell - purchase)
- ✅ **Sales History tracking** - Complete sales log with date, item type, cost, sell price, profit
- ✅ **Sales Dashboard** - New "Sales" tab shows total sales, revenue, and profit summary
- ✅ **Persistent sales data** - All sales recorded in `sales_history` database table
- ✅ **Auto-delete on deck sale** - Selling a deck removes it from inventory and frees all reserved cards
- ✅ **Profit tracking** - Color-coded profit display (green for gains, red for losses)

## Core Features

### Sales Tab (NEW)
- **Sales History Dashboard** - View all recorded sales with summary stats
- **Total Sales Count** - Number of items sold
- **Total Revenue** - Sum of all sell prices
- **Total Profit** - Net profit from all sales (color-coded)
- **Sales Table** - Detailed record with item name, type, cost, sell price, profit, date

### Inventory Tab
- View all cards organized by folder
- Folder thumbnails showing card count
- Expandable folders with browsable cards
- Quick folder creation
- Edit quantity/price per card
- Delete individual entries
- **🎴 Decks section** - Sidebar showing all deck instances with reserved/missing card counts
- Click deck to view full details (reserved cards with prices, missing cards, total cost)
- **Sell Deck button** (green $) - Open sell modal, enter price, track profit
- Reoptimize decks to recalculate cheapest card reservations
- Release decks to return all cards to inventory
- **Folder Sell buttons** - "Sell Folder" button under each folder header
  - Auto-calculates folder cost (all cards in folder × quantity × purchase price)
  - Opens modal to input sell price and track profit
  - Records sale without removing inventory (folders are organization, not deletion)

### Decks Tab (Decklists - Templates)
- Create decklists from Archidekt URLs
- Import decklists from text (one per line)
- Manually build decklists card by card
- **Copy to Deck** button - Creates inventory deck instance by reserving cheapest available cards

### Imports Tab
- Search and add cards from Scryfall
- Set selection per card
- Folder assignment
- Quantity and purchase price tracking
- Bulk import orders with status tracking
- Import completion marking

## Database Schema
```sql
-- Active tables:
inventory (id, user_id, name, set, set_name, quantity, purchase_price, purchase_date, reorder_type, image_url, scryfall_id, folder)
imports (id, user_id, title, description, card_list, source, status, created_at, updated_at)
decks (id, name, format, description, cards, decklist_id, is_deck_instance, created_at, updated_at)
deck_reservations (id, deck_id, inventory_item_id, quantity_reserved, original_folder, reserved_at)
deck_missing_cards (id, deck_id, card_name, set_code, quantity_needed)
sales_history (id, item_type, item_id, item_name, purchase_price, sell_price, profit, quantity, created_at)

-- Legacy tables preserved (for schema compatibility):
users, sessions, decklists, containers, sales
```

## API Endpoints (Production)

### Sales
- `POST /api/sales` - Record a sale (item_type, item_name, purchase_price, sell_price, quantity)
- `GET /api/sales` - Fetch all sales history with profit calculations

### Inventory
- `GET /api/inventory` - Fetch all cards
- `POST /api/inventory` - Add new card
- `PUT /api/inventory/:id` - Update card
- `DELETE /api/inventory/:id` - Remove card

### Imports
- `GET /api/imports` - Fetch all import orders
- `POST /api/imports` - Create import order
- `PATCH /api/imports/:id/complete` - Mark import complete
- `PATCH /api/imports/:id` - Update import order
- `DELETE /api/imports/:id` - Delete import order

### Decks (Decklists - Templates)
- `GET /api/decks` - Fetch all decklists
- `POST /api/decks` - Create new decklist
- `PUT /api/decks/:id` - Update decklist
- `DELETE /api/decks/:id` - Delete decklist

### Deck Instances (Inventory Decks)
- `GET /api/deck-instances` - Fetch all deck instances with reservation counts
- `GET /api/deck-instances/:id/details` - Get full details (reservations, missing cards, cost)
- `POST /api/decks/:id/copy-to-inventory` - Create deck instance by copying decklist
- `POST /api/deck-instances/:id/add-card` - Add card from inventory to deck
- `DELETE /api/deck-instances/:id/remove-card` - Remove card from deck
- `POST /api/deck-instances/:id/reoptimize` - Recalculate cheapest reservations
- `POST /api/deck-instances/:id/release` - Delete deck and free all cards
- `PUT /api/deck-instances/:id` - Update deck metadata

### Pricing
- `GET /api/prices/:cardName/:setCode` - Fetch market prices

## Project Structure (Cleaned)
```
src/
  components/
    InventoryTab.jsx       - View/manage cards by folder + Sell buttons
    ImportTab.jsx          - Add cards & import orders
    DeckTab.jsx            - Create & manage decklists
    AnalyticsTab.jsx       - Inventory analytics
    SalesHistoryTab.jsx    - Sales dashboard & history (NEW)
    SellModal.jsx          - Sell price input & profit calculation (NEW)
    ErrorBoundary.jsx      - Error handling
    inventory/
      CardGroup.jsx        - Card display component
  context/
    PriceCacheContext.jsx  - Price data caching
  hooks/
    useApi.js              - API helper functions
  utils/
    useDebounce.js         - Search debouncing
  App.jsx                  - Main app & state management
  main.jsx                 - React entry point
  index.css                - Tailwind + custom styles

server.js                  - Express server & API routes
package.json               - Dependencies (optimized)
replit.md                  - This file
```

## Key Implementation Details

### Two-Tier Deck System
- **Decklists** (templates): Live in Decks tab, never interact with inventory directly, can have multiple instances
- **Deck Instances** (active decks): Created by copying decklists, live as special entries in Inventory sidebar
- Reservations: When a deck is created, system finds cheapest available cards and reserves them
- Missing Cards: Tracked when deck needs cards not in inventory
- Reoptimize: Re-runs cheapest card selection algorithm when inventory changes
- Release: Deletes deck and frees all reserved cards back to inventory

### Cheapest-First Algorithm
- For each card in decklist, finds matching inventory items by name (case-insensitive)
- Sorts by purchase_price ascending (treats NULL as very expensive)
- Reserves quantities from cheapest sources first
- Tracks which folder each reserved card came from

## Dependencies
**Frontend:**
- react, react-dom (18)
- vite, @vitejs/plugin-react
- lucide-react (icons)
- prop-types (validation)

**Backend:**
- express, express-rate-limit, helmet, cors, body-parser
- pg (PostgreSQL)
- dotenv
- vite-express (server integration)

## Deployment
- **Local Development**: `npm run dev` (ViteExpress with Vite on port 5000)
- **Production Build**: `npm run build && npm run start`
- **Port**: 5000 (unified Express + Vite frontend server)
- **No environment variables required** for basic use
- **API tested and working** - Returns real inventory data

## Performance
- Lightweight bundle - only essential dependencies
- Price caching - minimizes Scryfall API calls
- Debounced search (300ms) - reduces API pressure
- Optimized React components - minimal re-renders
- Mobile-responsive - bottom nav on mobile, tabs on desktop
- Fast startup - cleaned codebase with no dead code

## File Count
- **Components**: 5 active (InventoryTab, ImportTab, DeckTab, AnalyticsTab, ErrorBoundary)
- **Total src files**: ~15 production files
- **No unused imports** or dead code

## Workflow Notes
- Deck instances refresh on-demand (create/delete events) instead of polling
- Event-driven updates keep Inventory tab sidebar in sync with Decks tab changes
- Callback system passes refresh function from InventoryTab to DeckTab

---
*Last updated: November 30, 2025*
*Status: Sell functionality fully implemented and tested*
*Features: Two-tier decks + Search + Sell tracking + Sales history dashboard*
*Ready for production deployment*
