export function normalizeCardName(name) {
  return (name || "").trim().toLowerCase();
}

export function normalizeSetCode(code) {
  if (!code) return "SPM"; // fallback for basic land variants
  return code.trim().toUpperCase();
}

export async function fetchCardPrices(cardName, setCode) {
  const normalizedName = normalizeCardName(cardName);
  const normalizedSet = normalizeSetCode(setCode);

  // Use path-based endpoint directly instead of query parameters
  const url = `/api/prices/${encodeURIComponent(normalizedName)}/${encodeURIComponent(normalizedSet)}`;
  console.log("[fetchCardPrices] Fetching from:", url);

  // Create an abort controller for timeout handling (10 second timeout)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.error("[fetchCardPrices] Request timeout, aborting");
    controller.abort();
  }, 10000);

  try {
    console.log("[fetchCardPrices] Sending fetch request with 10s timeout...");
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "Content-Type": "application/json" }
    });
    
    clearTimeout(timeoutId);
    console.log("[fetchCardPrices] Response received:", { status: response.status, ok: response.ok });

    if (!response.ok) {
      console.warn(`[fetchCardPrices] Response not OK (${response.status}), returning N/A`);
      return { tcg: "N/A", ck: "N/A" };
    }

    const price = await response.json();
    console.log("[fetchCardPrices] Parsed JSON:", price);
    
    const result = {
      tcg: price.tcg || "N/A",
      ck: price.ck || "N/A"
    };
    console.log("[fetchCardPrices] Returning result:", result);
    return result;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      console.error("[fetchCardPrices] Request aborted due to timeout (10s exceeded)");
    } else {
      console.error("[fetchCardPrices] Fetch error:", err.message || err);
    }
    return { tcg: "N/A", ck: "N/A" };
  }
}
