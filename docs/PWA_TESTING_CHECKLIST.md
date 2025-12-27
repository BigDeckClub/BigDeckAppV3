# PWA Testing Checklist

This checklist helps verify that your Progressive Web App is properly configured and ready for deployment.

## Pre-Deployment Testing

### 1. Icon Verification ✅

- [x] All 8 icon sizes generated (72, 96, 128, 144, 152, 192, 384, 512)
- [x] Icons are PNG format with transparency
- [x] Icons are square (1:1 ratio)
- [x] favicon.svg updated with app logo
- [x] Icons referenced correctly in manifest.json
- [x] Icons exist in public/ folder

**Verify:**
```bash
ls -lh public/icon-*.png
# Should show 8 files ranging from ~2KB to ~17KB
```

### 2. Manifest Configuration ✅

- [x] manifest.json exists in public/
- [x] name and short_name set correctly
- [x] start_url configured
- [x] display set to "standalone"
- [x] theme_color and background_color set
- [x] icons array populated with all sizes
- [x] shortcuts defined (optional but recommended)

**Verify:**
```bash
cat public/manifest.json | grep -E "name|icons|display"
```

### 3. Service Worker ✅

- [x] service-worker.js exists in public/
- [x] Service worker registration in index.html
- [x] Cache name defined (CACHE_NAME)
- [x] Install event handler configured
- [x] Fetch event handler configured
- [x] offline.html fallback created

**Verify:**
```bash
cat index.html | grep serviceWorker
cat public/service-worker.js | grep "CACHE_NAME"
```

### 4. Meta Tags ✅

- [x] Theme color meta tag
- [x] Apple mobile web app capable
- [x] Apple mobile web app status bar style
- [x] Manifest link in <head>
- [x] Apple touch icons
- [x] Open Graph tags for social sharing

**Verify in index.html:**
```html
<meta name="theme-color" content="#3b82f6" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<link rel="manifest" href="/manifest.json" />
```

## Local Testing

### 5. Development Server Test

```bash
# Start development server
npm run dev

# Server should start on http://localhost:5000
```

**Check in Browser DevTools:**

1. Open Chrome/Edge
2. Press F12 (DevTools)
3. Go to "Application" tab
4. Check "Manifest" section:
   - ✅ Manifest loads without errors
   - ✅ All icons show up
   - ✅ App name displays correctly
   - ✅ Theme color is visible

5. Check "Service Workers" section:
   - ✅ Service worker is registered
   - ✅ Status shows "activated and running"
   - ✅ No errors in console

### 6. Production Build Test

```bash
# Build for production
npm run build

# Preview production build
npm run preview

# Should start on http://localhost:4173
```

**Verify Build Output:**
```
✓ dist/assets/icon-*.png copied to dist
✓ dist/manifest.json exists
✓ dist/service-worker.js exists
✓ dist/offline.html exists
```

### 7. Offline Functionality Test

**In Chrome DevTools:**

1. Go to Application > Service Workers
2. Check "Offline" checkbox
3. Reload the page
4. ✅ App should still load (from cache)
5. ✅ Offline page should show for uncached routes
6. Uncheck "Offline"
7. Reload
8. ✅ App should update with fresh content

### 8. Cache Test

**First Visit:**
1. Open DevTools > Network tab
2. Visit the app
3. Note load times

**Second Visit:**
1. Hard refresh (Ctrl+Shift+R)
2. Check Network tab
3. ✅ Many resources should load from "ServiceWorker"
4. ✅ Load time should be significantly faster

## Mobile Device Testing

### 9. iOS Safari Test

**Requirements:**
- HTTPS deployment (required for PWA on iOS)
- iOS 11.3 or later

**Steps:**
1. Visit your app in Safari
2. Tap Share button (box with arrow)
3. Scroll down and tap "Add to Home Screen"
4. ✅ Icon should display correctly
5. ✅ Name should be "BigDeck" (short_name)
6. Tap "Add"
7. ✅ Icon appears on home screen
8. Tap the home screen icon
9. ✅ App opens in full-screen (no Safari UI)
10. ✅ Theme color applied to status bar
11. Test offline:
    - Enable Airplane mode
    - Close and reopen app
    - ✅ App should still load

**iOS-Specific Checks:**
- ✅ No Safari address bar
- ✅ Status bar color matches theme
- ✅ App behaves like native app
- ✅ Splash screen shows briefly on launch

### 10. Android Chrome Test

**Requirements:**
- HTTPS deployment
- Chrome 70 or later

**Steps:**
1. Visit your app in Chrome
2. Wait for "Add to Home Screen" banner
   - If it doesn't appear, tap menu (3 dots) > "Install app"
3. ✅ Install prompt shows app icon and name
4. Tap "Install" or "Add"
5. ✅ Icon appears on home screen
6. Tap the home screen icon
7. ✅ App opens in standalone window
8. ✅ Theme color applied to system UI
9. Test offline:
    - Enable Airplane mode
    - Close and reopen app
    - ✅ App should still load

**Android-Specific Checks:**
- ✅ No Chrome browser UI
- ✅ Can switch between apps using recent apps
- ✅ Theme color in status bar and nav bar
- ✅ Splash screen on launch

### 11. Desktop Installation Test

**Chrome/Edge (Windows, Mac, Linux):**

1. Visit your app
2. Look for install icon in address bar (⊕ or computer icon)
3. Click "Install BigDeck"
4. ✅ App installs as desktop app
5. ✅ App appears in Start Menu/Applications
6. ✅ Can be pinned to taskbar
7. ✅ Opens in standalone window

