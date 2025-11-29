# BigDeck.app - Debugging Guide for Claude/Copilot

## Project Overview
**BigDeck.app** is a Magic: The Gathering card inventory manager built with:
- **Frontend**: React 18 + Vite (compiled to static files in `dist/`)
- **Backend**: Express.js + PostgreSQL
- **No authentication** - fully open access
- **Two tabs**: Inventory (view cards by folder) + Imports (add bulk cards)

## Architecture Summary
```
PORT 5000 (Express server) 
├── API Routes (backend)
│   ├── GET /api/inventory - Fetch all cards
│   ├── POST /api/inventory - Add card
│   ├── PUT /api/inventory/:id - Update card
│   ├── DELETE /api/inventory/:id - Delete card
│   ├── GET /api/imports - Fetch import orders
│   ├── POST /api/imports - Create import order
│   ├── GET /api/prices/:cardName/:setCode - Fetch Scryfall prices
│   └── GET /health - Health check
└── Static Files (frontend)
    └── Serve `/dist/` folder (compiled React app)
    └── SPA routing: all non-API routes → serve index.html
```

## Current Status (Nov 29, 2025)
✅ **Working State:**
- Backend running on port 5000
- Database initialized with `inventory`, `imports`, `users`, `sessions` tables
- Frontend built to `dist/` and served as static files
- API endpoints all operational
- Real card data in database (Sol Ring examples confirmed)

## Quick Health Check

### 1. Verify Server is Running
```bash
curl http://localhost:5000/health
# Expected: {"ok":true}
```

### 2. Verify Frontend is Serving
```bash
curl http://localhost:5000/ | head -20
# Expected: HTML with <title>BigDeck.app</title>
```

### 3. Verify API is Working
```bash
curl http://localhost:5000/api/inventory
# Expected: JSON array of cards
```

### 4. Check Logs
```bash
# Workflow logs show:
# [SERVER] ✓ Running on port 5000
# [SERVER] ✓ All systems ready
```

## Common Issues & Diagnostics

### Issue 1: "App not reachable" / Timeout on Port 5000
**Diagnosis:**
```bash
# Check if server is running
ps aux | grep "node server.js" | grep -v grep

# Check if port 5000 is listening
lsof -i :5000

# Test connection
curl -v http://localhost:5000/health

# Check recent logs
tail -50 /tmp/logs/Start_application_*.log
```

**Possible Causes:**
- Process crashed: check logs for errors
- Frontend build failed: run `npm run build` manually to see errors
- Database connection failed: check `[DB]` lines in logs

**Fix:**
```bash
pkill -9 -f "node server.js"
npm run build  # Rebuild frontend
npm run dev    # This runs: npm run build && node server.js
```

### Issue 2: Frontend Blank/Not Loading JavaScript
**Diagnosis:**
```bash
# Check if dist folder exists and has files
ls -la dist/
# Should show: index.html, assets/ folder

# Check if index.html references correct asset paths
curl http://localhost:5000/ | grep "assets"

# Check browser console (if using screenshot/preview)
# Look for errors in /tmp/logs/browser_console_*.log
```

**Possible Causes:**
- Frontend not built: `dist/` folder empty or missing
- Asset paths wrong: check if `/assets/` files are being served
- React render error: check browser console logs

**Fix:**
```bash
npm run build  # Rebuild frontend
# Restart workflow after rebuild
```

### Issue 3: API Endpoints Returning 404
**Diagnosis:**
```bash
# Test specific endpoint
curl http://localhost:5000/api/inventory
# If 404: check server logs for route issues

# Check if database initialized
# Look for [DB] ✓ in server logs

# Test health endpoint (should work regardless)
curl http://localhost:5000/health
```

**Possible Causes:**
- Database not initialized: check for `[DB] ✗` errors in logs
- Server crashed during startup: check error messages
- API routes not registered: check server.js line 275+ for route definitions

**Fix:**
```bash
# Restart server - will reinitialize database
restart_workflow "Start application"
```

### Issue 4: Database Connection Failed
**Diagnosis:**
```bash
# Check if DATABASE_URL is set
echo $DATABASE_URL

# Check if Replit database exists
# Look for errors in logs: "[DB] ✗ Failed to initialize database"

# Test database directly
# (requires psql or similar)
```

**Possible Causes:**
- No database provisioned: need to create PostgreSQL database
- DATABASE_URL environment variable not set
- Database credentials expired

**Fix:**
```bash
# In Replit, provision a database via the GUI or use:
# The .replit file should have DATABASE_URL set automatically
```

## Key Files to Check

