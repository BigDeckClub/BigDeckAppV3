/**
 * Parse deck list text in MTG format
 * Supports formats: "4 Card Name", "4x Card Name", "4 Card Name (SET)"
 * @param {string} text - Raw deck list text
 * @returns {Array<{quantity: number, name: string, set: string, scryfall_id: string|null, image_url: string|null}>}
 */
export const parseDeckList = (text) => {
  const cards = [];
  const lines = text.split('\n');

  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) return;

    // Skip comment lines
    if (trimmed.startsWith('//')) return;

    // Match patterns: "4 Card Name", "4x Card Name", "4X Card Name"
    const match = trimmed.match(/^(\d+)\s*x?\s+(.+)$/i);
    if (match) {
      const quantity = parseInt(match[1], 10);
      const name = match[2].trim();

      // Try to extract set code from parentheses: "Card Name (MH2)" or "Card Name (MH2) 123"
      const setMatch = name.match(/^(.+?)\s*\(\s*([A-Z0-9]{2,})\s*\)(?:\s+\d+)?$/);
      
      if (setMatch) {
        cards.push({
          quantity,
          name: setMatch[1].trim(),
          set: setMatch[2].toUpperCase(),
          scryfall_id: null,
          image_url: null
        });
      } else {
        cards.push({
          quantity,
          name,
          set: 'Unknown',
          scryfall_id: null,
          image_url: null
        });
      }
    }
  });

  return cards;
};

/**
 * Extract deck ID from Archidekt URL
 * @param {string} url - Archidekt deck URL
 * @returns {string|null} - Deck ID or null if invalid
 */
export const extractArchidektDeckId = (url) => {
  const match = url.match(/archidekt\.com\/decks\/(\d+)/i);
  return match ? match[1] : null;
};
