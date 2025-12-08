/**
 * Tests for MTG color constants and filter logic
 */
import { describe, it, expect } from 'vitest';
import {
  MTG_COLORS,
  COLOR_ORDER,
  COLORLESS,
  COLOR_PAIR_NAMES,
  COLOR_TRIO_NAMES,
  getColorKey,
  getColorDisplayName,
  createColorFilter,
  matchesColorFilter,
  matchesAnyColorFilter,
  PRESET_COLOR_FILTERS,
} from '../constants/mtgColors';

describe('MTG Color Constants', () => {
  it('should have all five colors defined', () => {
    expect(MTG_COLORS.W).toBeDefined();
    expect(MTG_COLORS.U).toBeDefined();
    expect(MTG_COLORS.B).toBeDefined();
    expect(MTG_COLORS.R).toBeDefined();
    expect(MTG_COLORS.G).toBeDefined();
  });

  it('should have colors in WUBRG order', () => {
    expect(COLOR_ORDER).toEqual(['W', 'U', 'B', 'R', 'G']);
  });

  it('should have colorless defined', () => {
    expect(COLORLESS.code).toBe('C');
    expect(COLORLESS.name).toBe('Colorless');
  });

  it('should have guild names for all color pairs', () => {
    expect(COLOR_PAIR_NAMES['WU']).toBe('Azorius');
    expect(COLOR_PAIR_NAMES['UB']).toBe('Dimir');
    expect(COLOR_PAIR_NAMES['BR']).toBe('Rakdos');
    expect(COLOR_PAIR_NAMES['RG']).toBe('Gruul');
    expect(COLOR_PAIR_NAMES['WG']).toBe('Selesnya');
  });

  it('should have shard/wedge names for three-color combinations', () => {
    expect(COLOR_TRIO_NAMES['WUB']).toBe('Esper');
    expect(COLOR_TRIO_NAMES['BRG']).toBe('Jund');
    expect(COLOR_TRIO_NAMES['WUR']).toBe('Jeskai');
  });
});

describe('getColorKey', () => {
  it('should return C for empty or null colors', () => {
    expect(getColorKey([])).toBe('C');
    expect(getColorKey(null)).toBe('C');
    expect(getColorKey(undefined)).toBe('C');
  });

  it('should return single color for mono', () => {
    expect(getColorKey(['R'])).toBe('R');
    expect(getColorKey(['W'])).toBe('W');
  });

  it('should sort colors in WUBRG order', () => {
    expect(getColorKey(['U', 'W'])).toBe('WU');
    expect(getColorKey(['R', 'B'])).toBe('BR');
    expect(getColorKey(['G', 'R', 'B'])).toBe('BRG');
    expect(getColorKey(['G', 'W', 'U', 'B', 'R'])).toBe('WUBRG');
  });
});

describe('getColorDisplayName', () => {
  it('should return Colorless for empty colors', () => {
    expect(getColorDisplayName([])).toBe('Colorless');
    expect(getColorDisplayName(null)).toBe('Colorless');
  });

  it('should return Mono X for single colors', () => {
    expect(getColorDisplayName(['R'])).toBe('Mono Red');
    expect(getColorDisplayName(['W'])).toBe('Mono White');
    expect(getColorDisplayName(['U'])).toBe('Mono Blue');
    expect(getColorDisplayName(['B'])).toBe('Mono Black');
    expect(getColorDisplayName(['G'])).toBe('Mono Green');
  });

  it('should return guild names for two colors', () => {
    expect(getColorDisplayName(['W', 'U'])).toBe('Azorius');
    expect(getColorDisplayName(['U', 'W'])).toBe('Azorius');
    expect(getColorDisplayName(['B', 'R'])).toBe('Rakdos');
  });

  it('should return shard/wedge names for three colors', () => {
    expect(getColorDisplayName(['W', 'U', 'B'])).toBe('Esper');
    expect(getColorDisplayName(['B', 'R', 'G'])).toBe('Jund');
  });

  it('should return Five Color for all five colors', () => {
    expect(getColorDisplayName(['W', 'U', 'B', 'R', 'G'])).toBe('Five Color');
  });
});

