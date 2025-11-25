import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import DecklistCardPrice from '../src/components/DecklistCardPrice';
import { PriceCacheProvider } from '../src/context/PriceCacheContext';

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

describe('DecklistCardPrice Component', () => {
  it('should render card prices from context', async () => {
    render(
      <PriceCacheProvider>
        <DecklistCardPrice name="lightning bolt" set="M11" />
      </PriceCacheProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/TCG:.*CK:/)).toBeDefined();
    }, { timeout: 5000 });

    expect(screen.getByText(/\$1\.07.*\$2\.29/)).toBeDefined();
  });

  it('should display different prices for different cards', async () => {
    const { rerender } = render(
      <PriceCacheProvider>
        <DecklistCardPrice name="lightning bolt" set="M11" />
      </PriceCacheProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/\$1\.07.*\$2\.29/)).toBeDefined();
    }, { timeout: 5000 });

    rerender(
      <PriceCacheProvider>
        <DecklistCardPrice name="swamp" set="SPM" />
      </PriceCacheProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/\$0\.07.*\$0\.35/)).toBeDefined();
    }, { timeout: 5000 });
  });

  it('should apply custom className prop', async () => {
    const { container } = render(
      <PriceCacheProvider>
        <DecklistCardPrice name="sol ring" set="EOC" className="test-class" />
      </PriceCacheProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/TCG:.*CK:/)).toBeDefined();
    }, { timeout: 5000 });

    const span = container.querySelector('.test-class');
    expect(span).toBeDefined();
  });

  it('should handle case-insensitive card names and sets', async () => {
    render(
      <PriceCacheProvider>
        <DecklistCardPrice name="LIGHTNING BOLT" set="m11" />
      </PriceCacheProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/\$1\.07.*\$2\.29/)).toBeDefined();
    }, { timeout: 5000 });
  });
});
