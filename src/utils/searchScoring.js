/**
 * Search scoring utility for ranking card search results
 * @module utils/searchScoring
 */

/**
 * Calculates a relevance score for a card name against a search query
 * Higher scores indicate better matches
 * 
 * @param {string} cardName - The name of the card to score
 * @param {string} query - The search query
 * @returns {number} A score from 0 to 1000, where higher is more relevant
 * 
 * @example
 * // Exact match returns highest score
 * scoreCardMatch('Sol Ring', 'sol ring'); // Returns 1000
 * 
 * @example
 * // Starts with query returns high score
 * scoreCardMatch('Sol Ring', 'sol'); // Returns 500
 * 
 * @example
 * // Multi-word partial match
 * scoreCardMatch('Sol Ring', 'sol r'); // Returns 450
 */
export function scoreCardMatch(cardName, query) {
  const lowerName = cardName.toLowerCase();
  const lowerQuery = query.toLowerCase();
  
  // Exact match (highest priority)
  if (lowerName === lowerQuery) return 1000;
  
  // Starts with query (high priority)
  if (lowerName.startsWith(lowerQuery)) return 500;
  
  // Multi-word query matching (e.g., "sol r" -> "Sol Ring")
  const queryWords = lowerQuery.split(/\s+/).filter(w => w.length > 0);
  const cardWords = lowerName.split(/\s+/);
  
  if (queryWords.length > 1) {
    // Check if each query word matches a card word at the start (in order)
    let matchCount = 0;
    let cardWordIdx = 0;
    
    for (const qWord of queryWords) {
      while (cardWordIdx < cardWords.length) {
        if (cardWords[cardWordIdx].startsWith(qWord)) {
          matchCount++;
          cardWordIdx++;
          break;
        }
        cardWordIdx++;
      }
    }
    
    // If all query words matched card words in order, give high score
    if (matchCount === queryWords.length) {
      return 450; // Just below exact starts-with match
    }
  }
  
  // Single word or partial word boundary match
  const words = lowerName.split(/\s+/);
  if (words.some(word => word.startsWith(lowerQuery))) return 400;
  
  // Contains query as substring (medium priority)
  const containsIndex = lowerName.indexOf(lowerQuery);
  if (containsIndex !== -1) {
    // Prioritize matches closer to the start
    return 200 - (containsIndex / lowerName.length) * 100;
  }
  
  // Fuzzy match - each character of query found in order (low priority)
  let matchPos = 0;
  for (let i = 0; i < lowerQuery.length; i++) {
    matchPos = lowerName.indexOf(lowerQuery[i], matchPos);
    if (matchPos === -1) return 0;
    matchPos++;
  }
  return 50;
}
