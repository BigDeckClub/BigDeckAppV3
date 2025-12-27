# AI Inventory Awareness - Implementation Summary

## Overview

The AI deck builder now has **full awareness** of your card inventory, including which cards are available vs. reserved in other decks. This helps the AI make smarter recommendations when building new decks.

## What Changed

### 1. Enhanced Inventory Query

**File**: `server/routes/ai.js` (lines 106-122)

The inventory fetch now includes:
- **`quantity`** - Total cards owned
- **`reserved_quantity`** - Cards allocated to existing decks
- **`available_quantity`** - Cards available for new decks (calculated as `quantity - reserved_quantity`)

```javascript
async function getInventoryForDeck(userId) {
  const query = `
    SELECT
      name,
      quantity,
      COALESCE(reserved_quantity, 0) as reserved_quantity,
      (quantity - COALESCE(reserved_quantity, 0)) as available_quantity,
      image_url
    FROM inventory
    WHERE user_id = $1
    ORDER BY purchase_price DESC NULLS LAST
    LIMIT 300
  `;
  const result = await pool.query(query, [userId]);
  return result.rows;
}
```

### 2. Inventory Context for AI Prompts

**File**: `server/routes/ai.js` (lines 281-299)

The inventory is now formatted into two separate lists for the AI:

1. **Available Cards** - Cards the user owns that are NOT reserved in other decks
2. **Reserved Cards** - Cards that are already allocated to existing decks (AI should avoid these)

```javascript
// Separate available cards from reserved cards
const availableCards = inventory
  .filter(c => c.available_quantity > 0)
  .map(c => c.available_quantity > 1 ? `${c.name} (x${c.available_quantity})` : c.name);

const reservedCards = inventory
  .filter(c => c.reserved_quantity > 0)
  .map(c => c.reserved_quantity > 1 ? `${c.name} (x${c.reserved_quantity} reserved)` : `${c.name} (reserved)`);

const inventoryContext = `
**YOUR AVAILABLE CARDS (Prioritize these - they're ready to use):**
${availableCards.join(', ') || 'None'}

**YOUR RESERVED CARDS (Avoid these - already in other decks):**
${reservedCards.join(', ') || 'None'}
`.trim();
```

### 3. Updated AI Prompts

**File**: `server/routes/ai.js` (lines 437, 458)

Both deck-building passes now receive the enhanced inventory context:

**Pass 2 (Synergy Cards)**:
- Old: `6. Inventory First: ${inventoryList}`
- New: `6. ${inventoryContext}`

**Pass 3 (Staples)**:
- Old: `4. Inventory First: ${inventoryList}`
- New: `4. ${inventoryContext}`

## How It Works

### Before This Update

The AI received a simple comma-separated list of card names:
```
Inventory First: Lightning Bolt, Sol Ring, Rhystic Study, ...
```

**Problems:**
- ❌ No distinction between available and reserved cards
- ❌ AI might suggest cards already in other decks
- ❌ No quantity information

### After This Update

The AI receives structured inventory information:
```
**YOUR AVAILABLE CARDS (Prioritize these - they're ready to use):**
Lightning Bolt (x3), Sol Ring, Rhystic Study, Command Tower (x2), ...

**YOUR RESERVED CARDS (Avoid these - already in other decks):**
Mana Crypt (x1 reserved), Cyclonic Rift (reserved), ...
```

**Benefits:**
- ✅ AI knows which cards are available for new decks
- ✅ AI is instructed to avoid reserved cards
- ✅ Quantity information helps AI understand your collection depth
- ✅ Clear prioritization: use available cards first

## User Experience Improvements

### 1. Smarter Card Recommendations

The AI will now:
- **Prioritize** cards you own that aren't reserved
- **Avoid** suggesting cards you have reserved in other decks
- **Understand** when you have multiple copies available

### 2. Better Deck Diversity

With reserved card awareness:
- Building a new deck won't suggest breaking apart existing decks
- Each deck can use different cards from your collection
- Your collection is utilized more efficiently

### 3. Inventory-Aware Suggestions

If you own 4 copies of Sol Ring:
- 2 reserved in other decks
- 2 available

The AI sees: `Sol Ring (x2)` in available cards and knows it can safely recommend it.

## Example Scenarios

### Scenario 1: New Deck with Available Staples

**User Inventory:**
- Lightning Bolt (x4, 0 reserved) → 4 available
- Sol Ring (x3, 2 reserved) → 1 available
- Command Tower (x5, 3 reserved) → 2 available

**AI Receives:**
```
**YOUR AVAILABLE CARDS:**
Lightning Bolt (x4), Sol Ring, Command Tower (x2)

**YOUR RESERVED CARDS:**
Sol Ring (x2 reserved), Command Tower (x3 reserved)
```

**AI Behavior:**
- ✅ Will confidently suggest Lightning Bolt (plenty available)
- ✅ May suggest Sol Ring (1 copy available)
- ✅ Will suggest Command Tower if colors match
- ✅ Won't think all Sol Rings are unavailable

### Scenario 2: High-Demand Card

**User Inventory:**
- Mana Crypt (x1, 1 reserved) → 0 available

**AI Receives:**
```
**YOUR AVAILABLE CARDS:**
(none - card is fully reserved)

**YOUR RESERVED CARDS:**
Mana Crypt (reserved)
```

**AI Behavior:**
- ❌ Won't suggest Mana Crypt (sees it's reserved)
- ✅ Will suggest alternatives instead

