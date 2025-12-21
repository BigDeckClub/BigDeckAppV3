# Autobuy Optimizer

This module implements a deterministic, phase-based optimizer for purchasing Magic: The Gathering cards from multiple marketplaces.

## Architecture Overview

```
server/autobuy/
├── optimizer.ts           # Core optimization algorithm (Phases 0-5)
├── ipsCalculator.ts       # Inventory Pressure Score calculator for Hot List
├── demandBuilder.ts       # Aggregates demand from decks and inventory alerts
├── analyticsService.ts    # Learning loop - tracks predictions vs outcomes
├── analytics.ts           # Simplified analytics API wrapper
├── seasonalityService.ts  # Seasonal event multipliers for IPS
├── substitutionService.ts # Card substitution groups for demand sharing
├── validation.js          # Zod schemas for input validation
├── types.ts               # TypeScript type definitions
├── data/
│   └── seasonal-events.json  # Configurable seasonal events calendar
└── examples/
    └── sample-input.json     # Sample optimizer input for testing
```

## Features

### Core Optimization Engine
- **6-Phase Pipeline** - Preprocessing → Greedy Allocation → Shipping Optimization → Local Improvement → CK Fallback → Finalization
- **Budget Enforcement** - STRICT (hard cap) and SOFT (allow overspend for demand) modes
- **Seller Rating Penalty** - Lower-rated sellers have higher effective cost
- **Manual Directives** - FORCE, PREFER, SHIP_ONLY for fine-tuned control

### IPS (Inventory Pressure Score) Calculator
- **Demand Rate** - Deck usage, queued decks, sales velocity, alert bonuses
- **Liquidity** - Sales velocity stability, format breadth, price stability
- **Substitutability** - Accounts for interchangeable cards in groups
- **Margin Safety** - (CK Price - Market Median) / CK Price
- **Seasonality Modifiers** - Boost/dampen based on events (releases, bans, holidays)

### Substitution Groups
- Group interchangeable cards (e.g., Sol Ring / Mana Crypt)
- Cards in same group share demand pressure
- If one substitute is in stock, others' IPS is reduced

### Seasonality System
- **Commander Product Boost** - 1.3× for 2 weeks before release
- **Christmas Boost** - 1.2× for 1 week before Christmas
- **Ban Announcement Boost** - 1.5× for 1 week after announcement
- **Reprint Dampening** - 0.6× for 30 days after reprint

### Analytics / Learning Loop
- Track optimizer runs with predicted vs actual outcomes
- Suggest IPS weight adjustments based on sell-through rates
- Profit metrics per card
- Dashboard visualization

### Marketplace Integration
- **TCGPlayer** - Full integration with rate limiting (300 req/min)
- **Manabox** - Placeholder (awaiting API access)
- **Card Kingdom** - Used as fallback pricing source

## Optimization Phases

- **Phase 0: Preprocessing** - Apply `FORCE` directives, derive max prices from Card Kingdom
- **Phase 1: Greedy Allocation** - Allocate demand to sellers by lowest marginal cost
  - Supports `PREFER` directives for seller preference
  - Includes seller rating penalty (lower-rated sellers have higher effective cost)
  - Budget-aware allocation in SOFT mode
- **Phase 2: Shipping Optimization** - Add Hot List cards to trigger free shipping thresholds
  - Respects speculative spending limits
  - Only uses Tier A/B cards as filler
- **Phase 3: Local Improvement** - Greedy hill-climbing moves between sellers
- **Phase 4: Card Kingdom Fallback** - Fulfill unmet demand via CK with shipping rules
- **Phase 5: Finalize Plan** - Human-readable output with budget utilization metrics

## IPS Formula

```
IPS = (DemandRate × Liquidity × Substitutability) / (CurrentInventory + 1) × MarginSafety × SeasonalityFactor
```

### Hot List Tiers

- **Tier A**: High IPS - Always acceptable as filler cards
- **Tier B**: Medium IPS - Shipping-only filler
- **Tier C**: Low IPS or margin - Demand-only, never speculative

## API Endpoints

### Planning
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/autobuy/plan` | Run optimizer with provided data |
| GET | `/api/autobuy/demand-summary` | Get current demand from DB |
| POST | `/api/autobuy/generate-hot-list` | Generate IPS-ranked Hot List |
| POST | `/api/autobuy/fetch-offers` | Fetch offers from enabled marketplaces |
| GET | `/api/autobuy/marketplace-status` | Check marketplace configuration |

### Configuration
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/autobuy/substitution-groups` | List all substitution groups |
| POST | `/api/autobuy/substitution-groups` | Create new group |
| PUT | `/api/autobuy/substitution-groups/:id/cards` | Add card to group |
| DELETE | `/api/autobuy/substitution-groups/:id` | Delete group |

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/autobuy/analytics/runs` | Start tracking a run |
| PUT | `/api/autobuy/analytics/runs/:id` | Update run status |
| GET | `/api/autobuy/analytics/dashboard` | Get dashboard stats |
| GET | `/api/autobuy/analytics/accuracy` | Get prediction accuracy |
| GET | `/api/autobuy/analytics/suggestions` | Get IPS weight suggestions |

## Manual Directives

- **FORCE**: Add demand for a card regardless of current needs
- **PREFER**: Give preference to offers from a specific seller
- **SHIP_ONLY**: Only use this card for shipping optimization, not direct demand

## Budget Configuration

```json
{
  "budget": {
    "maxTotalSpend": 500,        // Hard cap on total purchase
    "maxPerSeller": 100,         // Max spend per seller basket
    "maxPerCard": 50,            // Skip cards priced above this
    "maxSpeculativeSpend": 50,   // Cap on Hot List spending
    "reserveBudgetPercent": 10,  // Reserve for CK fallback
    "budgetMode": "SOFT"         // "STRICT" or "SOFT"
  }
}
```

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

## Frontend UI

The AutobuyTab component provides:

### Optimizer Tab
- Run optimizer with live marketplace offers
- Visual purchase plan with expandable seller baskets
- Budget utilization display with warnings
- Mark as Purchased tracking
- Deep links to marketplace carts

### Analytics Tab
- Prediction accuracy metrics
- Recent runs history
- IPS weight adjustment suggestions
- Sell-through rate tracking

### Config Tab
- Substitution Groups manager (create, add cards, delete)
- Seasonality Events viewer (upcoming events, multiplier info)

### User Preferences (persisted to localStorage)
- Price Threshold % (50-120% of CK price)
- Min Seller Rating (0-100%)
- Max Sellers Per Order (1-20)
- Allow Hot List Filler
- Allow Speculative Overbuying
- Inventory Time Horizon (7-90 days)
- Include Queued Decks
- Budget Controls (all limits + STRICT/SOFT mode)

## Database Tables

### Required Migrations
1. `2025-12-20-create-substitution-groups.sql` - Substitution groups tables
2. `2025-12-21-create-autobuy-analytics.sql` - Analytics tracking tables

## Key Design Principles

1. **Seller-centric optimization** - Purchases organized into Seller Baskets
2. **Deterministic** - Same input always produces same output
3. **Card Kingdom as backstop** - Guaranteed fallback for unmet demand
4. **No speculative buying without positive expected value**
5. **Budget-aware** - Respects hard limits while maximizing value
6. **Learning loop** - Improves over time based on outcomes

## Test Coverage

106 tests covering:
- Optimizer phases (0-5)
- Budget enforcement (STRICT and SOFT modes)
- IPS calculations
- Demand building
- Substitution groups
- Seasonality factors
- Analytics service

See `server/__tests__/autobuy.*.test.ts` for test files.
