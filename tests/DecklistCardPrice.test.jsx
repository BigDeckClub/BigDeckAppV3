import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { PriceCacheProvider } from "../src/context/PriceCacheContext";
import DecklistCardPrice from "../src/components/DecklistCardPrice";
import { describe, it, expect, beforeAll, afterEach } from "vitest";

// Mock fetch globally
const mockFetch = (url) => {
  const mockPrices = {
    'lightning bolt|m11': { tcg: '$1.07', ck: '$2.29' },
    'sol ring|eoc': { tcg: '$1.25', ck: '$2.29' },
    'swamp|spm': { tcg: '$0.07', ck: '$0.35' },
  };
  
  const urlObj = new URL(url, 'http://localhost');
  const name = urlObj.searchParams.get('name');
  const set = urlObj.searchParams.get('set');
  const key = `${name}|${set}`.toLowerCase();
  const price = mockPrices[key] || { tcg: 'N/A', ck: 'N/A' };
  
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve(price)
  });
};

beforeAll(() => {
  global.fetch = mockFetch;
});

afterEach(() => {
  localStorage.clear();
});

describe("DecklistCardPrice Component", () => {
  it("renders pricing from cache context", async () => {
    render(
      <PriceCacheProvider>
        <DecklistCardPrice name="Lightning Bolt" set="M11" />
      </PriceCacheProvider>
    );

    const priceText = await screen.findByText(/TCG:.*\$1\.07.*CK:.*\$2\.29/i, {}, { timeout: 5000 });
    expect(priceText).toBeTruthy();
  });

  it("displays different prices for different cards", async () => {
    const { rerender } = render(
      <PriceCacheProvider>
        <DecklistCardPrice name="Sol Ring" set="EOC" />
      </PriceCacheProvider>
    );

    let priceText = await screen.findByText(/TCG:.*\$1\.25.*CK:.*\$2\.29/i, {}, { timeout: 5000 });
    expect(priceText).toBeTruthy();

    rerender(
      <PriceCacheProvider>
        <DecklistCardPrice name="Swamp" set="SPM" />
      </PriceCacheProvider>
    );

    priceText = await screen.findByText(/TCG:.*\$0\.07.*CK:.*\$0\.35/i, {}, { timeout: 5000 });
    expect(priceText).toBeTruthy();
  });

  it("applies custom className prop", async () => {
    const { container } = render(
      <PriceCacheProvider>
        <DecklistCardPrice name="Sol Ring" set="EOC" className="custom-price" />
      </PriceCacheProvider>
    );

    await screen.findByText(/TCG:.*CK:/i, {}, { timeout: 5000 });
    const styled = container.querySelector('.custom-price');
    expect(styled).toBeTruthy();
  });
});
