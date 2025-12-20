export type Marketplace = 'TCG' | 'MANABOX' | 'CK'

export type Demand = {
  cardId: string
  quantity: number
  maxPrice?: number
}

export type Offer = {
  marketplace: Marketplace
  sellerId: string
  cardId: string
  price: number
  quantityAvailable: number
  shipping: {
    base: number
    freeAt?: number
  }
  sellerRating?: number
}

export type SellerBasket = {
  sellerId: string
  marketplace: Marketplace
  items: Map<string, number>
  cardSubtotal: number
  shippingCost: number
  freeShippingTriggered: boolean
  totalCost: number
  reasons: Map<string, string[]>
}

export type ManualDirective = {
  cardId: string
  quantity?: number
  mode: 'FORCE' | 'PREFER' | 'SHIP_ONLY'
}

export type PreprocessResult = {
  demands: Demand[]
  maxPriceByCard: Map<string, number>
  offers: Offer[]
}
