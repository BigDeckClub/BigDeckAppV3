import { useCallback } from 'react';
import { getAuthHeaders } from '../config/api';

/**
 * Hook for making authenticated API requests
 * Automatically includes the Supabase JWT token in Authorization header
 */
export function useAuthFetch() {
  const authFetch = useCallback(async (url, options = {}) => {
    const headers = {
      ...getAuthHeaders(),
      ...options.headers
    };

    const response = await fetch(url, {
      ...options,
      headers
    });

    // If we get a 401, the user might need to log in again
    if (response.status === 401) {
      // Clear stored auth data
      localStorage.removeItem('supabase_user');
      localStorage.removeItem('supabase_session');
      // Optionally trigger a re-login
      window.dispatchEvent(new CustomEvent('auth-expired'));
    }

    return response;
  }, []);

  return { authFetch };
}

/**
 * Standalone function for making authenticated fetch requests
 * Can be used outside of React components
 */
export async function authFetch(url, options = {}) {
  const headers = {
    ...getAuthHeaders(),
    ...options.headers
  };

  const response = await fetch(url, {
    ...options,
    headers
  });

  if (response.status === 401) {
    localStorage.removeItem('supabase_user');
    localStorage.removeItem('supabase_session');
    window.dispatchEvent(new CustomEvent('auth-expired'));
  }

  return response;
}
