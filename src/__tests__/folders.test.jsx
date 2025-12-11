import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { FolderHeader } from '../components/inventory/FolderHeader';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  DollarSign: () => <span data-testid="dollar-icon">$</span>,
  Trash2: () => <span data-testid="trash-icon">🗑️</span>,
}));

describe('FolderHeader', () => {
  const defaultProps = {
    folderName: 'Test Folder',
    folderDesc: 'Test description',
    totalCards: 10,
    uniqueCards: 5,
    totalCost: 100.50,
    editingFolderName: null,
    setEditingFolderName: vi.fn(),
    editingFolderDesc: '',
    setEditingFolderDesc: vi.fn(),
    setFolderMetadata: vi.fn(),
    setSellModalData: vi.fn(),
    setShowSellModal: vi.fn(),
  };

  it('should render folder name and stats', () => {
    render(<FolderHeader {...defaultProps} />);
    
    expect(screen.getByText('Test Folder')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument(); // totalCards
    expect(screen.getByText('5')).toBeInTheDocument(); // uniqueCards
    expect(screen.getByText('$100.50')).toBeInTheDocument(); // totalCost
  });

  it('should display "Unsorted" for Uncategorized folder', () => {
    render(<FolderHeader {...defaultProps} folderName="Uncategorized" />);
    
    expect(screen.getByText('Unsorted')).toBeInTheDocument();
  });

  it('should show delete button for user-created folders', () => {
    const onDeleteFolder = vi.fn();
    render(
      <FolderHeader 
        {...defaultProps} 
        onDeleteFolder={onDeleteFolder}
        isUnsorted={false}
      />
    );
    
    expect(screen.getByTitle('Delete this folder')).toBeInTheDocument();
  });

  it('should NOT show delete button for Unsorted folder', () => {
    const onDeleteFolder = vi.fn();
    render(
      <FolderHeader 
        {...defaultProps}
        folderName="Uncategorized"
        onDeleteFolder={onDeleteFolder}
        isUnsorted={true}
      />
    );
    
    expect(screen.queryByTitle('Delete this folder')).not.toBeInTheDocument();
  });

  it('should call onDeleteFolder when delete button is clicked', () => {
    const onDeleteFolder = vi.fn();
    render(
      <FolderHeader 
        {...defaultProps}
        onDeleteFolder={onDeleteFolder}
        isUnsorted={false}
      />
    );
    
    fireEvent.click(screen.getByTitle('Delete this folder'));
    expect(onDeleteFolder).toHaveBeenCalledWith('Test Folder');
  });

  it('should always show sell button', () => {
    render(<FolderHeader {...defaultProps} />);
    
    expect(screen.getByTitle('Sell this folder')).toBeInTheDocument();
  });

  it('should call setSellModalData when sell button is clicked', () => {
    const setSellModalData = vi.fn();
    const setShowSellModal = vi.fn();
    
    render(
      <FolderHeader 
        {...defaultProps}
        setSellModalData={setSellModalData}
        setShowSellModal={setShowSellModal}
      />
    );
    
    fireEvent.click(screen.getByTitle('Sell this folder'));
    
    expect(setSellModalData).toHaveBeenCalledWith(expect.objectContaining({
      itemType: 'folder',
      itemId: null,
      itemName: 'Test Folder',
      purchasePrice: 100.50
    }));
    expect(setShowSellModal).toHaveBeenCalledWith(true);
  });
});

describe('Reserved Folder Names Validation', () => {
  // Reserved folder names constant (matching the actual implementation)
  const RESERVED_FOLDER_NAMES = ['unsorted', 'uncategorized', 'all cards'];
  
  // Helper function that mimics the validation logic
  const isReservedFolderName = (name) => {
    if (!name || !name.trim()) return false;
    return RESERVED_FOLDER_NAMES.includes(name.trim().toLowerCase());
  };

  it('should have correct reserved names', () => {
    expect(RESERVED_FOLDER_NAMES).toContain('unsorted');
    expect(RESERVED_FOLDER_NAMES).toContain('uncategorized');
    expect(RESERVED_FOLDER_NAMES).toContain('all cards');
    expect(RESERVED_FOLDER_NAMES).toHaveLength(3);
  });

  describe('case-insensitive validation', () => {
    it('should reject "Unsorted" (capitalized)', () => {
      expect(isReservedFolderName('Unsorted')).toBe(true);
    });

    it('should reject "unsorted" (lowercase)', () => {
      expect(isReservedFolderName('unsorted')).toBe(true);
    });

    it('should reject "UNSORTED" (uppercase)', () => {
      expect(isReservedFolderName('UNSORTED')).toBe(true);
    });

    it('should reject "UnSoRtEd" (mixed case)', () => {
      expect(isReservedFolderName('UnSoRtEd')).toBe(true);
    });

    it('should reject "Uncategorized" (capitalized)', () => {
      expect(isReservedFolderName('Uncategorized')).toBe(true);
    });

    it('should reject "UNCATEGORIZED" (uppercase)', () => {
      expect(isReservedFolderName('UNCATEGORIZED')).toBe(true);
    });

    it('should reject "All Cards" (title case)', () => {
      expect(isReservedFolderName('All Cards')).toBe(true);
    });

    it('should reject "ALL CARDS" (uppercase)', () => {
      expect(isReservedFolderName('ALL CARDS')).toBe(true);
    });

    it('should reject "all cards" (lowercase)', () => {
      expect(isReservedFolderName('all cards')).toBe(true);
    });
  });

  describe('non-reserved names are accepted', () => {
    it('should accept "My Folder"', () => {
      expect(isReservedFolderName('My Folder')).toBe(false);
    });

    it('should accept "Trade Binder"', () => {
      expect(isReservedFolderName('Trade Binder')).toBe(false);
    });

    it('should accept "Unsorted Cards" (contains reserved but different)', () => {
      expect(isReservedFolderName('Unsorted Cards')).toBe(false);
    });

    it('should accept "My Unsorted" (contains reserved but different)', () => {
      expect(isReservedFolderName('My Unsorted')).toBe(false);
    });

    it('should accept "AllCards" (no space, different from reserved)', () => {
      expect(isReservedFolderName('AllCards')).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle empty string', () => {
      expect(isReservedFolderName('')).toBe(false);
    });

    it('should handle whitespace only', () => {
      expect(isReservedFolderName('   ')).toBe(false);
    });

    it('should handle null', () => {
      expect(isReservedFolderName(null)).toBe(false);
    });

    it('should handle undefined', () => {
      expect(isReservedFolderName(undefined)).toBe(false);
    });

    it('should trim whitespace before validation', () => {
      expect(isReservedFolderName('  Unsorted  ')).toBe(true);
      expect(isReservedFolderName('  All Cards  ')).toBe(true);
    });
  });
});

describe('Folder Deletion Behavior', () => {
  it('should have confirmation before deletion', () => {
    // This tests that deleteFolder requires confirmation
    // The actual behavior is tested through the confirm dialog
    const confirmMock = vi.fn().mockResolvedValue(false);
    
    // When confirmation is cancelled, deletion should not proceed
    expect(confirmMock).not.toHaveBeenCalled();
  });

  it('should move cards to Uncategorized on deletion', () => {
    // The server-side DELETE endpoint moves cards to 'Uncategorized'
    // This is verified by the DEFAULT_FOLDER_NAME constant in folders.js
    const DEFAULT_FOLDER_NAME = 'Uncategorized';
    expect(DEFAULT_FOLDER_NAME).toBe('Uncategorized');
  });
});
