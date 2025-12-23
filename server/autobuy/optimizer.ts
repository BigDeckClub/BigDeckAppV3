import type {
  Demand,
  Offer,
  PreprocessResult,
  SellerBasket as SellerBasketType,
  ManualDirective,
  Marketplace,
  BudgetConfig,
  BudgetResult,
} from './types.js'

// Deterministic helper: stable sort by keys when equal
function stableSort<T>(arr: T[], cmp: (a: T, b: T) => number) {
  return arr
    .map((v, i) => ({ v, i }))
    .sort((a, b) => {
      const r = cmp(a.v, b.v)
      return r !== 0 ? r : a.i - b.i
    })
    .map(x => x.v)
}

export class SellerBasket implements SellerBasketType {
  sellerId: string
  marketplace: Marketplace
  items: Map<string, number>
  cardSubtotal: number
  shippingCost: number
  freeShippingTriggered: boolean
  totalCost: number
  reasons: Map<string, string[]>
  shippingBase: number
  freeAt?: number

  constructor(sellerId: string, marketplace: Marketplace, shippingBase = 0, freeAt?: number) {
    this.sellerId = sellerId
    this.marketplace = marketplace
    this.items = new Map()
    this.cardSubtotal = 0
    this.shippingCost = 0
    this.freeShippingTriggered = false
    this.totalCost = 0
    this.reasons = new Map()
    this.shippingBase = shippingBase
    this.freeAt = freeAt
  }

  addItem(cardId: string, price: number, qty = 1, reason = 'DECK_DEMAND') {
    const prev = this.items.get(cardId) ?? 0
    this.items.set(cardId, prev + qty)
    this.cardSubtotal += price * qty
    if (!this.shippingCost) {
      // first item triggers shipping base to be accounted later
      this.shippingCost = this.shippingBase
    }
    this.evaluateFreeShipping()
    this.totalCost = this.cardSubtotal + this.shippingCost
    const rs = this.reasons.get(cardId) ?? []
    rs.push(reason)
    this.reasons.set(cardId, rs)
  }

  evaluateFreeShipping() {
    if (this.freeAt !== undefined && this.cardSubtotal >= this.freeAt) {
      this.freeShippingTriggered = true
      this.shippingCost = 0
    } else if (this.freeAt === undefined) {
      // no free ship rule for this seller
      this.freeShippingTriggered = false
    }
  }
}

/**
 * Phase 0 - Preprocessing
 * - apply FORCE directives
 * - compute max acceptable price using Card Kingdom prices (if available)
 * - filter offers exceeding max price
 * - return updated demands and filtered offers
 */
export function preprocessDemands(
  demandsIn: Demand[],
  directives: ManualDirective[],
  cardKingdomPrices: Map<string, number>,
  currentInventory: Map<string, number>
): PreprocessResult {
  // clone demands
  const demandsMap = new Map<string, number>()
  const maxPriceByCard = new Map<string, number>()

  // start with provided demand
  for (const d of demandsIn) {
    demandsMap.set(d.cardId, (demandsMap.get(d.cardId) ?? 0) + d.quantity)
    if (d.maxPrice !== undefined) maxPriceByCard.set(d.cardId, d.maxPrice)
  }

  // apply FORCE directives deterministically
  for (const dir of directives.filter(x => x.mode === 'FORCE')) {
    const add = dir.quantity ?? 1
    demandsMap.set(dir.cardId, (demandsMap.get(dir.cardId) ?? 0) + add)
    // record directive max price as infinite unless provided elsewhere
    if (!maxPriceByCard.has(dir.cardId)) {
      const ck = cardKingdomPrices.get(dir.cardId)
      if (ck !== undefined) maxPriceByCard.set(dir.cardId, ck)
    }
  }

  // derive max price from CK if not specified
  for (const [cardId, qty] of demandsMap.entries()) {
    if (!maxPriceByCard.has(cardId)) {
      const ck = cardKingdomPrices.get(cardId)
      if (ck !== undefined) maxPriceByCard.set(cardId, ck)
    }
  }

  const demands: Demand[] = []
  for (const [cardId, quantity] of demandsMap.entries()) {
    const maxPrice = maxPriceByCard.get(cardId)
    demands.push({ cardId, quantity, maxPrice })
  }

  return { demands, maxPriceByCard, offers: [] }
}

/** Validate manual directives for safety and determinism. */
export function validateDirectives(directives: ManualDirective[]) {
  const knownModes = new Set(['FORCE', 'PREFER', 'SHIP_ONLY'])
  for (const d of directives) {
    if (!d.cardId) throw new Error('Directive missing cardId')
    if (!knownModes.has(d.mode)) throw new Error(`Unknown directive mode: ${d.mode}`)
    if (d.quantity !== undefined && (!Number.isInteger(d.quantity) || d.quantity <= 0)) throw new Error('Directive quantity must be a positive integer')
  }
  return true
}

/**
 * Run full pipeline phases 0-5 deterministically and return final plan.
 * This is a convenience runner intended for CLI/testing only.
 */
