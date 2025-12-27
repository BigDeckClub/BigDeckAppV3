/**
 * Unified API Client Hook
 * Consolidates all API request patterns into a single, consistent interface
 * Replaces: useApi, useAuthFetch (partially)
 */

import { useState, useCallback, useRef } from 'react';
import { useToast, TOAST_TYPES } from '../context/ToastContext';

const API_BASE = '/api';

/**
 * Custom hook for making API requests with consistent error handling
 * @param {Object} options - Configuration options
 * @param {boolean} options.showErrorToast - Show toast on error (default: true)
 * @param {boolean} options.showSuccessToast - Show toast on success (default: false)
 * @param {function} options.onError - Custom error handler
 * @param {function} options.onSuccess - Custom success handler
 */
export function useApiClient(options = {}) {
  const {
    showErrorToast = true,
    showSuccessToast = false,
    onError: customErrorHandler,
    onSuccess: customSuccessHandler
  } = options;

  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);

  /**
   * Make an HTTP request
   */
  const request = useCallback(async (endpoint, options = {}) => {
    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    const {
      method = 'GET',
      body,
      headers = {},
      successMessage,
      errorMessage,
      ...fetchOptions
    } = options;

    setLoading(true);
    setError(null);

    try {
      const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;

      const config = {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        signal: abortControllerRef.current.signal,
        ...fetchOptions
      };

      if (body) {
        config.body = typeof body === 'string' ? body : JSON.stringify(body);
      }

      const response = await fetch(url, config);

      // Handle non-OK responses
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: `HTTP ${response.status}: ${response.statusText}`
        }));

        throw new Error(errorData.error || errorData.message || `Request failed with status ${response.status}`);
      }

      // Parse response
      const contentType = response.headers.get('content-type');
      const data = contentType?.includes('application/json')
        ? await response.json()
        : await response.text();

      // Success handling
      if (successMessage && showSuccessToast) {
        showToast(successMessage, TOAST_TYPES.SUCCESS);
      }

      if (customSuccessHandler) {
        customSuccessHandler(data);
      }

      setLoading(false);
      return data;

    } catch (err) {
      // Ignore abort errors
      if (err.name === 'AbortError') {
        setLoading(false);
        return null;
      }

      setError(err.message);

      // Error handling
      if (errorMessage && showErrorToast) {
        showToast(errorMessage, TOAST_TYPES.ERROR);
      } else if (showErrorToast) {
        showToast(err.message, TOAST_TYPES.ERROR);
      }

      if (customErrorHandler) {
        customErrorHandler(err);
      }

      setLoading(false);
      throw err;
    }
  }, [showToast, showErrorToast, showSuccessToast, customErrorHandler, customSuccessHandler]);

  /**
   * Convenience methods for common HTTP verbs
   */
  const get = useCallback((endpoint, options = {}) => {
    return request(endpoint, { method: 'GET', ...options });
  }, [request]);

  const post = useCallback((endpoint, body, options = {}) => {
    return request(endpoint, { method: 'POST', body, ...options });
  }, [request]);

  const put = useCallback((endpoint, body, options = {}) => {
    return request(endpoint, { method: 'PUT', body, ...options });
  }, [request]);

  const patch = useCallback((endpoint, body, options = {}) => {
    return request(endpoint, { method: 'PATCH', body, ...options });
  }, [request]);

  const del = useCallback((endpoint, options = {}) => {
    return request(endpoint, { method: 'DELETE', ...options });
  }, [request]);

  /**
   * Cancel any pending request
   */
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  return {
    // Request methods
    request,
    get,
    post,
    put,
    patch,
    delete: del,

    // State
    loading,
    error,

    // Utilities
    cancel
  };
}

/**
 * Hook for resource-specific API client
 * Provides CRUD operations for a specific resource
 *
 * @param {string} resourcePath - Base path for the resource (e.g., '/inventory', '/decks')
 * @param {Object} options - Configuration options
 */
export function useResourceApi(resourcePath, options = {}) {
  const api = useApiClient(options);

  const list = useCallback((queryParams = {}) => {
    const query = new URLSearchParams(queryParams).toString();
    const endpoint = query ? `${resourcePath}?${query}` : resourcePath;
    return api.get(endpoint);
  }, [api, resourcePath]);

  const getOne = useCallback((id) => {
    return api.get(`${resourcePath}/${id}`);
  }, [api, resourcePath]);

  const create = useCallback((data, opts = {}) => {
    return api.post(resourcePath, data, {
      successMessage: `Created successfully`,
      ...opts
    });
  }, [api, resourcePath]);

  const update = useCallback((id, data, opts = {}) => {
    return api.put(`${resourcePath}/${id}`, data, {
      successMessage: `Updated successfully`,
      ...opts
    });
  }, [api, resourcePath]);

  const remove = useCallback((id, opts = {}) => {
    return api.delete(`${resourcePath}/${id}`, {
      successMessage: `Deleted successfully`,
      ...opts
    });
  }, [api, resourcePath]);

  return {
    ...api,
    list,
    getOne,
    create,
    update,
    remove
  };
}

/**
 * Example usage:
 *
 * // Basic usage
 * const api = useApiClient();
 * const data = await api.get('/inventory');
 *
 * // With options
 * const api = useApiClient({
 *   showErrorToast: true,
 *   showSuccessToast: true,
 *   onError: (err) => console.error(err)
 * });
 *
 * // Resource-specific
 * const inventoryApi = useResourceApi('/inventory');
 * const items = await inventoryApi.list({ folder: 'Lands' });
 * await inventoryApi.create({ name: 'Forest', quantity: 10 });
 * await inventoryApi.update(123, { quantity: 15 });
 * await inventoryApi.remove(123);
 */
