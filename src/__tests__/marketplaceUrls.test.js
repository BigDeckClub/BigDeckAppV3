import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  MARKETPLACES,
  getPreferredMarketplace,
  setPreferredMarketplace,
  getMarketplaceKeys,
  getMarketplace,
  buildCartUrl,
  buildClipboardText,
} from '../utils/marketplaceUrls';

describe('marketplaceUrls', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  describe('MARKETPLACES', () => {
    it('should have tcgplayer, manapool, and cardkingdom entries', () => {
      expect(MARKETPLACES.tcgplayer).toBeDefined();
      expect(MARKETPLACES.manapool).toBeDefined();
      expect(MARKETPLACES.cardkingdom).toBeDefined();
    });

    it('should have required properties for each marketplace', () => {
      Object.values(MARKETPLACES).forEach(marketplace => {
        expect(marketplace.name).toBeDefined();
        expect(marketplace.icon).toBeDefined();
        expect(marketplace.color).toBeDefined();
        expect(typeof marketplace.buildCartUrl).toBe('function');
        expect(typeof marketplace.buildClipboardText).toBe('function');
      });
    });
  });

  describe('getPreferredMarketplace', () => {
    it('should return tcgplayer as default when no preference is set', () => {
      expect(getPreferredMarketplace()).toBe('tcgplayer');
    });

    it('should return stored preference', () => {
      localStorage.setItem('preferredMarketplace', 'manapool');
      expect(getPreferredMarketplace()).toBe('manapool');
    });
  });

  describe('setPreferredMarketplace', () => {
    it('should store preference in localStorage', () => {
      setPreferredMarketplace('cardkingdom');
      expect(localStorage.getItem('preferredMarketplace')).toBe('cardkingdom');
    });
  });

  describe('getMarketplaceKeys', () => {
    it('should return all marketplace keys', () => {
      const keys = getMarketplaceKeys();
      expect(keys).toContain('tcgplayer');
      expect(keys).toContain('manapool');
      expect(keys).toContain('cardkingdom');
    });
  });

  describe('getMarketplace', () => {
    it('should return marketplace config by key', () => {
      const marketplace = getMarketplace('tcgplayer');
      expect(marketplace.name).toBe('TCGPlayer');
    });

    it('should return undefined for invalid key', () => {
      expect(getMarketplace('invalid')).toBeUndefined();
    });
  });

  describe('buildCartUrl', () => {
    const testCards = [
      { name: 'Lightning Bolt', quantity: 4 },
      { name: 'Counterspell', quantity: 2 },
    ];

    it('should build TCGPlayer URL with proper format', () => {
      const url = buildCartUrl('tcgplayer', testCards);
      expect(url).toContain('tcgplayer.com/massentry');
      expect(url).toContain('productline=magic');
      expect(url).toContain('4%20Lightning%20Bolt');
    });

    it('should build Manapool URL with proper format', () => {
      const url = buildCartUrl('manapool', testCards);
      expect(url).toContain('manapool.com/cart/import');
    });

    it('should build Card Kingdom URL with proper format', () => {
      const url = buildCartUrl('cardkingdom', testCards);
      expect(url).toContain('cardkingdom.com/builder');
      expect(url).toContain('partner=bigdeck');
    });

    it('should return null for invalid marketplace', () => {
      expect(buildCartUrl('invalid', testCards)).toBeNull();
    });

    it('should return null for empty cards array', () => {
      expect(buildCartUrl('tcgplayer', [])).toBeNull();
    });
  });

  describe('buildClipboardText', () => {
    const testCards = [
      { name: 'Lightning Bolt', quantity: 4 },
      { name: 'Counterspell', quantity: 2 },
    ];

    it('should format TCGPlayer clipboard text', () => {
      const text = buildClipboardText('tcgplayer', testCards);
      expect(text).toBe('4 Lightning Bolt\n2 Counterspell');
    });

    it('should format Manapool clipboard text', () => {
      const text = buildClipboardText('manapool', testCards);
      expect(text).toBe('4 Lightning Bolt\n2 Counterspell');
    });

    it('should format Card Kingdom clipboard text with x suffix', () => {
      const text = buildClipboardText('cardkingdom', testCards);
      expect(text).toBe('4x Lightning Bolt\n2x Counterspell');
    });

    it('should return null for invalid marketplace', () => {
      expect(buildClipboardText('invalid', testCards)).toBeNull();
    });

    it('should return null for empty cards array', () => {
      expect(buildClipboardText('tcgplayer', [])).toBeNull();
    });
  });
});
