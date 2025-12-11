import express from 'express';
import request from 'supertest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createInventoryRouter } from '../routes/inventory.js';

describe('inventory route integration', () => {
  let app;
  let queries;

  beforeEach(() => {
    queries = [];

    // Simple mock pool that records queries and returns sensible results
    const mockPool = {
      query: async (text, params) => {
        queries.push({ text, params });
        if (text.includes('INSERT INTO inventory (')) {
          // Simulate DB returning the created row
          const row = {
            id: 123,
            user_id: params[0],
            name: params[1],
            set: params[2],
            set_name: params[3],
            quantity: params[4]
          };
          return { rows: [row] };
        }
        // Generic successful response for other inserts/selects
        return { rows: [] };
      }
    };

    // Mock Scryfall client that fails (so route continues without Scryfall ID)
    const mockScryfallClient = {
      getCardByName: vi.fn(async () => { throw new Error('Scryfall unavailable'); }),
      batchResolve: vi.fn(async () => ({}))
    };

    // No-op authenticate middleware that sets a test user id
    const authMiddleware = (req, res, next) => { req.userId = 'test-user'; next(); };
    const noopLimiter = (req, res, next) => next();

    app = express();
    app.use(express.json());
    // Mount the inventory router with injected mocks under /api
    app.use('/api', createInventoryRouter({ pool: mockPool, scryfallServerClient: mockScryfallClient, authenticateMiddleware: authMiddleware, apiLimiterMiddleware: noopLimiter }));
  });

  it('creates inventory item even when scryfall lookup fails', async () => {
    const res = await request(app)
      .post('/api/inventory')
      .send({ name: 'Lightning Bolt' })
      .expect(201);

    expect(res.body).toBeTruthy();
    expect(res.body.id).toBe(123);
    expect(res.body.name).toBe('Lightning Bolt');

    // Ensure an INSERT was executed and the user_id param was the test user
    const insert = queries.find(q => q.text && q.text.includes('INSERT INTO inventory'));
    expect(insert).toBeTruthy();
    expect(insert.params[0]).toBe('test-user');
  });
});
