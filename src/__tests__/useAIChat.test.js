import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAIChat } from '../hooks/useAIChat';

// Mock the useApi hook
vi.mock('../hooks/useApi', () => ({
  useApi: () => ({
    post: vi.fn().mockResolvedValue({
      response: 'Test AI response',
      suggestions: ['suggestion1'],
      timestamp: new Date().toISOString()
    }),
    get: vi.fn().mockResolvedValue({
      available: true,
      version: '1.0.0',
      features: ['deck-building']
    }),
    isLoading: false,
    error: null,
    clearError: vi.fn()
  })
}));

describe('useAIChat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with empty messages', () => {
    const { result } = renderHook(() => useAIChat());
    expect(result.current.messages).toEqual([]);
  });

  it('should not be typing initially', () => {
    const { result } = renderHook(() => useAIChat());
    expect(result.current.isTyping).toBe(false);
  });

  it('should have no error initially', () => {
    const { result } = renderHook(() => useAIChat());
    expect(result.current.error).toBeNull();
  });

  it('should clear conversation when clearConversation is called', () => {
    const { result } = renderHook(() => useAIChat());
    
    act(() => {
      result.current.clearConversation();
    });
    
    expect(result.current.messages).toEqual([]);
  });

  it('should not send empty messages', async () => {
    const { result } = renderHook(() => useAIChat());
    
    let response;
    await act(async () => {
      response = await result.current.sendMessage('');
    });
    
    expect(response).toBeNull();
    expect(result.current.messages).toEqual([]);
  });

  it('should not send whitespace-only messages', async () => {
    const { result } = renderHook(() => useAIChat());
    
    let response;
    await act(async () => {
      response = await result.current.sendMessage('   ');
    });
    
    expect(response).toBeNull();
    expect(result.current.messages).toEqual([]);
  });

  it('should return status from checkStatus', async () => {
    const { result } = renderHook(() => useAIChat());
    
    let status;
    await act(async () => {
      status = await result.current.checkStatus();
    });
    
    expect(status).toEqual({
      available: true,
      version: '1.0.0',
      features: ['deck-building']
    });
  });

  it('should expose sendMessage function', () => {
    const { result } = renderHook(() => useAIChat());
    expect(typeof result.current.sendMessage).toBe('function');
  });

  it('should expose clearConversation function', () => {
    const { result } = renderHook(() => useAIChat());
    expect(typeof result.current.clearConversation).toBe('function');
  });

  it('should expose cancelRequest function', () => {
    const { result } = renderHook(() => useAIChat());
    expect(typeof result.current.cancelRequest).toBe('function');
  });

  it('should stop typing when cancelRequest is called', () => {
    const { result } = renderHook(() => useAIChat());
    
    act(() => {
      result.current.cancelRequest();
    });
    
    expect(result.current.isTyping).toBe(false);
  });
});
