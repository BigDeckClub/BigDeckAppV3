import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BuyCardsModal } from '../components/buy/BuyCardsModal';
import { ToastProvider } from '../context/ToastContext';
import { ToastContainer } from '../components/ToastContainer';

// Mock window.open
const mockWindowOpen = vi.fn();
Object.defineProperty(window, 'open', {
  value: mockWindowOpen,
  writable: true,
});

// Mock clipboard
const mockClipboard = {
  writeText: vi.fn(),
};
Object.defineProperty(navigator, 'clipboard', {
  value: mockClipboard,
  writable: true,
});

// Helper to render with providers
const renderWithProviders = (ui) => {
  return render(
    <ToastProvider>
      {ui}
      <ToastContainer />
    </ToastProvider>
  );
};

const mockCards = [
  { name: 'Lightning Bolt', quantity: 4 },
  { name: 'Counterspell', quantity: 2 },
  { name: 'Sol Ring', quantity: 1 },
];

describe('BuyCardsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClipboard.writeText.mockResolvedValue(undefined);
    localStorage.clear();
  });

  describe('rendering', () => {
    it('should not render when isOpen is false', () => {
      renderWithProviders(
        <BuyCardsModal isOpen={false} onClose={() => {}} cards={mockCards} />
      );
      
      expect(screen.queryByText('Buy Missing Cards')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      renderWithProviders(
        <BuyCardsModal isOpen onClose={() => {}} cards={mockCards} />
      );
      
      expect(screen.getByText('Buy Missing Cards')).toBeInTheDocument();
    });

    it('should display deck name when provided', () => {
      renderWithProviders(
        <BuyCardsModal isOpen onClose={() => {}} cards={mockCards} deckName="Modern Burn" />
      );
      
      expect(screen.getByText('Modern Burn')).toBeInTheDocument();
    });

    it('should display all cards', () => {
      renderWithProviders(
        <BuyCardsModal isOpen onClose={() => {}} cards={mockCards} />
      );
      
      expect(screen.getByText('Lightning Bolt')).toBeInTheDocument();
      expect(screen.getByText('Counterspell')).toBeInTheDocument();
      expect(screen.getByText('Sol Ring')).toBeInTheDocument();
    });

    it('should display correct card count', () => {
      renderWithProviders(
        <BuyCardsModal isOpen onClose={() => {}} cards={mockCards} />
      );
      
      expect(screen.getByText(/Cards to Buy \(3 cards\)/)).toBeInTheDocument();
    });
  });

  describe('marketplace selection', () => {
    it('should render all marketplace options', () => {
      renderWithProviders(
        <BuyCardsModal isOpen onClose={() => {}} cards={mockCards} />
      );
      
      expect(screen.getByText('TCGPlayer')).toBeInTheDocument();
      expect(screen.getByText('Manapool')).toBeInTheDocument();
      expect(screen.getByText('Card Kingdom')).toBeInTheDocument();
    });

    it('should change marketplace when option is clicked', () => {
      renderWithProviders(
        <BuyCardsModal isOpen onClose={() => {}} cards={mockCards} />
      );
      
      // Initially TCGPlayer should be selected
      const tcgButton = screen.getAllByRole('button').find(btn => btn.textContent.includes('TCGPlayer'));
      expect(tcgButton).toHaveAttribute('aria-pressed', 'true');
      
      // Click Manapool
      fireEvent.click(screen.getByText('Manapool'));
      
      // Manapool should now be selected
      const manapoolButton = screen.getAllByRole('button').find(btn => btn.textContent.includes('Manapool'));
      expect(manapoolButton).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('card selection', () => {
    it('should have all cards selected by default', () => {
      renderWithProviders(
        <BuyCardsModal isOpen onClose={() => {}} cards={mockCards} />
      );
      
      expect(screen.getByText(/Selected: 3 cards \(7 total\)/)).toBeInTheDocument();
    });

    it('should deselect card when checkbox is clicked', () => {
      renderWithProviders(
        <BuyCardsModal isOpen onClose={() => {}} cards={mockCards} />
      );
      
      // Find and click the first checkbox (assuming it's for Lightning Bolt)
      const checkboxes = screen.getAllByRole('button').filter(btn => 
        btn.className.includes('w-5 h-5 rounded border')
      );
      
      fireEvent.click(checkboxes[0]);
      
      // Should now show 2 cards selected
      expect(screen.getByText(/Selected: 2 cards/)).toBeInTheDocument();
    });

    it('should deselect all cards when Deselect All is clicked', () => {
      renderWithProviders(
        <BuyCardsModal isOpen onClose={() => {}} cards={mockCards} />
      );
      
      fireEvent.click(screen.getByText('Deselect All'));
      
      expect(screen.getByText(/Selected: 0 cards \(0 total\)/)).toBeInTheDocument();
    });

    it('should select all cards when Select All is clicked', () => {
      renderWithProviders(
        <BuyCardsModal isOpen onClose={() => {}} cards={mockCards} />
      );
      
      // First deselect all
      fireEvent.click(screen.getByText('Deselect All'));
      expect(screen.getByText(/Selected: 0 cards/)).toBeInTheDocument();
      
      // Then select all
      fireEvent.click(screen.getByText('Select All'));
      expect(screen.getByText(/Selected: 3 cards \(7 total\)/)).toBeInTheDocument();
    });
  });

  describe('quantity adjustment', () => {
    it('should increase quantity when + is clicked', () => {
      renderWithProviders(
        <BuyCardsModal isOpen onClose={() => {}} cards={mockCards} />
      );
      
      // Initial total is 7 (4 + 2 + 1)
      expect(screen.getByText(/7 total/)).toBeInTheDocument();
      
      // Find the + buttons and click the first one
      const plusButtons = screen.getAllByRole('button').filter(btn => {
        const svg = btn.querySelector('svg');
        return svg && btn.className.includes('text-slate-400 hover:text-white') && !btn.disabled;
      });
      
      // Click the + for the first card (should have quantity displayed)
      const firstPlusButton = plusButtons[0];
      fireEvent.click(firstPlusButton);
      
      // Total should increase
      expect(screen.getByText(/8 total/)).toBeInTheDocument();
    });

    it('should decrease quantity when - is clicked', () => {
      renderWithProviders(
        <BuyCardsModal isOpen onClose={() => {}} cards={mockCards} />
      );
      
      // Initial total is 7
      expect(screen.getByText(/7 total/)).toBeInTheDocument();
      
      // Find and click a minus button (not for quantity 1 cards)
      const minusButtons = screen.getAllByRole('button').filter(btn => {
        return btn.className.includes('text-slate-400') && !btn.disabled;
      });
      
      // Click minus on first card (quantity 4)
      fireEvent.click(minusButtons[0]);
      
      // Total should decrease
      expect(screen.getByText(/6 total/)).toBeInTheDocument();
    });

    it('should not decrease quantity below 1', () => {
      const singleCard = [{ name: 'Sol Ring', quantity: 1 }];
      renderWithProviders(
        <BuyCardsModal isOpen onClose={() => {}} cards={singleCard} />
      );
      
      // The minus button for quantity 1 should be disabled
      const minusButtons = screen.getAllByRole('button').filter(btn => {
        return btn.disabled && btn.className.includes('disabled:opacity-30');
      });
      
      expect(minusButtons.length).toBeGreaterThan(0);
    });
  });

  describe('copy to clipboard', () => {
    it('should copy selected cards to clipboard', async () => {
      renderWithProviders(
        <BuyCardsModal isOpen onClose={() => {}} cards={mockCards} />
      );
      
      fireEvent.click(screen.getByText('Copy to Clipboard'));
      
      await waitFor(() => {
        expect(mockClipboard.writeText).toHaveBeenCalled();
      });
    });

    it('should show success toast after copying', async () => {
      renderWithProviders(
        <BuyCardsModal isOpen onClose={() => {}} cards={mockCards} />
      );
      
      fireEvent.click(screen.getByText('Copy to Clipboard'));
      
      await waitFor(() => {
        expect(screen.getByText(/7 cards copied to clipboard/)).toBeInTheDocument();
      });
    });

    it('should show warning when no cards selected', async () => {
      renderWithProviders(
        <BuyCardsModal isOpen onClose={() => {}} cards={mockCards} />
      );
      
      // Deselect all cards
      fireEvent.click(screen.getByText('Deselect All'));
      
      // Try to copy
      fireEvent.click(screen.getByText('Copy to Clipboard'));
      
      await waitFor(() => {
        expect(screen.getByText(/No cards selected/)).toBeInTheDocument();
      });
    });

    it('should show error toast when copy fails', async () => {
      mockClipboard.writeText.mockRejectedValue(new Error('Copy failed'));
      
      renderWithProviders(
        <BuyCardsModal isOpen onClose={() => {}} cards={mockCards} />
      );
      
      fireEvent.click(screen.getByText('Copy to Clipboard'));
      
      await waitFor(() => {
        expect(screen.getByText('Failed to copy to clipboard')).toBeInTheDocument();
      });
    });
  });

  describe('open marketplace', () => {
    it('should open marketplace URL in new tab', async () => {
      renderWithProviders(
        <BuyCardsModal isOpen onClose={() => {}} cards={mockCards} />
      );
      
      // Click the open marketplace button
      fireEvent.click(screen.getByText(/Open TCGPlayer/));
      
      expect(mockWindowOpen).toHaveBeenCalledWith(
        expect.stringContaining('tcgplayer.com'),
        '_blank',
        'noopener,noreferrer'
      );
    });

    it('should show success toast when opening marketplace', async () => {
      renderWithProviders(
        <BuyCardsModal isOpen onClose={() => {}} cards={mockCards} />
      );
      
      fireEvent.click(screen.getByText(/Open TCGPlayer/));
      
      await waitFor(() => {
        expect(screen.getByText(/Opening TCGPlayer/)).toBeInTheDocument();
      });
    });

    it('should show warning when no cards selected', async () => {
      renderWithProviders(
        <BuyCardsModal isOpen onClose={() => {}} cards={mockCards} />
      );
      
      // Deselect all cards
      fireEvent.click(screen.getByText('Deselect All'));
      
      // Try to open marketplace
      fireEvent.click(screen.getByText(/Open TCGPlayer/));
      
      await waitFor(() => {
        expect(screen.getByText(/No cards selected/)).toBeInTheDocument();
      });
    });
  });

  describe('remember preference', () => {
    it('should render remember checkbox', () => {
      renderWithProviders(
        <BuyCardsModal isOpen onClose={() => {}} cards={mockCards} />
      );
      
      expect(screen.getByText('Remember my choice')).toBeInTheDocument();
    });

    it('should save preference when checkbox is checked', () => {
      renderWithProviders(
        <BuyCardsModal isOpen onClose={() => {}} cards={mockCards} />
      );
      
      // Click remember checkbox
      fireEvent.click(screen.getByRole('checkbox'));
      
      expect(localStorage.getItem('preferredMarketplace')).toBe('tcgplayer');
    });
  });

  describe('empty cards array', () => {
    it('should render with empty cards array', () => {
      renderWithProviders(
        <BuyCardsModal isOpen onClose={() => {}} cards={[]} />
      );
      
      expect(screen.getByText(/Cards to Buy \(0 cards\)/)).toBeInTheDocument();
    });

    it('should show 0 selected with empty cards', () => {
      renderWithProviders(
        <BuyCardsModal isOpen onClose={() => {}} cards={[]} />
      );
      
      expect(screen.getByText(/Selected: 0 cards \(0 total\)/)).toBeInTheDocument();
    });
  });

  describe('modal closing', () => {
    it('should call onClose when modal is closed', () => {
      const onClose = vi.fn();
      renderWithProviders(
        <BuyCardsModal isOpen onClose={onClose} cards={mockCards} />
      );
      
      // Find and click the close button
      const closeButton = screen.getByLabelText('Close modal');
      fireEvent.click(closeButton);
      
      expect(onClose).toHaveBeenCalled();
    });
  });
});
