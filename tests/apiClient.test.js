import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiGet, apiPost, apiPut, apiDelete, ApiRequestError, formatApiError, isNetworkError, isValidationError, isNotFoundError } from '../src/lib/apiClient.js';

describe('API Client', () => {
  let mockFetch;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('apiGet', () => {
    it('returns data on successful response', async () => {
      const mockData = { id: 1, name: 'Test' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      const result = await apiGet('/api/test');

      expect(result).toEqual(mockData);
      expect(mockFetch).toHaveBeenCalledWith('/api/test', expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'Accept': 'application/json',
        }),
      }));
    });

    it('throws ApiRequestError on failed response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Not found' }),
      });

      await expect(apiGet('/api/test')).rejects.toThrow(ApiRequestError);
      await expect(apiGet('/api/test')).rejects.toMatchObject({
        status: 404,
        message: 'Not found',
      });
    });
  });

  describe('apiPost', () => {
    it('sends JSON body and returns data on success', async () => {
      const requestBody = { name: 'New Item' };
      const responseData = { id: 1, name: 'New Item' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(responseData),
      });

      const result = await apiPost('/api/items', requestBody);

      expect(result).toEqual(responseData);
      expect(mockFetch).toHaveBeenCalledWith('/api/items', expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify(requestBody),
      }));
    });

    it('throws ApiRequestError with validation details on 400', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ 
          error: 'Validation failed', 
          details: ['Name is required'] 
        }),
      });

      try {
        await apiPost('/api/items', {});
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiRequestError);
        expect(error.status).toBe(400);
        expect(error.details).toEqual(['Name is required']);
      }
    });
  });

  describe('apiPut', () => {
    it('sends PUT request with JSON body', async () => {
      const requestBody = { name: 'Updated Item' };
      const responseData = { id: 1, name: 'Updated Item' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(responseData),
      });

      const result = await apiPut('/api/items/1', requestBody);

      expect(result).toEqual(responseData);
      expect(mockFetch).toHaveBeenCalledWith('/api/items/1', expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify(requestBody),
      }));
    });
  });

  describe('apiDelete', () => {
    it('sends DELETE request', async () => {
      const responseData = { success: true };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(responseData),
      });

      const result = await apiDelete('/api/items/1');

      expect(result).toEqual(responseData);
      expect(mockFetch).toHaveBeenCalledWith('/api/items/1', expect.objectContaining({
        method: 'DELETE',
      }));
    });

    it('handles 204 No Content response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

      const result = await apiDelete('/api/items/1');

      expect(result).toBeNull();
    });
  });

  describe('formatApiError', () => {
    it('formats ApiRequestError with details', () => {
      const error = new ApiRequestError('Validation failed', 400, ['Name is required', 'Email is invalid']);
      expect(formatApiError(error)).toBe('Name is required, Email is invalid');
    });

    it('formats ApiRequestError without details', () => {
      const error = new ApiRequestError('Server error', 500);
      expect(formatApiError(error)).toBe('Server error');
    });

    it('formats regular Error', () => {
      const error = new Error('Something went wrong');
      expect(formatApiError(error)).toBe('Something went wrong');
    });

    it('handles non-Error values', () => {
      expect(formatApiError('string error')).toBe('An unexpected error occurred');
      expect(formatApiError(null)).toBe('An unexpected error occurred');
    });
  });

  describe('error type checks', () => {
    it('isNetworkError detects fetch failures', () => {
      const networkError = new TypeError('Failed to fetch');
      expect(isNetworkError(networkError)).toBe(true);
      expect(isNetworkError(new Error('Other error'))).toBe(false);
    });

    it('isNetworkError detects various network error messages', () => {
      expect(isNetworkError(new TypeError('Network request failed'))).toBe(true);
      expect(isNetworkError(new TypeError('A network error occurred'))).toBe(true);
    });

    it('isValidationError detects 400 errors', () => {
      expect(isValidationError(new ApiRequestError('Bad request', 400))).toBe(true);
      expect(isValidationError(new ApiRequestError('Server error', 500))).toBe(false);
    });

    it('isNotFoundError detects 404 errors', () => {
      expect(isNotFoundError(new ApiRequestError('Not found', 404))).toBe(true);
      expect(isNotFoundError(new ApiRequestError('Bad request', 400))).toBe(false);
    });
  });

  describe('custom headers', () => {
    it('allows custom headers to be passed', async () => {
      const mockData = { id: 1 };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      await apiGet('/api/test', {
        headers: { Authorization: 'Bearer token123' }
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/test', 
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer token123'
          })
        })
      );
    });
  });
});
