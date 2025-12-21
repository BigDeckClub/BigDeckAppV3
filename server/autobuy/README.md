# Autobuy Optimizer

This module implements a deterministic, phase-based optimizer for purchasing Magic: The Gathering cards from multiple marketplaces.

## Architecture Overview

```
server/autobuy/
├── optimizer.ts       # Core optimization algorithm (Phases 0-5)
├── ipsCalculator.ts   # Inventory Pressure Score calculator for Hot List
├── demandBuilder.ts   # Aggregates demand from decks and inventory alerts
├── validation.js      # Zod schemas for input validation
├── types.ts           # TypeScript type definitions
└── examples/
    └── sample-input.json
```

## Optimization Phases

- **Phase 0: Preprocessing** - Apply `FORCE` directives, derive max prices from Card Kingdom
- **Phase 1: Greedy Allocation** - Allocate demand to sellers by lowest marginal cost
  - Supports `PREFER` directives for seller preference
  - Includes seller rating penalty (lower-rated sellers have higher effective cost)
- **Phase 2: Shipping Optimization** - Add Hot List cards to trigger free shipping thresholds
- **Phase 3: Local Improvement** - Greedy hill-climbing moves between sellers
- **Phase 4: Card Kingdom Fallback** - Fulfill unmet demand via CK
- **Phase 5: Finalize Plan** - Human-readable output with totals

## IPS (Inventory Pressure Score) Calculator

The IPS system ranks cards by procurement priority:

```
IPS = (DemandRate × Liquidity × Substitutability) / (CurrentInventory + 1) × MarginSafety
```

### Metric Definitions

- **DemandRate**: Deck usage + queued deck usage + sales velocity + alert bonus
- **Liquidity**: Sales velocity stability, format breadth, price stability (0-1)
- **Substitutability**: Functional equivalence score (1.0 = unique, 0.3 = many substitutes)
- **MarginSafety**: `(CKPrice - MarketMedianPrice) / CKPrice`

### Hot List Tiers

- **Tier A**: High IPS - Always acceptable as filler cards
- **Tier B**: Medium IPS - Shipping-only filler
- **Tier C**: Low IPS or margin - Demand-only, never speculative

## Demand Builder

Aggregates card demand from multiple sources:

1. **Active Decks** - Cards needed to fulfill current deck sales
2. **Queued Decks** - Cards for future deck builds
3. **Low-Inventory Alerts** - Cards below threshold in inventory

Net demand = max(deck demand, alert threshold) - available inventory

## API Endpoints

### POST /api/autobuy/plan
Run the optimizer with provided data.

```json
{
  "demands": [{ "cardId": "sol-ring", "quantity": 2 }],
  "offers": [{ "cardId": "sol-ring", "sellerId": "S1", "price": 3.50, "quantityAvailable": 4, "marketplace": "TCG", "shipping": { "base": 2.99, "freeAt": 35 }}],
  "hotList": [{ "cardId": "swords-to-plowshares", "IPS": 0.85, "targetInventory": 4 }],
  "cardKingdomPrices": { "sol-ring": 4.00 },
  "currentInventory": { "sol-ring": 1 },
  "directives": [{ "cardId": "counterspell", "mode": "FORCE", "quantity": 2 }]
}
```

### GET /api/autobuy/demand-summary
Get current demand from inventory alerts and deck requirements (requires DB).

### POST /api/autobuy/generate-hot-list
Generate a Hot List using the IPS Calculator from current inventory data.

### GET /api/autobuy/sample
Get sample input JSON for testing.

### GET /api/autobuy/status
Check if optimizer modules are available.

## Manual Directives

- **FORCE**: Add demand for a card regardless of current needs
- **PREFER**: Give preference to offers from a specific seller
- **SHIP_ONLY**: Only use this card for shipping optimization, not direct demand

## Quick Start

### CLI Demo
```bash
node scripts/run-autobuy.mjs
```

### Run Tests
```bash
npm test -- server/__tests__/autobuy --run
```

### Build TypeScript
```bash
npx tsc -p tsconfig.autobuy.json
```

## User Controls (Frontend)

The AutobuyTab UI exposes these settings:

- **Price Threshold %**: Only buy cards priced at or below this % of CK price
- **Min Seller Rating**: Filter out low-rated sellers
- **Max Sellers Per Order**: Limit basket count for simplicity
- **Allow Hot List Filler**: Enable/disable speculative filler cards
- **Inventory Time Horizon**: Days of inventory to maintain
- **Include Queued Decks**: Factor in future deck demand

## Key Design Principles

1. **Seller-centric optimization** - Purchases organized into Seller Baskets
2. **Deterministic** - Same input always produces same output
3. **Card Kingdom as backstop** - Guaranteed fallback for unmet demand
4. **No speculative buying without positive expected value**

See `server/autobuy/optimizer.ts` for implementation details and exported helpers.
