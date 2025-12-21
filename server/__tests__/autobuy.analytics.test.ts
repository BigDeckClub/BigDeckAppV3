
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AnalyticsService } from '../autobuy/analytics'

// Mock database
const mockDb = {
    query: vi.fn(),
}

describe('AnalyticsService', () => {
    let analytics: AnalyticsService

    beforeEach(() => {
        vi.clearAllMocks()
        analytics = new AnalyticsService(mockDb)
    })

    it('starts a run and returns runId', async () => {
        mockDb.query.mockResolvedValueOnce({ rows: [{ id: 123 }] })

        const runId = await analytics.startRun({
            predictedTotal: 100.50,
            notes: 'Test run',
        })

        expect(runId).toBe(123)
        expect(mockDb.query).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO autobuy_runs'),
            [100.50, 'Test run']
        )
    })

    it('logs run items in batches', async () => {
        const items = Array(60).fill(null).map((_, i) => ({
            cardId: `card-${i}`,
            cardName: `Card ${i}`,
            predictedPrice: 1.00,
            quantity: 1,
            sellerId: 'seller-1',
            marketplace: 'TCG'
        }))

        await analytics.logRunItems(123, items)

        // Should be called twice due to batch size of 50
        expect(mockDb.query).toHaveBeenCalledTimes(2)
    })

    it('completes a run', async () => {
        await analytics.completeRun(123, {
            actualTotal: 95.00,
            status: 'purchased'
        })

        expect(mockDb.query).toHaveBeenCalledWith(
            expect.stringContaining('UPDATE autobuy_runs'),
            ['purchased', 95.00, 123]
        )
    })

    it('logs a metric', async () => {
        await analytics.logMetric({
            type: 'ips_test',
            value: 0.85,
            cardId: 'card-abc',
            metadata: { version: 'v2' }
        })

        expect(mockDb.query).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO autobuy_metrics'),
            ['ips_test', 0.85, 'card-abc', { version: 'v2' }]
        )
    })
})
