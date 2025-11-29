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
- **Database**: PostgreSQL with folder-based card tracking
- **Icons**: Lucide React (minimal icon set)
- **Search**: Debounced Scryfall search (300ms) with smart ranking algorithm
- **Pricing**: Real-time market prices from Scryfall API

## Latest Changes (November 29, 2025 - Final Cleanup)
- ✅ **Removed all non-core features** - Settings, analytics, containers, decklists, sales
- ✅ **Deleted unused components** - 8 unused component files removed
- ✅ **Removed location/is_shared_location** - Complete folder-based migration
- ✅ **Cleaned API endpoints** - Only inventory, imports, and pricing remain
- ✅ **Streamlined imports** - Removed unused packages and icons
- ✅ **Repository organized** - Clean src/ structure with only active files

## Core Features

### Inventory Tab
- View all cards organized by folder
- Folder thumbnails showing card count
- Expandable folders with browsable cards
- Quick folder creation
- Edit quantity/price per card
- Delete individual entries
- Uncategorized section for unorganized cards

### Imports Tab
- Search and add cards from Scryfall
- Set selection per card
- Folder assignment
- Quantity and purchase price tracking
- Bulk import orders with status tracking
- Import completion marking

## Database Schema
```sql
-- Active tables only:
inventory (id, user_id, name, set, set_name, quantity, purchase_price, purchase_date, reorder_type, image_url, scryfall_id, folder)
imports (id, user_id, title, description, card_list, source, status, created_at, updated_at)

-- Legacy tables preserved (for schema compatibility):
users, sessions, decklists, containers, sales
```

## API Endpoints (Production)

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

### Pricing
- `GET /api/prices/:cardName/:setCode` - Fetch market prices

## Project Structure (Cleaned)
```
src/
  components/
    InventoryTab.jsx       - View/manage cards by folder
    ImportTab.jsx          - Add cards & import orders
    ErrorBoundary.jsx      - Error handling
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

## Removed Features
- ❌ Settings panel (reorder thresholds)
- ❌ Usage history tracking
- ❌ Container/box management
- ❌ Decklist management
- ❌ Sales tracking
- ❌ Sell modal & animations
- ❌ Analytics dashboard
- ❌ Location-based organization (replaced with folders)

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
- **Local Development**: `npm run dev` (server on 3000, frontend on 5000)
- **Production Build**: `npm run build && npm run start`
- **Port**: 3000 (Express), 5000 (frontend proxy)
- **No environment variables required** for basic use

## Performance
- Lightweight bundle - only essential dependencies
- Price caching - minimizes Scryfall API calls
- Debounced search (300ms) - reduces API pressure
- Optimized React components - minimal re-renders
- Mobile-responsive - bottom nav on mobile, tabs on desktop
- Fast startup - cleaned codebase with no dead code

## File Count
- **Components**: 3 active (InventoryTab, ImportTab, ErrorBoundary)
- **Total src files**: ~10 production files
- **No unused imports** or dead code

---
*Last updated: November 29, 2025*
*Status: Production-ready, fully optimized, and cleaned*
*Ready for deployment*
