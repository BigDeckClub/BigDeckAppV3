# Print Options Feature - Implementation Summary

## Overview

Added a user-friendly modal for selecting proxy printing options with inventory-aware recommendations and paywall integration points.

## Features Implemented

### 1. Print Options Modal

When users click "Print Proxies", they see a modal with:
- **Deck Statistics**: Shows total cards, owned cards, and missing cards
- **Two Print Options**:
  - **Print All Cards**: Print the entire deck
  - **Print Missing Cards Only** (Recommended): Only print cards not in inventory

### 2. Inventory Integration

The system automatically:
- Checks user's inventory for each card in the deck
- Calculates how many cards the user already owns
- Determines missing card quantities
- Shows cost savings when printing only missing cards

### 3. Smart Recommendations

- If user owns some cards, "Print Missing Only" is marked as "Recommended"
- Shows cost comparison: e.g., "Save $0.45" by printing only missing cards
- If user owns all cards, "Print Missing Only" button is disabled and greyed out with "All Owned" badge

### 4. Pricing Display

- Clear pricing at $0.01 per card
- Shows total cost for each option
- Displays potential savings when printing only missing cards

### 5. Paywall Integration Point

Location: `src/components/aidbuilder/AIDeckBuilder.jsx` line 138-143

```javascript
// TODO: Integrate actual payment gateway here
// For now, just show confirmation and proceed
// When ready, add Stripe/PayPal integration:
// const paymentResult = await processPayment(cost);
// if (!paymentResult.success) return;
```

## User Flow

1. User generates a deck with AI
2. Clicks "Print Proxies" button
3. Modal appears showing:
   - Total cards in deck
   - Cards they already own (green)
   - Cards they need (amber)
4. User sees two options:
   - **Print All Cards** ($X.XX) - Always available
   - **Print Missing Cards Only** ($Y.YY) - Shows "Recommended" badge if missing cards exist
     - If user owns all cards: Button is disabled, greyed out, shows "All Owned" badge and message "You already own all cards in this deck"
5. User selects available option
6. **[PAYWALL CHECKPOINT]** - Payment gateway would be integrated here
7. PDF generates with selected cards
8. Success notification appears

## Code Changes

### Modified Files

1. **`src/components/aidbuilder/AIDeckBuilder.jsx`**
   - Added `showPrintModal` state
   - Added `handlePrintProxies(mode)` function
   - Added Print Options Modal UI (lines 617-720)
   - Updated Print Proxies button to open modal

2. **`src/utils/proxyGenerator.js`** (from previous update)
   - Removed procedural art generation
   - Added Scryfall data fetching
   - Added category-based template system

### Key Functions

#### `handlePrintProxies(mode)`
- **Parameters**: `mode` - 'all' or 'missing'
- **Purpose**: Filters cards based on mode and generates PDF
- **Integration Point**: Add payment gateway call before generating PDF

#### Modal Calculation Logic
```javascript
const totalCards = result.deck.cards.reduce((sum, c) => sum + (c.quantity || 1), 0);
const missingCards = result.deck.cards.filter(card => {
    const ownedQty = checkOwnership(card.name);
    const neededQty = card.quantity || 1;
    return ownedQty < neededQty;
});
const missingCount = missingCards.reduce((sum, card) => {
    const ownedQty = checkOwnership(card.name);
    const neededQty = card.quantity || 1;
    return sum + (neededQty - ownedQty);
}, 0);
```

## Payment Integration Guide

To add payment processing:

### 1. Install Payment Library
```bash
npm install @stripe/stripe-js
# or
npm install @paypal/checkout-server-sdk
```

### 2. Create Payment Endpoint
```javascript
// server/routes/payments.js
router.post('/create-payment-intent', async (req, res) => {
    const { amount, cardCount } = req.body;
    // Create payment intent
    // Return client secret
});
```

### 3. Update handlePrintProxies
```javascript
const handlePrintProxies = async (mode) => {
    // ... existing card filtering logic ...

    // Add payment processing
    const paymentResult = await processPayment({
        amount: cost,
        cardCount: totalCardsToPrint,
        description: `Print ${totalCardsToPrint} proxy cards`
    });

    if (!paymentResult.success) {
        showToast('Payment failed. Please try again.', TOAST_TYPES.ERROR);
        return;
    }

    // Continue with PDF generation...
};
```

### 4. Add processPayment Function
```javascript
const processPayment = async ({ amount, cardCount, description }) => {
    // Stripe example
    const stripe = await loadStripe(STRIPE_PUBLIC_KEY);

    const response = await post('/payments/create-payment-intent', {
        amount: Math.round(amount * 100), // Convert to cents
        cardCount,
        description
    });

    const { error } = await stripe.confirmPayment({
        clientSecret: response.clientSecret,
        // ... payment method details
    });

    return { success: !error };
};
```

## UI/UX Improvements

### Modal Design
- Clean, dark-themed modal matching app design
- Clear visual hierarchy with color coding:
  - Green for owned cards
  - Amber for missing cards
  - Amber button for recommended option
- Prominent pricing display
- Clear savings calculation

### Responsive Design
- Modal is responsive with max-width and padding
- Works on mobile and desktop
- Uses existing design system variables

### User Feedback
- Toast notifications for:
  - Generating PDF
  - Success
  - Errors
  - No cards to print

## Testing Checklist

- [ ] Modal opens when clicking "Print Proxies"
- [ ] Correctly calculates owned vs missing cards
- [ ] Shows "Print All" option with correct count and price
- [ ] Shows "Print Missing Only" when applicable
- [ ] Shows "You own all cards" when no missing cards
- [ ] Closes modal when clicking Cancel
- [ ] Generates correct PDF for "All Cards"
- [ ] Generates correct PDF for "Missing Cards Only"
- [ ] Payment integration (when added)

## Future Enhancements

1. **Premium Templates Selection**: Add dropdown in modal to select artist templates
2. **Save Preferences**: Remember user's last selection (all vs missing)
3. **Bulk Discount**: Offer discounts for printing many cards at once
4. **Download History**: Track previous prints for re-download
5. **Print Preview**: Show preview of first few cards before payment
6. **Subscription Model**: Offer unlimited prints for monthly fee

## Pricing Notes

Current pricing: **$0.01 per card**

Example costs:
- 100-card Commander deck: $1.00
- 60-card Standard deck: $0.60
- Missing 30 cards: $0.30

This is intentionally very affordable to encourage usage and volume.
