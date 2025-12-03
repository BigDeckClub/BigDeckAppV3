# Copilot Instructions for BigDeckAppV3

## Project Overview
This is a React-based MTG (Magic: The Gathering) card inventory management application that helps users track their card collection, manage decks, and monitor prices.

## Tech Stack
- React 18 with functional components and hooks
- Vite for bundling
- TailwindCSS for styling
- Lucide React for icons
- PropTypes for type checking

## Code Style Guidelines
- Use functional components with hooks, never class components
- Use named exports for components
- Always include PropTypes for component props
- Use camelCase for variables and functions
- Use PascalCase for component names
- Prefer destructuring for props and state
- Use optional chaining (?.) when accessing potentially undefined properties
- Use nullish coalescing (??) for default values

## File Structure
- Components go in `src/components/`
- Hooks go in `src/hooks/`
- Utilities go in `src/utils/`
- Each component folder may have an `index.js` for exports

## Data Model Notes

### Card Objects
Card objects may have `set` as either a string OR an object. Always handle both formats:

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
Always use this pattern when displaying set names:

```javascript
const getSetDisplayName = (set) => {
  if (!set) return 'Unknown';
  if (typeof set === 'string') return set;
  return set.editionname || set.editioncode || 'Unknown';
};
```

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

export default MyComponent;
```

### Defensive Coding
- Always use optional chaining for nested properties: `card.set?.editionname`
- Provide fallback values: `value || 'Default'`
- Check array existence before mapping: `(items || []).map(...)`

## Testing
- Test all changes by running `npm run dev`
- Check browser console for errors
- Test with both legacy data (strings) and new data formats (objects)