## Lighthouse Audit

### 12. Run Lighthouse PWA Audit

```bash
# Install Lighthouse (if not already installed)
npm install -g lighthouse

# Run audit (replace URL with your deployment)
lighthouse https://your-app.com --view
```

**Target Scores:**
- ✅ PWA: 100 (must have)
- ✅ Performance: 90+
- ✅ Accessibility: 90+
- ✅ Best Practices: 90+
- ✅ SEO: 90+

**PWA Checklist in Lighthouse:**
- ✅ Installable
- ✅ Service worker registered
- ✅ Works offline
- ✅ Has a manifest
- ✅ Fast and reliable
- ✅ Apple touch icon provided
- ✅ Configured for splash screen
- ✅ Sets theme color

## Deployment Checklist

### 13. Pre-Deployment Verification

- [ ] All icons generated and committed to repo
- [ ] manifest.json reviewed and correct
- [ ] service-worker.js tested locally
- [ ] HTTPS certificate configured on hosting
- [ ] Environment variables set (if any)
- [ ] Production build tested with `npm run preview`

### 14. Post-Deployment Verification

**Immediately after deployment:**

1. Visit production URL
2. Open DevTools > Application
3. ✅ Manifest loads without errors
4. ✅ Service worker registers successfully
5. ✅ All icons load (check Network tab)
6. ✅ No console errors

**Test install flow:**

1. Test on iOS device
2. Test on Android device
3. Test on desktop Chrome
4. ✅ All platforms can install successfully

**Monitor:**
```javascript
// Add to your app to track installs
window.addEventListener('appinstalled', () => {
  console.log('PWA installed!');
  // Send analytics event
});
```

## Troubleshooting

### Service Worker Not Registering

**Symptoms:**
- "Service worker registration failed" in console
- Can't install app

**Solutions:**
- ✅ Verify HTTPS (required, except localhost)
- ✅ Check service-worker.js is in public/ folder
- ✅ Clear browser cache and hard reload
- ✅ Check for JavaScript errors in console
- ✅ Verify service-worker.js syntax

### Icons Not Showing

**Symptoms:**
- Default icons or broken images
- Manifest shows missing icons

**Solutions:**
- ✅ Verify icon files exist in public/ folder
- ✅ Check file paths in manifest.json
- ✅ Ensure icons are PNG format
- ✅ Verify icon sizes match manifest
- ✅ Clear browser cache

### Install Prompt Not Appearing

**Symptoms:**
- No "Add to Home Screen" option
- Install icon not in address bar

**Solutions:**
- ✅ Verify all PWA criteria met (manifest, service worker, HTTPS)
- ✅ User must visit site at least twice
- ✅ Chrome shows prompt after ~5 minutes engagement
- ✅ Check Lighthouse PWA audit for issues
- ✅ Manually show prompt (see code below)

```javascript
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  // Show your custom install button
});
```

### Offline Mode Not Working

**Symptoms:**
- App doesn't load when offline
- "No internet" error

**Solutions:**
- ✅ Verify service worker is activated
- ✅ Check cache strategy in service-worker.js
- ✅ Ensure offline.html exists
- ✅ Test with DevTools "Offline" checkbox first
- ✅ Check Service Worker status in DevTools

### Updates Not Showing

**Symptoms:**
- Old version of app still loads
- Changes don't appear

**Solutions:**
- ✅ Increment CACHE_NAME in service-worker.js
- ✅ Service worker will auto-update on next visit
- ✅ Add update notification to app
- ✅ Test with hard reload (Ctrl+Shift+R)

```javascript
// Notify users of updates
navigator.serviceWorker.addEventListener('controllerchange', () => {
  // New service worker activated
  showUpdateNotification();
});
```

## Performance Monitoring

### 15. Real User Monitoring

**Track these metrics:**

```javascript
// Page Load Time
window.addEventListener('load', () => {
  const loadTime = performance.now();
  console.log('Page loaded in:', loadTime, 'ms');
});

// Service Worker Installation
navigator.serviceWorker.ready.then((registration) => {
  console.log('Service Worker ready');
});

// App Installed Event
window.addEventListener('appinstalled', () => {
  console.log('PWA installed');
  // Send to analytics
});
```

**Monitor:**
- Install rate (% of users who install)
- Time to interactive
- Cache hit rate
- Offline usage
- Update adoption rate

## Resources

- [PWA Checklist](https://web.dev/pwa-checklist/)
- [Service Worker Cookbook](https://serviceworke.rs/)
- [Workbox](https://developers.google.com/web/tools/workbox) - Advanced service worker library
- [PWA Builder](https://www.pwabuilder.com/) - PWA testing and packaging tools

---

## Quick Test Commands

```bash
# Generate icons
npm run generate-icons

# Build for production
npm run build

# Preview production build
npm run preview

# Run Lighthouse audit
lighthouse http://localhost:4173 --view

# Check service worker status
# (in browser console)
navigator.serviceWorker.getRegistrations()

# Check manifest
# (in browser console)
fetch('/manifest.json').then(r => r.json()).then(console.log)
```

---

**Status:** ✅ PWA Configuration Complete

**Next Steps:**
1. Test locally with `npm run preview`
2. Test on mobile device (requires HTTPS deployment)
3. Deploy to production with HTTPS
4. Monitor install metrics

**Deployment Ready:** Yes (pending HTTPS deployment)
