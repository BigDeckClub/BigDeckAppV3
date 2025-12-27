# PWA Icons - Quick Setup Guide

## Required Icons

Your PWA needs these icon files in the `public/` directory:

- [ ] `icon-72x72.png`
- [ ] `icon-96x96.png`
- [ ] `icon-128x128.png`
- [ ] `icon-144x144.png`
- [ ] `icon-152x152.png`
- [ ] `icon-192x192.png`
- [ ] `icon-384x384.png`
- [ ] `icon-512x512.png`

## Quick Generation Methods

### Option 1: Online Tool (Easiest) ⭐

1. Visit: https://www.pwabuilder.com/imageGenerator
2. Upload a 512x512 PNG logo
3. Click "Generate"
4. Download zip file
5. Extract all PNG files to `public/` folder

### Option 2: Photopea (Free Online Photoshop)

1. Visit: https://www.photopea.com
2. Create new image: 512x512 px
3. Design your logo (centered, with padding)
4. Export as PNG
5. Use Option 1 to generate all sizes

### Option 3: Canva (Free)

1. Create 512x512 design
2. Use "App Icon" template
3. Export as PNG
4. Use Option 1 to generate all sizes

### Option 4: ImageMagick (Command Line)

```bash
# Install ImageMagick first
# Windows: choco install imagemagick
# Mac: brew install imagemagick
# Linux: sudo apt-get install imagemagick

# Place your source logo.png in this directory, then run:

magick logo.png -resize 72x72 icon-72x72.png
magick logo.png -resize 96x96 icon-96x96.png
magick logo.png -resize 128x128 icon-128x128.png
magick logo.png -resize 144x144 icon-144x144.png
magick logo.png -resize 152x152 icon-152x152.png
magick logo.png -resize 192x192 icon-192x192.png
magick logo.png -resize 384x384 icon-384x384.png
magick logo.png -resize 512x512 icon-512x512.png
```

## Design Guidelines

### ✅ Do:
- Use simple, recognizable design
- High contrast for visibility
- Square canvas (1:1 ratio)
- Leave 10% padding around edges (safe zone)
- Use PNG format with transparency
- Center your icon
- Test on both light and dark backgrounds

### ❌ Don't:
- Include text (too small to read at icon size)
- Use complex gradients
- Use thin lines (< 2px)
- Fill entire canvas (needs padding)
- Use light colors on light backgrounds

## Testing Your Icons

### Browser DevTools
1. Open Chrome/Edge
2. Press F12 (DevTools)
3. Go to "Application" tab
4. Click "Manifest" in sidebar
5. Verify all icons show up

### Mobile Testing
1. Deploy to test server
2. Visit on mobile device
3. Tap "Add to Home Screen"
4. Check icon appearance

## Icon Specifications

### iOS Requirements
- 152x152 minimum
- 180x180 recommended for Retina displays
- No transparency (background will be white)
- Corners auto-rounded by iOS

### Android Requirements
- 192x192 minimum
- 512x512 for Play Store
- Transparency supported
- Can use "maskable" for adaptive icons

### PWA Requirements
- 192x192 and 512x512 required
- PNG format
- Served over HTTPS

## Example Icon Design (Text Description)

```
┌─────────────────────┐
│                     │
│   ┌─────────────┐   │ ← 10% padding
│   │             │   │
│   │   YOUR      │   │
│   │   LOGO      │   │
│   │   HERE      │   │
│   │             │   │
│   └─────────────┘   │
│                     │
└─────────────────────┘
  512x512 canvas
```

## Temporary Placeholder

Until you create icons, you can use a simple colored square:

```bash
# Create a solid color placeholder (temporary)
magick -size 512x512 xc:"#3b82f6" icon-512x512.png
magick icon-512x512.png -resize 192x192 icon-192x192.png
magick icon-512x512.png -resize 152x152 icon-152x152.png
# etc...
```

## Verification Checklist

After generating icons:

- [ ] All 8 icon files exist in `public/`
- [ ] Icons are PNG format
- [ ] Icons are square (1:1 ratio)
- [ ] Icons match specified sizes exactly
- [ ] Icon design is centered with padding
- [ ] Icons look good on light backgrounds
- [ ] Icons look good on dark backgrounds
- [ ] `manifest.json` paths are correct
- [ ] Icons show in DevTools > Manifest
- [ ] "Add to Home Screen" shows correct icon

## Troubleshooting

### Icons not showing in manifest
- Check file paths in `manifest.json`
- Verify files are in `public/` folder
- Clear browser cache
- Check browser console for 404 errors

### Icon looks pixelated
- Ensure source image is 512x512 or larger
- Use PNG (not JPG)
- Don't upscale small images

### Icon has white background on Android
- Use PNG with transparency
- Don't add background to source image
- Android will add its own background

## Need Help?

1. **Design help:** Use Canva app icon template
2. **Technical help:** Check manifest.json syntax
3. **Testing help:** Use Lighthouse PWA audit

## Quick Start (1 minute)

1. Visit https://www.pwabuilder.com/imageGenerator
2. Upload any 512x512 image (even a screenshot)
3. Download zip
4. Extract to `public/`
5. Done! ✅

---

**Status:** ✅ Icons generated and ready!
**Generated:** December 26, 2025
**Regenerate:** Run `npm run generate-icons` to regenerate from logo.svg
