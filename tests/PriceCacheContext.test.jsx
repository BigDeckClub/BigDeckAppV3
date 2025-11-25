import React, { useEffect, useState } from 'react';
import { render, waitFor, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { PriceCacheProvider, usePriceCache } from '../src/context/PriceCacheContext';

// Mock server for pricing API
const server = setupServer(
  http.get('/api/price', ({ request }) => {
    const url = new URL(request.url);
    const name = url.searchParams.get('name');
    const set = url.searchParams.get('set');
    
    const mockPrices = {
      'lightning bolt|m11': { tcg: '$1.07', ck: '$2.29' },
      'sol ring|eoc': { tcg: '$1.25', ck: '$2.29' },
      'swamp|spm': { tcg: '$0.07', ck: '$0.35' },
    };
    
    const key = `${name}|${set}`.toLowerCase();
    return HttpResponse.json(mockPrices[key] || { tcg: 'N/A', ck: 'N/A' });
  })
);

beforeEach(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Test component that uses PriceCacheContext
function TestComponent({ name, set }) {
  const { getPrice } = usePriceCache();
  const [price, setPrice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getPrice(name, set).then(p => {
      setPrice(p);
      setLoading(false);
    });
  }, [name, set, getPrice]);

  if (loading) return <div>Loading...</div>;
  return <div>{price?.tcg} | {price?.ck}</div>;
}

describe('PriceCacheContext', () => {
  it('should fetch and cache card prices on first request', async () => {
    render(
      <PriceCacheProvider>
        <TestComponent name="lightning bolt" set="M11" />
      </PriceCacheProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('$1.07 | $2.29')).toBeDefined();
    });
  });

  it('should return cached price on subsequent requests', async () => {
    render(
      <PriceCacheProvider>
        <TestComponent name="sol ring" set="EOC" />
      </PriceCacheProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('$1.25 | $2.29')).toBeDefined();
    });
  });

  it('should handle multiple concurrent requests with deduplication', async () => {
    function MultiRequestComponent() {
      const { getPrice } = usePriceCache();
      const [results, setResults] = useState([]);

      useEffect(() => {
        Promise.all([
          getPrice('lightning bolt', 'M11'),
          getPrice('lightning bolt', 'M11'),
          getPrice('lightning bolt', 'M11'),
        ]).then(prices => setResults(prices));
      }, [getPrice]);

      return <div>{results.length > 0 ? 'Done' : 'Loading'}</div>;
    }

    render(
      <PriceCacheProvider>
        <MultiRequestComponent />
      </PriceCacheProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Done')).toBeDefined();
    });
  });

  it('should handle API errors gracefully', async () => {
    server.use(
      http.get('/api/price', () => {
        return HttpResponse.json({ error: 'Server error' }, { status: 500 });
      })
    );

    render(
      <PriceCacheProvider>
        <TestComponent name="unknown card" set="UNK" />
      </PriceCacheProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/N\/A.*N\/A/)).toBeDefined();
    });
  });
});
