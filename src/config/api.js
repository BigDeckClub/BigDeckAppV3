/**
 * API configuration for the application
 * @module config/api
 */

/**
 * Base URL for all API requests
 * Uses environment variable if available, otherwise defaults to '/api'
 * @type {string}
 */
export const API_BASE = import.meta.env.VITE_API_BASE || '/api';

/**
 * External API endpoints
 */
export const EXTERNAL_APIS = {
  SCRYFALL: 'https://api.scryfall.com',
  ARCHIDEKT: 'https://api.archidekt.com/v1',
};

/**
 * Internal API endpoints
 */
export const API_ENDPOINTS = {
  INVENTORY: '/inventory',
  DECKS: '/decks',
  DECK_INSTANCES: '/deck-instances',
  FOLDERS: '/folders',
  SALES: '/sales',
  SETTINGS: '/settings',
  IMPORTS: '/imports',
  AUTH: '/auth',
  ANALYTICS: '/analytics',
  PRICES: '/prices',
  HEALTH: '/health',
  LOTS: '/lots',
};

/**
 * Get authentication headers for API requests
 * @returns {Object} Headers object with Authorization token if user is logged in
 */
export function getAuthHeaders() {
  const headers = {
    'Content-Type': 'application/json'
  };

  try {
    const userStr = localStorage.getItem('supabase_user');
    if (userStr) {
      const userData = JSON.parse(userStr);
      // Supabase stores the session with access_token
      const sessionStr = localStorage.getItem('supabase_session');
      if (sessionStr) {
        const session = JSON.parse(sessionStr);
        if (session.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
      }
    }
  } catch (err) {
    console.error('Error getting auth headers:', err);
  }

  return headers;
}
