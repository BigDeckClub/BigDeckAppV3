// import fetch from 'node-fetch'; // Native fetch in Node 18+

const BASE_URL = 'http://localhost:5000';

async function verifyGraceLogic() {
    console.log('--- Verifying Grace Amount Logic ---');

    // Scenario: Seller has Card A ($1). Shipping $5. Free at $5.
    // Demand: 1x Card A.
    // Without Grace: Cost $1 + $5 = $6.
    // With Grace: Buy 5x Card A ($5) + $0 Shipping = $5. Cheaper!

    const payload = {
        demands: [{ cardId: 'CardA', quantity: 1 }],
        offers: [
            {
                cardId: 'CardA', sellerId: 'Seller1', price: 1.00, quantityAvailable: 20,
                shipping: { base: 5.00, freeAt: 5.00 },
                marketplace: 'TCG'
            }
        ],
        cardKingdomPrices: { 'CardA': 2.00 }, // Retail price to allow speculative buy
        graceAmount: 5 // Allow buying up to 5 MORE
    };

    try {
        const res = await fetch(`${BASE_URL}/api/autobuy/plan`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const plan = await res.json();
        if (plan.error) {
            console.error('API Error:', plan.error);
            return;
        }

        const basket = plan.baskets.find(b => b.sellerId === 'Seller1');
        if (!basket) {
            console.error('Failed: No basket created for Seller1');
            return;
        }

        const item = basket.items.find(i => i.cardId === 'CardA');
        console.log(`Basket Items: ${item.quantity} (Expected 5)`);
        console.log(`Shipping Cost: $${basket.shippingCost} (Expected 0)`);
        console.log(`Total Cost: $${basket.totalCost} (Expected 5.00)`);

        if (item.quantity === 5 && basket.shippingCost === 0) {
            console.log('✅ SUCCESS: Grace logic triggered free shipping!');
        } else {
            console.log('❌ FAILURE: Grace logic did not trigger.');
        }

    } catch (err) {
        console.error('Request failed:', err);
    }
}

verifyGraceLogic();
