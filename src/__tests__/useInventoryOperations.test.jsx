import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useInventoryOperations } from '../hooks/useInventoryOperations';
import { ToastProvider } from '../context/ToastContext';
import React from 'react';

// Mock useApi hook
const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPut = vi.fn();
const mockDel = vi.fn();

vi.mock('../hooks/useApi', () => ({
  useApi: () => ({
    get: mockGet,
    post: mockPost,
    put: mockPut,
    del: mockDel,
  }),
}));

// Mock ToastContext
vi.mock('../context/ToastContext', async () => {
  const actual = await vi.importActual('../context/ToastContext');
  return {
    ...actual,
    useToast: () => ({
      showToast: vi.fn(),
    }),
    TOAST_TYPES: {
      SUCCESS: 'success',
      ERROR: 'error',
      WARNING: 'warning',
    },
  };
});

// Wrapper component for hooks that need context
const wrapper = ({ children }) => (
  <ToastProvider>{children}</ToastProvider>
);

describe('useInventoryOperations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('initializes with empty inventory', () => {
    const { result } = renderHook(() => useInventoryOperations(), { wrapper });

    expect(result.current.inventory).toEqual([]);
    expect(result.current.editingId).toBeNull();
    expect(result.current.editForm).toEqual({});
  });

  it('exposes loadInventory function', () => {
    const { result } = renderHook(() => useInventoryOperations(), { wrapper });

    expect(typeof result.current.loadInventory).toBe('function');
  });

  it('exposes addInventoryItem function', () => {
    const { result } = renderHook(() => useInventoryOperations(), { wrapper });

    expect(typeof result.current.addInventoryItem).toBe('function');
  });

  it('exposes updateInventoryItem function', () => {
    const { result } = renderHook(() => useInventoryOperations(), { wrapper });

    expect(typeof result.current.updateInventoryItem).toBe('function');
  });

  it('exposes deleteInventoryItem function', () => {
    const { result } = renderHook(() => useInventoryOperations(), { wrapper });

    expect(typeof result.current.deleteInventoryItem).toBe('function');
  });

  it('exposes permanentlyDeleteItem function', () => {
    const { result } = renderHook(() => useInventoryOperations(), { wrapper });

    expect(typeof result.current.permanentlyDeleteItem).toBe('function');
  });

  it('exposes restoreFromTrash function', () => {
    const { result } = renderHook(() => useInventoryOperations(), { wrapper });

    expect(typeof result.current.restoreFromTrash).toBe('function');
  });

  it('exposes emptyTrash function', () => {
    const { result } = renderHook(() => useInventoryOperations(), { wrapper });

    expect(typeof result.current.emptyTrash).toBe('function');
  });

  it('exposes startEditingItem function', () => {
    const { result } = renderHook(() => useInventoryOperations(), { wrapper });

    expect(typeof result.current.startEditingItem).toBe('function');
  });

  it('startEditingItem sets editingId and editForm', () => {
    const { result } = renderHook(() => useInventoryOperations(), { wrapper });

    const mockItem = {
      id: 1,
      quantity: 4,
      purchase_price: 10.5,
      folder: 'Commander',
      reorder_type: 'foil',
    };

    act(() => {
      result.current.startEditingItem(mockItem);
    });

    expect(result.current.editingId).toBe(1);
    expect(result.current.editForm).toEqual({
      quantity: 4,
      purchase_price: 10.5,
      folder: 'Commander',
      reorder_type: 'foil',
    });
  });

  it('startEditingItem uses defaults for missing fields', () => {
    const { result } = renderHook(() => useInventoryOperations(), { wrapper });

    const mockItem = {
      id: 2,
      quantity: 1,
    };

    act(() => {
      result.current.startEditingItem(mockItem);
    });

    expect(result.current.editForm).toEqual({
      quantity: 1,
      purchase_price: '',
      folder: 'Uncategorized',
      reorder_type: 'normal',
    });
  });

  it('loadInventory calls API and updates state', async () => {
    const mockInventory = [
      { id: 1, name: 'Sol Ring' },
      { id: 2, name: 'Lightning Bolt' },
    ];

    mockGet.mockResolvedValueOnce(mockInventory);

    const { result } = renderHook(() => useInventoryOperations(), { wrapper });

    await act(async () => {
      await result.current.loadInventory();
    });

    expect(mockGet).toHaveBeenCalledWith('/inventory');
    expect(result.current.inventory.length).toBe(2);
  });

  it('loadInventory handles errors gracefully', async () => {
    mockGet.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useInventoryOperations(), { wrapper });

    await act(async () => {
      await result.current.loadInventory();
    });

    expect(result.current.inventory).toEqual([]);
  });

  it('deleteInventoryItem moves item to Trash folder', async () => {
    mockPut.mockResolvedValueOnce({});
    mockGet.mockResolvedValueOnce([]);

    const { result } = renderHook(() => useInventoryOperations(), { wrapper });

    await act(async () => {
      await result.current.deleteInventoryItem(1);
    });

    expect(mockPut).toHaveBeenCalledWith('/inventory/1', { folder: 'Trash' });
  });

  it('permanentlyDeleteItem calls delete API', async () => {
    mockDel.mockResolvedValueOnce({});
    mockGet.mockResolvedValueOnce([]);

    const { result } = renderHook(() => useInventoryOperations(), { wrapper });

    await act(async () => {
      await result.current.permanentlyDeleteItem(1);
    });

    expect(mockDel).toHaveBeenCalledWith('/inventory/1');
  });

  it('restoreFromTrash moves item to Uncategorized folder', async () => {
    mockPut.mockResolvedValueOnce({});
    mockGet.mockResolvedValueOnce([]);

    const { result } = renderHook(() => useInventoryOperations(), { wrapper });

    await act(async () => {
      await result.current.restoreFromTrash(1);
    });

    expect(mockPut).toHaveBeenCalledWith('/inventory/1', { folder: 'Uncategorized' });
  });

  it('emptyTrash calls delete trash API', async () => {
    mockDel.mockResolvedValueOnce({});
    mockGet.mockResolvedValueOnce([]);

    const { result } = renderHook(() => useInventoryOperations(), { wrapper });

    await act(async () => {
      await result.current.emptyTrash();
    });

    expect(mockDel).toHaveBeenCalledWith('/inventory/trash');
  });
});
