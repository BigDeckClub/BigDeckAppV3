import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ToastProvider, useToast, TOAST_TYPES } from '../context/ToastContext';
import { ToastContainer } from '../components/ToastContainer';

// Test component that uses the toast hook
function TestComponent() {
  const { showToast, dismissAllToasts } = useToast();
  
  return (
    <div>
      <button onClick={() => showToast('Success message', TOAST_TYPES.SUCCESS)}>
        Show Success
      </button>
      <button onClick={() => showToast('Error message', TOAST_TYPES.ERROR)}>
        Show Error
      </button>
      <button onClick={() => showToast('Warning message', TOAST_TYPES.WARNING)}>
        Show Warning
      </button>
      <button onClick={() => showToast('Info message', TOAST_TYPES.INFO)}>
        Show Info
      </button>
      <button onClick={dismissAllToasts}>
        Dismiss All
      </button>
      <ToastContainer />
    </div>
  );
}

describe('ToastContext', () => {
  it('should show toast notifications', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );
    
    // Click the success button
    fireEvent.click(screen.getByText('Show Success'));
    
    // Toast should appear
    await waitFor(() => {
      expect(screen.getByText('Success message')).toBeInTheDocument();
    });
  });

  it('should show multiple toast types', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );
    
    // Show different toast types
    fireEvent.click(screen.getByText('Show Success'));
    fireEvent.click(screen.getByText('Show Error'));
    
    // Both toasts should appear
    await waitFor(() => {
      expect(screen.getByText('Success message')).toBeInTheDocument();
      expect(screen.getByText('Error message')).toBeInTheDocument();
    });
  });

  it('should dismiss all toasts', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );
    
    // Show a toast
    fireEvent.click(screen.getByText('Show Success'));
    
    // Verify toast appears
    await waitFor(() => {
      expect(screen.getByText('Success message')).toBeInTheDocument();
    });
    
    // Dismiss all
    fireEvent.click(screen.getByText('Dismiss All'));
    
    // Toast should be gone
    await waitFor(() => {
      expect(screen.queryByText('Success message')).not.toBeInTheDocument();
    });
  });
});
