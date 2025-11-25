import React from "react";
import { render, waitFor } from "@testing-library/react";
import { PriceCacheProvider, usePriceCache } from "../src/context/PriceCacheContext";
import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";

// Mock fetch globally - handle both path-based and query-based URLs
const mockFetch = vi.fn((url) => {
  const mockPrices = {
    'lightning bolt|m11': { tcg: '$1.07', ck: '$2.29' },
    'lightning bolt|M11': { tcg: '$1.07', ck: '$2.29' },
    'sol ring|eoc': { tcg: '$1.25', ck: '$2.29' },
    'sol ring|EOC': { tcg: '$1.25', ck: '$2.29' },
    'swamp|spm': { tcg: '$0.07', ck: '$0.35' },
    'swamp|SPM': { tcg: '$0.07', ck: '$0.35' },
  };
  
  // Parse URL to extract card name and set
  let name, set;
  const urlStr = typeof url === 'string' ? url : url.toString();
  
  // Handle path-based URLs: /api/prices/cardname/setcode
  const pathMatch = urlStr.match(/\/api\/prices\/([^/]+)\/([^?]+)/);
  if (pathMatch) {
    name = decodeURIComponent(pathMatch[1]);
    set = decodeURIComponent(pathMatch[2]);
  } else {
    // Handle query-based URLs
    const urlObj = new URL(urlStr, 'http://localhost');
    name = urlObj.searchParams.get('name');
    set = urlObj.searchParams.get('set');
  }
  
  const key = `${name}|${set}`.toLowerCase();
  const price = mockPrices[key] || mockPrices[`${name}|${set}`] || { tcg: 'N/A', ck: 'N/A' };
  
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve(price)
  });
});

beforeAll(() => {
  global.fetch = mockFetch;
});

afterEach(() => {
  localStorage.clear();
  mockFetch.mockClear();
});

// Test component
function TestComponent({ name, set, onDone }) {
  const { getPrice } = usePriceCache();
  React.useEffect(() => {
    let mounted = true;
    getPrice(name, set).then(price => {
      if (mounted) onDone(price);
    });
    return () => { mounted = false; };
  }, [name, set, getPrice, onDone]);
  return null;
}

describe("PriceCacheContext", () => {
  it("should fetch card prices", async () => {
    const results = [];
    
    render(
      <PriceCacheProvider>
        <TestComponent name="lightning bolt" set="M11" onDone={(p) => results.push(p)} />
      </PriceCacheProvider>
    );

    await waitFor(() => {
      expect(results.length).toBeGreaterThan(0);
    }, { timeout: 5000 });

    expect(results[0]).toEqual({ tcg: '$1.07', ck: '$2.29' });
  });

  it("should deduplicate concurrent requests for same card", async () => {
    let callCount = 0;
    const originalFetch = global.fetch;
    
    global.fetch = vi.fn((url) => {
      callCount++;
      return originalFetch(url);
    });

    const results = [];
    function ConcurrentCaller({ name, set, onDone }) {
      const { getPrice } = usePriceCache();
      React.useEffect(() => {
        Promise.all([
          getPrice(name, set),
          getPrice(name, set),
          getPrice(name, set)
        ]).then(prices => onDone(prices));
      }, [name, set, getPrice, onDone]);
      return null;
    }

    render(
      <PriceCacheProvider>
        <ConcurrentCaller name="sol ring" set="EOC" onDone={(p) => results.push(p)} />
      </PriceCacheProvider>
    );

    await waitFor(() => {
      expect(results.length).toBeGreaterThan(0);
    }, { timeout: 5000 });

    // Should only call fetch once due to deduplication
    expect(callCount).toBe(1);
    
    global.fetch = originalFetch;
  });

  it("should cache prices in localStorage", async () => {
    const results = [];
    
    render(
      <PriceCacheProvider>
        <TestComponent name="swamp" set="SPM" onDone={(p) => results.push(p)} />
      </PriceCacheProvider>
    );

    await waitFor(() => {
      expect(results.length).toBeGreaterThan(0);
    }, { timeout: 5000 });

    // Verify localStorage has cached price
    const cached = JSON.parse(localStorage.getItem('mtg-card-price-cache') || '{}');
    expect(Object.keys(cached).length).toBeGreaterThan(0);
  });
});
