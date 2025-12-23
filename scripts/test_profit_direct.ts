
import { phase5FinalizePlan } from '../server/autobuy/optimizer';
import type { SellerBasket } from '../server/autobuy/types';

const mockBaskets: SellerBasket[] = [
    {
        sellerId: 'SellerA',
        marketplace: 'TCG',
        items: new Map([['card_cheap', 1]]),
        cardSubtotal: 5.0,
        shippingCost: 0,
        freeShippingTriggered: false,
        totalCost: 5.0,
        reasons: new Map()
    },
    {
        sellerId: 'SellerB',
        marketplace: 'TCG',
        items: new Map([['card_expensive', 1]]),
        cardSubtotal: 9.0,
        shippingCost: 0,
        freeShippingTriggered: false,
        totalCost: 9.0,
        reasons: new Map()
    }
];

const mockCKPrices = new Map([
    ['card_cheap', 10.0],
    ['card_expensive', 10.0]
]);

const budget = {
    maxTotalSpend: 100,
    maxPerSeller: 100,
    maxPerCard: 100,
    maxSpeculativeSpend: 0,
    reserveBudgetPercent: 0,
    maxCostRatio: 0.7,
    budgetMode: 'STRICT' as const
};

console.log('Running Phase 5 Direct Test...');

const plan = phase5FinalizePlan(
    mockBaskets,
    {},
    budget,
    { demandSpend: 0, speculativeSpend: 0 },
    mockCKPrices
);

console.log('--- Results ---');
plan.baskets.forEach(b => {
    console.log(`Seller: ${b.sellerId}`);
    console.log(`Total: $${b.totalCost}`);
    console.log(`Retail: $${b.retailTotal}`);
    console.log(`Ratio: ${b.costRatio?.toFixed(2)}`);
    console.log(`Profitable: ${b.isProfitable}`);
});

// Assertions
const b1 = plan.baskets.find(b => b.sellerId === 'SellerA');
const b2 = plan.baskets.find(b => b.sellerId === 'SellerB');

if (b1?.isProfitable !== true) console.error('FAIL: SellerA should be profitable (0.5 < 0.7)');
else console.log('PASS: SellerA');

if (b2?.isProfitable !== false) console.error('FAIL: SellerB should NOT be profitable (0.9 > 0.7)');
else console.log('PASS: SellerB');
