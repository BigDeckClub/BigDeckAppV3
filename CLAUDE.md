# CLAUDE.md - AI Context for BigDeckAppV3

This file provides comprehensive context for Claude AI when working with this codebase.

## Project Overview

BigDeckAppV3 is a React-based MTG (Magic: The Gathering) card inventory management application that helps users track their card collection, manage decks, and monitor prices.

- **Repository:** BigDeckClub/BigDeckAppV3
- **Type:** Full-stack web application

---

## Tech Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18 | UI framework (functional components with hooks) |
| Vite | 5 | Build tool and bundler |
| TailwindCSS | 3 | Utility-first CSS framework |
| Lucide React | - | Icon library |
| PropTypes | - | Runtime type checking |
| react-window | - | Virtualized list rendering |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Express | 5 | Node.js web framework |
| PostgreSQL (pg) | - | Database |
| Supabase | - | Authentication and database services |
| Helmet | - | Security middleware |
| express-rate-limit | - | API rate limiting |
| compression | - | Response compression |

### Testing
| Technology | Version | Purpose |
|------------|---------|---------|
| Vitest | - | Test runner |
| Testing Library (React & Jest-DOM) | - | Component testing |
| jsdom | - | DOM environment for tests |

---

## Project Structure

```
BigDeckAppV3/
├── src/
│   ├── App.jsx                 # Main application component
│   ├── main.jsx                # Application entry point
│   ├── index.css               # Global styles (TailwindCSS)
│   ├── components/             # React components
│   │   ├── decks/              # Deck-related components
│   │   ├── inventory/          # Inventory-related components
│   │   ├── rapid-entry/        # Quick card entry components
│   │   ├── settings/           # Settings components
│   │   └── ui/                 # Reusable UI components
│   ├── hooks/                  # Custom React hooks
│   ├── utils/                  # Utility functions
│   ├── context/                # React context providers
│   ├── constants/              # Application constants
│   ├── config/                 # Configuration files
│   └── __tests__/              # Test files
├── server/
│   ├── db/                     # Database utilities
│   ├── middleware/             # Express middleware
│   ├── routes/                 # API route handlers
│   ├── utils/                  # Server utilities
│   └── mtgjsonPriceService.js  # Price data service
├── public/                     # Static assets
├── migrate/                    # Database migrations
├── server.js                   # Express server entry point
├── vite.config.js              # Vite configuration
├── tailwind.config.js          # TailwindCSS configuration
└── Dockerfile                  # Container configuration
```

---

## Core Components Documentation

### Main Application Tabs

| Component | File | Description |
|-----------|------|-------------|
| InventoryTab | `InventoryTab.jsx` | Card collection management and browsing |
| DeckTab | `DeckTab.jsx` | Deck building and management |
| ImportTab | `ImportTab.jsx` | Data import interface |
| AnalyticsTab | `AnalyticsTab.jsx` | Collection statistics and insights |
| SalesHistoryTab | `SalesHistoryTab.jsx` | Sales tracking and history |
| SettingsTab | `SettingsTab.jsx` | User preferences and configuration |
| ChangeLogTab | `ChangeLogTab.jsx` | Application changelog display |

### UI & Navigation

| Component | File | Description |
|-----------|------|-------------|
| Navigation | `Navigation.jsx` | Main navigation bar |
| LoginForm | `LoginForm.jsx` | Authentication form |
| LogoutButton | `LogoutButton.jsx` | Logout functionality |
| UserDropdown | `UserDropdown.jsx` | User menu dropdown |
| ToastContainer | `ToastContainer.jsx` | Notification system |
| ConfirmDialog | `ConfirmDialog.jsx` | Confirmation modals |
| TutorialModal | `TutorialModal.jsx` | Onboarding tutorial |

### Utility Components

