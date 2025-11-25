# Price Display Issue - Component Not Receiving Prices from Backend

## Problem Statement
After refactoring the DecklistCardPrice component to show individual price types (TCG or CK), prices are displaying as "..." (loading state) and never updating to show actual prices.

## Evidence

### Backend IS Working
Server logs confirm prices are successfully fetched and formatted:
```
=== PRICE REQUEST: swiftfoot boots (PIP) ===
✓ Scryfall TCG price: $1.38
[CK][SUCCESS] Best match: swiftfoot boots = $2.79
Final result: TCG=$1.38, CK=$2.79
```

Server returns correct JSON format (line 1245 in server.js):
```javascript
res.json({ tcg: tcgPrice, ck: ckPrice });
// Returns: { tcg: "$1.38", ck: "$2.79" }
```

### Frontend Component Implementation
**File: `src/components/DecklistCardPrice.jsx`**

```javascript
export default function DecklistCardPrice({ name, set, priceType, className }) {
  const { getPrice } = usePriceCache();
  const [price, setPrice] = useState("N/A");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!name || !set) {
      setPrice("N/A");
      setLoading(false);
      return;
    }

    setLoading(true);
    const cardName = normalizeCardName(name);
    const setCode = normalizeSetCode(set);
    
    getPrice(cardName, setCode)
      .then(result => {
        if (result && priceType && result[priceType]) {
          setPrice(result[priceType]);  // Should set "$1.38" or "$2.79"
        } else {
          setPrice("N/A");
        }
        setLoading(false);  // Should stop showing "..."
      })
      // ...
  }, [name, set, getPrice, priceType]);

  return (
    <span className={className}>
      {loading ? "..." : price}
    </span>
  );
}
```

### Usage in Container Display
```javascript
<div className="bg-slate-700 p-2 rounded">
  <div className="text-slate-400 text-xs mb-1">TCG Player</div>
  <div className="text-teal-300 font-semibold text-sm">
    <DecklistCardPrice name={item.name} set={item.set} priceType="tcg" />
  </div>
</div>
```

## Data Flow
1. ✅ Backend successfully fetches prices from Scryfall and Card Kingdom
2. ✅ Backend formats response as `{ tcg: "$1.38", ck: "$2.79" }`
3. ✅ Backend sends JSON response via `res.json()`
4. ❓ Frontend receives response?
5. ❓ Component extracts price using `result[priceType]`?
6. ❌ Component stays in loading state ("...") forever

## Potential Root Causes

### Issue 1: Promise Never Resolves
- The `getPrice()` promise from PriceCacheContext might not be resolving with the expected data structure
- The cache might be storing prices in a different format than what the component expects

### Issue 2: Response Format Mismatch
- The component expects `result.tcg` or `result.ck` to be a string
- The backend might be returning something else (object, null, undefined, number)
- Verify what `result` actually contains when the promise resolves

### Issue 3: Component Props Not Passed
- `priceType` prop might be undefined or not matching "tcg" or "ck" exactly
- `item.name` or `item.set` might be undefined when component mounts
- Dependency array might be causing infinite loops or stale closures

### Issue 4: Cache Logic Issue
In PriceCacheContext, the getPrice() function returns formatted strings like "$1.38"
- But the component is checking `if (result && priceType && result[priceType])`
- This check should work unless result is structured differently

## What Needs Investigation

1. **Add console logging** in DecklistCardPrice to debug:
   ```javascript
   getPrice(cardName, setCode)
     .then(result => {
       console.log('Price result:', result, 'Type:', priceType);  // DEBUG
       console.log('Value to extract:', result?.[priceType]);     // DEBUG
   ```

2. **Verify what PriceCacheContext.getPrice()** actually returns:
   - Check if it's returning `{ tcg: "$1.38", ck: "$2.79" }`
   - Or if it's returning something else entirely

3. **Check if the problem is specific**:
   - Does ANY price display work in the container?
   - Does the price display work elsewhere (not in containers)?
   - Are all prices showing "..." or just specific cards?

4. **Browser DevTools checks**:
   - Open Network tab → look for `/api/price?name=...` requests
   - Check the response body - what is actually being returned?
   - Check Console for any errors in component execution

## Questions for ChatGPT

1. Is PriceCacheContext.getPrice() returning the right data structure?
2. Is there a timing issue where the component unmounts before the promise resolves?
3. Is there a type mismatch between what the backend sends and what the component expects?
4. Should the component fall back to displaying prices differently if the cache returns a different format?

## Files Involved
- `server.js` (lines 979-1250) - Price endpoint that returns `{ tcg, ck }`
- `src/context/PriceCacheContext.jsx` - Cache that manages getPrice() promises
- `src/components/DecklistCardPrice.jsx` - Component trying to display individual prices
- `src/lib/fetchCardPrices.js` - Normalization and fetch logic
