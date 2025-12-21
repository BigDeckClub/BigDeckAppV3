/**
 * Analytics Service for Autobuy
 * 
 * Tracks optimizer runs, predicted outcomes vs actual results, and
 * performance metrics for the IPS learning loop.
 */

import { z } from 'zod'

// Types for analytics data
export type AutobuyRunStatus = 'pending' | 'purchased' | 'partially_purchased' | 'cancelled' | 'failed'

export interface CreateRunParams {
    predictedTotal: number
    notes?: string
}

export interface RunItem {
    cardId: string // scryfall_id
    cardName: string
    predictedPrice: number
    quantity: number
    sellerId: string
    marketplace: string
}

export interface CompleteRunParams {
    actualTotal: number
    status: AutobuyRunStatus
}

export interface Metric {
    type: string
    value: number
    cardId?: string
    metadata?: Record<string, any>
}

// Database interface wrapper
interface Database {
    query<T = any>(sql: string, params?: any[]): Promise<{ rows: T[] }>
}

export interface WeightAdjustment {
    weightName: string;
    currentValue: number;
    suggestedValue: number;
    reason: string;
    confidence: 'low' | 'medium' | 'high';
    basedOnCards: number;
}

export class AnalyticsService {
    private db: Database

    constructor(db: Database) {
        this.db = db
    }

    /**
     * Start tracking a new optimizer run
     */
    async startRun(params: CreateRunParams): Promise<number> {
        const result = await this.db.query(
            `INSERT INTO autobuy_runs (predicted_total, notes, status)
       VALUES ($1, $2, 'pending')
       RETURNING id`,
            [params.predictedTotal, params.notes || null]
        )
        return result.rows[0].id
    }

    /**
     * Log the items predicted for a run
     */
    async logRunItems(runId: number, items: RunItem[]): Promise<void> {
        if (items.length === 0) return

        // Limit batch size to avoid query parameter limits
        const BATCH_SIZE = 50

        for (let i = 0; i < items.length; i += BATCH_SIZE) {
            const batch = items.slice(i, i + BATCH_SIZE)
            const values: any[] = []
            const placeholders: string[] = []
            let pIdx = 1

            for (const item of batch) {
                placeholders.push(`($${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++})`)
                values.push(
                    runId,
                    item.cardId,
                    item.cardName,
                    item.predictedPrice,
                    item.quantity,
                    item.sellerId,
                    item.marketplace
                )
            }

            const sql = `
        INSERT INTO autobuy_run_items 
        (run_id, card_id, card_name, predicted_price, quantity, seller_id, marketplace)
        VALUES ${placeholders.join(', ')}
      `

            await this.db.query(sql, values)
        }
    }

    /**
     * Mark a run as completed (or cancelled/failed) with actual results
     */
    async completeRun(runId: number, params: CompleteRunParams): Promise<void> {
        await this.db.query(
            `UPDATE autobuy_runs 
       SET status = $1, actual_total = $2, completed_at = NOW()
       WHERE id = $3`,
            [params.status, params.actualTotal, runId]
        )
    }

    /**
     * Log a specialized metric for analysis
     */
    async logMetric(metric: Metric): Promise<void> {
        await this.db.query(
            `INSERT INTO autobuy_metrics (metric_type, value, card_id, metadata)
       VALUES ($1, $2, $3, $4)`,
            [metric.type, metric.value, metric.cardId || null, metric.metadata || {}]
        )
    }

    /**
     * Update the purchase status of a specific item in a run
     */
    async markItemPurchased(
        runId: number,
        cardId: string,
        actualPrice: number
    ): Promise<void> {
        await this.db.query(
            `UPDATE autobuy_run_items
       SET was_purchased = true, actual_price = $1, purchased_at = NOW()
       WHERE run_id = $2 AND card_id = $3`,
            [actualPrice, runId, cardId]
        )
    }

    /**
     * Get summary stats for dashboard
     */
    async getDashboardStats(): Promise<any> {
        const runs = await this.db.query(`
      SELECT 
        COUNT(*) as total_runs,
        COUNT(*) FILTER (WHERE status = 'purchased') as completed_runs,
        SUM(actual_total) as total_spend,
        AVG(CASE WHEN status = 'purchased' THEN (predicted_total - actual_total) ELSE 0 END) as avg_savings
      FROM autobuy_runs
      WHERE created_at > NOW() - INTERVAL '30 days'
    `)

        return runs.rows[0]
    }

    /**
     * Get recent optimizer runs
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

    /**
     * Get accuracy metrics (stub/simplified for now)
     */
    async getAccuracyMetrics(days: number = 30): Promise<any> {
        // Basic placeholder implementation
        return {
            overallAccuracy: 0.95,
            avgPriceVariance: 0.50,
            avgPriceVariancePercent: 2.5,
            totalRuns: 10,
            totalItems: 50,
            itemBreakdown: []
        };
    }

    /**
     * Get suggestions for IPS weight tuning (The Learning Loop)
     */
    async getSuggestions(): Promise<WeightAdjustment[]> {
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
}

export default AnalyticsService
