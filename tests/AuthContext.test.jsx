import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import React from 'react';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock window.location
const mockLocation = {
  href: '',
};
Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

describe('AuthContext', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockLocation.href = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should start in loading state', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
    });

    const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
    const { result } = renderHook(() => useAuth(), { wrapper });

    // Initially loading
    expect(result.current.isLoading).toBe(true);
    expect(result.current.user).toBe(null);
    expect(result.current.isAuthenticated).toBe(false);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('should set user when authenticated', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      profileImage: 'https://example.com/avatar.jpg',
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockUser,
    });

    const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('should set user to null when not authenticated', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
    });

    const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user).toBe(null);
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('should redirect to login page on login()', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
    });

    const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.login();
    });

    expect(mockLocation.href).toBe('/api/login');
  });

  it('should redirect to logout endpoint on logout()', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockUser,
    });

    const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.logout();
    });

    expect(mockLocation.href).toBe('/api/logout');
  });

  it('should handle fetch errors gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user).toBe(null);
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('should throw error when useAuth is used outside provider', () => {
    // Suppress console error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => {
      renderHook(() => useAuth());
    }).toThrow('useAuth must be used within an AuthProvider');
    
    consoleSpy.mockRestore();
  });

  it('should refresh user data when refreshUser is called', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
    };

    // First call returns unauthorized
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
    });

    const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user).toBe(null);

    // Second call returns authenticated user
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockUser,
    });

    await act(async () => {
      await result.current.refreshUser();
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
  });
});
