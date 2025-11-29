# BigDeck.app - MTG Card Manager

## Overview
BigDeck.app is a streamlined Magic: The Gathering inventory management system. It enables users to track card inventory organized into custom folders. The app uses real-time market pricing from Scryfall and features a clean, modern interface with no authentication required.

## Current Status
✅ **PRODUCTION READY** - Clean, focused core features
- Two-tab interface: **Inventory** (view/organize cards by folder) and **Imports** (add cards)
- Folder-based card organization
- Real-time pricing from Scryfall
- Responsive design with mobile-optimized bottom navigation
- PostgreSQL database with complete schema and API routes
- Zero authentication overhead - fully accessible without login
- Clean, optimized codebase with no dead code

## Architecture
- **Frontend**: React 18 + Vite with Tailwind CSS, glassmorphism UI, cyan/teal color palette
- **Backend**: Express.js with PostgreSQL via native pg driver
- **Database**: PostgreSQL with folder-based card tracking
- **Icons**: Lucide React
- **Pricing**: Scryfall API for real-time TCG pricing

## Latest Changes (November 29, 2025)
- ✅ Replaced location feature with folder feature - unified organization
- ✅ Added folder dropdown to "Add Card" section in Imports
- ✅ Folder thumbnails grid with expandable view
- ✅ "Create New Folder" button to organize cards
- ✅ Removed unused packages (@types/memoizee, memoizee)
- ✅ Cleaned up unused imports
- ✅ Streamlined component code

## Core Features
1. **Inventory Tab** - View all cards organized by folder with:
   - Folder thumbnails with card count
   - Expandable folders to browse cards
   - Total quantity per card
   - Average purchase price (last 60 days)
   - Edit/delete individual entries
   - Uncategorized section for cards without folders

2. **Imports Tab** - Add cards to inventory with:
   - Search Scryfall for cards
   - Select set and folder
   - Specify quantity and purchase price
   - Create bulk import orders with status tracking

## Database Tables
- `inventory` - Card inventory with quantities, prices, images, folder
- `imports` - Bulk import orders with status tracking
- `decklists` - Saved decklists (legacy, not actively used)
- `containers` - Collection boxes (legacy, not actively used)
- `sales` - Sale records (legacy)
- `users` - User profiles (schema preserved)
- `sessions` - User session data (schema preserved)

## API Endpoints
**Inventory:**
- `GET /api/inventory` - Fetch all cards
- `POST /api/inventory` - Add new card
- `PUT /api/inventory/:id` - Update card
- `DELETE /api/inventory/:id` - Remove card

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
- Folder-based card organization (e.g., "Modern", "Standard", "Casual")
- Mobile-first responsive design
- Scryfall search integration for card discovery

## Project Structure
```
src/
  components/
    InventoryTab.jsx       - View inventory, manage folders
    ImportTab.jsx          - Add cards & import orders
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

## Performance
- Lightweight bundle with only essential dependencies
- Price caching to minimize external API calls
- Debounced card search (300ms)
- Optimized React component structure
- Mobile-responsive design
- Clean codebase with no dead code or unused packages

---
*Last updated: November 29, 2025*
*Status: Production-ready, clean and optimized*
