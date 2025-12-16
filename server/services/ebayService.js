/**
 * eBay API Service
 * Handles OAuth, listing management, and order sync for eBay integration
 */

import { pool } from '../db/pool.js';
import crypto from 'crypto';

// eBay API configuration
const EBAY_CONFIG = {
  sandbox: {
    authUrl: 'https://auth.sandbox.ebay.com/oauth2/authorize',
    tokenUrl: 'https://api.sandbox.ebay.com/identity/v1/oauth2/token',
    apiUrl: 'https://api.sandbox.ebay.com',
  },
  production: {
    authUrl: 'https://auth.ebay.com/oauth2/authorize',
    tokenUrl: 'https://api.ebay.com/identity/v1/oauth2/token',
    apiUrl: 'https://api.ebay.com',
  },
};

// Required scopes for selling
const EBAY_SCOPES = [
  'https://api.ebay.com/oauth/api_scope',
  'https://api.ebay.com/oauth/api_scope/sell.inventory',
  'https://api.ebay.com/oauth/api_scope/sell.account',
  'https://api.ebay.com/oauth/api_scope/sell.fulfillment',
].join(' ');

/**
 * Get eBay environment configuration
 */
function getEbayConfig() {
  const env = process.env.EBAY_ENVIRONMENT || 'sandbox';
  return EBAY_CONFIG[env] || EBAY_CONFIG.sandbox;
}

/**
 * Check if eBay integration is configured
 */
export function isEbayConfigured() {
  return !!(
    process.env.EBAY_CLIENT_ID &&
    process.env.EBAY_CLIENT_SECRET &&
    process.env.EBAY_REDIRECT_URI
  );
}

/**
 * Encrypt sensitive data (tokens) before storing
 */
function encryptToken(token) {
  if (!token) return null;
  const key = process.env.ENCRYPTION_KEY;
  if (!key || key.length < 32) {
    console.warn('[EBAY] ENCRYPTION_KEY not set or too short, storing token unencrypted');
    return token;
  }
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key.slice(0, 32)), iv);
  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypt sensitive data (tokens) when reading
 */
function decryptToken(encryptedToken) {
  if (!encryptedToken) return null;
  const key = process.env.ENCRYPTION_KEY;
  if (!key || key.length < 32 || !encryptedToken.includes(':')) {
    return encryptedToken; // Return as-is if not encrypted
  }
  try {
    const [ivHex, encrypted] = encryptedToken.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key.slice(0, 32)), iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('[EBAY] Token decryption failed:', err.message);
    return encryptedToken;
  }
}

/**
 * Generate OAuth authorization URL
 */