| Component | File | Description |
|-----------|------|-------------|
| ErrorBoundary | `ErrorBoundary.jsx` | Error handling wrapper |
| ErrorBoundaryWithRetry | `ErrorBoundaryWithRetry.jsx` | Error handling with retry option |
| LoadingStates | `LoadingStates.jsx` | Loading indicators |
| TabLoadingSpinner | `TabLoadingSpinner.jsx` | Tab-specific loading spinner |
| OfflineBanner | `OfflineBanner.jsx` | Offline status notification |
| VirtualizedCardList | `VirtualizedCardList.jsx` | Performance-optimized card list using react-window |
| ActivityFeed | `ActivityFeed.jsx` | Recent activity display |
| AuditLog | `AuditLog.jsx` | Action history logging |
| SellModal | `SellModal.jsx` | Card selling interface |
| FileImportSection | `FileImportSection.jsx` | File upload and import handling |

---

## Custom Hooks

| Hook | File | Description |
|------|------|-------------|
| useApi | `useApi.js` | Generic API request handling |
| useAuthFetch | `useAuthFetch.js` | Authenticated API requests |
| useInventoryState | `useInventoryState.js` | Inventory state management |
| useInventoryOperations | `useInventoryOperations.js` | Inventory CRUD operations |
| useDeckOperations | `useDeckOperations.js` | Deck CRUD operations |
| useDeckReservations | `useDeckReservations.js` | Card reservation for decks |
| useFolderOperations | `useFolderOperations.js` | Folder organization operations |
| useCardSearch | `useCardSearch.js` | Card search functionality |
| useFileImport | `useFileImport.js` | File import processing |
| useArchidektImport | `useArchidektImport.js` | Archidekt deck import |
| useRapidEntry | `useRapidEntry.js` | Quick card entry logic |
| useThresholdSettings | `useThresholdSettings.js` | Price threshold configuration |
| useOnlineStatus | `useOnlineStatus.js` | Network connectivity detection |

---

## Context Providers

| Context | File | Description |
|---------|------|-------------|
| AuthContext | `AuthContext.jsx` | Authentication state management |
| ToastContext | `ToastContext.jsx` | Toast notification system |
| ConfirmContext | `ConfirmContext.jsx` | Confirmation dialog management |
| PriceCacheContext | `PriceCacheContext.jsx` | Card price caching |

---

## Utility Functions

| Utility | File | Description |
|---------|------|-------------|
| apiClient | `apiClient.js` | HTTP client wrapper |
| cardHelpers | `cardHelpers.js` | Card data manipulation helpers |
| csvTemplates | `csvTemplates.js` | CSV export/import templates |
| decklistParser | `decklistParser.js` | Deck list text parsing |
| scryfallApi | `scryfallApi.js` | Scryfall API integration |
| searchScoring | `searchScoring.js` | Search result ranking |
| thresholdCalculator | `thresholdCalculator.js` | Price threshold calculations |
| popularCards | `popularCards.js` | Popular card suggestions |
| useDebounce | `useDebounce.js` | Debounce utility hook |

---

## CRITICAL: Data Model Notes

### Card Objects - Mixed Data Types

Card objects may have `set` as either a string OR an object. **Always handle both formats:**

```javascript
// set can be a string like "MH3" 
// OR an object like:
{
  mtgoCode: "...",
  editioncode: "...",
  editiondate: "...",
  editionname: "...",
  editiontype: "..."
}
```

### Safe Set Name Extraction Pattern

**ALWAYS use this pattern when displaying set names:**

```javascript
const getSetDisplayName = (set) => {
  if (!set) return 'Unknown';
  if (typeof set === 'string') return set;
  return set.editionname || set.editioncode || 'Unknown';
};
```

---

## Best Practices for Claude

### When Making Changes

1. **Check existing patterns** in similar components before adding new code
2. **Maintain consistent code style** with the rest of the project
3. **Add PropTypes** for any new props
4. **Use existing hooks and context providers** instead of creating new state management
5. **Follow the established file organization** structure