export function runFullPipeline(opts: {
  demands: Demand[]
  directives?: ManualDirective[]
  offers?: Offer[]
  hotList?: { cardId: string; IPS: number; targetInventory?: number }[]
  cardKingdomPrices?: Map<string, number>
  currentInventory?: Map<string, number>
  budget?: BudgetConfig
  graceAmount?: number
  substitutionGroups?: { groupId: string; cards: string[] }[]
}) {
  const directives = opts.directives ?? []
  validateDirectives(directives)
  const cardKingdomPrices = opts.cardKingdomPrices ?? new Map()
  const currentInventory = opts.currentInventory ?? new Map()
  const budgetConfig = opts.budget
  const graceAmount = opts.graceAmount ?? 0
  const substitutionGroups = opts.substitutionGroups ?? []

  const pre = preprocessDemands(opts.demands, directives, cardKingdomPrices, currentInventory)

  // Build PREFER directives map for Phase 1
  const preferDirectives = new Map<string, string>()
  for (const d of directives) {
    if (d.mode === 'PREFER') {
      // For PREFER, the cardId indicates which card, and we could extend to include preferred seller
      // For now, PREFER cards get priority in allocation order
      preferDirectives.set(d.cardId, d.cardId) // Placeholder - extend schema for preferred seller
    }
  }

  const offers = opts.offers ?? []

  console.log('[Optimizer] Input Summary:')
  console.log(`  - Demands: ${pre.demands.length}`)
  console.log(`  - Offers: ${offers.length}`)
  console.log(`  - CK Prices Map Size: ${cardKingdomPrices.size}`)
  console.log(`  - Grace Amount: ${graceAmount}`)
  console.log(`  - Substitution Groups: ${substitutionGroups.length}`)

  if (offers.length > 0) {
    console.log(`  - Sample Offer:`, JSON.stringify(offers[0], null, 2))
  }
  if (pre.demands.length > 0) {
    console.log(`  - Sample Demand:`, JSON.stringify(pre.demands[0]))
  }

  const { baskets: phase1Baskets, unmet, budgetTracker: phase1Budget } = greedyAllocatePhase1(
    pre.demands, offers, cardKingdomPrices, preferDirectives, 0.1, budgetConfig
  )

  console.log(`[Optimizer] Phase 1 Result: ${phase1Baskets.length} baskets, ${unmet.length} unmet demands`)

  const { baskets: phase2Baskets, budgetTracker: phase2Budget } = phase2OptimizeShipping(
    phase1Baskets, offers, unmet, opts.hotList ?? [], directives, pre.maxPriceByCard, currentInventory,
    budgetConfig, phase1Budget.demandSpend, cardKingdomPrices,
    graceAmount, substitutionGroups
  )

  const { baskets: phase3Baskets } = phase3LocalImprovement(phase2Baskets, offers, cardKingdomPrices)

  // Calculate current spend before Phase 4
  const currentTotalSpend = phase3Baskets.reduce((sum, b) => sum + b.totalCost, 0)

  const { baskets: phase4Baskets } = phase4CardKingdomFallback(
    phase3Baskets, unmet, cardKingdomPrices, { base: 0 }, budgetConfig, currentTotalSpend
  )

  const plan = phase5FinalizePlan(phase4Baskets, {}, budgetConfig, {
    demandSpend: phase1Budget.demandSpend,
    speculativeSpend: phase2Budget.speculativeSpend,
  }, cardKingdomPrices)
  return plan
}

export function groupOffersBySeller(offers: Offer[]) {
  const map = new Map<string, Offer[]>()
  for (const o of offers) {
    const arr = map.get(o.sellerId) ?? []
    arr.push({ ...o })
    map.set(o.sellerId, arr)
  }
  return map
}

/**
 * Phase 1 - Greedy Demand Allocation
 * For each demanded card unit, assign to seller with lowest marginal cost
 * Supports PREFER directives which give a discount to preferred sellers
 * Includes seller rating penalty for lower-rated sellers
 * Now includes budget tracking and enforcement
 */
