import type {
  Demand,
  Offer,
  PreprocessResult,
  SellerBasket as SellerBasketType,
  ManualDirective,
  Marketplace,
} from './types'

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

class SellerBasket implements SellerBasketType {
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
}) {
  const directives = opts.directives ?? []
  validateDirectives(directives)
  const cardKingdomPrices = opts.cardKingdomPrices ?? new Map()
  const currentInventory = opts.currentInventory ?? new Map()

  const pre = preprocessDemands(opts.demands, directives, cardKingdomPrices, currentInventory)

  const offers = opts.offers ?? []
  const { baskets: phase1Baskets, unmet } = greedyAllocatePhase1(pre.demands, offers, cardKingdomPrices)

  const { baskets: phase2Baskets } = phase2OptimizeShipping(phase1Baskets, offers, unmet, opts.hotList ?? [], directives, pre.maxPriceByCard, currentInventory)

  const { baskets: phase3Baskets } = phase3LocalImprovement(phase2Baskets, offers, cardKingdomPrices)

  const { baskets: phase4Baskets } = phase4CardKingdomFallback(phase3Baskets, unmet, cardKingdomPrices)

  const plan = phase5FinalizePlan(phase4Baskets)
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
 */
export function greedyAllocatePhase1(
  demandsIn: Demand[],
  offersIn: Offer[],
  cardKingdomPrices: Map<string, number>
) {
  // Filter offers map by availability
  const offersByCard = new Map<string, Offer[]>()
  for (const o of offersIn) {
    if (o.quantityAvailable <= 0) continue
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

    // allocate each unit deterministically
    while (remaining > 0) {
      // build candidate marginal costs
      const candidates: { offer: Offer; marginal: number }[] = []
      for (const o of offers) {
        if (o.quantityAvailable <= 0) continue
        // compute marginal cost
        const basketExists = baskets.has(o.sellerId)
        const shippingMarginal = basketExists ? 0 : o.shipping.base
        const marginal = o.price + shippingMarginal
        candidates.push({ offer: o, marginal })
      }

      if (candidates.length === 0) break

      // pick lowest marginal; deterministic tie-breaker: sellerId
      candidates.sort((a, b) => {
        if (a.marginal !== b.marginal) return a.marginal - b.marginal
        if (a.offer.sellerId < b.offer.sellerId) return -1
        if (a.offer.sellerId > b.offer.sellerId) return 1
        return 0
      })

      const pick = candidates[0].offer
      // create basket if needed
      if (!baskets.has(pick.sellerId)) {
        baskets.set(pick.sellerId, new SellerBasket(pick.sellerId, pick.marketplace, pick.shipping.base, pick.shipping.freeAt))
      }
      const basket = baskets.get(pick.sellerId) as SellerBasket

      // assign one unit
      basket.addItem(demand.cardId, pick.price, 1, 'DECK_DEMAND')
      pick.quantityAvailable -= 1
      remaining -= 1
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

  return { baskets: result, unmet }
}

/**
 * Phase 2 - Shipping Threshold Optimization
 * For each seller basket try to add seller-local candidates (demand, hot list, ship_only)
 * until free shipping is triggered and only if total cost improves.
 */
export function phase2OptimizeShipping(
  basketsIn: SellerBasketType[],
  offersIn: Offer[],
  unmet: Demand[],
  hotList: { cardId: string; IPS: number; targetInventory?: number }[],
  directives: ManualDirective[],
  maxPriceByCard: Map<string, number>,
  currentInventory: Map<string, number>
) {
  // Reconstruct mutable SellerBasket instances with shipping rules
  const offersBySeller = new Map<string, Offer[]>()
  for (const o of offersIn) {
    const arr = offersBySeller.get(o.sellerId) ?? []
    arr.push({ ...o })
    offersBySeller.set(o.sellerId, arr)
  }

  const hotMap = new Map<string, { IPS: number; target?: number }>()
  for (const h of hotList) hotMap.set(h.cardId, { IPS: h.IPS, target: h.targetInventory })

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
    const candidates: { cardId: string; price: number; available: number; priority: number; reasonSrc: string }[] = []

    // helper to push candidate if meets price/margin rules
    const pushIfValid = (cardId: string, price: number, avail: number, priority: number, reasonSrc: string) => {
      const maxP = maxPriceByCard.get(cardId)
      if (maxP === undefined) return
      const margin = maxP - price
      if (margin <= 0) return
      candidates.push({ cardId, price, available: avail, priority, reasonSrc })
    }

    // unmet demand candidates (highest priority)
    for (const o of sellerOffers) {
      const avail = o.quantityAvailable
      if (avail <= 0) continue
      if (unmetMap.has(o.cardId)) {
        pushIfValid(o.cardId, o.price, avail, 1, 'DEMAND')
      }
    }

    // hot list candidates
    for (const o of sellerOffers) {
      const h = hotMap.get(o.cardId)
      if (!h) continue
      const target = h.target ?? Infinity
      const curr = currentInventory.get(o.cardId) ?? 0
      const deficit = Math.max(0, target - curr)
      if (deficit <= 0) continue
      pushIfValid(o.cardId, o.price, Math.min(o.quantityAvailable, deficit), 2, 'HOT_LIST')
    }

    // SHIP_ONLY directives
    for (const o of sellerOffers) {
      if (shipOnlySet.has(o.cardId)) pushIfValid(o.cardId, o.price, o.quantityAvailable, 5, 'SHIP_ONLY')
    }

    if (candidates.length === 0) continue

    // deterministic ordering: priority asc, price asc, cardId asc
    candidates.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority
      if (a.price !== b.price) return a.price - b.price
      return a.cardId < b.cardId ? -1 : 1
    })

    const initialTotal = basket.cardSubtotal + basket.shippingCost
    const deltaNeeded = basket.freeAt - basket.cardSubtotal

    // try adding cheapest candidates in order until free ship triggered
    const additions: { cardId: string; qty: number; price: number; reason: string }[] = []
    let runningSubtotal = basket.cardSubtotal
    for (const c of candidates) {
      if (runningSubtotal >= basket.freeAt) break
      // take up to available units; but keep deterministic: try 1 unit first
      const take = 1
      // respect hot list target deficit cap already in available
      runningSubtotal += c.price * take
      additions.push({ cardId: c.cardId, qty: take, price: c.price, reason: 'SHIPPING_OPTIMIZATION' })
    }

    if (runningSubtotal < basket.freeAt) {
      // couldn't trigger free shipping; skip unless sequence reduces total (unlikely)
      continue
    }

    const newTotal = runningSubtotal // shipping 0
    if (newTotal < initialTotal) {
      // apply additions to basket and decrement seller offers
      for (const a of additions) {
        // find matching offer from this seller
        const offer = sellerOffers.find(x => x.cardId === a.cardId && x.quantityAvailable > 0)
        if (!offer) continue
        const qtyToAdd = Math.min(a.qty, offer.quantityAvailable)
        basket.addItem(a.cardId, a.price, qtyToAdd, a.reason)
        offer.quantityAvailable -= qtyToAdd
        // adjust unmetMap if we satisfied demand
        if (unmetMap.has(a.cardId)) {
          const rem = unmetMap.get(a.cardId)! - qtyToAdd
          if (rem <= 0) unmetMap.delete(a.cardId)
          else unmetMap.set(a.cardId, rem)
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

  return { baskets: outBaskets, offers: offersIn }
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

  return { baskets: outBaskets, offers: [].concat(...offersBySeller.values()) }
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
  ckShipping: { base: number; freeAt?: number } = { base: 0, freeAt: undefined }
) {
  // copy existing baskets
  const baskets = basketsIn.slice()

  if (!unmet || unmet.length === 0) return { baskets, unmet: [] }

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
    const qty = u.quantity
    // update items map
    const prev = ckBasket.items.get(u.cardId) ?? 0
    ckBasket.items.set(u.cardId, prev + qty)
    ckBasket.cardSubtotal += price * qty
    const reasons = ckBasket.reasons.get(u.cardId) ?? []
    reasons.push('CK_FALLBACK')
    ckBasket.reasons.set(u.cardId, reasons)
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
 */
export function phase5FinalizePlan(
  basketsIn: SellerBasketType[],
  meta: { runId?: string; createdAt?: string } = {}
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
  }))

  // deterministic sort by sellerId
  baskets.sort((a, b) => (a.sellerId < b.sellerId ? -1 : a.sellerId > b.sellerId ? 1 : 0))

  const overallTotal = baskets.reduce((s, bx) => s + bx.totalCost, 0)

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
