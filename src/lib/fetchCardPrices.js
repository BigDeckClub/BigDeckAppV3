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

  const url = `/api/price?name=${encodeURIComponent(normalizedName)}&set=${encodeURIComponent(normalizedSet)}`;
  console.log("[fetchCardPrices] Fetching:", { normalizedName, normalizedSet, url });

  try {
    console.log("[fetchCardPrices] Sending fetch request...");
    const response = await fetch(url);
    
    console.log("[fetchCardPrices] Response received:", { status: response.status, ok: response.ok });

    if (!response.ok) {
      console.warn("[fetchCardPrices] Response not OK, returning N/A");
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
    console.error("[fetchCardPrices] Caught error:", err);
    return { tcg: "N/A", ck: "N/A" };
  }
}
