import React from "react";
import { render, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { PriceCacheProvider, usePriceCache } from "../src/context/PriceCacheContext";
import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";

// Simple test component that calls getPrice twice concurrently
function Caller({ name, set, onDone }) {
  const { getPrice } = usePriceCache();
  React.useEffect(() => {
    let mounted = true;
    Promise.all([getPrice(name, set), getPrice(name, set)])
      .then((results) => {
        if (!mounted) return;
        onDone(results);
      })
      .catch((err) => {
        if (!mounted) return;
        onDone(err);
      });
    return () => {
      mounted = false;
    };
  }, [name, set, getPrice, onDone]);

  return null;
}

let apiCallCount = 0;
const server = setupServer(
  // Match any URL that contains /api/price with RegExp - robust to absolute vs relative URLs
  http.get(/\/api\/price/, ({ request }) => {
    apiCallCount += 1;
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
afterEach(() => {
  server.resetHandlers();
  apiCallCount = 0;
});
afterAll(() => server.close());

describe("PriceCacheContext", () => {
  it("inflight dedupe: concurrent getPrice calls for same key result in only one backend call", async () => {
    const results = [];
    function onDone(res) {
      results.push(res);
    }

    render(
      <PriceCacheProvider>
        <Caller name="lightning bolt" set="M11" onDone={onDone} />
      </PriceCacheProvider>
    );

    // wait until onDone pushed results
    await waitFor(() => {
      if (results.length === 0) throw new Error("waiting for results");
      return true;
    }, { timeout: 5000 });

    // Expect backend invoked only once due to inflight dedupe
    expect(apiCallCount).toBe(1);

    const first = results[0][0];
    expect(first).toEqual({ tcg: '$1.07', ck: '$2.29' });
  });

  it("should fetch prices from mocked backend", async () => {
    const results = [];
    function onDone(res) {
      results.push(res);
    }

    render(
      <PriceCacheProvider>
        <Caller name="sol ring" set="EOC" onDone={onDone} />
      </PriceCacheProvider>
    );

    await waitFor(() => {
      if (results.length === 0) throw new Error("waiting for results");
      return true;
    }, { timeout: 5000 });

    const first = results[0][0];
    expect(first).toEqual({ tcg: '$1.25', ck: '$2.29' });
  });
});
