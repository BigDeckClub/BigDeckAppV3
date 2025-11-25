import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { PriceCacheProvider } from "../src/context/PriceCacheContext";
import DecklistCardPrice from "../src/components/DecklistCardPrice";
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

describe("DecklistCardPrice Component", () => {
  it("renders TCG price from cache context", async () => {
    render(
      <PriceCacheProvider>
        <DecklistCardPrice name="Lightning Bolt" set="M11" priceType="tcg" />
      </PriceCacheProvider>
    );

    // The component renders just the price value, not "TCG: $X.XX"
    const priceText = await screen.findByText('$1.07', {}, { timeout: 5000 });
    expect(priceText).toBeTruthy();
  });

  it("renders CK price from cache context", async () => {
    render(
      <PriceCacheProvider>
        <DecklistCardPrice name="Lightning Bolt" set="M11" priceType="ck" />
      </PriceCacheProvider>
    );

    const priceText = await screen.findByText('$2.29', {}, { timeout: 5000 });
    expect(priceText).toBeTruthy();
  });

  it("displays different prices for different cards", async () => {
    const { rerender } = render(
      <PriceCacheProvider>
        <DecklistCardPrice name="Sol Ring" set="EOC" priceType="tcg" />
      </PriceCacheProvider>
    );

    let priceText = await screen.findByText('$1.25', {}, { timeout: 5000 });
    expect(priceText).toBeTruthy();

    rerender(
      <PriceCacheProvider>
        <DecklistCardPrice name="Swamp" set="SPM" priceType="tcg" />
      </PriceCacheProvider>
    );

    priceText = await screen.findByText('$0.07', {}, { timeout: 5000 });
    expect(priceText).toBeTruthy();
  });

  it("applies custom className prop", async () => {
    const { container } = render(
      <PriceCacheProvider>
        <DecklistCardPrice name="Sol Ring" set="EOC" priceType="tcg" className="custom-price" />
      </PriceCacheProvider>
    );

    // Wait for loading to complete
    await waitFor(() => {
      const element = container.querySelector('.custom-price');
      expect(element).toBeTruthy();
      expect(element.textContent).not.toBe('...');
    }, { timeout: 5000 });
    
    const styled = container.querySelector('.custom-price');
    expect(styled).toBeTruthy();
  });

  it("shows loading state initially", () => {
    const { container } = render(
      <PriceCacheProvider>
        <DecklistCardPrice name="Lightning Bolt" set="M11" priceType="tcg" />
      </PriceCacheProvider>
    );

    // Initially should show loading indicator
    expect(container.textContent).toBe('...');
  });
});
