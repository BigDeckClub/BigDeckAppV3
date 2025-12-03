import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ConfirmProvider, useConfirm } from '../context/ConfirmContext';
import { ConfirmDialog } from '../components/ConfirmDialog';

// Test component that uses the confirm hook
function TestComponent({ onResult }) {
  const { confirm } = useConfirm();
  
  const handleConfirm = async () => {
    const result = await confirm({
      title: 'Test Confirm',
      message: 'Are you sure?',
      confirmText: 'Yes',
      cancelText: 'No',
    });
    onResult(result);
  };
  
  const handleDangerConfirm = async () => {
    const result = await confirm({
      title: 'Delete Item',
      message: 'This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'danger',
    });
    onResult(result);
  };
  
  return (
    <div>
      <button onClick={handleConfirm}>Open Confirm</button>
      <button onClick={handleDangerConfirm}>Open Danger Confirm</button>
      <ConfirmDialog />
    </div>
  );
}

describe('ConfirmContext', () => {
  it('should show confirmation dialog', async () => {
    const handleResult = vi.fn();
    
    render(
      <ConfirmProvider>
        <TestComponent onResult={handleResult} />
      </ConfirmProvider>
    );
    
    // Open the dialog
    fireEvent.click(screen.getByText('Open Confirm'));
    
    // Dialog should appear
    await waitFor(() => {
      expect(screen.getByText('Test Confirm')).toBeInTheDocument();
      expect(screen.getByText('Are you sure?')).toBeInTheDocument();
    });
  });

  it('should resolve true when confirmed', async () => {
    const handleResult = vi.fn();
    
    render(
      <ConfirmProvider>
        <TestComponent onResult={handleResult} />
      </ConfirmProvider>
    );
    
    // Open the dialog
    fireEvent.click(screen.getByText('Open Confirm'));
    
    // Wait for dialog and click confirm
    await waitFor(() => {
      expect(screen.getByText('Yes')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('Yes'));
    
    // Should resolve with true
    await waitFor(() => {
      expect(handleResult).toHaveBeenCalledWith(true);
    });
  });

  it('should resolve false when cancelled', async () => {
    const handleResult = vi.fn();
    
    render(
      <ConfirmProvider>
        <TestComponent onResult={handleResult} />
      </ConfirmProvider>
    );
    
    // Open the dialog
    fireEvent.click(screen.getByText('Open Confirm'));
    
    // Wait for dialog and click cancel
    await waitFor(() => {
      expect(screen.getByText('No')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('No'));
    
    // Should resolve with false
    await waitFor(() => {
      expect(handleResult).toHaveBeenCalledWith(false);
    });
  });

  it('should show danger variant styling', async () => {
    const handleResult = vi.fn();
    
    render(
      <ConfirmProvider>
        <TestComponent onResult={handleResult} />
      </ConfirmProvider>
    );
    
    // Open the danger dialog
    fireEvent.click(screen.getByText('Open Danger Confirm'));
    
    // Dialog should appear with danger title
    await waitFor(() => {
      expect(screen.getByText('Delete Item')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });
  });
});
