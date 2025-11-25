import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for fetching data from API endpoints.
 * Handles loading states, errors, and refetching.
 * 
 * @param {string} url - The API endpoint URL to fetch from
 * @param {Object} options - Fetch options
 * @param {boolean} options.immediate - Whether to fetch immediately on mount (default: true)
 * @param {Object} options.fetchOptions - Options to pass to fetch()
 * @returns {Object} - { data, loading, error, refetch }
 * 
 * @example
 * const { data, loading, error, refetch } = useFetchData('/api/inventory');
 * 
 * @example
 * // With delayed fetch
 * const { data, loading, error, refetch } = useFetchData('/api/inventory', { immediate: false });
 * // Later call refetch() to trigger the fetch
 */
export function useFetchData(url, options = {}) {
  const { immediate = true, fetchOptions = {} } = options;
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!url) {
      console.warn('[useFetchData] No URL provided, skipping fetch');
      return;
    }
    
    console.log(`[useFetchData] Fetching: ${url}`);
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...fetchOptions.headers
        },
        ...fetchOptions
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log(`[useFetchData] ✅ Success: ${url}`, { itemCount: Array.isArray(result) ? result.length : 1 });
      setData(result);
      return result;
    } catch (err) {
      console.error(`[useFetchData] ❌ Error fetching ${url}:`, err.message);
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [url, JSON.stringify(fetchOptions)]);

  useEffect(() => {
    if (immediate && url) {
      fetchData();
    }
  }, [immediate, fetchData]);

  return { 
    data, 
    loading, 
    error, 
    refetch: fetchData,
    setData // Allow manual data updates
  };
}

/**
 * Custom hook for making POST/PUT/DELETE requests.
 * Returns a function to execute the mutation.
 * 
 * @param {string} url - The API endpoint URL
 * @param {string} method - HTTP method (POST, PUT, DELETE)
 * @returns {Object} - { mutate, loading, error, data }
 * 
 * @example
 * const { mutate, loading, error } = useMutation('/api/inventory', 'POST');
 * const handleSubmit = async (newItem) => {
 *   const result = await mutate(newItem);
 *   console.log('Created:', result);
 * };
 */
export function useMutation(url, method = 'POST') {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const mutate = useCallback(async (body, urlOverride = null) => {
    const targetUrl = urlOverride || url;
    
    if (!targetUrl) {
      console.warn('[useMutation] No URL provided');
      return;
    }
    
    console.log(`[useMutation] ${method} ${targetUrl}`);
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(targetUrl, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: body ? JSON.stringify(body) : undefined
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log(`[useMutation] ✅ Success: ${method} ${targetUrl}`);
      setData(result);
      return result;
    } catch (err) {
      console.error(`[useMutation] ❌ Error ${method} ${targetUrl}:`, err.message);
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [url, method]);

  return { mutate, loading, error, data };
}

/**
 * Custom hook for handling API state with optimistic updates.
 * Useful for lists where you want immediate UI feedback.
 * 
 * @param {string} url - The API endpoint URL
 * @returns {Object} - Full CRUD operations with optimistic updates
 */
export function useApiState(url) {
  const { data, loading, error, refetch, setData } = useFetchData(url);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const create = useCallback(async (newItem) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create');
      }
      
      const result = await response.json();
      // Optimistic update
      setData(prev => Array.isArray(prev) ? [...prev, result] : result);
      return result;
    } finally {
      setIsSubmitting(false);
    }
  }, [url, setData]);

  const update = useCallback(async (id, updates) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`${url}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update');
      }
      
      const result = await response.json();
      // Optimistic update
      setData(prev => {
        if (Array.isArray(prev)) {
          return prev.map(item => item.id === id ? result : item);
        }
        return result;
      });
      return result;
    } finally {
      setIsSubmitting(false);
    }
  }, [url, setData]);

  const remove = useCallback(async (id) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`${url}/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete');
      }
      
      // Optimistic update
      setData(prev => {
        if (Array.isArray(prev)) {
          return prev.filter(item => item.id !== id);
        }
        return null;
      });
      return true;
    } finally {
      setIsSubmitting(false);
    }
  }, [url, setData]);

  return {
    data,
    loading,
    error,
    isSubmitting,
    refetch,
    create,
    update,
    remove
  };
}

export default useFetchData;
