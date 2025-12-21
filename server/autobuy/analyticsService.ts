/**
 * Autobuy Analytics Service
 * 
 * Tracks autobuy predictions vs actual outcomes to enable
 * IPS weight tuning over time (learning loop).
 */

/**
 * Database interface for type safety (matches substitutionService pattern)
 */
interface Database {
    query<T = any>(sql: string, params?: any[]): Promise<{ rows: T[] }>;
    connect(): Promise<DatabaseClient>;
}

interface DatabaseClient {
    query<T = any>(sql: string, params?: any[]): Promise<{ rows: T[] }>;
    release(): void;
}

// Types
export interface PurchaseRunBasket {
    sellerId: string;
    marketplace?: string;
    items: {
        cardId: string;
        cardName?: string;
        price: number;
        quantity: number;
    }[];
}

export interface ActualPurchaseItem {
    cardId: string;
    actualPrice: number;
    wasPurchased: boolean;
    purchasedAt?: Date;
}

export interface AccuracyMetrics {
    overallAccuracy: number;  // 1 - avg(abs(predicted - actual) / predicted)
    avgPriceVariance: number; // avg(actual - predicted)
    avgPriceVariancePercent: number;
    totalRuns: number;
    totalItems: number;
    itemBreakdown: {
        cardId: string;
        cardName: string;
        predictedTotal: number;
        actualTotal: number;
        variancePercent: number;
    }[];
}

export interface SellThroughMetrics {
    cardId?: string;
    avgDaysToSell: number;
    sellThroughRate: number; // sold / purchased ratio
    totalPurchased: number;
    totalSold: number;
}

export interface CardProfitMetrics {
    cardId: string;
    cardName?: string;
    totalPurchaseCost: number;
    totalSaleRevenue: number;
    totalProfit: number;
    profitMargin: number;
    quantityPurchased: number;
    quantitySold: number;
}

export interface WeightAdjustment {
    weightName: string;
    currentValue: number;
    suggestedValue: number;
    reason: string;
    confidence: 'low' | 'medium' | 'high';
    basedOnCards: number;
}

// Analytics Service class
export class AnalyticsService {
    private db: Database;

    constructor(db: Database) {
        this.db = db;
    }

