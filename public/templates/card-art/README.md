# Card Artwork Templates

This directory contains artwork templates for proxy card generation.

## Template Structure

Templates are organized by card type/category. Each template is a JPEG image that will be used as the artwork section of proxy cards.

### Standard Templates

Place your base templates in this directory:

```
public/templates/card-art/
├── creature.jpg       - Used for creature cards
├── instant.jpg        - Used for instant cards
├── sorcery.jpg        - Used for sorcery cards
├── artifact.jpg       - Used for artifact cards
├── enchantment.jpg    - Used for enchantment cards
├── planeswalker.jpg   - Used for planeswalker cards
├── land.jpg           - Used for land cards
├── battle.jpg         - Used for battle cards
└── default.jpg        - Fallback for unknown types
```

### Premium Artist Templates

Premium templates created by invited artists should be organized in subdirectories:

```
public/templates/card-art/premium/
├── artist-name-1/
│   ├── creature.jpg
│   ├── instant.jpg
│   ├── sorcery.jpg
│   └── ... (all card types)
└── artist-name-2/
    ├── creature.jpg
    └── ... (all card types)
```

To register a premium template set, add it to `PREMIUM_TEMPLATES` in `src/utils/proxyGenerator.js`:

```javascript
const PREMIUM_TEMPLATES = {
    'artist-name-1': {
        creature: `${TEMPLATE_BASE_PATH}/premium/artist-name-1/creature.jpg`,
        instant: `${TEMPLATE_BASE_PATH}/premium/artist-name-1/instant.jpg`,
        // ... etc
    }
};
```

## Template Specifications

- **Format**: JPEG (recommended) or PNG
- **Dimensions**: Recommended 300x420 pixels minimum (for print quality)
- **Aspect Ratio**: Approximately 5:7 (matches Magic card artwork area)
- **File Size**: Keep under 500KB per template for fast loading

## Using Templates

### Default Usage (Standard Templates)

```javascript
await generateProxyPDF([
    { name: 'Lightning Bolt', quantity: 4 },
    { name: 'Counterspell', quantity: 2 }
]);
```

### Premium Template Usage

```javascript
await generateProxyPDF(deckList, {
    templateStyle: 'artist-name-1'
});
```

## Category Assignment

Cards are automatically assigned to categories based on their type line:

- `creature` - Cards with "Creature" in type line
- `instant` - Cards with "Instant" in type line
- `sorcery` - Cards with "Sorcery" in type line
- `artifact` - Cards with "Artifact" in type line
- `enchantment` - Cards with "Enchantment" in type line
- `planeswalker` - Cards with "Planeswalker" in type line
- `land` - Cards with "Land" in type line
- `battle` - Cards with "Battle" in type line
- `default` - Fallback for any other card type

## Contributing Artist Templates

If you're an artist interested in creating premium templates:

1. Create artwork for all 9 categories (8 card types + default)
2. Follow the template specifications above
3. Submit your templates with a unique artist identifier (e.g., `your-name`)
4. Templates will be reviewed and added to the premium collection
