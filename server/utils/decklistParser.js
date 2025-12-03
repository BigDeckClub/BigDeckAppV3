// ========== DECKLIST PARSER ==========
export function parseDecklistTextToCards(deckText) {
  if (!deckText || typeof deckText !== "string") return [];

  const lines = deckText.split(/\r?\n/);
  const cards = [];

  for (let raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    const qtyNameMatch = line.match(/^\s*(\d+)\s+(.+)$/);
    let qty = 1;
    let rest = line;
    if (qtyNameMatch) {
      qty = parseInt(qtyNameMatch[1], 10) || 1;
      rest = qtyNameMatch[2].trim();
    }

    let name = rest;
    let set = "";

    const parenMatch = rest.match(/^(.*?)\s*\(\s*([^)]+)\s*\)\s*$/);
    if (parenMatch) {
      name = parenMatch[1].trim();
      set = parenMatch[2].trim();
    } else {
      const sepMatch = rest.match(/^(.*?)\s*(?:[-|]\s*)([A-Za-z0-9]+)\s*$/);
      if (sepMatch) {
        name = sepMatch[1].trim();
        set = sepMatch[2].trim();
      } else {
        const trailingSetMatch = rest.match(/^(.*)\s+([A-Z0-9]{2,6})$/);
        if (trailingSetMatch) {
          name = trailingSetMatch[1].trim();
          set = trailingSetMatch[2].trim();
        }
      }
    }

    cards.push({ name, set, qty });
  }

  return cards;
}
