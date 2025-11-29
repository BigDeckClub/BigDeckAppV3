# BigDeck.app - MTG Card Manager

## Overview
BigDeck.app is a production-ready Magic: The Gathering inventory management system. It enables users to track card inventory with location-based organization, create decklists, manage containers by location, import bulk orders, record sales, and monitor real-time market pricing from Scryfall and Card Kingdom.

## Current Status
✅ **PRODUCTION READY** - All core features implemented and optimized
- Multi-tab interface with Inventory, Decklists, Containers, Imports, Sales, and Analytics
- **NEW: Location-based inventory system** - Cards now tracked by physical location with shared location support
- **NEW: Location-based containers** - Containers organized by storage location instead of decklists
- Real-time pricing from Scryfall and Card Kingdom
- Responsive design with mobile-optimized bottom navigation
- PostgreSQL database with complete schema and API routes
- Zero authentication overhead - fully accessible without login

## Architecture
- **Frontend**: React 18 + Vite with Tailwind CSS, modern glassmorphism UI, cyan/teal color palette
- **Backend**: Express.js with PostgreSQL via native pg driver
- **Database**: PostgreSQL with complete inventory location tracking
- **Icons**: Lucide React
- **Pricing**: Scryfall (TCG) + Card Kingdom scraping + fallback support

## Recent Optimizations
- ✅ Added location and shared_location fields to inventory table
- ✅ Transformed containers system from decklist-based to location-based
- ✅ Added complete CRUD API endpoints for inventory (GET, POST, PUT, DELETE)
- ✅ Added complete CRUD API endpoints for containers (GET, POST, DELETE)
- ✅ Frontend location input fields with shared location checkbox
- ✅ Location display badges in inventory list
- ✅ Container creation now tied to physical storage locations
- Removed 15+ unused dependencies (Prisma, Passport, auth packages, testing libraries)
- Deleted unused utility files (apiClient.js, fetchCardPrices.js, priceUtils.js, api types)
- Removed all authentication infrastructure and dead code

## Core Features
1. **Inventory Tab** - Add/edit/delete cards with location tracking, quantity management, purchase history, real-time prices
2. **Decklists Tab** - Paste decklists, validate cards, calculate deck value, manage multiple decklists
3. **Containers Tab** - Create collection boxes within specific locations, organize cards by storage location (shelf, box, etc.)
4. **Imports Tab** - Create bulk import orders, track pending/completed imports, manage card lists
5. **Sales Tab** - Record sales, calculate profit/loss, view sales history
6. **Analytics Tab** - Inventory stats, reorder alerts, activity history, purchase tracking

## Locations Feature (NEW)
- **Location Field**: Every card in inventory has a location (e.g., "Shelf A", "Box 1", "Binder Top Shelf")
- **Shared Locations**: Mark locations as shared to indicate multi-user storage areas
- **Location Badges**: Visual indicators show location and shared status on each card
- **Container Organization**: Containers now represent collection boxes within specific locations
- **Location Dropdown**: Containers can only be created for locations that have inventory items

## Database Tables
- `inventory` - Card inventory with quantities, prices, images, **location, is_shared_location** (NEW)
- `decklists` - Saved decklists with card lists
- `containers` - Boxes/containers organized by **location** (decklist_id removed)
- `container_items` - Individual cards in containers
- `sales` - Sale records with COGS and profit tracking
- `imports` - Bulk import orders with status tracking
- `users` - User profiles (schema preserved for future multi-user)
- `sessions` - User session data (schema preserved)

## API Endpoints
**Inventory (NEW - Complete CRUD):**
- `GET /api/inventory` - Fetch all inventory items with locations
- `POST /api/inventory` - Add new card with location data
- `PUT /api/inventory/:id` - Update card (quantity, price, location, shared status)
- `DELETE /api/inventory/:id` - Remove card from inventory

**Containers (NEW - Updated for locations):**
- `GET /api/containers` - Fetch all containers organized by location
- `POST /api/containers` - Create container for specific location
- `DELETE /api/containers/:id` - Delete container

**Legacy Endpoints:**
- `GET/POST /api/decklists` - Decklist CRUD
- `PATCH /api/imports/:id/complete` - Mark import as done
- `POST /api/containers/:id/sell` - Record container sale
- `GET /api/prices/:cardName/:setCode` - Fetch market prices
- `GET /api/settings/reorder_thresholds` - Reorder threshold settings

## User Preferences
- No authentication layer required for MVP
- Prefer iterative development with focus on core functionality
- Value clean, well-structured code with clear patterns
- Mobile-first responsive design approach
- **Location-based organization** over decklist-based containers

## Project Structure
```
src/
  components/      - React components (Tabs, Modals, Cards)
  context/         - PriceCacheContext for pricing data
  hooks/           - useApi, useDebounce utilities
  utils/           - useDebounce hook
  App.jsx          - Main app container and state management
  main.jsx         - Entry point
  index.css        - Tailwind + custom styles

server/            - (Removed unused auth files)

server.js          - Express server with all API routes
package.json       - Dependencies (optimized)
```

## Next Steps for Production
1. Deploy to Replit with `npm run prod`
2. Configure PostgreSQL DATABASE_URL environment variable
3. Monitor pricing API calls and adjust rate limits if needed
4. Test location-based workflow: Add cards with different locations → Create containers for those locations
5. Prepare marketing materials highlighting real-time pricing and location tracking
6. Consider adding multi-user support (schema ready but not implemented)

## Deployment Notes
- App runs on port 3000 (Express) with Vite dev server on 5000
- Frontend served via ViteExpress with Vite dev middleware in dev mode
- Production: `npm run build && npm run start`
- All environment variables optional except DATABASE_URL for persistence

## Performance Metrics
- Lightweight bundle with only essential dependencies
- Price caching to minimize external API calls
- Rate limiting on price endpoints (100 req/min)
- Debounced search queries (300ms)
- Optimized React component structure with memoization
- Efficient location extraction from inventory for container creation

---
*Last updated: November 29, 2025*
*Locations feature fully implemented and ready for production*
