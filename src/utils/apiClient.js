import { API_BASE, getAuthHeaders } from '../config/api';

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
    this.name = 'ApiError';
  }
}

/**
 * Make an API request with consistent error handling
 * Automatically includes authentication headers
 */
export const apiRequest = async (endpoint, options = {}) => {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  
  const config = {
    headers: {
      ...getAuthHeaders(),
      ...options.headers,
    },
    ...options,
  };

  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  const response = await fetch(url, config);
  
  // Handle 401 unauthorized - clear auth state
  if (response.status === 401) {
    localStorage.removeItem('supabase_user');
    localStorage.removeItem('supabase_session');
    window.dispatchEvent(new CustomEvent('auth-expired'));
  }
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(
      errorData.error || errorData.message || `Request failed with status ${response.status}`,
      response.status,
      errorData
    );
  }

  // Handle empty responses (204 No Content) and non-JSON responses
  if (response.status === 204) {
    return null;
  }
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    const text = await response.text();
    if (!text) {
      return null;
    }
    try {
      return JSON.parse(text);
    } catch (parseError) {
      console.error('Failed to parse JSON response:', parseError);
      return null;
    }
  }
  return null;
};

// Convenience methods with options support
export const api = {
  get: (endpoint, options = {}) => apiRequest(endpoint, { method: 'GET', ...options }),
  post: (endpoint, body, options = {}) => apiRequest(endpoint, { method: 'POST', body, ...options }),
  put: (endpoint, body, options = {}) => apiRequest(endpoint, { method: 'PUT', body, ...options }),
  patch: (endpoint, body, options = {}) => apiRequest(endpoint, { method: 'PATCH', body, ...options }),
  delete: (endpoint, body, options = {}) => apiRequest(endpoint, { method: 'DELETE', body, ...options }),
};

/**
 * Wrapper around fetch that automatically includes auth headers
 * Drop-in replacement for native fetch for API calls
 */
export const fetchWithAuth = async (url, options = {}) => {
  const config = {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options.headers,
    },
  };

  const response = await fetch(url, config);
  
  // Handle 401 unauthorized - clear auth state
  if (response.status === 401) {
    localStorage.removeItem('supabase_user');
    localStorage.removeItem('supabase_session');
    window.dispatchEvent(new CustomEvent('auth-expired'));
  }
  
  return response;
};

export { ApiError };