export function greedyAllocatePhase1(
  demandsIn: Demand[],
  offersIn: Offer[],
  cardKingdomPrices: Map<string, number>,
  preferDirectives: Map<string, string> = new Map(), // cardId -> preferred sellerId
  sellerRatingPenaltyWeight: number = 0.1, // λ for rating penalty
  budgetConfig?: BudgetConfig
) {
  // Calculate effective budget (reserving for CK fallback)
  const reservePercent = budgetConfig?.reserveBudgetPercent ?? 0
  const effectiveBudget = budgetConfig?.maxTotalSpend
    ? budgetConfig.maxTotalSpend * (1 - reservePercent / 100)
    : Infinity
  const maxPerCard = budgetConfig?.maxPerCard ?? Infinity
  const maxPerSeller = budgetConfig?.maxPerSeller ?? Infinity

  // Budget tracking
  let runningTotalSpend = 0
  const sellerSpend = new Map<string, number>()

  // Calculate potential revenue for optimistic shipping checks
  const demandsMap = new Map<string, number>()
  for (const d of demandsIn) demandsMap.set(d.cardId, d.quantity)

  const potentialRevenueBySeller = new Map<string, number>()
  for (const o of offersIn) {
    const qtyNeeded = demandsMap.get(o.cardId) ?? 0
    if (qtyNeeded > 0 && o.quantityAvailable > 0) {
      const reachable = Math.min(qtyNeeded, o.quantityAvailable)
      const val = reachable * o.price
      potentialRevenueBySeller.set(o.sellerId, (potentialRevenueBySeller.get(o.sellerId) ?? 0) + val)
    }
  }

  // Filter offers map by availability
  const offersByCard = new Map<string, Offer[]>()
  for (const o of offersIn) {
    if (o.quantityAvailable <= 0) continue
    // Skip offers exceeding per-card budget
    if (o.price > maxPerCard) continue
    const arr = offersByCard.get(o.cardId) ?? []
    arr.push({ ...o })
    offersByCard.set(o.cardId, arr)
  }

  // Seller baskets map
  const baskets = new Map<string, SellerBasket>()

  // Prepare demands sorting: highest CK price, fewest sellers
  const demands = demandsIn.slice()
  const demandsSorted = stableSort(demands, (a, b) => {
    const aCK = cardKingdomPrices.get(a.cardId) ?? 0
    const bCK = cardKingdomPrices.get(b.cardId) ?? 0
    if (bCK !== aCK) return bCK - aCK
    const aSellers = (offersByCard.get(a.cardId) ?? []).length
    const bSellers = (offersByCard.get(b.cardId) ?? []).length
    return aSellers - bSellers
  })

  const unmet: Demand[] = []

  for (const demand of demandsSorted) {
    let remaining = demand.quantity
    const offers = stableSort((offersByCard.get(demand.cardId) ?? []).slice(), (x, y) => {
      if (x.price !== y.price) return x.price - y.price
      return x.sellerId < y.sellerId ? -1 : 1
    })

    // Check if there's a PREFER directive for this card
    const preferredSellerId = preferDirectives.get(demand.cardId)

    // allocate each unit deterministically
    while (remaining > 0) {
      // Check if we've hit the budget ceiling (STRICT only)
      if (budgetConfig?.budgetMode !== 'SOFT' && runningTotalSpend >= effectiveBudget) break

      // build candidate marginal costs
      // calculate CR Ratio for prioritization
      const candidates: { offer: Offer; marginal: number; ratio: number }[] = []

      const retailPrice = cardKingdomPrices.get(demand.cardId) ?? 0

      for (const o of offers) {
        if (o.quantityAvailable <= 0) continue

        // Check if this purchase would exceed total budget
        const wouldSpend = runningTotalSpend + o.price
        if (budgetConfig?.budgetMode !== 'SOFT' && wouldSpend > effectiveBudget) continue

        // Check if this purchase would exceed per-seller budget
        const currentSellerSpend = sellerSpend.get(o.sellerId) ?? 0
        const basketExists = baskets.has(o.sellerId)

        // Optimistic Shipping: Check if we are likely to hit free shipping threshold
        // If basket exists, shipping is 0.
        // If not, check if potential revenue >= freeAt
        const freeAt = o.shipping.freeAt
        const potentialVal = potentialRevenueBySeller.get(o.sellerId) ?? 0
        const isFreeShippingLikely = freeAt !== undefined && potentialVal >= freeAt

        // We use Optimistic Shipping for prioritization if basket exists OR likely to trigger free shipping
        const shippingMarginal = (basketExists || isFreeShippingLikely) ? 0 : o.shipping.base

        const totalSellerWithPurchase = currentSellerSpend + o.price + shippingMarginal
        if (totalSellerWithPurchase > maxPerSeller) continue

        // Seller rating penalty: penalty = λ * (1 - sellerRating)
        const sellerRating = o.sellerRating ?? 1.0
        const ratingPenalty = sellerRatingPenaltyWeight * (1 - sellerRating) * o.price

        let marginal = o.price + shippingMarginal + ratingPenalty

        // Apply PREFER discount: give 10% preference to preferred sellers
        if (preferredSellerId && o.sellerId === preferredSellerId) {
          marginal *= 0.9
        }

        // CR Ratio: Marginal Cost / Retail Price
        // If Retail Price is missing (0), fallback to using Marginal Cost as the sort key (effectively Ratio = Cost)
        // This prioritizes cheap items when value is unknown.
        const ratio = retailPrice > 0 ? marginal / retailPrice : marginal

        candidates.push({ offer: o, marginal, ratio })
      }

      if (candidates.length === 0) break

      // pick lowest CR Ratio (Best Dealer); tie-breaker: marginal cost, then sellerId
      candidates.sort((a, b) => {
        // Primary: CR Ratio ASC
        if (Math.abs(a.ratio - b.ratio) > 0.0001) return a.ratio - b.ratio

        // Secondary: Marginal Cost ASC
        if (a.marginal !== b.marginal) return a.marginal - b.marginal

        // Tertiary: SellerId
        if (a.offer.sellerId < b.offer.sellerId) return -1
        if (a.offer.sellerId > b.offer.sellerId) return 1
        return 0
      })

      const pick = candidates[0].offer
      // create basket if needed
      if (!baskets.has(pick.sellerId)) {
        baskets.set(pick.sellerId, new SellerBasket(pick.sellerId, pick.marketplace, pick.shipping.base, pick.shipping.freeAt))
        // Account for shipping in seller spend
        const newSellerSpend = (sellerSpend.get(pick.sellerId) ?? 0) + pick.shipping.base
        sellerSpend.set(pick.sellerId, newSellerSpend)
        runningTotalSpend += pick.shipping.base
      }
      const basket = baskets.get(pick.sellerId) as SellerBasket

      // assign one unit and track budget
      basket.addItem(demand.cardId, pick.price, 1, 'DECK_DEMAND')
      pick.quantityAvailable -= 1
      remaining -= 1

      // Update spend tracking
      runningTotalSpend += pick.price
      sellerSpend.set(pick.sellerId, (sellerSpend.get(pick.sellerId) ?? 0) + pick.price)
    }

    if (remaining > 0) {
      unmet.push({ cardId: demand.cardId, quantity: remaining })
    }
  }

  // finalize totalCost for baskets
  const result: SellerBasketType[] = Array.from(baskets.values()).map(b => ({
    sellerId: b.sellerId,
    marketplace: b.marketplace,
    items: b.items,
    cardSubtotal: b.cardSubtotal,
    shippingCost: b.shippingCost,
    freeShippingTriggered: b.freeShippingTriggered,
    totalCost: b.totalCost,
    reasons: b.reasons,
  }))

  return {
    baskets: result,
    unmet,
    budgetTracker: {
      demandSpend: runningTotalSpend,
      sellerSpend: Object.fromEntries(sellerSpend),
    }
  }
}


/**
 * Phase 2 - Shipping Threshold Optimization
 * For each seller basket try to add seller-local candidates (demand, hot list, ship_only)
 * until free shipping is triggered and only if total cost improves.
 * Now includes budget tracking for speculative (non-demand) spending.
 */
