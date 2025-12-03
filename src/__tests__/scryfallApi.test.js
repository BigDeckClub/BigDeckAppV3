import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { searchCards, getAllSets } from '../utils/scryfallApi';

describe('scryfallApi', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('searchCards', () => {
    it('should return card data on successful search', async () => {
      const mockData = {
        data: [
          { name: 'Black Lotus', set: 'lea' },
          { name: 'Black Lotus', set: '2ed' },
        ],
      };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      const result = await searchCards('black lotus');

      expect(result).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.scryfall.com/cards/search?q=black%20lotus&unique=prints'
      );
    });

    it('should encode special characters in query', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });

      await searchCards('name:"Sol Ring"');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('q=name%3A%22Sol%20Ring%22')
      );
    });

    it('should return empty data array on failed response', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const result = await searchCards('nonexistent card xyz');

      expect(result).toEqual({ data: [] });
    });
  });

  describe('getAllSets', () => {
    it('should return filtered and mapped sets on success', async () => {
      const mockData = {
        data: [
          { code: 'lea', name: 'Limited Edition Alpha', set_type: 'core' },
          { code: 'tmm3', name: 'Token Set', set_type: 'token' },
          { code: 'plst', name: 'The List', set_type: 'memorabilia' },
          { code: 'dom', name: 'Dominaria', set_type: 'expansion' },
        ],
      };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      const result = await getAllSets();

      expect(result).toEqual([
        { code: 'LEA', name: 'Limited Edition Alpha' },
        { code: 'DOM', name: 'Dominaria' },
      ]);
      expect(result).toHaveLength(2);
    });

    it('should filter out token sets', async () => {
      const mockData = {
        data: [
          { code: 'tmm3', name: 'Token Set', set_type: 'token' },
        ],
      };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      const result = await getAllSets();

      expect(result).toEqual([]);
    });

    it('should filter out memorabilia sets', async () => {
      const mockData = {
        data: [
          { code: 'plst', name: 'The List', set_type: 'memorabilia' },
        ],
      };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      const result = await getAllSets();

      expect(result).toEqual([]);
    });

    it('should uppercase set codes', async () => {
      const mockData = {
        data: [
          { code: 'mh2', name: 'Modern Horizons 2', set_type: 'draft_innovation' },
        ],
      };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      const result = await getAllSets();

      expect(result[0].code).toBe('MH2');
    });

    it('should return empty data on failed response', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const result = await getAllSets();

      expect(result).toEqual({ data: [] });
    });
  });
});
