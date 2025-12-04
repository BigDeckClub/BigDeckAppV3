# Copilot Instructions for BigDeckAppV3

## Project Overview

This is a React-based MTG (Magic: The Gathering) card inventory management application that helps users track their card collection, manage decks, and monitor prices.

---

## Tech Stack

### Frontend
- **React 18** - UI framework (functional components with hooks)
- **Vite 5** - Build tool and bundler
- **TailwindCSS 3** - Utility-first CSS framework
- **Lucide React** - Icon library
- **PropTypes** - Runtime type checking
- **react-window** - Virtualized list rendering

### Backend
- **Express 5** - Node.js web framework
- **PostgreSQL (pg)** - Database
- **Supabase** - Authentication and database services
- **Helmet** - Security middleware
- **express-rate-limit** - API rate limiting
- **compression** - Response compression

### Testing
- **Vitest** - Test runner
- **Testing Library (React & Jest-DOM)** - Component testing
- **jsdom** - DOM environment for tests

---

## File Structure

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

## Code Style Guidelines

- Use **functional components with hooks** (NEVER class components)
- Use **named exports** for components
- Always include **PropTypes** for component props
- Use **camelCase** for variables and functions
- Use **PascalCase** for component names
- Prefer **destructuring** for props and state
- Use **optional chaining** (`?.`) when accessing potentially undefined properties
- Use **nullish coalescing** (`??`) for default values

---

## Context Providers

| Context | File | Description |
|---------|------|-------------|
| AuthContext | `src/context/AuthContext.jsx` | Authentication state management |
| ToastContext | `src/context/ToastContext.jsx` | Toast notification system |
| ConfirmContext | `src/context/ConfirmContext.jsx` | Confirmation dialog management |
| PriceCacheContext | `src/context/PriceCacheContext.jsx` | Card price caching |

---

## Custom Hooks Reference

| Hook | File | Description |
|------|------|-------------|
| useApi | `src/hooks/useApi.js` | Generic API request handling |
| useAuthFetch | `src/hooks/useAuthFetch.js` | Authenticated API requests |
| useInventoryState | `src/hooks/useInventoryState.js` | Inventory state management |
| useInventoryOperations | `src/hooks/useInventoryOperations.js` | Inventory CRUD operations |
| useDeckOperations | `src/hooks/useDeckOperations.js` | Deck CRUD operations |
| useDeckReservations | `src/hooks/useDeckReservations.js` | Card reservation for decks |
| useFolderOperations | `src/hooks/useFolderOperations.js` | Folder organization operations |
| useCardSearch | `src/hooks/useCardSearch.js` | Card search functionality |
| useFileImport | `src/hooks/useFileImport.js` | File import processing |
| useArchidektImport | `src/hooks/useArchidektImport.js` | Archidekt deck import |
| useRapidEntry | `src/hooks/useRapidEntry.js` | Quick card entry logic |
| useThresholdSettings | `src/hooks/useThresholdSettings.js` | Price threshold configuration |
| useOnlineStatus | `src/hooks/useOnlineStatus.js` | Network connectivity detection |

---

## External API Integrations

| Service | Location | Purpose |
|---------|----------|---------|
| Scryfall API | `src/utils/scryfallApi.js` | Card data and images |
| MTGJSON | `server/mtgjsonPriceService.js` | Price data |
| Archidekt | `src/hooks/useArchidektImport.js` | Deck import |
| Supabase | (via `@supabase/supabase-js`) | Authentication and database |

---

## Data Model Notes

### Card Objects
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
**Always use this pattern when displaying set names:**

```javascript
const getSetDisplayName = (set) => {
  if (!set) return 'Unknown';
  if (typeof set === 'string') return set;
  return set.editionname || set.editioncode || 'Unknown';
};
```

---

## Common Patterns

### Component Structure
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

### Defensive Coding
- Always use optional chaining for nested properties: `card.set?.editionname`
- Provide fallback values: `value || 'Default'`
- Check array existence before mapping: `(items || []).map(...)`

```javascript
// Good - defensive coding
const setName = card.set?.editionname ?? 'Unknown';
const cards = (inventory.cards || []).map(card => ...);

// Bad - may throw errors
const setName = card.set.editionname;
const cards = inventory.cards.map(card => ...);
```

---

## Performance Guidelines

1. **Virtualized Lists** - Use `react-window` for lists with many items (see `VirtualizedCardList.jsx`)
2. **Memoization** - Use `useMemo` for expensive computations
3. **Callback Stability** - Use `useCallback` for functions passed as props
4. **Component Memoization** - Use `memo()` for components that re-render frequently with same props

---

## Common Pitfalls to Avoid

1. **Assuming `card.set` is a string** - It can be an object; use safe extraction pattern
2. **Missing optional chaining** - Always use `?.` for nested properties
3. **Missing loading/error states** - Always handle all UI states
4. **Duplicating hook logic** - Use existing hooks instead of creating new ones
5. **Missing PropTypes** - Always add PropTypes for new component props
6. **Not testing with legacy data** - Test with both string and object formats

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

## Testing

### Development Testing
- Run `npm run dev` to test changes
- Check browser console for errors
- Test with both legacy data (strings) and new data formats (objects)
- Verify changes work across different tabs/views

### Unit Testing
- Run `npm test` for unit tests
- Run `npm run test:watch` for watch mode
- Test files are located in `src/__tests__/`

### Testing Checklist
- [ ] Changes work with string-based card sets
- [ ] Changes work with object-based card sets
- [ ] No console errors
- [ ] Loading states display correctly
- [ ] Error states are handled gracefully
