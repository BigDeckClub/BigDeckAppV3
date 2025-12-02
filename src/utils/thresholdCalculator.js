/**
 * Calculate smart threshold based on sales velocity and user settings
 * @param {Object} card - The inventory item
 * @param {Array} salesHistory - Array of sale transactions
 * @param {Object} settings - User's threshold settings (baseStock, landMultiplier, velocityWeeks)
 * @returns {Object} - { suggested: number, reason: string }
 */
export const calculateSmartThreshold = (card, salesHistory = [], settings) => {
  const { baseStock, landMultiplier, velocityWeeks } = settings;
  const name = (card.name || '').toLowerCase().trim();
  
  // === RULE 1: Basic Lands - Always high threshold ===
  const basicLands = ['plains', 'island', 'swamp', 'mountain', 'forest'];
  const isSnowBasic = name.startsWith('snow-covered ') && 
    basicLands.includes(name.replace('snow-covered ', ''));
  
  if (basicLands.includes(name) || isSnowBasic) {
    return {
      suggested: baseStock * landMultiplier,
      reason: 'Basic land - every deck needs these'
    };
  }
  
  // === RULE 2: Sales Velocity ===
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  // Filter sales for this specific card in last 30 days
  const recentSales = salesHistory.filter(sale => {
    const saleDate = new Date(sale.date || sale.created_at || sale.sale_date);
    const matchesCard = (
      sale.card_id === card.id || 
      sale.inventory_id === card.id ||
      (sale.card_name || sale.name || '').toLowerCase() === name
    );
    return matchesCard && saleDate >= thirtyDaysAgo;
  });
  
  const totalSold = recentSales.reduce((sum, sale) => {
    return sum + (parseInt(sale.quantity) || 1);
  }, 0);
  
  // Calculate weekly sales rate
  const weeklySales = totalSold / 4; // 30 days ≈ 4 weeks
  
  // === RULE 3: Calculate threshold ===
  let suggested;
  let reason;
  
  if (weeklySales > 0) {
    // Velocity-based: buffer stock for X weeks
    suggested = Math.ceil(weeklySales * velocityWeeks);
    reason = `Sells ~${weeklySales.toFixed(1)}/week → ${velocityWeeks}-week buffer`;
  } else {
    // No recent sales: use base stock adjusted by price
    const price = parseFloat(card.price || card.purchase_price) || 0;
    
    if (price < 0.50) {
      suggested = Math.round(baseStock * 1.5);
      reason = 'No recent sales, low price item';
    } else if (price > 10) {
      suggested = Math.round(baseStock * 0.3);
      reason = 'No recent sales, high value item';
    } else {
      suggested = baseStock;
      reason = 'No recent sales, using base stock level';
    }
  }
  
  // Minimum threshold of 2
  suggested = Math.max(suggested, 2);
  
  return { suggested, reason };
};
