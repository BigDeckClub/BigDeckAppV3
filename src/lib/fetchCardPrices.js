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
  console.log("[FETCH DEBUG] Fetching from:", url);

  // Create an abort controller for timeout handling (10 second timeout)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.error("[FETCH DEBUG] Request timeout, aborting");
    controller.abort();
  }, 10000);

  try {
    console.log("[FETCH DEBUG] Sending fetch request with 10s timeout...");
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "Accept": "application/json" }
    });
    
    clearTimeout(timeoutId);
    console.log("[FETCH DEBUG] Response received:", { status: response.status, ok: response.ok });
    console.log("[FETCH DEBUG] Response headers:", {
      contentType: response.headers.get('Content-Type'),
      corsOrigin: response.headers.get('Access-Control-Allow-Origin')
    });

    if (!response.ok) {
      console.warn(`[FETCH DEBUG] Response not OK (${response.status}), returning N/A`);
      return { tcg: "N/A", ck: "N/A" };
    }

    console.log("[FETCH DEBUG] About to parse JSON...");
    const price = await response.json();
    console.log("[FETCH DEBUG] Parsed JSON successfully:", price);
    
    const result = {
      tcg: price.tcg || "N/A",
      ck: price.ck || "N/A"
    };
    console.log("[FETCH DEBUG] Returning result:", result);
    return result;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      console.error("[FETCH DEBUG] Request aborted due to timeout (10s exceeded)");
    } else {
      console.error("[FETCH DEBUG] Fetch error:", err.message || err, err.stack);
    }
    return { tcg: "N/A", ck: "N/A" };
  }
}
