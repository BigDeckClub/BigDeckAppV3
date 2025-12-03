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
};
