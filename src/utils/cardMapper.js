// Utility to map legacy/new card objects to a small UI-friendly shape
export function mapCardForTile(card) {
  if (!card) return {};

  // Title fallback handling
  const title = card.name || card.title || card.cardName || card.printing?.name || card.displayName || '';

  // Quantity handling: try common keys
  const qty = Number(card.quantity ?? card.qty ?? card.count ?? card.owned ?? card.total ?? 0);

  // Unique (approx) - if there is a set/count per printing, prefer that
  const unique = Number(card.unique ?? card.uniqueCount ?? 1);

  // Price extraction: support nested price objects
  let cost = 0;
  if (typeof card.price === 'number') cost = card.price;
  else if (card.price && typeof card.price === 'object') cost = Number(card.price.usd ?? card.price.value ?? 0);
  else if (typeof card.market_price === 'number') cost = card.market_price;
  else if (card.prices && card.prices.usd) cost = Number(card.prices.usd);

  // Cover image extraction - scryfall-style nested fields and common fallbacks
  const coverUrl = card.image || card.cover || card.coverUrl || card.printing?.image_uris?.small || card.card?.image_uris?.small || card.image_uris?.small || '';

  return { title, qty, unique, cost, coverUrl };
}
