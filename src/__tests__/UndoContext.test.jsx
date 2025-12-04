import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { UndoProvider, useUndo, UNDO_ACTION_TYPES } from '../context/UndoContext';
import { ToastProvider } from '../context/ToastContext';
import { ToastContainer } from '../components/ToastContainer';

// Test component that uses the undo hook
function TestComponent() {
  const { canUndo, canRedo, registerAction, undo, redo, clearHistory } = useUndo();

  const handleAddAction = () => {
    registerAction({
      type: UNDO_ACTION_TYPES.DELETE_ITEM,
      description: 'Deleted Test Card',
      data: { id: 1 },
      undoFn: vi.fn().mockResolvedValue(undefined),
      redoFn: vi.fn().mockResolvedValue(undefined),
    });
  };

  return (
    <div>
      <button onClick={handleAddAction}>Add Action</button>
      <button onClick={undo} disabled={!canUndo}>Undo</button>
      <button onClick={redo} disabled={!canRedo}>Redo</button>
      <button onClick={clearHistory}>Clear History</button>
      <span data-testid="can-undo">{canUndo ? 'true' : 'false'}</span>
      <span data-testid="can-redo">{canRedo ? 'true' : 'false'}</span>
      <ToastContainer />
    </div>
  );
}

// Wrapper with required providers
function renderWithProviders(ui) {
  return render(
    <ToastProvider>
      <UndoProvider>
        {ui}
      </UndoProvider>
    </ToastProvider>
  );
}

describe('UndoContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('provides undo context to children', () => {
    renderWithProviders(<TestComponent />);

    expect(screen.getByTestId('can-undo')).toHaveTextContent('false');
    expect(screen.getByTestId('can-redo')).toHaveTextContent('false');
  });

  it('registers action and shows toast', async () => {
    renderWithProviders(<TestComponent />);

    fireEvent.click(screen.getByText('Add Action'));

    await waitFor(() => {
      expect(screen.getByTestId('can-undo')).toHaveTextContent('true');
    });

    // Toast should appear with the description
    await waitFor(() => {
      expect(screen.getByText('Deleted Test Card')).toBeInTheDocument();
    });
  });

  it('shows toast with undo button', async () => {
    renderWithProviders(<TestComponent />);

    fireEvent.click(screen.getByText('Add Action'));

    // Toast should have an Undo button (there are two - one in header, one in toast)
    await waitFor(() => {
      const undoButtons = screen.getAllByRole('button', { name: 'Undo' });
      // We should have 2 Undo buttons now - one in component and one in toast
      expect(undoButtons.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('canUndo is true after adding action', async () => {
    renderWithProviders(<TestComponent />);

    expect(screen.getByTestId('can-undo')).toHaveTextContent('false');

    fireEvent.click(screen.getByText('Add Action'));

    await waitFor(() => {
      expect(screen.getByTestId('can-undo')).toHaveTextContent('true');
    });
  });

  it('canRedo is true after undoing', async () => {
    renderWithProviders(<TestComponent />);

    fireEvent.click(screen.getByText('Add Action'));

    await waitFor(() => {
      expect(screen.getByTestId('can-undo')).toHaveTextContent('true');
    });

    // Click the Undo button in the header (not the toast)
    const buttons = screen.getAllByRole('button', { name: 'Undo' });
    const headerUndoButton = buttons.find(btn => !btn.closest('[role="alert"]'));
    fireEvent.click(headerUndoButton);

    await waitFor(() => {
      expect(screen.getByTestId('can-redo')).toHaveTextContent('true');
    });
  });

  it('clearHistory resets undo/redo state', async () => {
    renderWithProviders(<TestComponent />);

    fireEvent.click(screen.getByText('Add Action'));

    await waitFor(() => {
      expect(screen.getByTestId('can-undo')).toHaveTextContent('true');
    });

    fireEvent.click(screen.getByText('Clear History'));

    await waitFor(() => {
      expect(screen.getByTestId('can-undo')).toHaveTextContent('false');
      expect(screen.getByTestId('can-redo')).toHaveTextContent('false');
    });
  });

  it('throws error when useUndo is used outside provider', () => {
    // Suppress console.error for this test
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    function BadComponent() {
      useUndo();
      return null;
    }

    expect(() => render(<BadComponent />)).toThrow(
      'useUndo must be used within an UndoProvider'
    );

    consoleError.mockRestore();
  });

  it('exports UNDO_ACTION_TYPES', () => {
    expect(UNDO_ACTION_TYPES.DELETE_ITEM).toBe('DELETE_ITEM');
    expect(UNDO_ACTION_TYPES.UPDATE_ITEM).toBe('UPDATE_ITEM');
    expect(UNDO_ACTION_TYPES.MOVE_TO_FOLDER).toBe('MOVE_TO_FOLDER');
    expect(UNDO_ACTION_TYPES.RESTORE_ITEM).toBe('RESTORE_ITEM');
    expect(UNDO_ACTION_TYPES.BULK_DELETE).toBe('BULK_DELETE');
    expect(UNDO_ACTION_TYPES.BULK_MOVE).toBe('BULK_MOVE');
  });
});

describe('UndoContext Keyboard Shortcuts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('responds to Ctrl+Z for undo', async () => {
    renderWithProviders(<TestComponent />);

    // Add an action first
    fireEvent.click(screen.getByText('Add Action'));

    await waitFor(() => {
      expect(screen.getByTestId('can-undo')).toHaveTextContent('true');
    });

    // Trigger Ctrl+Z
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });

    await waitFor(() => {
      expect(screen.getByTestId('can-undo')).toHaveTextContent('false');
      expect(screen.getByTestId('can-redo')).toHaveTextContent('true');
    });
  });

  it('responds to Ctrl+Shift+Z for redo', async () => {
    renderWithProviders(<TestComponent />);

    // Add an action first
    fireEvent.click(screen.getByText('Add Action'));

    await waitFor(() => {
      expect(screen.getByTestId('can-undo')).toHaveTextContent('true');
    });

    // Undo first
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });

    await waitFor(() => {
      expect(screen.getByTestId('can-redo')).toHaveTextContent('true');
    });

    // Trigger Ctrl+Shift+Z for redo
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true, shiftKey: true });

    await waitFor(() => {
      expect(screen.getByTestId('can-undo')).toHaveTextContent('true');
      expect(screen.getByTestId('can-redo')).toHaveTextContent('false');
    });
  });

  it('responds to Ctrl+Y for redo on Windows', async () => {
    // Mock non-Mac platform
    Object.defineProperty(navigator, 'platform', {
      value: 'Win32',
      writable: true,
    });

    renderWithProviders(<TestComponent />);

    // Add an action first
    fireEvent.click(screen.getByText('Add Action'));

    await waitFor(() => {
      expect(screen.getByTestId('can-undo')).toHaveTextContent('true');
    });

    // Undo first
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });

    await waitFor(() => {
      expect(screen.getByTestId('can-redo')).toHaveTextContent('true');
    });

    // Trigger Ctrl+Y for redo
    fireEvent.keyDown(window, { key: 'y', ctrlKey: true });

    await waitFor(() => {
      expect(screen.getByTestId('can-undo')).toHaveTextContent('true');
    });
  });
});
