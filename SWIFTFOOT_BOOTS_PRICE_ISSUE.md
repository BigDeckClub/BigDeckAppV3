# Swiftfoot Boots Pricing Issue - N/A Display in Container

## Problem
When viewing cards in containers, prices for Swiftfoot Boots (and sometimes other cards) display as "N/A" for both TCG Player and Card Kingdom, even though the backend server is successfully fetching these prices.

## Evidence

### Backend IS Working Correctly
Server logs show successful price fetches:
```
=== PRICE REQUEST: swiftfoot boots (PIP) ===
✓ Scryfall TCG price: $1.38
[CK] Starting fetch for: swiftfoot boots
[CK][SUCCESS] Best match: swiftfoot boots = $2.79
Final result: TCG=$1.38, CK=$2.79
```

The same Swiftfoot Boots card shows different prices when requested at different times:
- With set PIP: TCG=$1.38, CK=$2.79
- With set TLE: TCG=$1.36, CK=$2.79
- Backend IS working ✅

## Frontend Implementation
**File: `src/components/DecklistCardPrice.jsx`**
- Component uses `usePriceCache()` hook to retrieve cached prices
- Normalizes card name and set code before querying
- Should display: `"TCG: {price.tcg} | CK: {price.ck}"`
- Currently shows: `"TCG: N/A | CK: N/A"`

**File: `src/context/PriceCacheContext.jsx`**
- Implements caching with 10-minute soft TTL and 1-hour hard TTL
- Cache stored in localStorage with key format: `${name}|${setCode}`
- Deduplicates concurrent requests for same card+set

**File: `src/lib/fetchCardPrices.js`**
- Normalizes card names: `.trim().toLowerCase()`
- Normalizes set codes: `.trim().toUpperCase()` (defaults to "SPM" if missing)
- Sends query to: `/api/price?name={normalized}&set={normalized}`

## Backend API Endpoint
**File: `server.js` lines 979-996**

```javascript
app.get('/api/price', async (req, res) => {
  const name = req.query.name;
  const set = req.query.set;
  
  // Forwards to /api/prices/:cardName/:setCode
  const url = `http://localhost:3000/api/prices/${encodeURIComponent(name)}/${encodeURIComponent(set || '')}`;
  const result = await fetch(url);
  const data = await result.json();
  res.json(data);
});
```

## Possible Root Causes

1. **Cache Key Mismatch**: The cache key uses normalized `${name}|${setCode}` but the set code might not be matching what's being stored. When a card is in a container, is the set code being passed correctly?

2. **Async Timing Issue**: The component mounts and calls `getPrice()` but if the price hasn't been fetched yet, it returns the initial state `{ tcg: "N/A", ck: "N/A" }`. The Promise might not be awaited correctly.

3. **Set Code Not Being Passed**: In the container display, when DecklistCardPrice is called with `<DecklistCardPrice name={item.name} set={item.set} />`, is `item.set` actually populated? It might be undefined or null.

4. **Empty Set Code Fallback**: In `normalizeSetCode()`, if no set code is provided, it defaults to "SPM". But the prices were fetched with specific set codes (PIP, TLE). This mismatch would cause cache misses.

## Data Flow to Investigate

1. **In Container**: Check if `item.set` is correctly populated from the cards array stored in the container
2. **In Price Request**: Verify what set code is actually being sent to `/api/price` 
3. **In Cache**: Verify the cache key is being constructed correctly and prices are being stored
4. **In Component Re-render**: Verify the component is properly updating when the price promise resolves

## Questions for Debugging
1. When DecklistCardPrice is called in the container, what are the exact values of `name` and `set` props?
2. Is the Promise from `getPrice()` resolving with data or just timing out?
3. Are prices working correctly for other cards in the container (like Sol Ring)?
4. Is this specific to Swiftfoot Boots or all cards sometimes show N/A?

## Files to Check
- `src/App.jsx` - Lines 1573-1585 (where prices are displayed in container)
- `src/components/DecklistCardPrice.jsx` - Verify promise resolution
- `src/context/PriceCacheContext.jsx` - Verify cache logic and key construction
- Browser Developer Tools → Application → Local Storage → Look for "mtg-card-price-cache" entries