### When Debugging

1. Check if the issue relates to **mixed data types** (especially `card.set`)
2. Verify **optional chaining** is used for nested property access
3. Ensure arrays have **fallback empty arrays** before mapping
4. Check console for **runtime errors**

### When Adding New Features

1. Place components in the appropriate subdirectory under `src/components/`
2. Create custom hooks for reusable logic in `src/hooks/`
3. Use existing context providers (Auth, Toast, Confirm, PriceCache)
4. Follow the established component structure pattern
5. Add comprehensive PropTypes

---

## Performance Considerations

1. **Virtualized Lists** - Use react-window for lists with many items (see `VirtualizedCardList.jsx`)
2. **Memoization** - Use `useMemo` for expensive computations
3. **Callback Stability** - Use `useCallback` for functions passed as props
4. **Component Memoization** - Use `memo()` for components that re-render frequently with same props

---

## Code Style Guidelines

- Use **functional components with hooks** (NEVER class components)
- Use **named exports** for components
- Always include **PropTypes** for component props
- Use **camelCase** for variables and functions
- Use **PascalCase** for component names
- Prefer **destructuring** for props and state
- Use **optional chaining** (`?.`) when accessing potentially undefined properties
- Use **nullish coalescing** (`??`) for default values

### Component Template

```jsx
import React, { memo } from 'react';
import PropTypes from 'prop-types';

export const MyComponent = memo(function MyComponent({ prop1, prop2 }) {
  // component logic
  return (
    // JSX
  );
});

MyComponent.propTypes = {
  prop1: PropTypes.string.isRequired,
  prop2: PropTypes.func
};
```

### Defensive Coding Patterns

```javascript
// Good - defensive coding
const setName = card.set?.editionname ?? 'Unknown';
const cards = (inventory.cards || []).map(card => ...);

// Bad - may throw errors
const setName = card.set.editionname;
const cards = inventory.cards.map(card => ...);
```

---

## Common Pitfalls to Avoid

| Pitfall | Problem | Solution |
|---------|---------|----------|
| Assuming `card.set` is a string | It can be an object | Use `getSetDisplayName()` helper |
| Missing optional chaining | Runtime errors on undefined | Always use `?.` for nested properties |
| Missing loading/error states | Poor UX | Always handle all states |
| Duplicating hook logic | Inconsistent behavior | Use existing hooks |
| Missing PropTypes | No type safety | Always add PropTypes for new props |
| Not testing with legacy data | Breaks old data | Test with both string and object formats |

---

## NPM Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Build and start development server |
| `npm run build` | Production build with Vite |
| `npm run preview` | Preview production build |
| `npm start` | Start Express server |
| `npm run prod` | Build and start production server |
| `npm test` | Run tests once |
| `npm run test:watch` | Run tests in watch mode |

---

## Testing Guidelines

1. Run `npm run dev` to test changes
2. Check browser console for errors
3. Test with both legacy data (strings) and new data formats (objects)
4. Verify changes work across different tabs/views
5. Test error states and loading states
6. Run `npm test` for unit tests

---

## External API Integrations

| Service | File | Purpose |
|---------|------|---------|
| Scryfall API | `src/utils/scryfallApi.js` | Card data and images |
| MTGJSON | `server/mtgjsonPriceService.js` | Price data |
| Archidekt | `src/hooks/useArchidektImport.js` | Deck import |
| Supabase | (via `@supabase/supabase-js`) | Authentication and database |

---

## Key Architectural Decisions

1. **Virtualized Lists** - Uses react-window for rendering large card lists efficiently
2. **Context-based State** - Global state managed through React Context
3. **Custom Hooks** - Business logic encapsulated in reusable hooks
4. **Defensive Data Handling** - All card data access uses optional chaining due to mixed data formats
5. **Server-side Price Caching** - MTGJSON price data cached server-side for performance
