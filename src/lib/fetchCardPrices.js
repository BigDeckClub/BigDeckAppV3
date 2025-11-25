/**
 * Normalize card name for API requests
 * @param {string} name - Card name
 * @returns {string} Normalized lowercase name
 */
export function normalizeCardName(name) {
  return (name || "").trim().toLowerCase();
}

/**
 * Normalize set code for API requests
 * @param {string} code - Set code
 * @returns {string} Normalized uppercase set code
 */
export function normalizeSetCode(code) {
  if (!code) return "SPM"; // fallback for basic land variants
  return code.trim().toUpperCase();
}

/**
 * Fetch card prices from the backend API
 * @param {string} cardName - Card name
 * @param {string} setCode - Set code
 * @returns {Promise<{tcg: string, ck: string}>}
 */
export async function fetchCardPrices(cardName, setCode) {
  const normalizedName = normalizeCardName(cardName);
  const normalizedSet = normalizeSetCode(setCode);

  const url = `/api/prices/${encodeURIComponent(normalizedName)}/${encodeURIComponent(normalizedSet)}`;

  // Create an abort controller for timeout handling (10 second timeout)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 10000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "Accept": "application/json" }
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      return { tcg: "N/A", ck: "N/A" };
    }

    const data = await response.json();
    
    return {
      tcg: data.tcg || "N/A",
      ck: data.ck || "N/A"
    };
  } catch (err) {
    clearTimeout(timeoutId);
    console.error("[fetchCardPrices] Error:", err.message);
    return { tcg: "N/A", ck: "N/A" };
  }
}
