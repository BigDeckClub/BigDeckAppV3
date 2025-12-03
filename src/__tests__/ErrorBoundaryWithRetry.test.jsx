import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorBoundaryWithRetry from '../components/ErrorBoundaryWithRetry';

// Component that throws an error
const ThrowError = ({ shouldThrow, message = 'Test error' }) => {
  if (shouldThrow) {
    throw new Error(message);
  }
  return <div>Child content</div>;
};

describe('ErrorBoundaryWithRetry', () => {
  let consoleSpy;

  beforeEach(() => {
    // Suppress console.error for cleaner test output
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('should render children when there is no error', () => {
    render(
      <ErrorBoundaryWithRetry>
        <div>Test content</div>
      </ErrorBoundaryWithRetry>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('should display error message when an error occurs', () => {
    render(
      <ErrorBoundaryWithRetry>
        <ThrowError shouldThrow={true} message="Something broke" />
      </ErrorBoundaryWithRetry>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Something broke')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('should reset error state when retry button is clicked', () => {
    const { rerender } = render(
      <ErrorBoundaryWithRetry>
        <ThrowError shouldThrow={true} />
      </ErrorBoundaryWithRetry>
    );

    // Verify error state is shown
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    // Rerender with non-throwing component before clicking retry
    rerender(
      <ErrorBoundaryWithRetry>
        <ThrowError shouldThrow={false} />
      </ErrorBoundaryWithRetry>
    );

    // Click retry button
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));

    // Verify children are rendered after retry
    expect(screen.getByText('Child content')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });

  it('should log error via componentDidCatch', () => {
    render(
      <ErrorBoundaryWithRetry>
        <ThrowError shouldThrow={true} message="Logged error" />
      </ErrorBoundaryWithRetry>
    );

    // Verify console.error was called with error info
    expect(consoleSpy).toHaveBeenCalled();
    const lastCall = consoleSpy.mock.calls.find(call => 
      call[0] === 'Error caught by boundary:'
    );
    expect(lastCall).toBeDefined();
  });

  it('should force remount of children on retry by changing key', () => {
    let mountCount = 0;
    
    const CountingComponent = ({ shouldThrow }) => {
      mountCount++;
      if (shouldThrow) {
        throw new Error('Test error');
      }
      return <div>Mount count: {mountCount}</div>;
    };

    const { rerender } = render(
      <ErrorBoundaryWithRetry>
        <CountingComponent shouldThrow={true} />
      </ErrorBoundaryWithRetry>
    );

    const initialMountCount = mountCount;

    // Rerender with non-throwing component
    rerender(
      <ErrorBoundaryWithRetry>
        <CountingComponent shouldThrow={false} />
      </ErrorBoundaryWithRetry>
    );

    // Click retry
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));

    // Verify component was remounted (mount count increased)
    expect(mountCount).toBeGreaterThan(initialMountCount);
  });
});
