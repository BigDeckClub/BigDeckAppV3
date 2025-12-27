/**
 * Tests for Zod validation schemas
 */

import { describe, it, expect } from 'vitest';
import {
  IdSchema,
  CardSchema,
  AddInventorySchema,
  UpdateInventorySchema,
  CreateDeckSchema,
  UpdateDeckSchema,
  GenerateDeckSchema,
  validate
} from '../validation/schemas.js';

describe('Validation Schemas', () => {
  describe('IdSchema', () => {
    it('should accept valid UUIDs', () => {
      const result = IdSchema.parse('550e8400-e29b-41d4-a716-446655440000');
      expect(result).toBe('550e8400-e29b-41d4-a716-446655440000');
    });

    it('should accept positive integers', () => {
      const result = IdSchema.parse(123);
      expect(result).toBe(123);
    });

    it('should accept numeric strings and convert to numbers', () => {
      const result = IdSchema.parse('456');
      expect(result).toBe(456);
    });

    it('should reject negative numbers', () => {
      expect(() => IdSchema.parse(-1)).toThrow();
    });

    it('should reject zero', () => {
      expect(() => IdSchema.parse(0)).toThrow();
    });
  });

  describe('CardSchema', () => {
    it('should accept valid card data', () => {
      const card = {
        name: 'Lightning Bolt',
        set: 'MH3',
        quantity: 4,
        foil: false,
        quality: 'NM'
      };

      const result = CardSchema.parse(card);
      expect(result.name).toBe('Lightning Bolt');
      expect(result.quantity).toBe(4);
    });

    it('should accept card with set object', () => {
      const card = {
        name: 'Sol Ring',
        set: {
          editionname: 'Commander Masters',
          editioncode: 'CMM'
        },
        quantity: 1
      };

      const result = CardSchema.parse(card);
      expect(result.set.editionname).toBe('Commander Masters');
    });

    it('should use default values', () => {
      const card = {
        name: 'Forest'
      };

      const result = CardSchema.parse(card);
      expect(result.quantity).toBe(1);
      expect(result.foil).toBe(false);
      expect(result.quality).toBe('NM');
      expect(result.folder).toBe('Uncategorized');
    });

    it('should reject invalid quality', () => {
      const card = {
        name: 'Island',
        quality: 'INVALID'
      };

      expect(() => CardSchema.parse(card)).toThrow();
    });

    it('should reject missing name', () => {
      const card = {
        set: 'MH3'
      };

      expect(() => CardSchema.parse(card)).toThrow();
    });
  });

  describe('AddInventorySchema', () => {
    it('should accept valid inventory data', () => {
      const data = {
        name: 'Counterspell',
        set: 'MH3',
        quantity: 3,
        purchase_price: 2.50,
        folder: 'Blue Cards',
        foil: true,
        quality: 'LP'
      };

      const result = AddInventorySchema.parse(data);
      expect(result.name).toBe('Counterspell');
      expect(result.quantity).toBe(3);
      expect(result.purchase_price).toBe(2.50);
    });

    it('should reject negative quantities', () => {
      const data = {
        name: 'Island',
        quantity: -1
      };

      expect(() => AddInventorySchema.parse(data)).toThrow();
    });

    it('should reject zero quantities', () => {
      const data = {
        name: 'Island',
        quantity: 0
      };

      expect(() => AddInventorySchema.parse(data)).toThrow();
    });
  });

  describe('UpdateInventorySchema', () => {
    it('should accept partial updates', () => {
      const data = {
        quantity: 5
      };

      const result = UpdateInventorySchema.parse(data);
      expect(result.quantity).toBe(5);
    });

    it('should accept zero quantity for updates', () => {
      const data = {
        quantity: 0
      };

      const result = UpdateInventorySchema.parse(data);
      expect(result.quantity).toBe(0);
    });

    it('should reject empty updates', () => {
      expect(() => UpdateInventorySchema.parse({})).toThrow();
    });

    it('should accept multiple field updates', () => {
      const data = {
        quantity: 3,
        folder: 'Lands',
        quality: 'MP'
      };

      const result = UpdateInventorySchema.parse(data);
      expect(result.quantity).toBe(3);
      expect(result.folder).toBe('Lands');
      expect(result.quality).toBe('MP');
    });
  });

  describe('CreateDeckSchema', () => {
    it('should accept valid deck data', () => {
      const deck = {
        name: 'Atraxa Superfriends',
        format: 'commander',
        commander: 'Atraxa, Praetors\' Voice',
        cards: [
          { name: 'Sol Ring', quantity: 1 },
          { name: 'Command Tower', quantity: 1 }
        ],
        description: 'A planeswalker-focused deck'
      };

      const result = CreateDeckSchema.parse(deck);
      expect(result.name).toBe('Atraxa Superfriends');
      expect(result.format).toBe('commander');
      expect(result.cards).toHaveLength(2);
    });

    it('should use default format', () => {
      const deck = {
        name: 'My Deck'
      };

      const result = CreateDeckSchema.parse(deck);
      expect(result.format).toBe('commander');
      expect(result.cards).toEqual([]);
    });

    it('should reject invalid format', () => {
      const deck = {
        name: 'My Deck',
        format: 'invalid_format'
      };

      expect(() => CreateDeckSchema.parse(deck)).toThrow();
    });

    it('should reject empty name', () => {
      const deck = {
        name: ''
      };

      expect(() => CreateDeckSchema.parse(deck)).toThrow();
    });
  });

  describe('GenerateDeckSchema', () => {
    it('should accept valid generation data', () => {
      const data = {
        commander: 'Atraxa',
        userPrompt: 'Build a superfriends deck with lots of planeswalkers',
        budget: 500,
        includeUserInventory: true,
        colorIdentity: ['W', 'U', 'B', 'G'],
        themes: ['superfriends', 'control']
      };

      const result = GenerateDeckSchema.parse(data);
      expect(result.commander).toBe('Atraxa');
      expect(result.budget).toBe(500);
      expect(result.colorIdentity).toHaveLength(4);
    });

    it('should accept generation without commander', () => {
      const data = {
        userPrompt: 'Build a mono-red aggro deck',
        colorIdentity: ['R']
      };

      const result = GenerateDeckSchema.parse(data);
      expect(result.commander).toBeUndefined();
      expect(result.includeUserInventory).toBe(false);
    });

    it('should reject short prompts', () => {
      const data = {
        userPrompt: 'too short'
      };

      expect(() => GenerateDeckSchema.parse(data)).toThrow();
    });

    it('should reject invalid color identity', () => {
      const data = {
        userPrompt: 'Build a deck with invalid colors',
        colorIdentity: ['W', 'X', 'Y']
      };

      expect(() => GenerateDeckSchema.parse(data)).toThrow();
    });
  });

  describe('validate() middleware', () => {
    it('should validate request body', () => {
      const req = {
        body: { name: 'Test Deck' }
      };
      const res = {
        status: vi.fn(() => res),
        json: vi.fn()
      };
      const next = vi.fn();

      const middleware = validate(CreateDeckSchema, 'body');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.body.format).toBe('commander'); // Default value applied
    });

    it('should return 400 on validation error', () => {
      const req = {
        body: { name: '' } // Invalid: empty name
      };
      const res = {
        status: vi.fn(() => res),
        json: vi.fn()
      };
      const next = vi.fn();

      const middleware = validate(CreateDeckSchema, 'body');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation failed',
          details: expect.any(Array)
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should validate query params', () => {
      const req = {
        query: { page: '1', limit: '50' }
      };
      const res = {
        status: vi.fn(() => res),
        json: vi.fn()
      };
      const next = vi.fn();

      const middleware = validate(
        require('zod').z.object({
          page: require('zod').z.string(),
          limit: require('zod').z.string()
        }),
        'query'
      );
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });
});
