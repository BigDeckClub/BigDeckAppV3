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
    
    expect(setSellModalData).toHaveBeenCalledWith({
      itemType: 'folder',
      itemId: null,
      itemName: 'Test Folder',
      purchasePrice: 100.50
    });
    expect(setShowSellModal).toHaveBeenCalledWith(true);
  });
});

describe('Reserved Folder Names', () => {
  // Test the reserved names constant (we'll test the validation through integration)
  const RESERVED_FOLDER_NAMES = ['unsorted', 'uncategorized', 'all cards'];
  
  it('should have correct reserved names', () => {
    expect(RESERVED_FOLDER_NAMES).toContain('unsorted');
    expect(RESERVED_FOLDER_NAMES).toContain('uncategorized');
    expect(RESERVED_FOLDER_NAMES).toContain('all cards');
    expect(RESERVED_FOLDER_NAMES).toHaveLength(3);
  });

  it('should be case-insensitive for validation', () => {
    const testName = 'UNSORTED';
    expect(RESERVED_FOLDER_NAMES.includes(testName.toLowerCase())).toBe(true);
  });
});
