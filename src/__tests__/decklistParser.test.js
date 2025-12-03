import { describe, it, expect } from 'vitest';
import { parseDeckList, extractArchidektDeckId } from '../utils/decklistParser';

describe('decklistParser', () => {
  describe('parseDeckList', () => {
    it('parses basic card entries with quantity', () => {
      const input = '4 Black Lotus';
      const result = parseDeckList(input);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        quantity: 4,
        name: 'Black Lotus',
        set: 'Unknown',
        scryfall_id: null,
        image_url: null
      });
    });

    it('parses card entries with x notation', () => {
      const input = '4x Lightning Bolt';
      const result = parseDeckList(input);
      expect(result).toHaveLength(1);
      expect(result[0].quantity).toBe(4);
      expect(result[0].name).toBe('Lightning Bolt');
    });

    it('parses card entries with X notation (uppercase)', () => {
      const input = '2X Counterspell';
      const result = parseDeckList(input);
      expect(result).toHaveLength(1);
      expect(result[0].quantity).toBe(2);
      expect(result[0].name).toBe('Counterspell');
    });

    it('parses card entries with set code in parentheses', () => {
      const input = '4 Lightning Bolt (MH2)';
      const result = parseDeckList(input);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        quantity: 4,
        name: 'Lightning Bolt',
        set: 'MH2',
        scryfall_id: null,
        image_url: null
      });
    });

    it('parses card entries with set code and collector number', () => {
      const input = '4 Lightning Bolt (MH2) 123';
      const result = parseDeckList(input);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Lightning Bolt');
      expect(result[0].set).toBe('MH2');
    });

    it('parses multiple cards from multiline input', () => {
      const input = `4 Black Lotus
3 Ancestral Recall
2 Time Walk`;
      const result = parseDeckList(input);
      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('Black Lotus');
      expect(result[1].name).toBe('Ancestral Recall');
      expect(result[2].name).toBe('Time Walk');
    });

    it('skips empty lines', () => {
      const input = `4 Black Lotus

3 Ancestral Recall`;
      const result = parseDeckList(input);
      expect(result).toHaveLength(2);
    });

    it('skips comment lines starting with //', () => {
      const input = `// Main deck
4 Black Lotus
// Sideboard
3 Ancestral Recall`;
      const result = parseDeckList(input);
      expect(result).toHaveLength(2);
    });

    it('converts lowercase set codes to uppercase', () => {
      const input = '4 Card Name (mh2)';
      const result = parseDeckList(input);
      expect(result[0].set).toBe('MH2');
    });

    it('returns empty array for empty input', () => {
      expect(parseDeckList('')).toEqual([]);
    });

    it('returns empty array for input with only comments', () => {
      const input = `// Comment 1
// Comment 2`;
      expect(parseDeckList(input)).toEqual([]);
    });

    it('handles cards with special characters in names', () => {
      const input = "4 Jace, the Mind Sculptor";
      const result = parseDeckList(input);
      expect(result[0].name).toBe("Jace, the Mind Sculptor");
    });
  });

  describe('extractArchidektDeckId', () => {
    it('extracts deck ID from basic URL', () => {
      const url = 'https://archidekt.com/decks/1234567';
      expect(extractArchidektDeckId(url)).toBe('1234567');
    });

    it('extracts deck ID from URL with trailing slash', () => {
      const url = 'https://archidekt.com/decks/1234567/';
      expect(extractArchidektDeckId(url)).toBe('1234567');
    });

    it('extracts deck ID from URL with deck name', () => {
      const url = 'https://archidekt.com/decks/1234567/my-awesome-deck';
      expect(extractArchidektDeckId(url)).toBe('1234567');
    });

    it('extracts deck ID from URL with www prefix', () => {
      const url = 'https://www.archidekt.com/decks/1234567';
      expect(extractArchidektDeckId(url)).toBe('1234567');
    });

    it('is case-insensitive', () => {
      const url = 'https://ARCHIDEKT.COM/decks/1234567';
      expect(extractArchidektDeckId(url)).toBe('1234567');
    });

    it('returns null for invalid URL', () => {
      expect(extractArchidektDeckId('not a url')).toBeNull();
    });

    it('returns null for URL from different domain', () => {
      expect(extractArchidektDeckId('https://moxfield.com/decks/123')).toBeNull();
    });

    it('returns null for Archidekt URL without deck path', () => {
      expect(extractArchidektDeckId('https://archidekt.com/')).toBeNull();
    });
  });
});
