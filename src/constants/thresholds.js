/**
 * Threshold presets for different card categories
 */
export const THRESHOLD_PRESETS = {
  'Basic Land': { threshold: 100, description: 'Stock heavily for casual decks' },
  'Staple Common': { threshold: 25, description: 'Core playables in multiple formats' },
  'Staple Uncommon': { threshold: 15, description: 'Format staples, moderate demand' },
  'Format Staple Rare': { threshold: 8, description: 'Competitive format staples' },
  'Bulk Common': { threshold: 10, description: 'General bulk inventory' },
  'Bulk Uncommon': { threshold: 5, description: 'Lower-demand bulk' },
};

/**
 * Quick preset configurations for shop types
 */
export const QUICK_PRESETS = {
  lowVolume: {
    label: '🏃 Low Volume Shop',
    baseStock: 5,
    landMultiplier: 15,
    velocityWeeks: 2,
    description: 'Minimal inventory, quick turnover'
  },
  balanced: {
    label: '⚖️ Balanced (Default)',
    baseStock: 10,
    landMultiplier: 10,
    velocityWeeks: 4,
    description: 'Standard settings for most shops'
  },
  highVolume: {
    label: '📦 High Volume Shop',
    baseStock: 20,
    landMultiplier: 15,
    velocityWeeks: 6,
    description: 'Large inventory, high turnover'
  },
  commander: {
    label: '🎴 Commander Focus',
    baseStock: 15,
    landMultiplier: 20,
    velocityWeeks: 4,
    description: 'Emphasis on lands for Commander'
  }
};

/**
 * Default threshold settings
 */
export const DEFAULT_SETTINGS = {
  baseStock: 10,
  landMultiplier: 10,
  velocityWeeks: 4
};
