# Scryfall Backfill Job

This document describes the server-side backfill job that enriches inventory rows with Scryfall metadata.

What it does
- Finds inventory rows with missing `scryfall_id` (configurable limit).
- Resolves card metadata using the server Scryfall client (`/cards/collection` where possible).
- Updates inventory columns: `scryfall_id`, `image_uri_small`, `image_uri_normal`, `mana_value`, `color_identity`.
- Adds missing columns if they don't already exist.
- Supports `dryRun` mode and background execution.

Files
- `server/jobs/backfillScryfall.js` — main job implementation (exports `runBackfill`).
- `server/routes/admin.js` — admin route to trigger the job (`POST /api/admin/backfill-scryfall`).

Permissions
- The admin endpoint requires authentication and that your Supabase user ID be listed in the `ADMIN_USER_IDS` environment variable (comma-separated list of IDs). Example:

```
ADMIN_USER_IDS=uid1,uid2
```

How to trigger

- Background (recommended): enqueue a background job — returns immediately.

```
curl -X POST https://your-api.example.com/api/admin/backfill-scryfall \
  -H "Authorization: Bearer <YOUR_SUPABASE_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"limit":200, "dryRun": false, "background": true}'
```

- Run synchronously (waits for completion):

```
curl -X POST https://your-api.example.com/api/admin/backfill-scryfall \
  -H "Authorization: Bearer <YOUR_SUPABASE_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"limit":100, "dryRun": true, "background": false}'
```

Programmatic usage

From a Node REPL or script (runs in-process):

```js
import { runBackfill } from './server/jobs/backfillScryfall.js';
(async () => {
  const stats = await runBackfill({ limit: 200, dryRun: true });
  console.log(stats);
})();
```

Notes & safety
- The job will add columns to the `inventory` table if they don't already exist. You should run a DB backup before running large production backfills.
- The job uses Scryfall's `/cards/collection` endpoint in chunks (75 identifiers) to reduce per-card requests and reuse the existing server `scryfallQueue` rate limiter.
- Use `dryRun: true` to preview the number of items that would be updated without writing to the database.

If you'd like, I can open a PR for this change and include migration scripts to add the new inventory columns explicitly rather than relying on runtime ALTER TABLEs.

-- Testing & Rollout Checklist

- Use `dryRun: true` for initial runs to preview updates before writing to DB.
- Start with small `limit` values (e.g., 50) and verify logs and API usage.
- Monitor application logs for `[BACKFILL]` messages and Scryfall 429/5xx errors.
- Once comfortable, increase batch sizes gradually and run multiple background jobs.

