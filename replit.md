# BigDeck.app - MTG Card Manager

## Overview
BigDeck.app is a streamlined Magic: The Gathering inventory management system. It enables users to track card inventory with location-based organization and manage bulk import orders. The app uses real-time market pricing from Scryfall and features a clean, modern interface with no authentication required.

## Current Status
✅ **PRODUCTION READY** - Streamlined core features fully implemented
- Two-tab interface: **Inventory** (view/edit cards) and **Imports** (add cards + manage orders)
- Location-based inventory system with shared location support
- Real-time pricing from Scryfall
- Responsive design with mobile-optimized bottom navigation
- PostgreSQL database with complete schema and API routes
- Zero authentication overhead - fully accessible without login

## Architecture
- **Frontend**: React 18 + Vite with Tailwind CSS, modern glassmorphism UI, cyan/teal color palette
- **Backend**: Express.js with PostgreSQL via native pg driver
- **Database**: PostgreSQL with inventory location tracking
- **Icons**: Lucide React
- **Pricing**: Scryfall API for real-time TCG pricing

## Latest Changes (November 29, 2025)
- ✅ Removed unused tabs (Decklists, Containers, Sales, Analytics) - simplified to 2-tab interface
- ✅ Moved "Add Card" feature from Inventory tab to Imports tab
- ✅ Cleaned up 40+ lines of unused imports, state variables, and functions
- ✅ Removed SellModal and all related dead code
- ✅ Fixed all syntax errors and JSX warnings
- ✅ Optimized component rendering with proper React keys

## Core Features
1. **Inventory Tab** - View all cards organized by name with:
   - Total quantity per card
   - Available copies (not in containers)
   - Cards in containers
   - Average purchase price (last 60 days)
   - Edit/delete individual entries
   - Expandable card groups

2. **Imports Tab** - Centralized card management with:
   - Add card to inventory (search Scryfall, select set, enter quantity/price/location)
   - Create bulk import orders (paste card lists, track status)
   - Mark orders as complete
   - Delete orders

## Database Tables
- `inventory` - Card inventory with quantities, prices, images, location, is_shared_location
- `imports` - Bulk import orders with status tracking
- `decklists` - Saved decklists (legacy, not actively used)
- `containers` - Collection boxes organized by location (legacy, not actively used)
- `container_items` - Cards in containers (legacy)
- `sales` - Sale records (legacy)
- `users` - User profiles (schema preserved)
- `sessions` - User session data (schema preserved)

## API Endpoints
**Inventory:**
- `GET /api/inventory` - Fetch all cards with locations
- `POST /api/inventory` - Add new card with location data
- `PUT /api/inventory/:id` - Update card (quantity, price, location, shared status)
- `DELETE /api/inventory/:id` - Remove card from inventory

**Imports:**
- `GET /api/imports` - Fetch all import orders
- `POST /api/imports` - Create new import order
- `PATCH /api/imports/:id/complete` - Mark import as done
- `DELETE /api/imports/:id` - Delete import order

**Pricing:**
- `GET /api/prices/:cardName/:setCode` - Fetch market prices

## User Preferences
- No authentication layer - fully open access
- Clean, streamlined two-tab interface for focused workflow
- Location-based card organization (e.g., "Shelf A", "Box 1")
- Mobile-first responsive design
- Scryfall search integration for card discovery

## Project Structure
```
src/
  components/
    InventoryTab.jsx       - View inventory, edit/delete cards
    ImportTab.jsx          - Add cards & manage import orders
    SettingsPanel.jsx      - Settings modal
    PriceCacheContext.jsx   - Price caching
    DecklistCardPrice.jsx   - Market price display
    ErrorBoundary.jsx      - Error handling
  context/
    PriceCacheContext.jsx  - Price data caching
  hooks/
    useApi.js              - API utility functions
  utils/
    useDebounce.js         - Debounced search
  App.jsx                  - Main app & state management
  main.jsx                 - Entry point
  index.css                - Tailwind + custom styles

server.js                  - Express server with all routes
package.json               - Dependencies (optimized)
```

## Deployment
- App runs on port 3000 (Express) with Vite on port 5000
- Frontend served via ViteExpress
- Production: `npm run build && npm run start`
- No special environment variables required for basic use
- Optional: Set DATABASE_URL for persistent storage

## Performance
- Lightweight bundle with only essential dependencies
- Price caching to minimize external API calls
- Debounced card search (300ms)
- Optimized React component structure
- Mobile-responsive design

---
*Last updated: November 29, 2025 - 2:10 PM*
*Status: Production-ready, streamlined 2-tab interface*