export function getAuthUrl(state) {
  const config = getEbayConfig();
  const params = new URLSearchParams({
    client_id: process.env.EBAY_CLIENT_ID,
    redirect_uri: process.env.EBAY_REDIRECT_URI,
    response_type: 'code',
    scope: EBAY_SCOPES,
    state: state || crypto.randomBytes(16).toString('hex'),
  });
  return `${config.authUrl}?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code) {
  const config = getEbayConfig();
  const credentials = Buffer.from(
    `${process.env.EBAY_CLIENT_ID}:${process.env.EBAY_CLIENT_SECRET}`
  ).toString('base64');

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.EBAY_REDIRECT_URI,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`eBay token exchange failed: ${error}`);
  }

  return response.json();
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken) {
  const config = getEbayConfig();
  const credentials = Buffer.from(
    `${process.env.EBAY_CLIENT_ID}:${process.env.EBAY_CLIENT_SECRET}`
  ).toString('base64');

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      scope: EBAY_SCOPES,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`eBay token refresh failed: ${error}`);
  }

  return response.json();
}

/**
 * Store eBay connection for a user
 */
export async function storeConnection(userId, tokenData, ebayUserId = null) {
  const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));

  await pool.query(
    `INSERT INTO ebay_connections
     (user_id, ebay_user_id, access_token, refresh_token, token_expires_at, scope, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     ON CONFLICT (user_id)
     DO UPDATE SET
       ebay_user_id = COALESCE($2, ebay_connections.ebay_user_id),
       access_token = $3,
       refresh_token = COALESCE($4, ebay_connections.refresh_token),
       token_expires_at = $5,
       scope = $6,
       updated_at = NOW()`,
    [
      userId,
      ebayUserId,
      encryptToken(tokenData.access_token),
      encryptToken(tokenData.refresh_token),
      expiresAt,
      tokenData.scope || EBAY_SCOPES,
    ]
  );
}

/**
 * Get eBay connection for a user
 */
export async function getConnection(userId) {
  const result = await pool.query(
    `SELECT * FROM ebay_connections WHERE user_id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const connection = result.rows[0];
  return {
    ...connection,
    access_token: decryptToken(connection.access_token),
    refresh_token: decryptToken(connection.refresh_token),
  };
}

/**
 * Remove eBay connection for a user
 */
export async function removeConnection(userId) {
  await pool.query(`DELETE FROM ebay_connections WHERE user_id = $1`, [userId]);
}

/**
 * Get valid access token (refreshes if expired)
 */
export async function getValidAccessToken(userId) {
  const connection = await getConnection(userId);
  if (!connection) {
    throw new Error('No eBay connection found');
  }

  // Check if token is expired or expiring soon (within 5 minutes)
  const expiresAt = new Date(connection.token_expires_at);
  const now = new Date();
  const fiveMinutes = 5 * 60 * 1000;

  if (expiresAt.getTime() - now.getTime() < fiveMinutes) {
    // Refresh the token
    const tokenData = await refreshAccessToken(connection.refresh_token);
    await storeConnection(userId, tokenData, connection.ebay_user_id);
    return tokenData.access_token;
  }

  return connection.access_token;
}

/**
 * Make authenticated eBay API request
 */
export async function ebayApiRequest(userId, endpoint, options = {}) {
  const accessToken = await getValidAccessToken(userId);
  const config = getEbayConfig();

  const url = `${config.apiUrl}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers,
    },
  });

  // Log the request for debugging
  await logSyncAction(userId, options.method || 'GET', null, null, {
    endpoint,
    method: options.method || 'GET',
  }, response.ok ? { status: response.status } : null, response.ok ? null : await response.text());

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`eBay API error (${response.status}): ${errorText}`);
  }

  // Handle empty responses
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

/**
 * Log eBay sync action for debugging
 */
export async function logSyncAction(userId, action, ebayListingId, deckId, requestPayload, responsePayload, errorMessage) {
  try {
    await pool.query(
      `INSERT INTO ebay_sync_log
       (user_id, action, ebay_listing_id, deck_id, request_payload, response_payload, error_message, success)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        userId,
        action,
        ebayListingId,
        deckId,
        requestPayload ? JSON.stringify(requestPayload) : null,
        responsePayload ? JSON.stringify(responsePayload) : null,
        errorMessage,
        !errorMessage,
      ]
    );
  } catch (err) {
    console.error('[EBAY] Failed to log sync action:', err.message);
  }
}

/**
 * Create inventory item on eBay for a deck
 */
export async function createInventoryItem(userId, deck, sku) {
  const inventoryItem = {
    availability: {
      shipToLocationAvailability: {
        quantity: 1,
      },
    },
    condition: 'NEW', // MTG decks are typically sold as new/complete
    product: {
      title: deck.title || deck.name,
      description: deck.description || `Complete MTG deck: ${deck.name}`,
      aspects: {
        'Game': ['Magic: The Gathering'],
        'Card Type': ['Deck'],
      },
    },
  };

  await ebayApiRequest(userId, `/sell/inventory/v1/inventory_item/${sku}`, {
    method: 'PUT',
    body: JSON.stringify(inventoryItem),
  });

  return sku;
}

/**
 * Create offer (listing draft) on eBay
 */