    /**
     * Record a new purchase run with predicted items
     */
    async recordPurchaseRun(baskets: PurchaseRunBasket[]): Promise<number> {
        const client = await this.db.connect();
        try {
            await client.query('BEGIN');

            // Calculate total predicted cost
            const predictedTotal = baskets.reduce((sum, basket) =>
                sum + basket.items.reduce((bSum, item) => bSum + item.price * item.quantity, 0), 0
            );

            // Create the run record
            const runResult = await client.query(
                `INSERT INTO autobuy_runs (predicted_total, status)
         VALUES ($1, 'pending')
         RETURNING id`,
                [predictedTotal]
            );
            const runId = runResult.rows[0].id;

            // Insert all items
            for (const basket of baskets) {
                for (const item of basket.items) {
                    await client.query(
                        `INSERT INTO autobuy_run_items 
             (run_id, card_id, card_name, predicted_price, quantity, seller_id, marketplace)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                        [runId, item.cardId, item.cardName, item.price, item.quantity, basket.sellerId, basket.marketplace]
                    );
                }
            }

            await client.query('COMMIT');
            return runId;
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    /**
     * Update a run with actual purchase data
     */
    async recordActualPurchase(runId: number, actuals: ActualPurchaseItem[]): Promise<void> {
        const client = await this.db.connect();
        try {
            await client.query('BEGIN');

            let actualTotal = 0;
            let purchasedCount = 0;
            let totalCount = 0;

            for (const actual of actuals) {
                const result = await client.query(
                    `UPDATE autobuy_run_items 
           SET actual_price = $1, was_purchased = $2, purchased_at = $3
           WHERE run_id = $4 AND card_id = $5
           RETURNING quantity, predicted_price`,
                    [
                        actual.wasPurchased ? actual.actualPrice : null,
                        actual.wasPurchased,
                        actual.wasPurchased ? (actual.purchasedAt || new Date()) : null,
                        runId,
                        actual.cardId
                    ]
                );

                if (result.rows.length > 0) {
                    totalCount++;
                    if (actual.wasPurchased) {
                        purchasedCount++;
                        actualTotal += actual.actualPrice * result.rows[0].quantity;
                    }
                }
            }

            // Determine status based on purchase ratio
            let status = 'cancelled';
            if (purchasedCount === totalCount && totalCount > 0) {
                status = 'purchased';
            } else if (purchasedCount > 0) {
                status = 'partially_purchased';
            }

            await client.query(
                `UPDATE autobuy_runs 
         SET actual_total = $1, status = $2, completed_at = NOW()
         WHERE id = $3`,
                [actualTotal, status, runId]
            );

            await client.query('COMMIT');
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    /**
     * Get accuracy metrics for prediction vs actual prices
     */
    async getAccuracyMetrics(days: number = 30): Promise<AccuracyMetrics> {
        const result = await this.db.query(`
      WITH completed_items AS (
        SELECT 
          ri.card_id,
          ri.card_name,
          ri.predicted_price,
          ri.actual_price,
          ri.quantity,
          ABS(ri.actual_price - ri.predicted_price) as price_diff,
          CASE WHEN ri.predicted_price > 0 
               THEN (ri.actual_price - ri.predicted_price) / ri.predicted_price 
               ELSE 0 END as variance_pct
        FROM autobuy_run_items ri
        JOIN autobuy_runs r ON ri.run_id = r.id
        WHERE ri.was_purchased = true
          AND ri.actual_price IS NOT NULL
          AND r.created_at > NOW() - INTERVAL '1 day' * $1
      ),
      aggregates AS (
        SELECT 
          COUNT(DISTINCT card_id) as unique_cards,
          COUNT(*) as total_items,
          AVG(price_diff) as avg_diff,
          AVG(variance_pct) as avg_variance_pct
        FROM completed_items
      ),
      card_breakdown AS (
        SELECT 
          card_id,
          MAX(card_name) as card_name,
          SUM(predicted_price * quantity) as predicted_total,
          SUM(actual_price * quantity) as actual_total
        FROM completed_items
        GROUP BY card_id
        ORDER BY SUM(actual_price * quantity) - SUM(predicted_price * quantity) DESC
        LIMIT 20
      )
      SELECT 
        (SELECT COUNT(*) FROM autobuy_runs 
         WHERE status IN ('purchased', 'partially_purchased') 
         AND created_at > NOW() - INTERVAL '1 day' * $1) as total_runs,
        a.total_items,
        a.avg_diff,
        a.avg_variance_pct,
        COALESCE(json_agg(json_build_object(
          'cardId', b.card_id,
          'cardName', b.card_name,
          'predictedTotal', b.predicted_total,
          'actualTotal', b.actual_total,
          'variancePercent', CASE WHEN b.predicted_total > 0 
                                  THEN (b.actual_total - b.predicted_total) / b.predicted_total * 100
                                  ELSE 0 END
        )) FILTER (WHERE b.card_id IS NOT NULL), '[]') as breakdown
      FROM aggregates a
      LEFT JOIN card_breakdown b ON true
      GROUP BY a.total_items, a.avg_diff, a.avg_variance_pct
    `, [days]);

        const row = result.rows[0] || {};
        const avgVariance = parseFloat(row.avg_variance_pct) || 0;

        return {
            overallAccuracy: Math.max(0, 1 - Math.abs(avgVariance)),
            avgPriceVariance: parseFloat(row.avg_diff) || 0,
            avgPriceVariancePercent: avgVariance * 100,
            totalRuns: parseInt(row.total_runs) || 0,
            totalItems: parseInt(row.total_items) || 0,
            itemBreakdown: row.breakdown || [],
        };
    }

    /**
     * Get sell-through rate for cards purchased via autobuy
     */
    async getSellThroughRate(cardId?: string, days: number = 30): Promise<SellThroughMetrics> {
        const params: (string | number)[] = [days];
        let cardFilter = '';

        if (cardId) {
            params.push(cardId);
            cardFilter = 'AND ri.card_id = $2';
        }

        const result = await this.db.query(`
      WITH purchased AS (
        SELECT 
          ri.card_id,
          ri.card_name,
          SUM(ri.quantity) as qty_purchased,
          MIN(ri.purchased_at) as first_purchase
        FROM autobuy_run_items ri
        JOIN autobuy_runs r ON ri.run_id = r.id
        WHERE ri.was_purchased = true
          AND r.created_at > NOW() - INTERVAL '1 day' * $1
          ${cardFilter}
        GROUP BY ri.card_id, ri.card_name
      ),
      sold AS (
        SELECT 
          COALESCE(i.scryfall_id, p.card_id) as card_id,
          SUM(sh.quantity) as qty_sold,
          AVG(EXTRACT(EPOCH FROM (sh.created_at - p.first_purchase)) / 86400) as avg_days
        FROM purchased p
        LEFT JOIN inventory i ON LOWER(TRIM(i.name)) = LOWER(TRIM(p.card_name))
        LEFT JOIN sales_history sh ON sh.item_name = p.card_name
          AND sh.created_at > p.first_purchase
        GROUP BY COALESCE(i.scryfall_id, p.card_id)
      )
      SELECT 
        SUM(p.qty_purchased) as total_purchased,
        COALESCE(SUM(s.qty_sold), 0) as total_sold,
        COALESCE(AVG(s.avg_days), 0) as avg_days_to_sell
      FROM purchased p
      LEFT JOIN sold s ON p.card_id = s.card_id
    `, params);

        const row = result.rows[0] || {};
        const purchased = parseInt(row.total_purchased) || 0;
        const sold = parseInt(row.total_sold) || 0;

        return {
            cardId: cardId,
            avgDaysToSell: parseFloat(row.avg_days_to_sell) || 0,
            sellThroughRate: purchased > 0 ? sold / purchased : 0,
            totalPurchased: purchased,
            totalSold: sold,
        };
    }

    /**
     * Get profit metrics for auto-bought cards
     */
    async getProfitPerCard(cardId: string): Promise<CardProfitMetrics | null> {
        const result = await this.db.query(`
      WITH purchases AS (
        SELECT 
          ri.card_id,
          MAX(ri.card_name) as card_name,
          SUM(COALESCE(ri.actual_price, ri.predicted_price) * ri.quantity) as purchase_cost,
          SUM(ri.quantity) as qty_purchased
        FROM autobuy_run_items ri
        WHERE ri.card_id = $1 AND ri.was_purchased = true
        GROUP BY ri.card_id
      ),
      sales AS (
        SELECT 
          SUM(sh.sell_price * sh.quantity) as revenue,
          SUM(sh.quantity) as qty_sold
        FROM sales_history sh
        WHERE sh.item_name = (SELECT card_name FROM purchases)
      )
      SELECT 
        p.card_id,
        p.card_name,
        p.purchase_cost,
        COALESCE(s.revenue, 0) as revenue,
        COALESCE(s.revenue, 0) - p.purchase_cost as profit,
        p.qty_purchased,
        COALESCE(s.qty_sold, 0) as qty_sold
      FROM purchases p
      CROSS JOIN sales s
    `, [cardId]);

        if (result.rows.length === 0) {
            return null;
        }

        const row = result.rows[0];
        const cost = parseFloat(row.purchase_cost) || 0;
        const revenue = parseFloat(row.revenue) || 0;

        return {
            cardId: row.card_id,
            cardName: row.card_name,
            totalPurchaseCost: cost,
            totalSaleRevenue: revenue,
            totalProfit: revenue - cost,
            profitMargin: cost > 0 ? (revenue - cost) / cost : 0,
            quantityPurchased: parseInt(row.qty_purchased) || 0,
            quantitySold: parseInt(row.qty_sold) || 0,
        };
    }

    /**
     * Record current IPS weights for historical tracking
     */
    async recordIPSWeights(config: Record<string, number>): Promise<void> {
        const entries = Object.entries(config);

        for (const [name, value] of entries) {
            if (typeof value === 'number') {
                await this.db.query(
                    `INSERT INTO autobuy_metrics (card_id, metric_type, value, metadata)
           VALUES (NULL, 'ips_weight', $1, $2)`,
                    [value, JSON.stringify({ weightName: name })]
                );
            }
        }
    }

    /**
     * Suggest IPS weight adjustments based on outcomes
     * - Reduce weights for cards bought but not sold
     * - Increase weights for quick-selling profitable cards
     */
    async suggestWeightAdjustments(): Promise<WeightAdjustment[]> {
        const suggestions: WeightAdjustment[] = [];

        // Analyze unsold cards (bought > 30 days ago, not sold)
        const unsoldResult = await this.db.query(`
      WITH bought_cards AS (
        SELECT 
          ri.card_id,
          MAX(ri.card_name) as card_name,
          COUNT(*) as purchase_count,
          SUM(ri.quantity) as qty_bought,
          AVG(ri.actual_price) as avg_price
        FROM autobuy_run_items ri
        JOIN autobuy_runs r ON ri.run_id = r.id
        WHERE ri.was_purchased = true
          AND ri.purchased_at < NOW() - INTERVAL '30 days'
        GROUP BY ri.card_id
      ),
      sold_cards AS (
        SELECT 
          i.scryfall_id as card_id,
          SUM(sh.quantity) as qty_sold
        FROM sales_history sh
        JOIN inventory i ON LOWER(TRIM(i.name)) = LOWER(TRIM(sh.item_name))
        WHERE sh.created_at > NOW() - INTERVAL '60 days'
        GROUP BY i.scryfall_id
      )
      SELECT 
        b.card_id,
        b.card_name,
        b.qty_bought,
        COALESCE(s.qty_sold, 0) as qty_sold,
        b.avg_price
      FROM bought_cards b
      LEFT JOIN sold_cards s ON b.card_id = s.card_id
      WHERE COALESCE(s.qty_sold, 0) < b.qty_bought * 0.5
      ORDER BY b.qty_bought DESC
      LIMIT 100
    `);

        const unsoldCount = unsoldResult.rows.length;
        if (unsoldCount >= 5) {
            // Check if unsold cards have high deck usage weight influence
            const avgDeckUsage = await this.getAvgDeckUsageForCards(
                unsoldResult.rows.map(r => r.card_id)
            );

            if (avgDeckUsage > 3) {
                suggestions.push({
                    weightName: 'deckUsageWeight',
                    currentValue: 0.4,
                    suggestedValue: 0.35,
                    reason: `${unsoldCount} cards with high deck usage didn't sell. Consider reducing deck usage weight.`,
                    confidence: unsoldCount >= 20 ? 'high' : 'medium',
                    basedOnCards: unsoldCount,
                });
            }
        }

        // Analyze quick-selling profitable cards
        const quickSellResult = await this.db.query(`
      WITH bought_cards AS (
        SELECT 
          ri.card_id,
          MAX(ri.card_name) as card_name,
          SUM(ri.actual_price * ri.quantity) as purchase_cost,
          MAX(ri.purchased_at) as purchase_date
        FROM autobuy_run_items ri
        WHERE ri.was_purchased = true
          AND ri.purchased_at > NOW() - INTERVAL '90 days'
        GROUP BY ri.card_id
      ),
      sold_cards AS (
        SELECT 
          i.scryfall_id as card_id,
          SUM(sh.sell_price * sh.quantity) as revenue,
          MIN(sh.created_at) as first_sale,
          SUM(sh.quantity) as qty_sold
        FROM sales_history sh
        JOIN inventory i ON LOWER(TRIM(i.name)) = LOWER(TRIM(sh.item_name))
        WHERE sh.created_at > NOW() - INTERVAL '90 days'
        GROUP BY i.scryfall_id
      )
      SELECT 
        b.card_id,
        b.card_name,
        b.purchase_cost,
        s.revenue,
        s.qty_sold,
        EXTRACT(EPOCH FROM (s.first_sale - b.purchase_date)) / 86400 as days_to_sell
      FROM bought_cards b
      JOIN sold_cards s ON b.card_id = s.card_id
      WHERE s.revenue > b.purchase_cost * 1.1  -- At least 10% profit
        AND EXTRACT(EPOCH FROM (s.first_sale - b.purchase_date)) / 86400 < 7  -- Sold within 7 days
      ORDER BY (s.revenue - b.purchase_cost) DESC
      LIMIT 100
    `);

        const quickSellCount = quickSellResult.rows.length;
        if (quickSellCount >= 5) {
            // Check sales velocity correlation
            const avgSalesVelocity = await this.getAvgSalesVelocityForCards(
                quickSellResult.rows.map(r => r.card_id)
            );

            if (avgSalesVelocity > 0.3) {
                suggestions.push({
                    weightName: 'salesVelocityWeight',
                    currentValue: 0.2,
                    suggestedValue: 0.25,
                    reason: `${quickSellCount} cards with high sales velocity sold quickly with profit. Consider increasing velocity weight.`,
                    confidence: quickSellCount >= 15 ? 'high' : 'medium',
                    basedOnCards: quickSellCount,
                });
            }
        }

        // Check if low inventory alerts are performing well
        const alertResult = await this.db.query(`
      SELECT 
        COUNT(*) FILTER (WHERE i.low_inventory_alert = true AND sh.id IS NOT NULL) as alert_sold,
        COUNT(*) FILTER (WHERE i.low_inventory_alert = true) as alert_total
      FROM autobuy_run_items ri
      JOIN inventory i ON ri.card_id = i.scryfall_id
      LEFT JOIN sales_history sh ON LOWER(TRIM(sh.item_name)) = LOWER(TRIM(i.name))
        AND sh.created_at > ri.purchased_at
      WHERE ri.was_purchased = true
        AND ri.purchased_at > NOW() - INTERVAL '60 days'
    `);

        if (alertResult.rows[0]) {
            const alertSold = parseInt(alertResult.rows[0].alert_sold) || 0;
            const alertTotal = parseInt(alertResult.rows[0].alert_total) || 0;

            if (alertTotal >= 10) {
                const alertSellRate = alertSold / alertTotal;

                if (alertSellRate > 0.7) {
                    suggestions.push({
                        weightName: 'lowInventoryAlertWeight',
                        currentValue: 0.1,
                        suggestedValue: 0.15,
                        reason: `${(alertSellRate * 100).toFixed(0)}% of alert-triggered purchases sold. Consider increasing alert weight.`,
                        confidence: alertTotal >= 30 ? 'high' : 'medium',
                        basedOnCards: alertTotal,
                    });
                } else if (alertSellRate < 0.3) {
                    suggestions.push({
                        weightName: 'lowInventoryAlertWeight',
                        currentValue: 0.1,
                        suggestedValue: 0.05,
                        reason: `Only ${(alertSellRate * 100).toFixed(0)}% of alert-triggered purchases sold. Consider reducing alert weight.`,
                        confidence: alertTotal >= 30 ? 'high' : 'medium',
                        basedOnCards: alertTotal,
                    });
                }
            }
        }

        return suggestions;
    }

