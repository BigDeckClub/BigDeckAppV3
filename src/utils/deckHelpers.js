/**
 * Deck helper utilities (normalization and completion calculations)
 */

export const normalizeName = (name = '') =>
  String(name)
    .toLowerCase()
    .replace(/\(.*?\)/g, '') // strip parentheticals
    .replace(/[^a-z0-9\s]/g, '') // strip punctuation
    .replace(/\s+/g, ' ')
    .trim();

// Backwards-compatible alias: some modules historically used `normalize`.
// Exporting this alias prevents runtime ReferenceError until callers are updated.
export const normalize = normalizeName;

/**
 * Compute completion stats given deck cards and an inventory map keyed by normalized name
 * @param {Array<{name:string, quantity:number}>} cards
 * @param {Object<string, number>} inventoryMap - available quantities keyed by normalized name
 * @returns {{ totalCards: number, totalMissing: number, ownedCount: number, completionPercentage: number }}
 */
export const computeCompletion = (cards = [], inventoryMap = {}) => {
  const neededByName = {};
  let totalCards = 0;

  cards.forEach((c) => {
    const qty = parseInt(c.quantity || 1, 10) || 1;
    totalCards += qty;
    const key = normalizeName(c.name);
    neededByName[key] = (neededByName[key] || 0) + qty;
  });

  let totalMissing = 0;
  Object.entries(neededByName).forEach(([name, needed]) => {
    const avail = parseInt(inventoryMap[name] || 0, 10) || 0;
    if (avail < needed) totalMissing += (needed - avail);
  });

  const ownedCount = Math.max(0, totalCards - totalMissing);
  const completionPercentage = totalCards > 0 ? (ownedCount / totalCards) * 100 : 0;

  return { totalCards, totalMissing, ownedCount, completionPercentage };
};

export default { normalizeName, computeCompletion };
