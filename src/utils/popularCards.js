// Pre-loaded popular Magic cards for instant search results
export const POPULAR_CARDS = [
  { name: 'Black Lotus', set: 'LEA', setName: 'Limited Edition Alpha', rarity: 'rare', imageUrl: '' },
  { name: 'Counterspell', set: 'LEA', setName: 'Limited Edition Alpha', rarity: 'common', imageUrl: '' },
  { name: 'Lightning Bolt', set: 'LEA', setName: 'Limited Edition Alpha', rarity: 'common', imageUrl: '' },
  { name: 'Tarmogoyf', set: 'FUT', setName: 'Future Sight', rarity: 'rare', imageUrl: '' },
  { name: 'Dark Confidant', set: 'RAV', setName: 'Ravnica', rarity: 'rare', imageUrl: '' },
  { name: 'Snapcaster Mage', set: 'ISD', setName: 'Innistrad', rarity: 'rare', imageUrl: '' },
  { name: 'Path to Exile', set: 'CON', setName: 'Conflux', rarity: 'uncommon', imageUrl: '' },
  { name: 'Shock', set: 'RAV', setName: 'Ravnica', rarity: 'common', imageUrl: '' },
  { name: 'Bolt of Lightning', set: 'LEB', setName: 'Limited Edition Beta', rarity: 'common', imageUrl: '' },
  { name: 'Force of Will', set: 'ALL', setName: 'Alliances', rarity: 'uncommon', imageUrl: '' },
  { name: 'Jace, the Mind Sculptor', set: 'WWK', setName: 'Worldwake', rarity: 'mythic', imageUrl: '' },
  { name: 'Liliana of the Veil', set: 'ISD', setName: 'Innistrad', rarity: 'mythic', imageUrl: '' },
  { name: 'Cryptic Command', set: 'LRW', setName: 'Lorwyn', rarity: 'rare', imageUrl: '' },
  { name: 'Thoughtseize', set: 'IPA', setName: 'Ippon', rarity: 'rare', imageUrl: '' },
  { name: 'Mana Drain', set: 'LEA', setName: 'Limited Edition Alpha', rarity: 'rare', imageUrl: '' },
];

// Cache for all searches during session
let searchCache = {};

export function getCachedSearch(query) {
  return searchCache[query.toLowerCase()];
}

export function setCachedSearch(query, results) {
  searchCache[query.toLowerCase()] = results;
}

export function clearSearchCache() {
  searchCache = {};
}

// Get popular cards that match a query
export function getPopularCardMatches(query) {
  if (!query || query.length < 2) return [];
  
  const lowerQuery = query.toLowerCase();
  return POPULAR_CARDS.filter(card => 
    card.name.toLowerCase().includes(lowerQuery)
  ).slice(0, 15);
}
