/**
 * Tests for KeyboardShortcutsHelp component
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { KeyboardShortcutsHelp } from '../components/ui/KeyboardShortcutsHelp';

describe('KeyboardShortcutsHelp', () => {
  it('should render when isOpen is true', () => {
    const onClose = vi.fn();
    render(<KeyboardShortcutsHelp isOpen={true} onClose={onClose} />);
    
    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
  });

  it('should not render when isOpen is false', () => {
    const onClose = vi.fn();
    render(<KeyboardShortcutsHelp isOpen={false} onClose={onClose} />);
    
    expect(screen.queryByText('Keyboard Shortcuts')).not.toBeInTheDocument();
  });

  it('should display navigation shortcuts section', () => {
    const onClose = vi.fn();
    render(<KeyboardShortcutsHelp isOpen={true} onClose={onClose} />);
    
    expect(screen.getByText('Navigation')).toBeInTheDocument();
    // "Focus search input" appears twice (/ and Ctrl+K)
    expect(screen.getAllByText('Focus search input').length).toBe(2);
  });

  it('should display help shortcuts section', () => {
    const onClose = vi.fn();
    render(<KeyboardShortcutsHelp isOpen={true} onClose={onClose} />);
    
    expect(screen.getByText('Help')).toBeInTheDocument();
    expect(screen.getByText('Show keyboard shortcuts')).toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<KeyboardShortcutsHelp isOpen={true} onClose={onClose} />);
    
    const closeButton = screen.getByLabelText('Close modal');
    fireEvent.click(closeButton);
    
    expect(onClose).toHaveBeenCalled();
  });

  it('should call onClose when backdrop is clicked', () => {
    const onClose = vi.fn();
    render(<KeyboardShortcutsHelp isOpen={true} onClose={onClose} />);
    
    // Find the backdrop (the outer dialog element)
    const backdrop = screen.getByRole('dialog');
    fireEvent.click(backdrop);
    
    expect(onClose).toHaveBeenCalled();
  });

  it('should display shortcut keys', () => {
    const onClose = vi.fn();
    render(<KeyboardShortcutsHelp isOpen={true} onClose={onClose} />);
    
    // Check for keyboard shortcut keys rendered (use getAllByText for duplicates)
    expect(screen.getByText('/')).toBeInTheDocument();
    expect(screen.getAllByText('Esc').length).toBeGreaterThan(0);
    expect(screen.getByText('?')).toBeInTheDocument();
  });
});
