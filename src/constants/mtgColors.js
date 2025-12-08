/**
 * MTG Color Constants and Filter Definitions
 * @module constants/mtgColors
 */

// The five colors of Magic in WUBRG order
export const MTG_COLORS = {
  W: { code: 'W', name: 'White', hex: '#F9FAF4', darkHex: '#F8E7B9' },
  U: { code: 'U', name: 'Blue', hex: '#0E68AB', darkHex: '#0A4E82' },
  B: { code: 'B', name: 'Black', hex: '#150B00', darkHex: '#2D2D2D' },
  R: { code: 'R', name: 'Red', hex: '#D3202A', darkHex: '#A31A22' },
  G: { code: 'G', name: 'Green', hex: '#00733E', darkHex: '#005C32' },
};

// Color order for consistent sorting (WUBRG)
export const COLOR_ORDER = ['W', 'U', 'B', 'R', 'G'];

// Colorless definition
export const COLORLESS = { code: 'C', name: 'Colorless', hex: '#CBC2BF', darkHex: '#9E9E9E' };

// Guild/Shard names for multi-color combinations
export const COLOR_PAIR_NAMES = {
  'WU': 'Azorius',
  'WB': 'Orzhov',
  'WR': 'Boros',
  'WG': 'Selesnya',
  'UB': 'Dimir',
  'UR': 'Izzet',
  'UG': 'Simic',
  'BR': 'Rakdos',
  'BG': 'Golgari',
  'RG': 'Gruul',
};

export const COLOR_TRIO_NAMES = {
  'WUB': 'Esper',
  'WUR': 'Jeskai',
  'WUG': 'Bant',
  'WBR': 'Mardu',
  'WBG': 'Abzan',
  'WRG': 'Naya',
  'UBR': 'Grixis',
  'UBG': 'Sultai',
  'URG': 'Temur',
  'BRG': 'Jund',
};

export const COLOR_QUAD_NAMES = {
  'WUBR': 'Yore-Tiller (Non-Green)',
  'WUBG': 'Witch-Maw (Non-Red)',
  'WURG': 'Ink-Treader (Non-Black)',
  'WBRG': 'Dune-Brood (Non-Blue)',
  'UBRG': 'Glint-Eye (Non-White)',
};

export const FIVE_COLOR_NAME = 'WUBRG';

/**
 * Filter type definitions
 * @typedef {'colorless' | 'mono' | 'exact'} ColorFilterType
 */

/**
 * Color filter object
 * @typedef {Object} ColorFilter
 * @property {ColorFilterType} type - Type of filter
 * @property {string[]} colors - Array of color codes (empty for colorless)
 * @property {string} label - Human-readable label
 * @property {string} id - Unique identifier for the filter
 */

/**
 * Get a normalized color key from an array of colors
 * @param {string[]} colors - Array of color codes
 * @returns {string} Normalized key (sorted in WUBRG order)
 */
export function getColorKey(colors) {
  if (!colors || colors.length === 0) return 'C';
  return [...colors].sort((a, b) => COLOR_ORDER.indexOf(a) - COLOR_ORDER.indexOf(b)).join('');
}

/**
 * Get display name for a color combination
 * @param {string[]} colors - Array of color codes
 * @returns {string} Display name (e.g., "Azorius", "Mono Red", "Colorless")
 */
export function getColorDisplayName(colors) {
  if (!colors || colors.length === 0) return 'Colorless';

  const key = getColorKey(colors);

  if (colors.length === 1) {
    return `Mono ${MTG_COLORS[colors[0]]?.name || colors[0]}`;
  }

  if (colors.length === 2) {
    return COLOR_PAIR_NAMES[key] || key;
  }

  if (colors.length === 3) {
    return COLOR_TRIO_NAMES[key] || key;
  }

  if (colors.length === 4) {
    return COLOR_QUAD_NAMES[key] || key;
  }

  if (colors.length === 5) {
    return 'Five Color';
  }

  return key;
}

/**
 * Create a color filter object
 * @param {ColorFilterType} type - Filter type
 * @param {string[]} colors - Color codes
 * @returns {ColorFilter} Filter object
 */
export function createColorFilter(type, colors = []) {
  const sortedColors = [...colors].sort((a, b) => COLOR_ORDER.indexOf(a) - COLOR_ORDER.indexOf(b));
  const id = type === 'colorless' ? 'colorless' : `${type}-${getColorKey(sortedColors)}`;

  let label;
  if (type === 'colorless') {
    label = 'Colorless';
  } else if (type === 'mono') {
    label = `Mono ${MTG_COLORS[sortedColors[0]]?.name || sortedColors[0]}`;
  } else {
    label = getColorDisplayName(sortedColors);
  }

  return {
    type,
    colors: sortedColors,
    label,
    id,
  };
}

/**
 * Predefined filter options for the UI
 */
export const PRESET_COLOR_FILTERS = [
  // Colorless
  createColorFilter('colorless', []),

  // Mono colors
  createColorFilter('mono', ['W']),
  createColorFilter('mono', ['U']),
  createColorFilter('mono', ['B']),
  createColorFilter('mono', ['R']),
  createColorFilter('mono', ['G']),

  // Two-color (guilds)
  createColorFilter('exact', ['W', 'U']),
  createColorFilter('exact', ['U', 'B']),
  createColorFilter('exact', ['B', 'R']),
  createColorFilter('exact', ['R', 'G']),
  createColorFilter('exact', ['G', 'W']),
  createColorFilter('exact', ['W', 'B']),
  createColorFilter('exact', ['U', 'R']),
  createColorFilter('exact', ['B', 'G']),
  createColorFilter('exact', ['R', 'W']),
  createColorFilter('exact', ['G', 'U']),

  // Three-color (shards/wedges)
  createColorFilter('exact', ['W', 'U', 'B']),
  createColorFilter('exact', ['U', 'B', 'R']),
  createColorFilter('exact', ['B', 'R', 'G']),
  createColorFilter('exact', ['R', 'G', 'W']),
  createColorFilter('exact', ['G', 'W', 'U']),
  createColorFilter('exact', ['W', 'B', 'G']),
  createColorFilter('exact', ['U', 'R', 'W']),
  createColorFilter('exact', ['B', 'G', 'U']),
  createColorFilter('exact', ['R', 'W', 'B']),
  createColorFilter('exact', ['G', 'U', 'R']),
];

/**
 * Check if a card's color identity matches a filter
 * @param {string[]} cardColors - Card's color identity array from Scryfall
 * @param {ColorFilter} filter - Filter to check against
 * @returns {boolean} True if card matches filter
 */
export function matchesColorFilter(cardColors, filter) {
  const colors = cardColors || [];

  switch (filter.type) {
    case 'colorless':
      return colors.length === 0;

    case 'mono':
      return colors.length === 1 && colors[0] === filter.colors[0];

    case 'exact':
      if (colors.length !== filter.colors.length) return false;
      const sortedCard = getColorKey(colors);
      const sortedFilter = getColorKey(filter.colors);
      return sortedCard === sortedFilter;

    default:
      return false;
  }
}

/**
 * Check if a card matches any of the selected filters (OR logic)
 * @param {string[]} cardColors - Card's color identity array
 * @param {ColorFilter[]} filters - Array of active filters
 * @returns {boolean} True if card matches at least one filter
 */
export function matchesAnyColorFilter(cardColors, filters) {
  if (!filters || filters.length === 0) return true;
  return filters.some(filter => matchesColorFilter(cardColors, filter));
}
