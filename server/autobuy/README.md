# Autobuy Optimizer

This module implements a deterministic, phase-based optimizer for purchasing Magic: The Gathering cards from multiple marketplaces.

Phases implemented:

- Phase 0: Preprocessing (apply `FORCE` directives, derive max prices)
- Phase 1: Greedy allocation by marginal cost
- Phase 2: Shipping threshold optimization
- Phase 3: Local improvement (greedy moves between sellers)
- Phase 4: Card Kingdom fallback for unmet demand
- Phase 5: Finalize purchase plan (human-friendly output)

Quick CLI demo:

```bash
node scripts/run-autobuy.mjs
```

API:

- `runFullPipeline(opts)` — runs phases 0-5 and returns a finalized plan.
- `validateDirectives(directives)` — validates manual directives.

See `server/autobuy/optimizer.ts` for implementation details and exported helpers.
