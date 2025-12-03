import { useState, useCallback, useEffect, useRef } from 'react';
import { api, ApiError } from '../utils/apiClient';

const isNetworkError = (err) => {
  return err instanceof TypeError || err.message.includes('Failed to fetch');
};

const formatApiError = (err) => {
  if (err instanceof ApiError) {
    return err.message;
  }
  if (err.response?.statusText) {
    return err.response.statusText;
  }
  return err.message || 'An error occurred';
};

/**
 * @typedef {Object} UseApiState
 * @property {boolean} isLoading - Whether a request is in progress
 * @property {string|null} error - Error message if request failed
 * @property {boolean} isSuccess - Whether the last request succeeded
 */

/**
 * @typedef {Object} UseApiResult
 * @property {boolean} isLoading - Whether a request is in progress
 * @property {string|null} error - Error message if request failed
 * @property {boolean} isSuccess - Whether the last request succeeded
 * @property {function(): void} clearError - Clear the current error
 * @property {function(string, Object=): Promise<T>} get - Make a GET request
 * @property {function(string, *, Object=): Promise<T>} post - Make a POST request
 * @property {function(string, *, Object=): Promise<T>} put - Make a PUT request
 * @property {function(string, Object=): Promise<T>} del - Make a DELETE request
 */

/**
 * Custom hook for making API requests with loading and error states
 * @returns {UseApiResult}
 */
export function useApi() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const handleRequest = useCallback(async (requestFn) => {
    setIsLoading(true);
    setError(null);
    setIsSuccess(false);
    
    try {
      const result = await requestFn();
      setIsSuccess(true);
      return result;
    } catch (err) {
      const errorMessage = isNetworkError(err) 
        ? 'Unable to connect to server. Please check your connection.'
        : formatApiError(err);
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const get = useCallback((url, options = {}) => {
    return handleRequest(() => api.get(url, options));
  }, [handleRequest]);

  const post = useCallback((url, body, options = {}) => {
    return handleRequest(() => api.post(url, body, options));
  }, [handleRequest]);

  const put = useCallback((url, body, options = {}) => {
    return handleRequest(() => api.put(url, body, options));
  }, [handleRequest]);

  const del = useCallback((url, bodyOrOptions, options = {}) => {
    // Support both del(url, options) and del(url, body, options) signatures
    const isBody = bodyOrOptions && typeof bodyOrOptions === 'object' && !bodyOrOptions.signal && !bodyOrOptions.headers;
    if (isBody) {
      return handleRequest(() => api.delete(url, bodyOrOptions, options));
    }
    return handleRequest(() => api.delete(url, undefined, bodyOrOptions || {}));
  }, [handleRequest]);

  return {
    isLoading,
    error,
    isSuccess,
    clearError,
    get,
    post,
    put,
    del,
  };
}

/**
 * Custom hook for fetching data on mount with automatic refresh
 * @template T
 * @param {string} url - API endpoint URL
 * @param {Object} [options] - Options
 * @param {boolean} [options.enabled=true] - Whether to fetch automatically
 * @param {T} [options.initialData] - Initial data before fetch completes
 * @returns {{data: T|null, isLoading: boolean, error: string|null, refetch: function(): Promise<void>}}
 */
export function useFetch(url, options = {}) {
  const { enabled = true, initialData = null } = options;
  const [data, setData] = useState(initialData);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);

  const fetchData = useCallback(async () => {
    if (!url) return;
    
    // Abort any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new abort controller
    abortControllerRef.current = new AbortController();
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await api.get(url, { signal: abortControllerRef.current.signal });
      setData(result);
    } catch (err) {
      // Don't set error if request was aborted
      if (err.name === 'AbortError') return;
      
      const errorMessage = isNetworkError(err) 
        ? 'Unable to connect to server. Please check your connection.'
        : formatApiError(err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [url]);

  // Fetch on mount if enabled, cleanup on unmount
  useEffect(() => {
    if (enabled) {
      fetchData();
    }
    
    // Cleanup: abort any in-flight request when component unmounts
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [enabled, fetchData]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
  };
}

export default useApi;
