import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useUndoRedo } from '../hooks/useUndoRedo';

describe('useUndoRedo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with empty past and future', () => {
    const { result } = renderHook(() => useUndoRedo());

    expect(result.current.past).toEqual([]);
    expect(result.current.future).toEqual([]);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it('adds action to past array', () => {
    const { result } = renderHook(() => useUndoRedo());

    const action = {
      type: 'TEST_ACTION',
      description: 'Test action',
      data: { id: 1 },
      undoFn: vi.fn(),
      redoFn: vi.fn(),
    };

    act(() => {
      result.current.addAction(action);
    });

    expect(result.current.past).toHaveLength(1);
    expect(result.current.past[0].type).toBe('TEST_ACTION');
    expect(result.current.past[0].description).toBe('Test action');
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
  });

  it('clears future when new action is added', async () => {
    const { result } = renderHook(() => useUndoRedo());

    const action1 = {
      type: 'ACTION_1',
      description: 'Action 1',
      data: {},
      undoFn: vi.fn(),
      redoFn: vi.fn(),
    };

    const action2 = {
      type: 'ACTION_2',
      description: 'Action 2',
      data: {},
      undoFn: vi.fn(),
      redoFn: vi.fn(),
    };

    act(() => {
      result.current.addAction(action1);
    });

    await act(async () => {
      await result.current.undo();
    });

    // At this point, future should have action1
    expect(result.current.future).toHaveLength(1);

    act(() => {
      result.current.addAction(action2);
    });

    // Future should be cleared
    expect(result.current.future).toHaveLength(0);
    expect(result.current.past).toHaveLength(1);
    expect(result.current.past[0].type).toBe('ACTION_2');
  });

  it('undo moves action from past to future and calls undoFn', async () => {
    const { result } = renderHook(() => useUndoRedo());

    const undoFn = vi.fn();
    const action = {
      type: 'TEST_ACTION',
      description: 'Test action',
      data: {},
      undoFn,
      redoFn: vi.fn(),
    };

    act(() => {
      result.current.addAction(action);
    });

    let success;
    await act(async () => {
      success = await result.current.undo();
    });

    expect(success).toBe(true);
    expect(undoFn).toHaveBeenCalled();
    expect(result.current.past).toHaveLength(0);
    expect(result.current.future).toHaveLength(1);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);
  });

  it('redo moves action from future to past and calls redoFn', async () => {
    const { result } = renderHook(() => useUndoRedo());

    const redoFn = vi.fn();
    const action = {
      type: 'TEST_ACTION',
      description: 'Test action',
      data: {},
      undoFn: vi.fn(),
      redoFn,
    };

    act(() => {
      result.current.addAction(action);
    });

    await act(async () => {
      await result.current.undo();
    });

    let success;
    await act(async () => {
      success = await result.current.redo();
    });

    expect(success).toBe(true);
    expect(redoFn).toHaveBeenCalled();
    expect(result.current.past).toHaveLength(1);
    expect(result.current.future).toHaveLength(0);
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
  });

  it('undo returns false when past is empty', async () => {
    const { result } = renderHook(() => useUndoRedo());

    // Ensure hook is initialized
    expect(result.current.canUndo).toBe(false);

    let success;
    await act(async () => {
      success = await result.current.undo();
    });

    expect(success).toBe(false);
  });

  it('redo returns false when future is empty', async () => {
    const { result } = renderHook(() => useUndoRedo());

    // Ensure hook is initialized
    expect(result.current.canRedo).toBe(false);

    let success;
    await act(async () => {
      success = await result.current.redo();
    });

    expect(success).toBe(false);
  });

  it('clearHistory clears both past and future', async () => {
    const { result } = renderHook(() => useUndoRedo());

    const action = {
      type: 'TEST_ACTION',
      description: 'Test action',
      data: {},
      undoFn: vi.fn(),
      redoFn: vi.fn(),
    };

    act(() => {
      result.current.addAction(action);
    });

    expect(result.current.past).toHaveLength(1);

    act(() => {
      result.current.clearHistory();
    });

    expect(result.current.past).toHaveLength(0);
    expect(result.current.future).toHaveLength(0);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it('limits history to 50 items', () => {
    const { result } = renderHook(() => useUndoRedo());

    // Add 55 actions
    act(() => {
      for (let i = 0; i < 55; i++) {
        result.current.addAction({
          type: `ACTION_${i}`,
          description: `Action ${i}`,
          data: {},
          undoFn: vi.fn(),
          redoFn: vi.fn(),
        });
      }
    });

    // Should only keep the last 50
    expect(result.current.past).toHaveLength(50);
    // First action should be ACTION_5 (0-4 were trimmed)
    expect(result.current.past[0].type).toBe('ACTION_5');
    // Last action should be ACTION_54
    expect(result.current.past[49].type).toBe('ACTION_54');
  });

  it('lastActionDescription returns description of last action', () => {
    const { result } = renderHook(() => useUndoRedo());

    expect(result.current.lastActionDescription).toBeNull();

    act(() => {
      result.current.addAction({
        type: 'TEST_ACTION',
        description: 'My test description',
        data: {},
        undoFn: vi.fn(),
        redoFn: vi.fn(),
      });
    });

    expect(result.current.lastActionDescription).toBe('My test description');
  });

  it('nextRedoDescription returns description of next redo action', async () => {
    const { result } = renderHook(() => useUndoRedo());

    expect(result.current.nextRedoDescription).toBeNull();

    act(() => {
      result.current.addAction({
        type: 'TEST_ACTION',
        description: 'My test description',
        data: {},
        undoFn: vi.fn(),
        redoFn: vi.fn(),
      });
    });

    await act(async () => {
      await result.current.undo();
    });

    expect(result.current.nextRedoDescription).toBe('My test description');
  });

  it('handles undo failure gracefully', async () => {
    const { result } = renderHook(() => useUndoRedo());
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const undoFn = vi.fn().mockRejectedValue(new Error('Undo failed'));
    
    act(() => {
      result.current.addAction({
        type: 'TEST_ACTION',
        description: 'Test action',
        data: {},
        undoFn,
        redoFn: vi.fn(),
      });
    });

    let success;
    await act(async () => {
      success = await result.current.undo();
    });

    expect(success).toBe(false);
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('handles redo failure gracefully', async () => {
    const { result } = renderHook(() => useUndoRedo());
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const redoFn = vi.fn().mockRejectedValue(new Error('Redo failed'));
    
    act(() => {
      result.current.addAction({
        type: 'TEST_ACTION',
        description: 'Test action',
        data: {},
        undoFn: vi.fn(),
        redoFn,
      });
    });

    await act(async () => {
      await result.current.undo();
    });

    let success;
    await act(async () => {
      success = await result.current.redo();
    });

    expect(success).toBe(false);
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
