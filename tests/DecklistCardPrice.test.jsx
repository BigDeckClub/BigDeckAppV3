import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { PriceCacheProvider } from "../src/context/PriceCacheContext";
import DecklistCardPrice from "../src/components/DecklistCardPrice";
import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";

// Use a regex-based handler to match any /api/price request
const server = setupServer(
  http.get(/\/api\/price/, ({ request }) => {
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

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("DecklistCardPrice Component", () => {
  it("renders resolved prices (integration test)", async () => {
    render(
      <PriceCacheProvider>
        <DecklistCardPrice name="Lightning Bolt" set="M11" />
      </PriceCacheProvider>
    );

    const expectedText = /TCG: \$1\.07\s*\|\s*CK: \$2\.29/i;
    const node = await screen.findByText(expectedText, {}, { timeout: 5000 });
    expect(node).toBeTruthy();
  });

  it("renders different prices for different cards", async () => {
    const { rerender } = render(
      <PriceCacheProvider>
        <DecklistCardPrice name="Sol Ring" set="EOC" />
      </PriceCacheProvider>
    );

    let node = await screen.findByText(/TCG: \$1\.25\s*\|\s*CK: \$2\.29/i, {}, { timeout: 5000 });
    expect(node).toBeTruthy();

    rerender(
      <PriceCacheProvider>
        <DecklistCardPrice name="Swamp" set="SPM" />
      </PriceCacheProvider>
    );

    node = await screen.findByText(/TCG: \$0\.07\s*\|\s*CK: \$0\.35/i, {}, { timeout: 5000 });
    expect(node).toBeTruthy();
  });

  it("applies custom className prop", async () => {
    const { container } = render(
      <PriceCacheProvider>
        <DecklistCardPrice name="Sol Ring" set="EOC" className="test-class" />
      </PriceCacheProvider>
    );

    await screen.findByText(/TCG:.*CK:/i, {}, { timeout: 5000 });
    const span = container.querySelector('.test-class');
    expect(span).toBeTruthy();
  });
});
