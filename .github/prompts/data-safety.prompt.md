# Data Safety Guidelines

When working with card data in this application:

## The `set` Field Problem
The `card.set` field can be either:
- A **string**: `"MH3"`, `"ONE"`, `"DMU"`
- An **object**: `{ mtgoCode, editioncode, editiondate, editionname, editiontype }`

## Always Use Helper Functions

```javascript
// For displaying set names
const getSetDisplayName = (set) => {
  if (!set) return 'Unknown';
  if (typeof set === 'string') return set;
  return set.editionname || set.editioncode || 'Unknown';
};

// For getting set code
const getSetCode = (set) => {
  if (!set) return '';
  if (typeof set === 'string') return set;
  return set.editioncode || set.mtgoCode || '';
};
```

## Never Do This
```jsx
// BAD - will crash if set is an object
<span>{card.set}</span>

// BAD - doesn't handle object case
<span>{card.set.toUpperCase()}</span>
```

## Always Do This
```jsx
// GOOD - handles both cases
<span>{getSetDisplayName(card.set)}</span>

// GOOD - inline handling
<span>{typeof card.set === 'string' ? card.set : card.set?.editionname}</span>
```
