import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BuyButton } from '../components/buy/BuyButton';
import { ToastProvider } from '../context/ToastContext';
import { ToastContainer } from '../components/ToastContainer';

// Mock window.open
const mockWindowOpen = vi.fn();
vi.stubGlobal('open', mockWindowOpen);

// Helper to render with providers
const renderWithProviders = (ui) => {
  return render(
    <ToastProvider>
      {ui}
      <ToastContainer />
    </ToastProvider>
  );
};

describe('BuyButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
    localStorage.clear();
  });

  describe('icon variant (default)', () => {
    it('should render shopping cart icon', () => {
      renderWithProviders(<BuyButton card={{ name: 'Lightning Bolt' }} />);
      
      const button = screen.getByRole('button', { name: /buy this card/i });
      expect(button).toBeInTheDocument();
    });

    it('should open dropdown when clicked', () => {
      renderWithProviders(<BuyButton card={{ name: 'Lightning Bolt' }} />);
      
      const button = screen.getByRole('button', { name: /buy this card/i });
      fireEvent.click(button);
      
      expect(screen.getByText('TCGPlayer')).toBeInTheDocument();
      expect(screen.getByText('Manapool')).toBeInTheDocument();
      expect(screen.getByText('Card Kingdom')).toBeInTheDocument();
    });

    it('should show card name and quantity in dropdown header', () => {
      renderWithProviders(<BuyButton card={{ name: 'Lightning Bolt' }} quantity={4} />);
      
      fireEvent.click(screen.getByRole('button', { name: /buy this card/i }));
      
      expect(screen.getByText('4x Lightning Bolt')).toBeInTheDocument();
    });

    it('should close dropdown when clicking outside', async () => {
      renderWithProviders(
        <div>
          <BuyButton card={{ name: 'Lightning Bolt' }} />
          <div data-testid="outside">Outside</div>
        </div>
      );
      
      // Open dropdown
      fireEvent.click(screen.getByRole('button', { name: /buy this card/i }));
      expect(screen.getByText('TCGPlayer')).toBeInTheDocument();
      
      // Click outside
      fireEvent.mouseDown(screen.getByTestId('outside'));
      
      await waitFor(() => {
        expect(screen.queryByText('TCGPlayer')).not.toBeInTheDocument();
      });
    });

    it('should toggle dropdown on button click', () => {
      renderWithProviders(<BuyButton card={{ name: 'Lightning Bolt' }} />);
      
      const button = screen.getByRole('button', { name: /buy this card/i });
      
      // First click opens
      fireEvent.click(button);
      expect(screen.getByText('TCGPlayer')).toBeInTheDocument();
      
      // Second click closes
      fireEvent.click(button);
      expect(screen.queryByText('TCGPlayer')).not.toBeInTheDocument();
    });
  });

  describe('marketplace selection', () => {
    it('should open TCGPlayer when TCGPlayer is clicked', () => {
      renderWithProviders(<BuyButton card={{ name: 'Lightning Bolt' }} quantity={4} />);
      
      fireEvent.click(screen.getByRole('button', { name: /buy this card/i }));
      fireEvent.click(screen.getByText('TCGPlayer'));
      
      expect(mockWindowOpen).toHaveBeenCalledWith(
        expect.stringContaining('tcgplayer.com/massentry'),
        '_blank',
        'noopener,noreferrer'
      );
    });

    it('should open Manapool when Manapool is clicked', () => {
      renderWithProviders(<BuyButton card={{ name: 'Lightning Bolt' }} quantity={4} />);
      
      fireEvent.click(screen.getByRole('button', { name: /buy this card/i }));
      fireEvent.click(screen.getByText('Manapool'));
      
      expect(mockWindowOpen).toHaveBeenCalledWith(
        expect.stringContaining('manapool.com'),
        '_blank',
        'noopener,noreferrer'
      );
    });

    it('should open Card Kingdom when Card Kingdom is clicked', () => {
      renderWithProviders(<BuyButton card={{ name: 'Lightning Bolt' }} quantity={4} />);
      
      fireEvent.click(screen.getByRole('button', { name: /buy this card/i }));
      fireEvent.click(screen.getByText('Card Kingdom'));
      
      expect(mockWindowOpen).toHaveBeenCalledWith(
        expect.stringContaining('cardkingdom.com'),
        '_blank',
        'noopener,noreferrer'
      );
    });

    it('should close dropdown after marketplace selection', async () => {
      renderWithProviders(<BuyButton card={{ name: 'Lightning Bolt' }} />);
      
      fireEvent.click(screen.getByRole('button', { name: /buy this card/i }));
      fireEvent.click(screen.getByText('TCGPlayer'));
      
      await waitFor(() => {
        expect(screen.queryByText('Manapool')).not.toBeInTheDocument();
      });
    });
  });

  describe('copy to clipboard', () => {
    it('should copy card to clipboard when copy option is clicked', async () => {
      renderWithProviders(<BuyButton card={{ name: 'Lightning Bolt' }} quantity={4} />);
      
      fireEvent.click(screen.getByRole('button', { name: /buy this card/i }));
      fireEvent.click(screen.getByText('Copy to clipboard'));
      
      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalled();
      });
    });

    it('should show success toast after copying', async () => {
      renderWithProviders(<BuyButton card={{ name: 'Lightning Bolt' }} quantity={4} />);
      
      fireEvent.click(screen.getByRole('button', { name: /buy this card/i }));
      fireEvent.click(screen.getByText('Copy to clipboard'));
      
      await waitFor(() => {
        expect(screen.getByText(/Copied 4x Lightning Bolt/)).toBeInTheDocument();
      });
    });

    it('should show error toast when copy fails', async () => {
      vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('Copy failed'));
      
      renderWithProviders(<BuyButton card={{ name: 'Lightning Bolt' }} />);
      
      fireEvent.click(screen.getByRole('button', { name: /buy this card/i }));
      fireEvent.click(screen.getByText('Copy to clipboard'));
      
      await waitFor(() => {
        expect(screen.getByText('Failed to copy to clipboard')).toBeInTheDocument();
      });
    });
  });

  describe('card formats', () => {
    it('should handle card as object with name property', () => {
      renderWithProviders(<BuyButton card={{ name: 'Counterspell' }} quantity={2} />);
      
      fireEvent.click(screen.getByRole('button', { name: /buy this card/i }));
      
      expect(screen.getByText('2x Counterspell')).toBeInTheDocument();
    });

    it('should handle card as string', () => {
      renderWithProviders(<BuyButton card="Sol Ring" quantity={1} />);
      
      fireEvent.click(screen.getByRole('button', { name: /buy this card/i }));
      
      expect(screen.getByText('1x Sol Ring')).toBeInTheDocument();
    });

    it('should default quantity to 1', () => {
      renderWithProviders(<BuyButton card={{ name: 'Lightning Bolt' }} />);
      
      fireEvent.click(screen.getByRole('button', { name: /buy this card/i }));
      
      expect(screen.getByText('1x Lightning Bolt')).toBeInTheDocument();
    });
  });

  describe('button variant', () => {
    it('should render as full button when variant is button', () => {
      renderWithProviders(<BuyButton card={{ name: 'Lightning Bolt' }} variant="button" />);
      
      expect(screen.getByText('Buy')).toBeInTheDocument();
    });

    it('should open preferred marketplace directly when variant is button', () => {
      localStorage.setItem('preferredMarketplace', 'manapool');
      
      renderWithProviders(<BuyButton card={{ name: 'Lightning Bolt' }} variant="button" />);
      
      fireEvent.click(screen.getByText('Buy'));
      
      expect(mockWindowOpen).toHaveBeenCalledWith(
        expect.stringContaining('manapool.com'),
        '_blank',
        'noopener,noreferrer'
      );
    });
  });

  describe('sizes', () => {
    it('should apply small size classes', () => {
      renderWithProviders(<BuyButton card={{ name: 'Lightning Bolt' }} size="sm" />);
      
      const button = screen.getByRole('button', { name: /buy this card/i });
      expect(button).toHaveClass('p-1');
    });

    it('should apply medium size classes', () => {
      renderWithProviders(<BuyButton card={{ name: 'Lightning Bolt' }} size="md" />);
      
      const button = screen.getByRole('button', { name: /buy this card/i });
      expect(button).toHaveClass('p-1.5');
    });

    it('should apply large size classes', () => {
      renderWithProviders(<BuyButton card={{ name: 'Lightning Bolt' }} size="lg" />);
      
      const button = screen.getByRole('button', { name: /buy this card/i });
      expect(button).toHaveClass('p-2');
    });
  });

  describe('event propagation', () => {
    it('should stop propagation on button click', () => {
      const parentClick = vi.fn();
      
      render(
        <ToastProvider>
          <div onClick={parentClick}>
            <BuyButton card={{ name: 'Lightning Bolt' }} />
          </div>
        </ToastProvider>
      );
      
      fireEvent.click(screen.getByRole('button', { name: /buy this card/i }));
      
      expect(parentClick).not.toHaveBeenCalled();
    });
  });
});
