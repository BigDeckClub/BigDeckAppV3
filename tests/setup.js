import { setupServer } from 'msw/node';
import { rest } from 'msw';

// Mock backend API for price requests
export const server = setupServer(
  rest.get('/api/price', (req, res, ctx) => {
    const name = req.url.searchParams.get('name');
    const set = req.url.searchParams.get('set');
    
    // Mock pricing data
    const mockPrices = {
      'lightning bolt|M11': { tcg: '$1.07', ck: '$2.29' },
      'sol ring|EOC': { tcg: '$1.25', ck: '$2.29' },
      'swamp|SPM': { tcg: '$0.07', ck: '$0.35' },
    };
    
    const key = `${name}|${set}`.toLowerCase();
    const price = mockPrices[key] || { tcg: 'N/A', ck: 'N/A' };
    
    return res(ctx.json(price));
  })
);

// Start server before all tests
beforeAll(() => server.listen());

// Reset handlers after each test
afterEach(() => server.resetHandlers());

// Stop server after all tests
afterAll(() => server.close());
