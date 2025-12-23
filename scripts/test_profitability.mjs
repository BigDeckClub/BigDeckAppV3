
// import fetch from 'node-fetch'; // Use global fetch

(async () => {
    const API_URL = 'http://localhost:3000/api/autobuy/plan';

    // Mock Data
    const payload = {
        demands: [
            { cardId: 'card_cheap', quantity: 1 },
            { cardId: 'card_expensive', quantity: 1 }
        ],
        offers: [
            {
                cardId: 'card_cheap',
                sellerId: 'SellerA',
                price: 5.0,
                quantityAvailable: 4,
                marketplace: 'TCG',
                shipping: { base: 0 }
            },
            {
                cardId: 'card_expensive',
                sellerId: 'SellerB',
                price: 9.0,
                quantityAvailable: 4,
                marketplace: 'TCG',
                shipping: { base: 0 }
            }
        ],
        cardKingdomPrices: {
            'card_cheap': 10.0,    // 5.0 / 10.0 = 50% (Profitable)
            'card_expensive': 10.0 // 9.0 / 10.0 = 90% (Unprofitable > 70%)
        },
        budget: {
            maxTotalSpend: 100,
            maxPerSeller: 100,
            maxPerCard: 100,
            maxSpeculativeSpend: 0,
            reserveBudgetPercent: 0,
            maxCostRatio: 0.7,
            budgetMode: 'STRICT'
        }
    };

    try {
        console.log('Sending request to optimizer...');
        const resp = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!resp.ok) {
            const txt = await resp.text();
            console.error('API Error:', resp.status);
            try {
                const json = JSON.parse(txt);
                console.error(JSON.stringify(json, null, 2));
            } catch (e) {
                console.error(txt);
            }
            return;
        }

        const plan = await resp.json();

        console.log('--- Results ---');
        plan.baskets.forEach(b => {
            console.log(`Seller: ${b.sellerId}`);
            console.log(`Total Cost: $${b.totalCost}`);
            console.log(`Retail Total: $${b.retailTotal}`);
            console.log(`Cost Ratio: ${b.costRatio.toFixed(2)} (${b.costRatio * 100}%)`);
            console.log(`Is Profitable: ${b.isProfitable}`);

            // Validation
            if (b.items[0].cardId === 'card_cheap' && !b.isProfitable) console.error('FAIL: Cheap card should be profitable');
            if (b.items[0].cardId === 'card_expensive' && b.isProfitable) console.error('FAIL: Expensive card should NOT be profitable');
        });

    } catch (e) {
        console.error(e);
    }
})();