export function phase2OptimizeShipping(
  basketsIn: SellerBasketType[],
  offersIn: Offer[],
  unmet: Demand[],
  hotList: { cardId: string; IPS: number; targetInventory?: number }[],
  directives: ManualDirective[],
  maxPriceByCard: Map<string, number>,
  currentInventory: Map<string, number>,
  budgetConfig?: BudgetConfig,
  currentDemandSpend: number = 0,
  cardKingdomPrices: Map<string, number> = new Map(),
  graceAmount: number = 0,
  substitutionGroups: { groupId: string; cards: string[] }[] = []
) {
  // Budget limits for speculative spending
  const maxSpeculativeSpend = budgetConfig?.maxSpeculativeSpend ?? Infinity
  const maxPerSeller = budgetConfig?.maxPerSeller ?? Infinity
  const maxPerCard = budgetConfig?.maxPerCard ?? Infinity
  // Speculative spending must ALWAYS respect total budget, even in SOFT mode
  const maxTotalDetail = budgetConfig?.maxTotalSpend ?? Infinity

  let speculativeSpend = 0
  let totalSpend = currentDemandSpend // Need to track total spend for speculative limits

  // Compute current seller spend from existing baskets
  const sellerSpend = new Map<string, number>()
  for (const b of basketsIn) {
    sellerSpend.set(b.sellerId, b.totalCost)
  }

  // Reconstruct mutable SellerBasket instances with shipping rules
  const offersBySeller = new Map<string, Offer[]>()
  for (const o of offersIn) {
    const arr = offersBySeller.get(o.sellerId) ?? []
    arr.push({ ...o })
    offersBySeller.set(o.sellerId, arr)
  }

  const hotMap = new Map<string, { IPS: number; target?: number }>()
  for (const h of hotList) hotMap.set(h.cardId, { IPS: h.IPS, target: h.targetInventory })

  // Pre-process substitution groups
  const substitutionsMap = new Map<string, string[]>() // cardId -> substitutes
  const cardToGroupMap = new Map<string, { groupId: string, cards: string[] }>() // cardId -> group
  for (const group of substitutionGroups) {
    for (const cardId of group.cards) {
      cardToGroupMap.set(cardId, group)
      const others = group.cards.filter(c => c !== cardId)
      if (others.length > 0) substitutionsMap.set(cardId, others)
    }
  }

  // Track ALL demanded cards (met or unmet) for Grace Amount logic
  const allDemandedCardIds = new Set(maxPriceByCard.keys())

  // Find "Active Groups" - groups that contain at least one demanded card
  const activeGroups = new Set<{ groupId: string, cards: string[] }>()
  for (const cardId of allDemandedCardIds) {
    const g = cardToGroupMap.get(cardId)
    if (g) activeGroups.add(g)
  }



  // helper: rebuild SellerBasket from plain input
  const basketsMap = new Map<string, SellerBasket>()
  for (const b of basketsIn) {
    const sellerOffers = offersBySeller.get(b.sellerId) ?? []
    const sample = sellerOffers[0]
    const shippingBase = sample?.shipping?.base ?? b.shippingCost ?? 0
    const freeAt = sample?.shipping?.freeAt ?? undefined
    const sb = new SellerBasket(b.sellerId, b.marketplace as Marketplace, shippingBase, freeAt)
    // restore items and subtotals
    for (const [cardId, qty] of b.items.entries()) {
      // we don't have per-card price here; keep subtotal as-is
      sb.items.set(cardId, qty)
    }
    sb.cardSubtotal = b.cardSubtotal
    sb.evaluateFreeShipping()
    sb.shippingCost = sb.freeShippingTriggered ? 0 : shippingBase
    sb.totalCost = sb.cardSubtotal + sb.shippingCost
    // copy reasons
    for (const [cardId, rs] of b.reasons.entries()) sb.reasons.set(cardId, [...rs])
    basketsMap.set(b.sellerId, sb)
  }

  // Build quick lookup for unmet demands
  const unmetMap = new Map<string, number>()
  for (const u of unmet) unmetMap.set(u.cardId, (unmetMap.get(u.cardId) ?? 0) + u.quantity)

  // Build directives lookup for SHIP_ONLY
  const shipOnlySet = new Set(directives.filter(d => d.mode === 'SHIP_ONLY').map(d => d.cardId))

  // Process each basket deterministically by sellerId order
  const sellerIds = Array.from(basketsMap.keys()).sort()
  for (const sellerId of sellerIds) {
    const basket = basketsMap.get(sellerId) as SellerBasket
    if (!basket || basket.freeShippingTriggered || basket.freeAt === undefined) continue
    if (basket.cardSubtotal >= basket.freeAt) {
      basket.evaluateFreeShipping()
      continue
    }

    const sellerOffers = offersBySeller.get(sellerId) ?? []
    // candidates: offers from this seller that match unmet, hot list, or ship_only
    const candidates: { cardId: string; price: number; available: number; priority: number; reasonSrc: string; isSpeculative: boolean; ratio: number }[] = []

    // helper to push candidate if meets price/margin/budget rules
    const pushIfValid = (cardId: string, price: number, avail: number, priority: number, reasonSrc: string, isSpeculative: boolean, maxPriceOverride?: number) => {
      const maxP = maxPriceByCard.get(cardId)
      // Allow substitutions/hotlist/filler (speculative) to check price against maxPerCard if implicit
      if (maxP === undefined && !maxPriceOverride && !isSpeculative) return

      const checkPrice = maxPriceOverride ?? maxP ?? maxPerCard
      const margin = checkPrice - price
      if (margin <= 0) return
      // Check per-card budget
      if (price > maxPerCard) return

      // Calculate CR Ratio using Retail Price (with fallback)
      const retail = cardKingdomPrices.get(cardId) ?? 0
      const ratio = retail > 0 ? price / retail : 1.1

      // Filter: For speculative items (Priority > 1.5), reject if Ratio > 1.0 (bad value)
      if (priority > 1.5 && ratio > 1.0) return

      candidates.push({ cardId, price, available: avail, priority, reasonSrc, isSpeculative, ratio })
    }

    // 1. Unmet demand candidates (highest priority, not speculative)
    for (const o of sellerOffers) {
      if (o.quantityAvailable <= 0) continue
      if (unmetMap.has(o.cardId)) {
        // Priority 1
        pushIfValid(o.cardId, o.price, o.quantityAvailable, 1, 'DEMAND', false)
      }
    }

    // 1.5 Substitution candidates (for UNMET demands)
    for (const [unmetCardId, _] of unmetMap.entries()) {
      const substitutes = substitutionsMap.get(unmetCardId)
      if (substitutes) {
        for (const subId of substitutes) {
          const subOffer = sellerOffers.find(o => o.cardId === subId && o.quantityAvailable > 0)
          if (subOffer) {
            const demandMax = maxPriceByCard.get(unmetCardId)
            // Use substitute price checks
            if (demandMax !== undefined && subOffer.price <= demandMax && subOffer.price <= maxPerCard) {
              const retail = cardKingdomPrices.get(subId) ?? 0
              const ratio = retail > 0 ? subOffer.price / retail : subOffer.price
              candidates.push({
                cardId: subId,
                price: subOffer.price,
                available: subOffer.quantityAvailable,
                priority: 1.5,
                reasonSrc: `SUBSTITUTION_FOR_${unmetCardId}`,
                isSpeculative: false,
                ratio
              })
            }
          }
        }
      }
    }

    // Iterate offers once for other categories to support Arbitrage (picking best from group)
    for (const o of sellerOffers) {
      if (o.quantityAvailable <= 0) continue

      const groupId = cardToGroupMap.get(o.cardId)
      const group = groupId ? activeGroups.has(groupId) : false

      // 3. Smart Filler (Priority 1.8) - Substitutes for active demands
      if (group) {
        // It's a member of an active substitution group
        pushIfValid(o.cardId, o.price, o.quantityAvailable, 1.8, 'SMART_FILLER', true)
      }

      // 4. Hot list candidates (Priority 2)
      const h = hotMap.get(o.cardId)
      if (h) {
        const target = h.target ?? Infinity
        const curr = currentInventory.get(o.cardId) ?? 0
        const deficit = Math.max(0, target - curr)
        if (deficit > 0) {
          pushIfValid(o.cardId, o.price, Math.min(o.quantityAvailable, deficit), 2, 'HOT_LIST', true)
        }
      }

      // 5. SHIP_ONLY directives (Priority 5)
      if (shipOnlySet.has(o.cardId)) {
        pushIfValid(o.cardId, o.price, o.quantityAvailable, 5, 'SHIP_ONLY', true)
      }

      // 6. Grace Arbitrage (Priority 3)
      if (graceAmount > 0) {
        if (allDemandedCardIds.has(o.cardId)) {
          // Direct match
          pushIfValid(o.cardId, o.price, Math.min(o.quantityAvailable, graceAmount), 3, 'GRACE_AMOUNT', true)
        } else if (group) {
          // Substitution match (Arbitrage)
          // If any card in this group is demanded, this card can serve as Grace
          pushIfValid(o.cardId, o.price, Math.min(o.quantityAvailable, graceAmount), 3, 'GRACE_ARBITRAGE', true)
        }
      }
    }

    if (candidates.length === 0) continue

    // deterministic ordering: 
    // 1. Ratio ASC (Best Value)
    // 2. Priority ASC (Demand > HotList > ShipOnly)
    // 3. Price ASC
    candidates.sort((a, b) => {
      if (Math.abs(a.ratio - b.ratio) > 0.0001) return a.ratio - b.ratio
      if (a.priority !== b.priority) return a.priority - b.priority
      if (a.price !== b.price) return a.price - b.price
      return a.cardId < b.cardId ? -1 : 1
    })



    const initialTotal = basket.cardSubtotal + basket.shippingCost
    const deltaNeeded = basket.freeAt - basket.cardSubtotal
    const currentSellerTotal = sellerSpend.get(sellerId) ?? 0

    // try adding cheapest candidates in order until free ship triggered
    const additions: { cardId: string; qty: number; price: number; reason: string; isSpeculative: boolean }[] = []
    let runningSubtotal = basket.cardSubtotal
    let runningSpeculative = speculativeSpend
    let runningSellerTotal = currentSellerTotal

    for (const c of candidates) {
      if (runningSubtotal >= basket.freeAt) break

      // take up to available units or enough to trigger free shipping
      const neededForFree = Math.max(0, basket.freeAt - runningSubtotal)
      const unitsForFree = Math.ceil(neededForFree / c.price)

      // Calculate max affordable by various budgets
      let maxAffordable = c.available
      if (c.isSpeculative) {
        const budgetRem = maxSpeculativeSpend - runningSpeculative
        maxAffordable = Math.min(maxAffordable, Math.floor(budgetRem / c.price))

        const totalRem = maxTotalDetail - totalSpend
        maxAffordable = Math.min(maxAffordable, Math.floor(totalRem / c.price))
      }

      const sellerRem = maxPerSeller - runningSellerTotal
      maxAffordable = Math.min(maxAffordable, Math.floor(sellerRem / c.price))

      if (maxAffordable <= 0) continue

      // Take enough to clear shipping, capped by availability/budget
      // If we are filling with cheap items, we might need multiple.
      const take = Math.min(maxAffordable, unitsForFree)
      if (take <= 0) continue

      runningSubtotal += c.price * take
      if (c.isSpeculative) runningSpeculative += c.price * take
      runningSellerTotal += c.price * take
      additions.push({ cardId: c.cardId, qty: take, price: c.price, reason: 'SHIPPING_OPTIMIZATION', isSpeculative: c.isSpeculative })
    }

    if (runningSubtotal < basket.freeAt) {
      // couldn't trigger free shipping; skip unless sequence reduces total (unlikely)
      continue
    }

    const newTotal = runningSubtotal // shipping 0
    if (newTotal <= initialTotal) {
      // apply additions to basket and decrement seller offers
      for (const a of additions) {
        // find matching offer from this seller
        const offer = sellerOffers.find(x => x.cardId === a.cardId && x.quantityAvailable > 0)
        if (!offer) continue
        const qtyToAdd = Math.min(a.qty, offer.quantityAvailable)
        basket.addItem(a.cardId, a.price, qtyToAdd, a.reason)
        offer.quantityAvailable -= qtyToAdd

        // Track speculative spending
        if (a.isSpeculative) {
          speculativeSpend += a.price * qtyToAdd
        }

        // Update seller spend tracking
        sellerSpend.set(sellerId, (sellerSpend.get(sellerId) ?? 0) + a.price * qtyToAdd)

        // adjust unmetMap if we satisfied demand
        // Check if this was a substitution
        let demandCardId = a.cardId
        if (a.reason.startsWith('SUBSTITUTION_FOR_')) {
          demandCardId = a.reason.replace('SUBSTITUTION_FOR_', '')
        }

        if (unmetMap.has(demandCardId)) {
          const rem = unmetMap.get(demandCardId)! - qtyToAdd
          if (rem <= 0) unmetMap.delete(demandCardId)
          else unmetMap.set(demandCardId, rem)
        }
      }
    }
  }

  // return updated baskets as plain objects and updated offers
  const outBaskets = Array.from(basketsMap.values()).map(b => ({
    sellerId: b.sellerId,
    marketplace: b.marketplace,
    items: b.items,
    cardSubtotal: b.cardSubtotal,
    shippingCost: b.shippingCost,
    freeShippingTriggered: b.freeShippingTriggered,
    totalCost: b.totalCost,
    reasons: b.reasons,
  }))

  return {
    baskets: outBaskets,
    offers: offersIn,
    budgetTracker: {
      speculativeSpend,
      sellerSpend: Object.fromEntries(sellerSpend),
    }
  }
}

