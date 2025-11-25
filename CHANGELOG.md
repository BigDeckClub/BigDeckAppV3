# Changelog

All notable changes to this project will be documented in this file.

## [1.0.1] - 2025-11-25

### Fixed
- **Critical: Unified pricing cache system** - All tabs (Inventory, Decklists, Containers) now share a single PriceCacheContext instance for consistent, real-time pricing
- **Decklist pricing N/A bug** - Fixed prop name mismatch in DecklistCardPrice component (cardName/setCode → name/set) that caused empty card names
- **Container pricing bypass** - Refactored `calculateContainerMarketPrices()` to use unified `getPrice()` instead of direct backend API calls
- **Pricing timing bug** - Implemented request deduplication and fixed async timing to ensure cache writes only occur after backend responds (prevents N/A placeholders)
- **Provider scoping issue** - Moved PriceCacheProvider to main.jsx root level to eliminate separate cache instances per component tree

### Changed
- Pricing pipeline now fully unified: Component → PriceCacheContext → fetchCardPrices.js → Backend → Cache → Display
- All cache keys standardized to format: `lowercase-cardname|UPPERCASE-SETCODE`
- Removed temporary debug instrumentation for production-ready code

### Verified
- Lightning Bolt (M11): TCG $1.07 / Card Kingdom $2.29 ✓
- Sol Ring (EOC): TCG $1.25 / Card Kingdom $2.29 ✓
- Swamp (SPM): TCG $0.07 / Card Kingdom $0.35 ✓
- All API endpoints returning correct real prices
- Request deduplication preventing duplicate backend calls

## [1.0.0] - 2025-11-24

### Added
- Initial release with full MTG Card Manager functionality
- Inventory management with card tracking and market pricing
- Decklist creation and valuation
- Container management with automatic inventory allocation
- Sales tracking with COGS/profit calculation
- Analytics dashboard with performance metrics
- Modern teal/slate UI theme with Tailwind CSS
- Search optimization with 300ms debouncing (60-80% API reduction)
- PostgreSQL database integration via Replit

### Features
- Scryfall API integration for card data
- Card Kingdom pricing via MTG Goldfish scraping
- Decklist template creation without inventory requirements
- Physical container building with automatic inventory deallocation
- Sales history tracking
- Market price comparison (TCG vs Card Kingdom)
- Automatic container deletion when sold
