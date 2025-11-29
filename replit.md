# BigDeck.app - MTG Card Manager

## Overview
BigDeck.app is a production-ready Magic: The Gathering inventory management system. It enables users to track card inventory, create decklists, manage containers, import bulk orders, record sales, and monitor real-time market pricing from TCG Player and Card Kingdom.

## Current Status
✅ **PRODUCTION READY** - All core features implemented and optimized
- Multi-tab interface with Inventory, Decklists, Containers, Imports, Sales, and Analytics
- Real-time pricing from Scryfall and Card Kingdom
- Responsive design with mobile-optimized bottom navigation
- PostgreSQL database with complete schema and API routes
- Zero authentication overhead - fully accessible without login

## Architecture
- **Frontend**: React 18 + Vite with Tailwind CSS, modern glassmorphism UI, cyan/teal color palette
- **Backend**: Express.js with PostgreSQL via native pg driver
- **Database**: PostgreSQL with user-isolated data structure (prepared for multi-user when needed)
- **Icons**: Lucide React
- **Pricing**: Scryfall (TCG) + Card Kingdom scraping + fallback support

## Recent Optimizations
- Removed 15+ unused dependencies (Prisma, Passport, auth packages, testing libraries)
- Deleted unused utility files (apiClient.js, fetchCardPrices.js, priceUtils.js, api types)
- Removed all authentication infrastructure and dead code
- Cleaned up unused imports and dead endpoints
- Streamlined package.json to only essential dependencies
- Removed test endpoint and MTGJSON service references

## Core Features
1. **Inventory Tab** - Add/edit/delete cards, track quantities, search Scryfall, display market prices
2. **Decklists Tab** - Paste decklists, validate cards, calculate deck value, manage multiple decklists
3. **Containers Tab** - Build containers from decklists, allocate inventory, track value
4. **Imports Tab** - Create bulk import orders, track pending/completed imports, manage card lists
5. **Sales Tab** - Record sales, calculate profit/loss, view sales history
6. **Analytics Tab** - Inventory stats, reorder alerts, activity history, purchase tracking

## Database Tables
- `inventory` - Card inventory with quantities, prices, images
- `decklists` - Saved decklists with card lists
- `containers` - Boxes/containers with allocated cards
- `sales` - Sale records with COGS and profit tracking
- `imports` - Bulk import orders with status tracking
- `users` - User profiles (schema preserved for future multi-user)
- `sessions` - User session data (schema preserved)

## API Endpoints
- `GET/POST /api/inventory` - Inventory management
- `GET/POST /api/decklists` - Decklist CRUD
- `GET/POST /api/containers` - Container management
- `GET/POST /api/imports` - Import order management
- `PATCH /api/imports/:id/complete` - Mark import as done
- `POST /api/containers/:id/sell` - Record container sale
- `GET /api/prices/:cardName/:setCode` - Fetch market prices
- `GET /api/settings/reorder_thresholds` - Reorder threshold settings

## User Preferences
- No authentication layer required for MVP
- Prefer iterative development with focus on core functionality
- Value clean, well-structured code with clear patterns
- Mobile-first responsive design approach

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
4. Prepare marketing materials highlighting real-time pricing
5. Consider adding multi-user support (schema ready but not implemented)

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

---
*Last updated: November 29, 2025*
