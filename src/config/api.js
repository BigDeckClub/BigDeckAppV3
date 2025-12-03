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
