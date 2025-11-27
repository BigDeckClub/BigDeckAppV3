/**
 * API Client Utilities
 * Provides standardized fetch wrappers with error handling and loading states
 */

/**
 * @typedef {import('./api.js').ApiError} ApiError
 */

/**
 * Custom API error class
 */
export class ApiRequestError extends Error {
  /**
   * @param {string} message - Error message
   * @param {number} status - HTTP status code
   * @param {string[]} [details] - Validation error details
   */
  constructor(message, status, details) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.details = details;
  }
}

/**
 * Make a GET request to the API
 * @template T
 * @param {string} url - API endpoint URL
 * @param {RequestInit} [options] - Additional fetch options
 * @returns {Promise<T>} Response data
 * @throws {ApiRequestError} On API error
 */
export async function apiGet(url, options = {}) {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await parseErrorResponse(response);
    throw new ApiRequestError(error.message, response.status, error.details);
  }

  return response.json();
}

/**
 * Make a POST request to the API
 * @template T
 * @param {string} url - API endpoint URL
 * @param {unknown} body - Request body
 * @param {RequestInit} [options] - Additional fetch options
 * @returns {Promise<T>} Response data
 * @throws {ApiRequestError} On API error
 */
export async function apiPost(url, body, options = {}) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers,
    },
    body: JSON.stringify(body),
    ...options,
  });

  if (!response.ok) {
    const error = await parseErrorResponse(response);
    throw new ApiRequestError(error.message, response.status, error.details);
  }

  return response.json();
}

/**
 * Make a PUT request to the API
 * @template T
 * @param {string} url - API endpoint URL
 * @param {unknown} body - Request body
 * @param {RequestInit} [options] - Additional fetch options
 * @returns {Promise<T>} Response data
 * @throws {ApiRequestError} On API error
 */
export async function apiPut(url, body, options = {}) {
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers,
    },
    body: JSON.stringify(body),
    ...options,
  });

  if (!response.ok) {
    const error = await parseErrorResponse(response);
    throw new ApiRequestError(error.message, response.status, error.details);
  }

  return response.json();
}

/**
 * Make a DELETE request to the API
 * @template T
 * @param {string} url - API endpoint URL
 * @param {RequestInit} [options] - Additional fetch options
 * @returns {Promise<T>} Response data
 * @throws {ApiRequestError} On API error
 */
export async function apiDelete(url, options = {}) {
  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Accept': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await parseErrorResponse(response);
    throw new ApiRequestError(error.message, response.status, error.details);
  }

  return response.json();
}

/**
 * Parse error response from API
 * @param {Response} response - Fetch response
 * @returns {Promise<{message: string, details?: string[]}>}
 */
async function parseErrorResponse(response) {
  try {
    const data = await response.json();
    return {
      message: data.error || `Request failed with status ${response.status}`,
      details: data.details,
    };
  } catch {
    return {
      message: `Request failed with status ${response.status}`,
    };
  }
}

/**
 * Format API error for display
 * @param {unknown} error - Error object
 * @returns {string} User-friendly error message
 */
export function formatApiError(error) {
  if (error instanceof ApiRequestError) {
    if (error.details && error.details.length > 0) {
      return error.details.join(', ');
    }
    return error.message;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'An unexpected error occurred';
}

/**
 * Check if error is a network error (offline, CORS, etc.)
 * @param {unknown} error - Error object
 * @returns {boolean}
 */
export function isNetworkError(error) {
  return error instanceof TypeError && error.message === 'Failed to fetch';
}

/**
 * Check if error is a validation error (400 Bad Request)
 * @param {unknown} error - Error object
 * @returns {boolean}
 */
export function isValidationError(error) {
  return error instanceof ApiRequestError && error.status === 400;
}

/**
 * Check if error is a not found error (404)
 * @param {unknown} error - Error object
 * @returns {boolean}
 */
export function isNotFoundError(error) {
  return error instanceof ApiRequestError && error.status === 404;
}
