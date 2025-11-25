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

  try {
    const response = await fetch(
      `/api/price?name=${encodeURIComponent(normalizedName)}&set=${encodeURIComponent(normalizedSet)}`
    );

    if (!response.ok) {
      return { tcg: "N/A", ck: "N/A" };
    }

    const price = await response.json();
    return {
      tcg: price.tcg || "N/A",
      ck: price.ck || "N/A"
    };
  } catch (err) {
    return { tcg: "N/A", ck: "N/A" };
  }
}