## Testing the Feature

### Test Cases

1. **Build a deck when you own many available cards**
   - AI should heavily favor your inventory

2. **Build a deck when most cards are reserved**
   - AI should suggest alternatives to reserved cards

3. **Build multiple decks in succession**
   - Each deck should avoid suggesting cards from previous decks (if reserved)

### Expected Behavior

When you generate a new deck:
1. AI fetches your top 300 most valuable cards
2. AI separates available vs. reserved cards
3. AI prioritizes available cards in recommendations
4. AI avoids suggesting reserved cards unless necessary

## Future Enhancements

Potential improvements for this feature:

1. **Real-Time Reservation Updates** - Update the AI's view when you add cards to decks mid-session
2. **Conditional Suggestions** - "You own this but it's reserved in [Deck Name]. Would you like to use it anyway?"
3. **Collection Gaps** - AI could identify cards you're missing that would benefit multiple decks
4. **Budget Awareness** - Combined with reserved cards, suggest budget alternatives for reserved staples

## Technical Details

### Database Schema

The inventory table includes:
- `quantity` (integer) - Total cards owned
- `reserved_quantity` (integer) - Cards allocated to decks

Reserved quantity is automatically managed by the deck system when cards are added/removed from decks.

### Performance Considerations

- Query fetches top 300 cards by purchase price (focuses on your most valuable inventory)
- Calculated `available_quantity` on-the-fly (no additional storage needed)
- Inventory context is built once per deck generation (not per pass)

### Error Handling

If reserved_quantity is NULL (older data):
- `COALESCE(reserved_quantity, 0)` treats it as 0
- All cards are considered available
- No breaking changes for existing data

## Inventory-Only Mode

Users can enable "Inventory-Only Mode" which enforces strict constraints on deck building.

### What it does

- **Strict constraint**: AI builds decks using ONLY cards from your available inventory
- **EDHREC/MTGGoldfish** data is provided for reference only - AI won't suggest cards from these sources
- **Post-processing validation**: System validates all cards are in your inventory
- **Inventory usage statistics**: Shows exactly how many cards came from your inventory vs. external recommendations
- **Detailed warnings**: Lists any cards that aren't in your inventory or have insufficient quantities

### When to use

- **Building budget decks** from existing cards without buying new ones
- **Testing deck ideas** with cards you already own
- **Maximizing collection usage** across multiple decks
- **Pre-purchase testing** to see if a deck concept works with what you have

### How to enable

1. Navigate to the AI Deck Builder
2. Check the box: **"Build using ONLY my inventory (no external cards)"**
3. If you have fewer than 64 available cards, you'll see a warning
4. Generate your deck as normal
5. View inventory usage stats and warnings in the results panel

### Limitations

- **Requires 64+ available cards** for a complete Commander deck (36 lands + 64 spells including commander)
- **May not support all strategies/themes** if your collection lacks specific card types
- **Reserved cards** (cards in other decks) cannot be used - they're treated as unavailable
- **Partial decks** may be generated if you don't have enough cards

### Example Output

When inventory-only mode is active:

**Inventory Usage Stats**:
```
Built with 85 / 100 cards from your inventory (85%)
```

**Warning (if applicable)**:
```
⚠️ Inventory-only mode: 15 cards not in inventory, 2 cards with insufficient quantity.

Cards not in inventory (15):
- Sol Ring
- Rhystic Study
- ...

Insufficient quantity (2):
- Lightning Bolt (need 1, have 0)
- Command Tower (need 1, have 0 available - 2 reserved)
```

### Technical Implementation

**Backend** (`server/routes/ai.js`):
- Accepts `inventoryOnly` boolean parameter
- Modifies AI prompts to use mandatory language ("MUST use ONLY") instead of suggestions ("Prioritize")
- Changes EDHREC/MTGGoldfish context from "USE THESE!" to "Reference only"
- Validates deck post-generation and calculates inventory usage stats

**Frontend** (`src/components/aidbuilder/AIDeckBuilder.jsx`):
- Checkbox toggle for inventory-only mode
- Warning display if user has < 64 available cards
- Inventory usage stats display in results panel
- Expandable details for cards not in inventory

## Related Features

This update complements:
- **Print Options Modal** - Shows missing/available/reserved cards for printing
- **Deck Reservation System** - Automatically tracks which cards are in which decks
- **Inventory Management** - Users can see total vs. available quantities

## Benefits Summary

| Aspect | Before | After |
|--------|--------|-------|
| **Inventory Info** | Card names only | Available + Reserved quantities |
| **AI Awareness** | Knows you own cards | Knows which cards are available |
| **Recommendations** | May suggest reserved cards | Avoids reserved cards |
| **Collection Usage** | Inefficient (overlap) | Efficient (distributed) |
| **User Experience** | Manual checking needed | AI handles it automatically |

---

**Last Updated**: December 2024
**Related Files**: `server/routes/ai.js`, `PRINT_OPTIONS_FEATURE.md`