    // Helper: Get average deck usage for a set of cards
    private async getAvgDeckUsageForCards(cardIds: string[]): Promise<number> {
        if (cardIds.length === 0) return 0;

        const result = await this.db.query(`
      SELECT AVG(deck_count) as avg_usage
      FROM (
        SELECT COUNT(DISTINCT d.id) as deck_count
        FROM deck_cards dc
        JOIN decks d ON dc.deck_id = d.id
        WHERE dc.scryfall_id = ANY($1)
          AND d.status = 'active'
        GROUP BY dc.scryfall_id
      ) sub
    `, [cardIds]);

        return parseFloat(result.rows[0]?.avg_usage) || 0;
    }

    // Helper: Get average sales velocity for a set of cards
    private async getAvgSalesVelocityForCards(cardIds: string[]): Promise<number> {
        if (cardIds.length === 0) return 0;

        const result = await this.db.query(`
      SELECT AVG(velocity) as avg_velocity
      FROM (
        SELECT 
          i.scryfall_id,
          COUNT(sh.id)::float / NULLIF(EXTRACT(EPOCH FROM (NOW() - MIN(sh.created_at))) / 86400, 0) as velocity
        FROM inventory i
        LEFT JOIN sales_history sh ON LOWER(TRIM(sh.item_name)) = LOWER(TRIM(i.name))
        WHERE i.scryfall_id = ANY($1)
          AND sh.created_at > NOW() - INTERVAL '90 days'
        GROUP BY i.scryfall_id
      ) sub
    `, [cardIds]);

        return parseFloat(result.rows[0]?.avg_velocity) || 0;
    }

    /**
     * Get recent autobuy runs for dashboard display
     */
    async getRecentRuns(limit: number = 10): Promise<any[]> {
        const result = await this.db.query(`
      SELECT 
        r.id,
        r.created_at,
        r.predicted_total,
        r.actual_total,
        r.status,
        r.completed_at,
        COUNT(ri.id) as item_count,
        SUM(CASE WHEN ri.was_purchased THEN 1 ELSE 0 END) as purchased_count
      FROM autobuy_runs r
      LEFT JOIN autobuy_run_items ri ON ri.run_id = r.id
      GROUP BY r.id
      ORDER BY r.created_at DESC
      LIMIT $1
    `, [limit]);

        return result.rows;
    }
}

// Factory function for easy instantiation
export function createAnalyticsService(db: Database): AnalyticsService {
    return new AnalyticsService(db);
}

export default AnalyticsService;

