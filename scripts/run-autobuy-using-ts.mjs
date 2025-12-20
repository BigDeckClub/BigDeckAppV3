#!/usr/bin/env node
// This file requires a TypeScript-aware runtime (ts-node with ESM loader).
// Example: npx ts-node --esm scripts/run-autobuy-using-ts.mjs

import optimizer from '../server/autobuy/optimizer'

const { runFullPipeline } = optimizer

const sampleDemands = [
  { cardId: 'C1', quantity: 2 },
  { cardId: 'C2', quantity: 1 },
]

const sampleOffers = [
  { marketplace: 'TCG', sellerId: 'S1', cardId: 'C1', price: 3, quantityAvailable: 2, shipping: { base: 5, freeAt: 20 } },
  { marketplace: 'TCG', sellerId: 'S2', cardId: 'C1', price: 4, quantityAvailable: 2, shipping: { base: 0 } },
  { marketplace: 'TCG', sellerId: 'S1', cardId: 'C2', price: 6, quantityAvailable: 1, shipping: { base: 5, freeAt: 20 } },
]

const ckPrices = new Map([['C1', 8], ['C2', 7]])

const plan = runFullPipeline({
  demands: sampleDemands,
  offers: sampleOffers,
  cardKingdomPrices: ckPrices,
})

console.log(JSON.stringify(plan, null, 2))