export async function createOffer(userId, sku, price, listingData) {
  const offer = {
    sku,
    marketplaceId: 'EBAY_US',
    format: 'FIXED_PRICE',
    listingDescription: listingData.description,
    availableQuantity: 1,
    pricingSummary: {
      price: {
        currency: 'USD',
        value: price.toString(),
      },
    },
    categoryId: '183454', // CCG Individual Cards category (decks also fit here)
    merchantLocationKey: 'default', // User needs to set up fulfillment location
    listingPolicies: {
      // These need to be set up in eBay seller account
      // paymentPolicyId, returnPolicyId, fulfillmentPolicyId
    },
  };

  const response = await ebayApiRequest(userId, '/sell/inventory/v1/offer', {
    method: 'POST',
    body: JSON.stringify(offer),
  });

  return response.offerId;
}

/**
 * Publish offer to make listing live
 */
export async function publishOffer(userId, offerId) {
  const response = await ebayApiRequest(userId, `/sell/inventory/v1/offer/${offerId}/publish`, {
    method: 'POST',
  });

  return response.listingId;
}

/**
 * Get orders from eBay (for syncing sales)
 */
export async function getOrders(userId, limit = 50) {
  const response = await ebayApiRequest(
    userId,
    `/sell/fulfillment/v1/order?limit=${limit}&filter=orderfulfillmentstatus:{NOT_STARTED|IN_PROGRESS}`
  );

  return response.orders || [];
}

/**
 * Get specific order details
 */
export async function getOrder(userId, orderId) {
  return ebayApiRequest(userId, `/sell/fulfillment/v1/order/${orderId}`);
}

/**
 * Save listing to database
 */
export async function saveListingToDb(userId, deckId, listingData) {
  const result = await pool.query(
    `INSERT INTO ebay_listings
     (user_id, deck_id, ebay_listing_id, ebay_offer_id, title, description, price, status, listing_url, listed_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      userId,
      deckId,
      listingData.ebayListingId,
      listingData.ebayOfferId,
      listingData.title,
      listingData.description,
      listingData.price,
      listingData.status || 'draft',
      listingData.listingUrl,
      listingData.status === 'active' ? new Date() : null,
    ]
  );
  return result.rows[0];
}

/**
 * Update listing status in database
 */
export async function updateListingStatus(listingId, status, additionalData = {}) {
  const updates = ['status = $2', 'updated_at = NOW()'];
  const values = [listingId, status];
  let paramIndex = 3;

  if (status === 'sold' && additionalData.soldAt) {
    updates.push(`sold_at = $${paramIndex}`);
    values.push(additionalData.soldAt);
    paramIndex++;
  }

  if (additionalData.ebayBuyerUsername) {
    updates.push(`ebay_buyer_username = $${paramIndex}`);
    values.push(additionalData.ebayBuyerUsername);
    paramIndex++;
  }

  if (additionalData.ebayOrderId) {
    updates.push(`ebay_order_id = $${paramIndex}`);
    values.push(additionalData.ebayOrderId);
    paramIndex++;
  }

  await pool.query(
    `UPDATE ebay_listings SET ${updates.join(', ')} WHERE id = $1`,
    values
  );
}

/**
 * Get user's eBay listings
 */
export async function getUserListings(userId, status = null) {
  let query = `
    SELECT el.*, d.name as deck_name
    FROM ebay_listings el
    LEFT JOIN decks d ON el.deck_id = d.id
    WHERE el.user_id = $1
  `;
  const values = [userId];

  if (status) {
    query += ` AND el.status = $2`;
    values.push(status);
  }

  query += ` ORDER BY el.created_at DESC`;

  const result = await pool.query(query, values);
  return result.rows;
}

/**
 * Get listing by deck ID
 */
export async function getListingByDeckId(userId, deckId) {
  const result = await pool.query(
    `SELECT * FROM ebay_listings WHERE user_id = $1 AND deck_id = $2 AND status != 'ended'`,
    [userId, deckId]
  );
  return result.rows[0] || null;
}

export default {
  isEbayConfigured,
  getAuthUrl,
  exchangeCodeForTokens,
  refreshAccessToken,
  storeConnection,
  getConnection,
  removeConnection,
  getValidAccessToken,
  ebayApiRequest,
  logSyncAction,
  createInventoryItem,
  createOffer,
  publishOffer,
  getOrders,
  getOrder,
  saveListingToDb,
  updateListingStatus,
  getUserListings,
  getListingByDeckId,
};