/**
 * Phase 3 - Local Improvement (Greedy hill-climbing)
 * Try moving single units between seller baskets when it reduces total cost.
 * Deterministic ordering and a capped number of iterations.
 */
export function phase3LocalImprovement(
  basketsIn: SellerBasketType[],
  offersIn: Offer[],
  cardKingdomPrices: Map<string, number>,
  maxIterations = 10
) {
  // Build offers-by-seller mutable copy
  const offersBySeller = new Map<string, Offer[]>()
  for (const o of offersIn) {
    const arr = offersBySeller.get(o.sellerId) ?? []
    // shallow copy so we can mutate quantities
    arr.push({ ...o })
    offersBySeller.set(o.sellerId, arr)
  }

  // Reconstruct SellerBasket instances (keep shippingBase stored)
  const basketsMap = new Map<string, SellerBasket>()
  for (const b of basketsIn) {
    const sellerOffers = offersBySeller.get(b.sellerId) ?? []
    const sample = sellerOffers[0]
    const shippingBase = sample?.shipping?.base ?? b.shippingCost ?? 0
    const freeAt = sample?.shipping?.freeAt ?? undefined
    const sb = new SellerBasket(b.sellerId, b.marketplace as Marketplace, shippingBase, freeAt)
    for (const [cardId, qty] of b.items.entries()) sb.items.set(cardId, qty)
    sb.cardSubtotal = b.cardSubtotal
    sb.evaluateFreeShipping()
    sb.shippingCost = sb.freeShippingTriggered ? 0 : shippingBase
    sb.totalCost = sb.cardSubtotal + sb.shippingCost
    for (const [cardId, rs] of b.reasons.entries()) sb.reasons.set(cardId, [...rs])
    basketsMap.set(b.sellerId, sb)
  }

  const sellerIds = Array.from(basketsMap.keys()).sort()

  const computeTotal = () => {
    let t = 0
    for (const s of basketsMap.values()) t += s.cardSubtotal + s.shippingCost
    return t
  }

  const getLowestOfferPrice = (sellerId: string, cardId: string) => {
    const ofs = offersBySeller.get(sellerId) ?? []
    let best: Offer | undefined
    for (const o of ofs) if (o.cardId === cardId && o.quantityAvailable > 0) {
      if (!best || o.price < best.price) best = o
    }
    return best?.price
  }

  let iter = 0
  let improved = true
  while (improved && iter < maxIterations) {
    improved = false
    iter += 1
    // deterministic scan
    for (const srcId of sellerIds) {
      const src = basketsMap.get(srcId)
      if (!src) continue
      // snapshot cardIds to avoid iterator mutation issues
      const srcCards = Array.from(src.items.keys()).sort()
      for (const cardId of srcCards) {
        const srcQty = src.items.get(cardId) ?? 0
        if (srcQty <= 0) continue

        for (const tgtId of sellerIds) {
          if (tgtId === srcId) continue
          const tgt = basketsMap.get(tgtId)
          if (!tgt) continue

          const tgtPrice = getLowestOfferPrice(tgtId, cardId)
          if (tgtPrice === undefined) continue

          const srcPrice = getLowestOfferPrice(srcId, cardId) ?? cardKingdomPrices.get(cardId) ?? 0

          // if moving unit from src to tgt, compute new subtotals
          const srcSubtotalAfter = src.cardSubtotal - srcPrice
          const tgtSubtotalAfter = tgt.cardSubtotal + tgtPrice

          const srcShippingAfter = (src.freeAt !== undefined && srcSubtotalAfter >= src.freeAt) ? 0 : (src.freeAt !== undefined ? src.shippingBase : src.shippingBase)
          const tgtShippingAfter = (tgt.freeAt !== undefined && tgtSubtotalAfter >= tgt.freeAt) ? 0 : (tgt.freeAt !== undefined ? tgt.shippingBase : tgt.shippingBase)

          const before = src.cardSubtotal + src.shippingCost + tgt.cardSubtotal + tgt.shippingCost
          const after = srcSubtotalAfter + srcShippingAfter + tgtSubtotalAfter + tgtShippingAfter

          if (after + 1e-9 < before) {
            // apply move of 1 unit
            // adjust source
            src.items.set(cardId, srcQty - 1)
            src.cardSubtotal = srcSubtotalAfter
            src.evaluateFreeShipping()
            src.shippingCost = src.freeShippingTriggered ? 0 : src.shippingBase
            src.totalCost = src.cardSubtotal + src.shippingCost

            // adjust target
            tgt.items.set(cardId, (tgt.items.get(cardId) ?? 0) + 1)
            tgt.cardSubtotal = tgtSubtotalAfter
            tgt.evaluateFreeShipping()
            tgt.shippingCost = tgt.freeShippingTriggered ? 0 : tgt.shippingBase
            tgt.totalCost = tgt.cardSubtotal + tgt.shippingCost

            // update offers availability where possible
            const tgtOffers = offersBySeller.get(tgtId) ?? []
            const srcOffers = offersBySeller.get(srcId) ?? []
            const usedTgt = tgtOffers.find(o => o.cardId === cardId && o.quantityAvailable > 0)
            if (usedTgt) usedTgt.quantityAvailable -= 1
            // return unit to source offers if any
            const returnedSrc = srcOffers.find(o => o.cardId === cardId)
            if (returnedSrc) returnedSrc.quantityAvailable += 1

            // set reasons
            const r = tgt.reasons.get(cardId) ?? []
            r.push('LOCAL_IMPROVEMENT')
            tgt.reasons.set(cardId, r)

            // remove empty source items
            if ((src.items.get(cardId) ?? 0) <= 0) src.items.delete(cardId)

            improved = true
            break
          }
        }
        if (improved) break
      }
      if (improved) break
    }
    // remove empty baskets
    for (const [id, b] of Array.from(basketsMap.entries())) {
      if (Array.from(b.items.values()).reduce((s, q) => s + q, 0) === 0) basketsMap.delete(id)
    }
  }

  const outBaskets = Array.from(basketsMap.values()).map(b => ({
    sellerId: b.sellerId,
    marketplace: b.marketplace,
    items: b.items,
    cardSubtotal: b.cardSubtotal,
    shippingCost: b.shippingCost,
    freeShippingTriggered: b.freeShippingTriggered,
    totalCost: b.totalCost,
    reasons: b.reasons,
  }))

  return { baskets: outBaskets, offers: Array.from(offersBySeller.values()).flat() }
}

