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
  console.log("[DEBUG] Sending fetch to:", url);

  // Create an abort controller for timeout handling (10 second timeout)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.error("[DEBUG] Request timeout, aborting");
    controller.abort();
  }, 10000);

  try {
    console.log("[DEBUG] Fetch starting...");
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "Accept": "application/json" }
    });
    
    clearTimeout(timeoutId);
    console.log("[DEBUG] Fetch response received with status:", response.status);

    if (!response.ok) {
      console.error(`[DEBUG] HTTP Error ${response.status} returned`);
      return { tcg: "N/A", ck: "N/A" };
    }

    console.log("[DEBUG] Parsing response JSON...");
    const data = await response.json();
    console.log("[DEBUG] Fetch successful. Response data:", data);
    
    const result = {
      tcg: data.tcg || "N/A",
      ck: data.ck || "N/A"
    };
    console.log("[DEBUG] Returning from fetchCardPrices:", result);
    return result;
  } catch (err) {
    clearTimeout(timeoutId);
    console.error("[DEBUG] Fetch failed:", err.message || err);
    return { tcg: "N/A", ck: "N/A" };
  }
}
