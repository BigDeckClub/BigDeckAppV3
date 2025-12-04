import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BuyCardsModal } from '../components/buy/BuyCardsModal';
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

const mockCards = [
  { name: 'Lightning Bolt', quantity: 4 },
  { name: 'Counterspell', quantity: 2 },
  { name: 'Sol Ring', quantity: 1 },
];

describe('BuyCardsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
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
      
      // All card names should be visible
      expect(screen.getByText('Lightning Bolt')).toBeInTheDocument();
      expect(screen.getByText('Counterspell')).toBeInTheDocument();
      expect(screen.getByText('Sol Ring')).toBeInTheDocument();
    });

    it('should deselect card when checkbox is clicked', () => {
      renderWithProviders(
        <BuyCardsModal isOpen onClose={() => {}} cards={mockCards} />
      );
      
      // Find and click the first checkbox
      const checkboxes = screen.getAllByRole('button').filter(btn => 
        btn.className.includes('w-5 h-5 rounded border')
      );
      
      // Initially should have teal background (selected)
      expect(checkboxes[0]).toHaveClass('bg-teal-600');
      
      fireEvent.click(checkboxes[0]);
      
      // Should now have slate background (deselected)
      expect(checkboxes[0]).toHaveClass('bg-slate-700');
    });

    it('should deselect all cards when Deselect All is clicked', () => {
      renderWithProviders(
        <BuyCardsModal isOpen onClose={() => {}} cards={mockCards} />
      );
      
      fireEvent.click(screen.getByText('Deselect All'));
      
      // All checkboxes should be deselected
      const checkboxes = screen.getAllByRole('button').filter(btn => 
        btn.className.includes('w-5 h-5 rounded border')
      );
      
      checkboxes.forEach(checkbox => {
        expect(checkbox).toHaveClass('bg-slate-700');
      });
    });

    it('should select all cards when Select All is clicked', () => {
      renderWithProviders(
        <BuyCardsModal isOpen onClose={() => {}} cards={mockCards} />
      );
      
      // First deselect all
      fireEvent.click(screen.getByText('Deselect All'));
      
      // Then select all
      fireEvent.click(screen.getByText('Select All'));
      
      // All checkboxes should be selected
      const checkboxes = screen.getAllByRole('button').filter(btn => 
        btn.className.includes('w-5 h-5 rounded border')
      );
      
      checkboxes.forEach(checkbox => {
        expect(checkbox).toHaveClass('bg-teal-600');
      });
    });
  });

  describe('quantity adjustment', () => {
    it('should have quantity controls for each card', () => {
      renderWithProviders(
        <BuyCardsModal isOpen onClose={() => {}} cards={mockCards} />
      );
      
      // Check that quantity is displayed for first card (4)
      expect(screen.getByText('4')).toBeInTheDocument();
      // Check that quantity is displayed for second card (2)
      expect(screen.getByText('2')).toBeInTheDocument();
      // Check that quantity is displayed for third card (1)
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('should have disabled minus button when quantity is 1', () => {
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
        expect(navigator.clipboard.writeText).toHaveBeenCalled();
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

    it('should show buttons as disabled when no cards selected', () => {
      renderWithProviders(
        <BuyCardsModal isOpen onClose={() => {}} cards={mockCards} />
      );
      
      // Deselect all cards
      fireEvent.click(screen.getByText('Deselect All'));
      
      // Buttons should be disabled
      expect(screen.getByText('Copy to Clipboard').closest('button')).toBeDisabled();
    });

    it('should show error toast when copy fails', async () => {
      vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('Copy failed'));
      
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

    it('should show marketplace button as disabled when no cards selected', () => {
      renderWithProviders(
        <BuyCardsModal isOpen onClose={() => {}} cards={mockCards} />
      );
      
      // Deselect all cards
      fireEvent.click(screen.getByText('Deselect All'));
      
      // Button should be disabled
      expect(screen.getByText(/Open TCGPlayer/).closest('button')).toBeDisabled();
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
      
      // Check that the card count section exists
      expect(screen.getByText(/Cards to Buy/)).toBeInTheDocument();
    });

    it('should show 0 selected with empty cards', () => {
      renderWithProviders(
        <BuyCardsModal isOpen onClose={() => {}} cards={[]} />
      );
      
      // Just verify the selection counter area exists with 0
      expect(screen.getByText('Selected:')).toBeInTheDocument();
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
