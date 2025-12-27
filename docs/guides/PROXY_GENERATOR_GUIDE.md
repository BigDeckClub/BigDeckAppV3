# Proxy Generator - Implementation Guide

## Overview

The proxy generator has been updated to fetch card data from Scryfall and use category-based artwork templates instead of procedural generation.

## What Changed

### Before
- Procedural background generation based on card type
- Generic gradient and pattern overlays
- All artwork generated programmatically

### After
- Card data fetched from Scryfall API (Name, Type Line, Mana Cost, Oracle Text)
- Category-based artwork templates (your artwork or artist-contributed)
- Support for premium artist template collections

## How It Works

1. **Card Data Fetching**: When generating proxies, the system fetches complete card data from Scryfall
2. **Category Detection**: Cards are automatically categorized based on their type line (creature, instant, sorcery, etc.)
3. **Template Selection**: The appropriate artwork template is selected based on category
4. **PDF Generation**: Cards are laid out 3x3 per page with the template artwork and Scryfall text data

## Artwork Template System

### Standard Templates
Located in `public/templates/card-art/`:
- `creature.jpg`
- `instant.jpg`
- `sorcery.jpg`
- `artifact.jpg`
- `enchantment.jpg`
- `planeswalker.jpg`
- `land.jpg`
- `battle.jpg`
- `default.jpg`

### Premium Templates
Located in `public/templates/card-art/premium/{artist-name}/`:
- Each artist has their own subdirectory
- Contains the same 9 template files
- Registered in `PREMIUM_TEMPLATES` constant in `proxyGenerator.js`

## Usage

### Basic (Standard Templates)
```javascript
import { generateProxyPDF } from './utils/proxyGenerator';

await generateProxyPDF([
    { name: 'Lightning Bolt', quantity: 4 },
    { name: 'Counterspell', quantity: 2 }
]);
```

### Premium Artist Templates
```javascript
await generateProxyPDF(deckList, {
    templateStyle: 'artist-name'
});
```

## Data Fetched from Scryfall

For each card, the following data is retrieved:
- **Name**: Card name
- **Type Line**: Full type line (e.g., "Creature — Human Wizard")
- **Mana Cost**: Mana cost string (e.g., "{2}{U}{U}")
- **Oracle Text**: Rules text
- **Power/Toughness**: For creatures

## Adding New Artwork Templates

1. Create artwork templates for each category (9 total)
2. Place them in `public/templates/card-art/` for standard templates
3. For premium templates:
   - Create subdirectory in `public/templates/card-art/premium/{artist-name}/`
   - Add all 9 category templates
   - Register in `PREMIUM_TEMPLATES` in `src/utils/proxyGenerator.js`

## Template Specifications

- **Format**: JPEG (recommended) or PNG
- **Minimum Dimensions**: 300x420 pixels (higher for better print quality)
- **Aspect Ratio**: ~5:7 (matches Magic card artwork area)
- **File Size**: Keep under 500KB for fast loading

## Current Integration

The proxy generator is currently integrated in:
- `src/components/aidbuilder/AIDeckBuilder.jsx` (line 279)
- Called when user clicks "Print Proxies" button
- Automatically uses AI-generated deck list

## Next Steps

1. **Create Artwork Templates**: Design and add the 9 base category templates
2. **Test Template Loading**: Verify templates load correctly in the PDF generator
3. **Artist Onboarding**: Set up process for artists to submit premium templates
4. **Premium Template Marketplace**: Consider adding selection UI for premium templates
5. **Template Preview**: Add UI to preview templates before generating PDFs

## File Structure

```
src/utils/proxyGenerator.js           # Main generator logic
public/templates/card-art/            # Standard template storage
public/templates/card-art/premium/    # Premium template storage
public/templates/card-art/README.md   # Template documentation
```

## Notes

- Templates are loaded asynchronously and cached by the browser
- If a template fails to load, a placeholder is shown with the category name
- Category detection is case-insensitive and prioritized (e.g., "Artifact Creature" → creature)
- Scryfall API has rate limits (10 requests/second); batch fetching optimizes this