describe('createColorFilter', () => {
  it('should create colorless filter', () => {
    const filter = createColorFilter('colorless', []);
    expect(filter.id).toBe('colorless');
    expect(filter.type).toBe('colorless');
    expect(filter.colors).toEqual([]);
    expect(filter.label).toBe('Colorless');
  });

  it('should create mono color filter', () => {
    const filter = createColorFilter('mono', ['R']);
    expect(filter.id).toBe('mono-R');
    expect(filter.type).toBe('mono');
    expect(filter.colors).toEqual(['R']);
    expect(filter.label).toBe('Mono Red');
  });

  it('should create exact multi-color filter', () => {
    const filter = createColorFilter('exact', ['U', 'W']);
    expect(filter.id).toBe('exact-WU');
    expect(filter.type).toBe('exact');
    expect(filter.colors).toEqual(['W', 'U']);
    expect(filter.label).toBe('Azorius');
  });

  it('should sort colors in WUBRG order', () => {
    const filter = createColorFilter('exact', ['G', 'R', 'B']);
    expect(filter.colors).toEqual(['B', 'R', 'G']);
  });
});

describe('matchesColorFilter', () => {
  describe('colorless filter', () => {
    const colorlessFilter = createColorFilter('colorless', []);

    it('should match cards with empty color identity', () => {
      expect(matchesColorFilter([], colorlessFilter)).toBe(true);
    });

    it('should match cards with null/undefined color identity', () => {
      expect(matchesColorFilter(null, colorlessFilter)).toBe(true);
      expect(matchesColorFilter(undefined, colorlessFilter)).toBe(true);
    });

    it('should not match colored cards', () => {
      expect(matchesColorFilter(['R'], colorlessFilter)).toBe(false);
      expect(matchesColorFilter(['W', 'U'], colorlessFilter)).toBe(false);
    });
  });

  describe('mono color filter', () => {
    const monoRedFilter = createColorFilter('mono', ['R']);

    it('should match exactly mono colored cards', () => {
      expect(matchesColorFilter(['R'], monoRedFilter)).toBe(true);
    });

    it('should not match multi-colored cards containing that color', () => {
      expect(matchesColorFilter(['R', 'G'], monoRedFilter)).toBe(false);
      expect(matchesColorFilter(['W', 'R'], monoRedFilter)).toBe(false);
    });

    it('should not match different mono color', () => {
      expect(matchesColorFilter(['G'], monoRedFilter)).toBe(false);
      expect(matchesColorFilter(['W'], monoRedFilter)).toBe(false);
    });

    it('should not match colorless', () => {
      expect(matchesColorFilter([], monoRedFilter)).toBe(false);
    });
  });

  describe('exact multi-color filter', () => {
    const azoriusFilter = createColorFilter('exact', ['W', 'U']);

    it('should match exactly Azorius cards', () => {
      expect(matchesColorFilter(['W', 'U'], azoriusFilter)).toBe(true);
      expect(matchesColorFilter(['U', 'W'], azoriusFilter)).toBe(true);
    });

    it('should not match cards with different colors', () => {
      expect(matchesColorFilter(['W', 'B'], azoriusFilter)).toBe(false);
      expect(matchesColorFilter(['U', 'B'], azoriusFilter)).toBe(false);
    });

    it('should not match cards with more colors (Esper includes WU)', () => {
      expect(matchesColorFilter(['W', 'U', 'B'], azoriusFilter)).toBe(false);
    });

    it('should not match mono color cards', () => {
      expect(matchesColorFilter(['W'], azoriusFilter)).toBe(false);
      expect(matchesColorFilter(['U'], azoriusFilter)).toBe(false);
    });
  });

  describe('three-color filter', () => {
    const esperFilter = createColorFilter('exact', ['W', 'U', 'B']);

    it('should match exactly Esper cards', () => {
      expect(matchesColorFilter(['W', 'U', 'B'], esperFilter)).toBe(true);
      expect(matchesColorFilter(['B', 'W', 'U'], esperFilter)).toBe(true);
    });

    it('should not match two-color subsets', () => {
      expect(matchesColorFilter(['W', 'U'], esperFilter)).toBe(false);
      expect(matchesColorFilter(['U', 'B'], esperFilter)).toBe(false);
    });

    it('should not match four-color cards', () => {
      expect(matchesColorFilter(['W', 'U', 'B', 'R'], esperFilter)).toBe(false);
    });
  });
});

