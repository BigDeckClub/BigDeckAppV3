import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api, apiRequest, ApiError } from '../utils/apiClient';

describe('apiClient', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('apiRequest', () => {
    it('should make a successful GET request', async () => {
      const mockData = { id: 1, name: 'Test' };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      const result = await apiRequest('/test', { method: 'GET' });

      expect(result).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledWith('/api/test', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
    });

    it('should make a successful POST request with body', async () => {
      const mockData = { id: 1 };
      const body = { name: 'Test' };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      const result = await apiRequest('/test', { method: 'POST', body });

      expect(result).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledWith('/api/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    });

    it('should throw ApiError on failed response', async () => {
      const errorData = { error: 'Not found' };
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve(errorData),
      });

      try {
        await apiRequest('/test', { method: 'GET' });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect(error.status).toBe(404);
        expect(error.message).toBe('Not found');
        expect(error.data).toEqual(errorData);
      }
    });

    it('should handle external URLs without prepending API_BASE', async () => {
      const mockData = { data: [] };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      await apiRequest('https://api.external.com/data', { method: 'GET' });

      expect(global.fetch).toHaveBeenCalledWith('https://api.external.com/data', expect.any(Object));
    });
  });

  describe('api convenience methods', () => {
    it('should call GET correctly', async () => {
      const mockData = { test: true };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      const result = await api.get('/test');
      
      expect(result).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledWith('/api/test', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
    });

    it('should call POST correctly', async () => {
      const mockData = { id: 1 };
      const body = { name: 'Test' };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      const result = await api.post('/test', body);
      
      expect(result).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledWith('/api/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    });

    it('should call PUT correctly', async () => {
      const mockData = { id: 1 };
      const body = { name: 'Updated' };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      const result = await api.put('/test/1', body);
      
      expect(result).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledWith('/api/test/1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    });

    it('should call DELETE correctly', async () => {
      const mockData = { success: true };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      const result = await api.delete('/test/1');
      
      expect(result).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledWith('/api/test/1', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
    });

    it('should call DELETE with body correctly', async () => {
      const mockData = { success: true };
      const body = { reservation_id: 123, quantity: 2 };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      const result = await api.delete('/test/1', body);
      
      expect(result).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledWith('/api/test/1', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    });

    it('should call PATCH correctly', async () => {
      const mockData = { id: 1 };
      const body = { status: 'completed' };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      const result = await api.patch('/test/1', body);
      
      expect(result).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledWith('/api/test/1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    });
  });

  describe('ApiError', () => {
    it('should create an error with correct properties', () => {
      const error = new ApiError('Test error', 400, { detail: 'Bad request' });
      
      expect(error.message).toBe('Test error');
      expect(error.status).toBe(400);
      expect(error.data).toEqual({ detail: 'Bad request' });
      expect(error.name).toBe('ApiError');
    });
  });
});
