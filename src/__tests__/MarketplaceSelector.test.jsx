import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MarketplaceSelector } from '../components/buy/MarketplaceSelector';

describe('MarketplaceSelector', () => {
  const defaultProps = {
    selectedMarketplace: 'tcgplayer',
    onSelect: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render all marketplace options', () => {
      render(<MarketplaceSelector {...defaultProps} />);
      
      expect(screen.getByText('TCGPlayer')).toBeInTheDocument();
      expect(screen.getByText('Manapool')).toBeInTheDocument();
      expect(screen.getByText('Card Kingdom')).toBeInTheDocument();
    });

    it('should render marketplace icons', () => {
      render(<MarketplaceSelector {...defaultProps} />);
      
      expect(screen.getByText('🔵')).toBeInTheDocument();
      expect(screen.getByText('🟢')).toBeInTheDocument();
      expect(screen.getByText('🟣')).toBeInTheDocument();
    });

    it('should render the label text', () => {
      render(<MarketplaceSelector {...defaultProps} />);
      
      expect(screen.getByText('Select Marketplace:')).toBeInTheDocument();
    });
  });

  describe('selection state', () => {
    it('should show TCGPlayer as selected when selectedMarketplace is tcgplayer', () => {
      render(<MarketplaceSelector {...defaultProps} selectedMarketplace="tcgplayer" />);
      
      const buttons = screen.getAllByRole('button');
      const tcgButton = buttons.find(btn => btn.textContent.includes('TCGPlayer'));
      expect(tcgButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('should show Manapool as selected when selectedMarketplace is manapool', () => {
      render(<MarketplaceSelector {...defaultProps} selectedMarketplace="manapool" />);
      
      const buttons = screen.getAllByRole('button');
      const manapoolButton = buttons.find(btn => btn.textContent.includes('Manapool'));
      expect(manapoolButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('should show Card Kingdom as selected when selectedMarketplace is cardkingdom', () => {
      render(<MarketplaceSelector {...defaultProps} selectedMarketplace="cardkingdom" />);
      
      const buttons = screen.getAllByRole('button');
      const ckButton = buttons.find(btn => btn.textContent.includes('Card Kingdom'));
      expect(ckButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('should set aria-pressed to false for non-selected marketplaces', () => {
      render(<MarketplaceSelector {...defaultProps} selectedMarketplace="tcgplayer" />);
      
      const buttons = screen.getAllByRole('button');
      const manapoolButton = buttons.find(btn => btn.textContent.includes('Manapool'));
      expect(manapoolButton).toHaveAttribute('aria-pressed', 'false');
    });
  });

  describe('click handling', () => {
    it('should call onSelect with tcgplayer when TCGPlayer is clicked', () => {
      const onSelect = vi.fn();
      render(<MarketplaceSelector {...defaultProps} onSelect={onSelect} />);
      
      fireEvent.click(screen.getByText('TCGPlayer'));
      
      expect(onSelect).toHaveBeenCalledWith('tcgplayer');
    });

    it('should call onSelect with manapool when Manapool is clicked', () => {
      const onSelect = vi.fn();
      render(<MarketplaceSelector {...defaultProps} onSelect={onSelect} />);
      
      fireEvent.click(screen.getByText('Manapool'));
      
      expect(onSelect).toHaveBeenCalledWith('manapool');
    });

    it('should call onSelect with cardkingdom when Card Kingdom is clicked', () => {
      const onSelect = vi.fn();
      render(<MarketplaceSelector {...defaultProps} onSelect={onSelect} />);
      
      fireEvent.click(screen.getByText('Card Kingdom'));
      
      expect(onSelect).toHaveBeenCalledWith('cardkingdom');
    });
  });

  describe('remember option', () => {
    it('should not render remember checkbox by default', () => {
      render(<MarketplaceSelector {...defaultProps} />);
      
      expect(screen.queryByText('Remember my choice')).not.toBeInTheDocument();
    });

    it('should render remember checkbox when showRememberOption is true', () => {
      render(<MarketplaceSelector {...defaultProps} showRememberOption />);
      
      expect(screen.getByText('Remember my choice')).toBeInTheDocument();
    });

    it('should show checkbox as unchecked when remember is false', () => {
      render(<MarketplaceSelector {...defaultProps} showRememberOption remember={false} />);
      
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).not.toBeChecked();
    });

    it('should show checkbox as checked when remember is true', () => {
      render(<MarketplaceSelector {...defaultProps} showRememberOption remember />);
      
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeChecked();
    });

    it('should call onRememberChange when checkbox is toggled', () => {
      const onRememberChange = vi.fn();
      render(
        <MarketplaceSelector
          {...defaultProps}
          showRememberOption
          remember={false}
          onRememberChange={onRememberChange}
        />
      );
      
      fireEvent.click(screen.getByRole('checkbox'));
      
      expect(onRememberChange).toHaveBeenCalledWith(true);
    });

    it('should not throw when onRememberChange is not provided', () => {
      render(<MarketplaceSelector {...defaultProps} showRememberOption remember={false} />);
      
      // Should not throw
      expect(() => fireEvent.click(screen.getByRole('checkbox'))).not.toThrow();
    });
  });

  describe('accessibility', () => {
    it('should have button type for all marketplace buttons', () => {
      render(<MarketplaceSelector {...defaultProps} />);
      
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveAttribute('type', 'button');
      });
    });

    it('should have aria-pressed attribute on all buttons', () => {
      render(<MarketplaceSelector {...defaultProps} />);
      
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveAttribute('aria-pressed');
      });
    });
  });
});