describe('matchesAnyColorFilter', () => {
  it('should return true when no filters are applied', () => {
    expect(matchesAnyColorFilter(['R'], [])).toBe(true);
    expect(matchesAnyColorFilter([], [])).toBe(true);
    expect(matchesAnyColorFilter(['W', 'U', 'B', 'R', 'G'], [])).toBe(true);
  });

  it('should return true if card matches any single filter (OR logic)', () => {
    const filters = [
      createColorFilter('mono', ['R']),
      createColorFilter('mono', ['G']),
    ];

    expect(matchesAnyColorFilter(['R'], filters)).toBe(true);
    expect(matchesAnyColorFilter(['G'], filters)).toBe(true);
    expect(matchesAnyColorFilter(['W'], filters)).toBe(false);
    expect(matchesAnyColorFilter(['R', 'G'], filters)).toBe(false); // This is Gruul, not mono
  });

  it('should work with mixed filter types', () => {
    const filters = [
      createColorFilter('colorless', []),
      createColorFilter('mono', ['R']),
      createColorFilter('exact', ['W', 'U']),
    ];

    expect(matchesAnyColorFilter([], filters)).toBe(true);
    expect(matchesAnyColorFilter(['R'], filters)).toBe(true);
    expect(matchesAnyColorFilter(['W', 'U'], filters)).toBe(true);
    expect(matchesAnyColorFilter(['G'], filters)).toBe(false);
    expect(matchesAnyColorFilter(['W'], filters)).toBe(false);
  });

  it('should handle complex multi-selection scenarios', () => {
    // User wants to see: Mono Red OR exactly Black/White OR Colorless
    const filters = [
      createColorFilter('mono', ['R']),
      createColorFilter('exact', ['W', 'B']),
      createColorFilter('colorless', []),
    ];

    expect(matchesAnyColorFilter(['R'], filters)).toBe(true);
    expect(matchesAnyColorFilter(['W', 'B'], filters)).toBe(true);
    expect(matchesAnyColorFilter(['B', 'W'], filters)).toBe(true);
    expect(matchesAnyColorFilter([], filters)).toBe(true);
    expect(matchesAnyColorFilter(['W'], filters)).toBe(false);
    expect(matchesAnyColorFilter(['B'], filters)).toBe(false);
    expect(matchesAnyColorFilter(['W', 'B', 'R'], filters)).toBe(false);
  });
});

describe('PRESET_COLOR_FILTERS', () => {
  it('should include colorless filter', () => {
    const colorless = PRESET_COLOR_FILTERS.find(f => f.type === 'colorless');
    expect(colorless).toBeDefined();
    expect(colorless.id).toBe('colorless');
  });

  it('should include all five mono color filters', () => {
    const monoFilters = PRESET_COLOR_FILTERS.filter(f => f.type === 'mono');
    expect(monoFilters).toHaveLength(5);
    expect(monoFilters.map(f => f.colors[0]).sort()).toEqual(['B', 'G', 'R', 'U', 'W']);
  });

  it('should include all 10 two-color (guild) filters', () => {
    const twoColorFilters = PRESET_COLOR_FILTERS.filter(f => f.type === 'exact' && f.colors.length === 2);
    expect(twoColorFilters).toHaveLength(10);
  });

  it('should include all 10 three-color (shard/wedge) filters', () => {
    const threeColorFilters = PRESET_COLOR_FILTERS.filter(f => f.type === 'exact' && f.colors.length === 3);
    expect(threeColorFilters).toHaveLength(10);
  });
});
