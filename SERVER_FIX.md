# Server MIME Type Fix

## Problem

When running the production build, assets (JavaScript and CSS files) were being served with incorrect MIME types, causing errors:

```
Failed to apply style from 'http://localhost:5000/assets/index-Ct-Dn6nY.css'
because its MIME type ('text/html') is not a supported stylesheet MIME type

Failed to fetch dynamically imported module:
http://localhost:5000/assets/proxyGenerator-DxVhxtGl.js
```

## Root Cause

The catch-all SPA routing handler in `server.js` was serving `index.html` for ALL non-API routes, including asset files like `.js` and `.css` files. This caused:

1. JavaScript files to be served as HTML
2. CSS files to be served as HTML
3. Browser MIME type validation to reject these files

## Solution

Updated the catch-all handler to skip asset files and let `express.static` handle them properly.

### Before (Lines 179-190)

```javascript
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }

  const indexPath = path.join(distPath, 'index.html');
  if (!fs.existsSync(indexPath)) {
    console.error(`[STATIC] index.html missing at ${indexPath}. Returning 500.`);
    return res.status(500).json({ error: 'Application bundle is not available. Please redeploy with a built client.' });
  }

  res.sendFile(indexPath);
});
```

### After (Lines 179-197)

```javascript
app.use((req, res, next) => {
  // Skip API routes
  if (req.path.startsWith('/api/')) {
    return next();
  }

  // Skip asset files - let express.static handle them or 404
  if (req.path.startsWith('/assets/') || req.path.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/)) {
    return next();
  }

  const indexPath = path.join(distPath, 'index.html');
  if (!fs.existsSync(indexPath)) {
    console.error(`[STATIC] index.html missing at ${indexPath}. Returning 500.`);
    return res.status(500).json({ error: 'Application bundle is not available. Please redeploy with a built client.' });
  }

  res.sendFile(indexPath);
});
```

## Key Changes

1. Added check for `/assets/` path prefix (Vite's default asset directory)
2. Added regex check for common asset file extensions
3. Asset requests now pass through to `express.static` middleware (line 161-164)
4. Only HTML navigation requests get served `index.html`

## How It Works

**Request Flow:**

1. **Asset Request** (`/assets/index-ABC123.js`)
   - ✅ Skipped by catch-all handler
   - ✅ Handled by `express.static(distPath)`
   - ✅ Served with correct MIME type (`application/javascript`)

2. **Navigation Request** (`/decks` or `/settings`)
   - ✅ Not an asset, not an API route
   - ✅ Served `index.html` (React Router handles routing)

3. **API Request** (`/api/inventory`)
   - ✅ Handled by API routes
   - ✅ Never reaches catch-all

## Testing

After this fix:

```bash
npm run build
npm start
```

Navigate to `http://localhost:5000` and verify:
- ✅ Page loads without MIME type errors
- ✅ JavaScript files load correctly
- ✅ CSS files load correctly
- ✅ Dynamic imports work (proxy generator)
- ✅ SPA routing still works (navigation)

## Related Files

- **Modified:** `server.js` (line 186-187)
- **Unchanged:** `express.static` configuration (lines 161-164)
- **Unchanged:** API routing (line 169)