| File | Purpose | Check This If |
|------|---------|--------------|
| `server.js` | Express backend + routes | API not working, server crashes |
| `src/App.jsx` | React main component | Frontend not rendering |
| `src/components/InventoryTab.jsx` | Card inventory view | Inventory tab broken |
| `src/components/ImportTab.jsx` | Card import interface | Imports tab broken |
| `vite.config.js` | Frontend build config | Build fails or frontend won't load |
| `package.json` | Dependencies + scripts | Missing packages or wrong build cmd |
| `dist/index.html` | Built frontend entry | Frontend serving but blank |

## How to Rebuild & Restart

**Full restart (most common fix):**
```bash
pkill -9 -f "node server.js"
npm run build
npm run dev
# or restart_workflow "Start application"
```

**Just rebuild frontend:**
```bash
npm run build
# Server will auto-serve updated files
```

**Check what's running:**
```bash
ps aux | grep -E "node|vite|npm"
```

## Testing Workflow

1. **Verify server starts:**
   ```bash
   tail -20 /tmp/logs/Start_application_*.log
   # Should end with: "[SERVER] ✓ All systems ready"
   ```

2. **Test API:**
   ```bash
   curl http://localhost:5000/api/inventory | jq . | head -20
   ```

3. **Test frontend:**
   ```bash
   curl http://localhost:5000/ | grep -o "<title>.*</title>"
   # Should output: <title>BigDeck.app</title>
   ```

4. **Check for JavaScript errors:**
   - Look in `/tmp/logs/browser_console_*.log` for error entries
   - Common: missing components, undefined variables, network errors

## Repository Structure

```
/home/runner/workspace/
├── server.js              # Express server
├── package.json           # Dependencies
├── vite.config.js         # Vite config
├── index.html             # Frontend entry
├── src/
│   ├── App.jsx            # Main React component
│   ├── main.jsx           # React DOM render
│   ├── index.css          # Tailwind styles
│   ├── components/        # React components
│   │   ├── InventoryTab.jsx
│   │   ├── ImportTab.jsx
│   │   └── ErrorBoundary.jsx
│   ├── context/
│   │   └── PriceCacheContext.jsx
│   ├── hooks/
│   │   └── useApi.js
│   └── utils/
│       └── useDebounce.js
├── dist/                  # Built frontend (generated)
├── .replit               # Replit config
├── replit.md             # Project docs
└── DEBUG_GUIDE.md        # This file
```

## Command Reference

```bash
# Start development
npm run dev

# Build frontend
npm run build

# Production build + start
npm run prod

# View logs
tail -100 /tmp/logs/Start_application_*.log

# Kill all node processes
pkill -9 -f "node server.js"

# Test API
curl http://localhost:5000/api/inventory
curl http://localhost:5000/health

# Check what's listening on port 5000
lsof -i :5000
```

## Database Schema

```sql
-- Main inventory table
CREATE TABLE inventory (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255),
  name VARCHAR(255) NOT NULL,
  set VARCHAR(20),
  set_name VARCHAR(255),
  quantity INTEGER DEFAULT 1,
  purchase_price REAL,
  purchase_date TEXT,
  image_url TEXT,
  scryfall_id VARCHAR(255),
  folder VARCHAR(255) DEFAULT 'Uncategorized',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Bulk import orders
CREATE TABLE imports (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255),
  title VARCHAR(255),
  description TEXT,
  card_list JSONB,
  source VARCHAR(100),
  status VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Debugging Checklist

When app is down:
- [ ] Check if server process is running: `ps aux | grep "node server.js"`
- [ ] Verify port 5000 is listening: `lsof -i :5000`
- [ ] Check server logs: `tail /tmp/logs/Start_application_*.log`
- [ ] Test API: `curl http://localhost:5000/health`
- [ ] Test frontend: `curl http://localhost:5000/ | head -5`
- [ ] Check if dist folder exists: `ls -la dist/`
- [ ] Verify database initialized: look for `[DB] ✓` in logs
- [ ] Rebuild if needed: `npm run build`
- [ ] Restart server: `restart_workflow "Start application"`

## Recent Changes (Why Things Are Set Up This Way)

1. **Frontend in dist/ folder**: React built to static files because ViteExpress had issues serving dev server
2. **No ViteExpress**: Switched to plain Express + static file serving (simpler, more reliable)
3. **npm run dev**: Now runs `npm run build && node server.js` to ensure frontend is up to date
4. **All components cleaned**: Removed all unused components (Settings, Analytics, etc.) that were causing errors
5. **Port 5000**: ViteExpress required port 5000 for Replit iframe preview

## Notes for Next Debugger

- The app is deliberately minimal (3 components only) - no dead code
- Database is PostgreSQL (auto-provisioned in Replit)
- No authentication system - fully open access
- Scryfall API is used for card search and pricing
- All state is server-managed (inventory, imports)
