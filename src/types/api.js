/**
 * JSDoc Type Definitions for API Data Models
 * These types match the Prisma schema and API response structures
 */

// ============================================
// Card & Printing Types (Reference Data)
// ============================================

/**
 * Master card catalog entry
 * @typedef {Object} Card
 * @property {number} id - Unique card ID
 * @property {string} oracleId - Scryfall oracle ID
 * @property {string} name - Card name
 * @property {string} normalizedName - Lowercase normalized name
 * @property {string} [typeLine] - Card type line
 * @property {string} [manaCost] - Mana cost string
 * @property {number} [cmc] - Converted mana cost
 * @property {string[]} colors - Card colors
 * @property {string[]} colorIdentity - Color identity
 * @property {string[]} keywords - Keywords
 * @property {string} [oracleText] - Rules text
 * @property {string} createdAt - Creation timestamp
 * @property {string} updatedAt - Last update timestamp
 */

/**
 * Set-specific card printing
 * @typedef {Object} Printing
 * @property {number} id - Unique printing ID
 * @property {number} cardId - Reference to Card
 * @property {string} scryfallId - Scryfall card ID
 * @property {string} setCode - Set code (e.g., "M11")
 * @property {string} setName - Full set name
 * @property {string} [collectorNumber] - Collector number
 * @property {string} [rarity] - Rarity (common, uncommon, rare, mythic)
 * @property {string} [finish] - Card finish (normal, foil, etched)
 * @property {string} [imageUriSmall] - Small image URL
 * @property {string} [imageUriNormal] - Normal image URL
 * @property {string} [imageUriLarge] - Large image URL
 * @property {string} createdAt - Creation timestamp
 * @property {string} updatedAt - Last update timestamp
 */

/**
 * Price history snapshot
 * @typedef {Object} PriceSnapshot
 * @property {number} id - Unique snapshot ID
 * @property {number} printingId - Reference to Printing
 * @property {number} [priceTcg] - TCGPlayer price
 * @property {number} [priceCk] - Card Kingdom price
 * @property {number} [priceScryfall] - Scryfall price
 * @property {string} snapshotDate - Snapshot timestamp
 */

// ============================================
// Inventory Types
// ============================================

/**
 * Inventory item (card in stock)
 * @typedef {Object} InventoryItem
 * @property {number} id - Unique inventory ID
 * @property {number} [printingId] - Reference to Printing (new modular schema)
 * @property {string} [name] - Card name (legacy field)
 * @property {string} [set] - Set code (legacy field)
 * @property {string} [setName] - Set name (legacy field)
 * @property {string} [imageUrl] - Image URL (legacy field)
 * @property {string} [scryfallId] - Scryfall ID (legacy field)
 * @property {number} quantity - Quantity in stock
 * @property {number} [purchasePrice] - Purchase price per card
 * @property {string} [purchaseDate] - Purchase date string
 * @property {string} [reorderType] - Reorder type (Normal, Priority, etc.)
 * @property {string} createdAt - Creation timestamp
 */

/**
 * Purchase history record
 * @typedef {Object} PurchaseHistoryItem
 * @property {number} id - Unique purchase ID
 * @property {number} inventoryId - Reference to Inventory
 * @property {string} purchaseDate - Purchase date
 * @property {number} purchasePrice - Purchase price
 * @property {number} quantity - Quantity purchased
 * @property {string} createdAt - Creation timestamp
 */

// ============================================
// Container Types
// ============================================

/**
 * Card container (deck box, binder, etc.)
 * @typedef {Object} Container
 * @property {number} id - Unique container ID
 * @property {string} name - Container name
 * @property {number} [decklistId] - Reference to Decklist
 * @property {ContainerCard[]} cards - Cards in container (legacy JSONB)
 * @property {string} createdAt - Creation timestamp
 */

/**
 * Card entry in a container (legacy JSONB structure)
 * @typedef {Object} ContainerCard
 * @property {number|string} [inventoryId] - Reference to Inventory
 * @property {string} name - Card name
 * @property {string} [set] - Set code
 * @property {string} [set_name] - Set name
 * @property {number} quantity_used - Quantity used from inventory
 * @property {number} [purchase_price] - Purchase price
 */

/**
 * Container item (new modular schema - for future use)
 * @typedef {Object} ContainerItem
 * @property {number} id - Unique item ID
 * @property {number} containerId - Reference to Container
 * @property {number} [inventoryId] - Reference to Inventory
 * @property {number} [printingId] - Reference to Printing
 * @property {number} quantity - Quantity
 */

// ============================================
// Decklist Types
// ============================================

/**
 * Decklist definition
 * @typedef {Object} Decklist
 * @property {number} id - Unique decklist ID
 * @property {string} name - Decklist name
 * @property {string} [decklist] - Raw decklist text (legacy format)
 * @property {string} createdAt - Creation timestamp
 */

/**
 * Parsed decklist card (new modular schema - for future use)
 * @typedef {Object} DeckItem
 * @property {number} id - Unique item ID
 * @property {number} decklistId - Reference to Decklist
 * @property {number} [printingId] - Reference to Printing
 * @property {string} [cardName] - Card name fallback
 * @property {string} [setCode] - Set code
 * @property {number} quantity - Quantity
 * @property {boolean} isSideboard - Whether card is in sideboard
 */

// ============================================
// Sales Types
// ============================================

/**
 * Sale record
 * @typedef {Object} Sale
 * @property {number} id - Unique sale ID
 * @property {number} [containerId] - Reference to Container (may be null after sale)
 * @property {number} [decklistId] - Reference to Decklist
 * @property {string} [decklistName] - Decklist name at time of sale
 * @property {number} [salePrice] - Sale price
 * @property {number} [costBasis] - Cost basis (total purchase cost)
 * @property {string} soldDate - Sale date
 * @property {string} createdAt - Creation timestamp
 */

// ============================================
// Settings & Activity Types
// ============================================

/**
 * Application setting
 * @typedef {Object} Setting
 * @property {string} key - Setting key
 * @property {string} [value] - Setting value
 */

/**
 * Usage history/activity log entry
 * @typedef {Object} UsageHistoryItem
 * @property {number} id - Unique entry ID
 * @property {string} action - Action description
 * @property {string} [details] - Additional details (JSON string)
 * @property {string} createdAt - Creation timestamp
 */

// ============================================
// API Response Types
// ============================================

/**
 * Standard API error response
 * @typedef {Object} ApiError
 * @property {string} error - Error message
 * @property {string[]} [details] - Validation error details
 */

/**
 * Price data from price API
 * @typedef {Object} PriceData
 * @property {string} tcg - TCGPlayer price string (e.g., "$1.07" or "N/A")
 * @property {string} ck - Card Kingdom price string
 */

/**
 * Analytics summary data
 * @typedef {Object} AnalyticsSummary
 * @property {number} totalPurchases - Total purchase count
 * @property {number} totalSpent - Total amount spent
 * @property {number} totalCards - Total card count
 * @property {number} avgPricePerCard - Average price per card
 */

export {};
