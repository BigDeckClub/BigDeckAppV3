export interface ScrapedOffer {
    sellerId: string;
    sellerName: string;
    cardId: string; // Scryfall ID
    price: number;
    quantity: number;
    marketplace: 'TCG';
    shipping: {
        base: number;
        freeAt?: number;
    };
    condition?: string;
    sellerRating?: number; // 0-1 scale
    // Internal API fields
    sellerKey?: string;
    sku?: string;
    itemKey?: string;
}

export interface ScraperResult {
    offers: ScrapedOffer[];
    errors: string[];
}