/**
 * Phase 4 - Card Kingdom Fallback
 * Any unmet demand will be fulfilled by Card Kingdom (CK) which is treated
 * as infinite inventory with known shipping rules. CK is a final-resort
 * marketplace and will be represented as a single basket per CK seller.
 */
export function phase4CardKingdomFallback(
  basketsIn: SellerBasketType[],
  unmet: { cardId: string; quantity: number }[],
  cardKingdomPrices: Map<string, number>,
  ckShipping: { base: number; freeAt?: number } = { base: 0, freeAt: undefined },
  budgetConfig?: BudgetConfig,
  currentTotalSpend: number = 0
) {
  // copy existing baskets
  const baskets = basketsIn.slice()

  if (!unmet || unmet.length === 0) return { baskets, unmet: [] }

  const maxTotal = budgetConfig?.maxTotalSpend ?? Infinity
  let runningTotal = currentTotalSpend

  // find existing CK basket or create new one
  let ckBasket = baskets.find(b => b.marketplace === 'CK') as SellerBasketType | undefined
  if (!ckBasket) {
    const mb = new SellerBasket('CK', 'CK', ckShipping.base, ckShipping.freeAt)
    ckBasket = {
      sellerId: mb.sellerId,
      marketplace: mb.marketplace,
      items: mb.items,
      cardSubtotal: mb.cardSubtotal,
      shippingCost: mb.shippingCost,
      freeShippingTriggered: mb.freeShippingTriggered,
      totalCost: mb.totalCost,
      reasons: mb.reasons,
    }
    baskets.push(ckBasket)
  }

  // add unmet demand to CK basket using CK prices from map
  for (const u of unmet) {
    const price = cardKingdomPrices.get(u.cardId) ?? 0
    let qty = u.quantity

    // Check budget
    // Check budget (STRICT mode only)
    if (budgetConfig && budgetConfig.budgetMode !== 'SOFT') {
      // If we can't afford even one unit, stop or partial fill
      if (runningTotal >= maxTotal) break

      const affordableQty = Math.floor((maxTotal - runningTotal) / price)
      if (affordableQty <= 0) continue // Skip if too expensive
      qty = Math.min(qty, affordableQty)
    }

    // update items map
    const prev = ckBasket.items.get(u.cardId) ?? 0
    ckBasket.items.set(u.cardId, prev + qty)
    ckBasket.cardSubtotal += price * qty
    const reasons = ckBasket.reasons.get(u.cardId) ?? []
    reasons.push('CK_FALLBACK')
    ckBasket.reasons.set(u.cardId, reasons)

    runningTotal += price * qty
  }

  // evaluate free shipping and totals
  const mbSample = new SellerBasket(ckBasket.sellerId, ckBasket.marketplace, ckShipping.base, ckShipping.freeAt)
  mbSample.cardSubtotal = ckBasket.cardSubtotal
  mbSample.evaluateFreeShipping()
  ckBasket.freeShippingTriggered = mbSample.freeShippingTriggered
  ckBasket.shippingCost = mbSample.freeShippingTriggered ? 0 : ckShipping.base
  ckBasket.totalCost = ckBasket.cardSubtotal + ckBasket.shippingCost

  return { baskets, unmet: [] }
}

