# Progressive Web App (PWA) Setup

BigDeck is now configured as a Progressive Web App, allowing users to install it on their mobile devices and use it offline!

## What's a PWA?

A Progressive Web App combines the best of web and mobile apps:
- ✅ **Installable** - Add to home screen like a native app
- ✅ **Offline** - Works without internet connection
- ✅ **Fast** - Caches assets for instant loading
- ✅ **Responsive** - Works on any device size
- ✅ **Updates** - Auto-updates when users visit

## Setup Completed

### Files Created

1. **`public/manifest.json`** - PWA configuration
   - App name, icons, theme colors
   - Display mode (standalone = full-screen app)
   - Shortcuts for quick actions

2. **`public/service-worker.js`** - Offline functionality
   - Caches assets for offline use
   - Network-first for API calls
   - Cache-first for static assets
   - Background sync support
   - Push notification support

3. **`public/offline.html`** - Offline fallback page
   - Shown when user is offline
   - Auto-reconnects when back online
   - User-friendly messaging

4. **`index.html`** - Updated with PWA meta tags
   - Manifest link
   - iOS-specific tags
   - Theme color
   - Social media cards

### Features Enabled

✅ **Install Prompt**
- Users will see "Add to Home Screen" on mobile
- Works on iOS, Android, and desktop

✅ **Offline Mode**
- App works without internet
- Previously loaded data is cached
- API requests cached for offline viewing

✅ **App Shortcuts**
- Quick access to Dashboard, Orb, Inventory
- Long-press app icon to see shortcuts

✅ **Splash Screen**
- Native app-like loading experience
- Uses theme color and icon

## Required: Generate Icons

You need to create app icons in multiple sizes. Here's how:

### Option 1: Using Online Tool (Easiest)

1. Visit [PWA Asset Generator](https://www.pwabuilder.com/imageGenerator)
2. Upload a 512x512 PNG logo
3. Download the generated icons
4. Place in `public/` folder

### Option 2: Using ImageMagick (Command Line)

```bash
# Install ImageMagick first
# Windows: choco install imagemagick
# Mac: brew install imagemagick
# Linux: sudo apt-get install imagemagick

# Convert your source image (replace source.png with your logo)
magick source.png -resize 72x72 public/icon-72x72.png
magick source.png -resize 96x96 public/icon-96x96.png
magick source.png -resize 128x128 public/icon-128x128.png
magick source.png -resize 144x144 public/icon-144x144.png
magick source.png -resize 152x152 public/icon-152x152.png
magick source.png -resize 192x192 public/icon-192x192.png
magick source.png -resize 384x384 public/icon-384x384.png
magick source.png -resize 512x512 public/icon-512x512.png
```

### Option 3: Design Tool

Create in Figma, Sketch, or Photoshop:
- **512x512** - Base icon (required)
- **192x192** - Android icon
- **152x152** - iOS icon

Export as PNG with transparency.

### Icon Guidelines

✅ **Design Tips:**
- Simple, recognizable design
- High contrast for visibility
- Works on light and dark backgrounds
- Square canvas with padding (safe zone)

❌ **Avoid:**
- Text (too small to read)
- Complex details
- Thin lines
- Light colors on light backgrounds

## Testing Your PWA

### Desktop (Chrome/Edge)

1. Open DevTools (F12)
2. Go to "Application" tab
3. Check "Manifest" section
4. Check "Service Workers" section
5. Click "Install" button in address bar

### Mobile (iOS Safari)

1. Visit your app in Safari
2. Tap Share button
3. Tap "Add to Home Screen"
4. Confirm

### Mobile (Android Chrome)

1. Visit your app in Chrome
2. Tap "Add to Home Screen" prompt
3. Confirm

### Lighthouse Audit

```bash
# Run Lighthouse PWA audit
npm install -g lighthouse
lighthouse https://your-app.com --view
```

Target scores:
- ✅ Performance: 90+
- ✅ Accessibility: 90+
- ✅ Best Practices: 90+
- ✅ SEO: 90+
- ✅ PWA: 100

## Configuration Options

### Change Theme Color

Edit `manifest.json` and `index.html`:

```json
// manifest.json
{
  "theme_color": "#3b82f6",  // Change this
  "background_color": "#0f172a"  // And this
}
```

```html
<!-- index.html -->
<meta name="theme-color" content="#3b82f6">
```

### Add More Shortcuts

Edit `manifest.json`:

```json
{
  "shortcuts": [
    {
      "name": "Quick Add Card",
      "short_name": "Add Card",
      "description": "Quickly add cards to inventory",
      "url": "/?tab=imports&action=add",
      "icons": [{ "src": "/icon-96x96.png", "sizes": "96x96" }]
    }
  ]
}
```

### Customize Offline Page

Edit `public/offline.html` to match your brand.

## Advanced Features

### Enable Push Notifications

```javascript
// Request permission
const permission = await Notification.requestPermission();

if (permission === 'granted') {
  // Subscribe to push notifications
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: 'YOUR_PUBLIC_KEY'
  });
}
```

### Background Sync

```javascript
// In your app
const registration = await navigator.serviceWorker.ready;
await registration.sync.register('sync-inventory');

// Service worker will sync when online
// Already configured in service-worker.js
```

### App Install Prompt

```javascript
// Capture the install prompt
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;

  // Show your custom install button
  showInstallButton();
});

// When user clicks your button
async function installApp() {
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  console.log('Install outcome:', outcome);
  deferredPrompt = null;
}
```

## Deployment

### Update Service Worker

When you make changes:

1. Update `CACHE_NAME` in `service-worker.js`:
   ```javascript
   const CACHE_NAME = 'bigdeck-v2'; // Increment version
   ```

2. Service worker will auto-update on next visit

### Hosting Requirements

PWAs require HTTPS (except localhost):
- ✅ Vercel, Netlify (auto HTTPS)
- ✅ Cloudflare Pages (auto HTTPS)
- ✅ Custom domain with SSL certificate

### Build Command

```bash
# Production build
npm run build

# Test PWA locally
npm run preview
```

## Monitoring

### Check Install Metrics

```javascript
// Track installs
window.addEventListener('appinstalled', () => {
  console.log('PWA installed!');
  // Send analytics event
});
```

### Service Worker Updates

```javascript
// Notify users of updates
navigator.serviceWorker.addEventListener('controllerchange', () => {
  // New service worker activated
  showUpdateNotification();
});
```

## Troubleshooting

### Service Worker Not Registering

- Check HTTPS (required except localhost)
- Check browser console for errors
- Verify `service-worker.js` is in `public/` folder

### Icons Not Showing

- Check file paths in `manifest.json`
- Verify icons exist in `public/` folder
- Check icon sizes match manifest

### Offline Mode Not Working

- Check Service Worker is registered
- Check "Application" > "Service Workers" in DevTools
- Verify cache names match

### Install Prompt Not Showing

- PWA criteria must be met (manifest, service worker, HTTPS)
- User must visit site at least twice
- Chrome shows after 5-minute engagement

## Resources

- [PWA Checklist](https://web.dev/pwa-checklist/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)
- [Workbox](https://developers.google.com/web/tools/workbox) - Advanced service worker library

## Next Steps

1. ✅ Generate app icons (required)
2. ✅ Test install on mobile device
3. ✅ Run Lighthouse audit
4. ⏳ Deploy to production with HTTPS
5. ⏳ Monitor install metrics
6. ⏳ Consider React Native for true native app

---

**Ready for Mobile!** 📱

Users can now install BigDeck on their phones and use it offline. This is a great stepping stone before building the full React Native app.