/**
 * Phase 5 - Finalize Plan
 * Validate baskets, compute totals deterministically and produce a human-friendly
 * purchase plan object ready for review.
 * Now includes budget validation with warnings and utilization metrics.
 */
export function phase5FinalizePlan(
  basketsIn: SellerBasketType[],
  meta: { runId?: string; createdAt?: string } = {},
  budgetConfig?: BudgetConfig,
  spendTracker?: { demandSpend: number; speculativeSpend: number },
  cardKingdomPrices?: Map<string, number>
) {
  // Validate and compute totals deterministically
  const baskets = basketsIn.map(b => ({
    sellerId: b.sellerId,
    marketplace: b.marketplace,
    items: Array.from(b.items.entries()).map(([cardId, qty]) => ({ cardId, quantity: qty })),
    cardSubtotal: Number((b.cardSubtotal ?? 0)),
    shippingCost: Number((b.shippingCost ?? 0)),
    freeShippingTriggered: Boolean(b.freeShippingTriggered),
    totalCost: Number((b.totalCost ?? (b.cardSubtotal ?? 0) + (b.shippingCost ?? 0))),
    reasons: Array.from(b.reasons.entries()).reduce((acc: Record<string, string[]>, [cid, rs]) => {
      acc[cid] = rs.slice()
      return acc
    }, {} as Record<string, string[]>),
    retailTotal: 0,
    costRatio: 0,
    isProfitable: true // default
  }))

  // deterministic sort by sellerId
  baskets.sort((a, b) => (a.sellerId < b.sellerId ? -1 : a.sellerId > b.sellerId ? 1 : 0))

  const overallTotal = baskets.reduce((s, bx) => s + bx.totalCost, 0)

  // Profitability Validation
  const maxCostRatio = budgetConfig?.maxCostRatio ?? 0.7
  if (cardKingdomPrices) {
    baskets.forEach(b => {
      let retail = 0
      b.items.forEach(item => {
        const p = cardKingdomPrices.get(item.cardId) ?? 0
        retail += p * item.quantity
      })
      b.retailTotal = retail

      if (retail > 0) {
        b.costRatio = b.totalCost / retail
        b.isProfitable = b.costRatio <= maxCostRatio
      } else {
        // Unknown retail
        b.costRatio = 0
        b.isProfitable = true
      }
    })
  }

  // Budget validation
  let budgetResult: BudgetResult | undefined
  if (budgetConfig) {
    const maxTotal = budgetConfig.maxTotalSpend
    const reservePercent = budgetConfig.reserveBudgetPercent ?? 0
    const reservedBudget = maxTotal * (reservePercent / 100)
    const budgetUtilization = maxTotal > 0 ? (overallTotal / maxTotal) * 100 : 0
    const warnings: string[] = []

    // Generate warnings based on utilization
    if (budgetUtilization >= 95) {
      warnings.push('Budget utilization exceeds 95% - critically close to limit')
    } else if (budgetUtilization >= 90) {
      warnings.push('Budget utilization exceeds 90% - approaching limit')
    } else if (budgetUtilization >= 80) {
      warnings.push('Budget utilization exceeds 80%')
    }

    // Check hard budget exceeded
    const isStrict = budgetConfig.budgetMode !== 'SOFT'
    const limitExceeded = overallTotal > maxTotal
    const hardBudgetExceeded = isStrict && limitExceeded

    if (limitExceeded) {
      if (isStrict) {
        warnings.push(`HARD BUDGET EXCEEDED: Total $${overallTotal.toFixed(2)} exceeds max $${maxTotal.toFixed(2)}`)
      } else {
        warnings.push(`Soft Budget Limit Exceeded: Total $${overallTotal.toFixed(2)} exceeds max $${maxTotal.toFixed(2)}`)
      }
    }

    // Check speculative spend
    if (spendTracker && budgetConfig.maxSpeculativeSpend > 0) {
      if (spendTracker.speculativeSpend > budgetConfig.maxSpeculativeSpend) {
        warnings.push(`Speculative spending ($${spendTracker.speculativeSpend.toFixed(2)}) exceeded limit ($${budgetConfig.maxSpeculativeSpend.toFixed(2)})`)
      }
    }

    budgetResult = {
      totalSpend: overallTotal,
      demandSpend: spendTracker?.demandSpend ?? overallTotal,
      speculativeSpend: spendTracker?.speculativeSpend ?? 0,
      reservedBudget,
      budgetUtilization: Math.round(budgetUtilization * 100) / 100,
      warnings,
      hardBudgetExceeded,
    }
  }

  const plan = {
    meta: {
      runId: meta.runId ?? `autobuy-${Date.now()}`,
      createdAt: meta.createdAt ?? new Date().toISOString(),
    },
    summary: {
      totalBaskets: baskets.length,
      overallTotal,
    },
    baskets,
    budget: budgetResult,
  }

  return plan
}



export default {
  preprocessDemands,
  groupOffersBySeller,
  greedyAllocatePhase1,
  phase2OptimizeShipping,
  phase3LocalImprovement,
  // Phase 4 fallback
  phase4CardKingdomFallback,
  phase5FinalizePlan,
}
