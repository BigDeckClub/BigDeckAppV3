import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InventoryTab } from '../components/InventoryTab';

// Mock inventory data with multiple sets for a card
const mockInventory = [
  {
    id: '1',
    name: 'Lightning Bolt',
    set: 'TLE',
    set_name: 'Tales of the Living End',
    quantity: 4,
    purchase_date: '2024-01-15',
    purchase_price: '2.50',
    reorder_type: 'normal',
    folder: 'Uncategorized'
  },
  {
    id: '2',
    name: 'Lightning Bolt',
    set: 'CLU',
    set_name: 'Cluedo',
    quantity: 2,
    purchase_date: '2024-01-20',
    purchase_price: '1.75',
    reorder_type: 'normal',
    folder: 'Uncategorized'
  },
  {
    id: '3',
    name: 'Counterspell',
    set: 'EOC',
    set_name: 'Edge of Chaos',
    quantity: 3,
    purchase_date: '2024-02-01',
    purchase_price: '1.00',
    reorder_type: 'normal',
    folder: 'Uncategorized'
  }
];

const defaultProps = {
  inventory: mockInventory,
  successMessage: '',
  setSuccessMessage: vi.fn(),
  newEntry: {},
  setNewEntry: vi.fn(),
  selectedCardSets: [],
  allSets: [],
  defaultSearchSet: '',
  setDefaultSearchSet: vi.fn(),
  searchQuery: '',
  setSearchQuery: vi.fn(),
  searchResults: [],
  showDropdown: false,
  setShowDropdown: vi.fn(),
  selectCard: vi.fn(),
  addCard: vi.fn(),
  expandedCards: {},
  setExpandedCards: vi.fn(),
  editingId: null,
  editForm: {},
  setEditForm: vi.fn(),
  startEditingItem: vi.fn(),
  updateInventoryItem: vi.fn(),
  deleteInventoryItem: vi.fn(),
  handleSearch: vi.fn()
};

describe('InventoryTab', () => {
  it('renders card tiles in the grid', () => {
    render(<InventoryTab {...defaultProps} />);
    
    // Should render both card names
    expect(screen.getByText('Lightning Bolt')).toBeInTheDocument();
    expect(screen.getByText('Counterspell')).toBeInTheDocument();
  });

  it('card tiles should be inside a grid container', () => {
    const { container } = render(<InventoryTab {...defaultProps} />);
    
    // Find the grid container with the specific classes
    const gridContainer = container.querySelector('.grid.grid-cols-3');
    expect(gridContainer).toBeInTheDocument();
    
    // The card tiles should be direct children of the grid
    const cardTiles = gridContainer.querySelectorAll('[class*="bg-gradient-to-br"]');
    expect(cardTiles.length).toBe(2); // Lightning Bolt and Counterspell
  });

  it('expanded content renders outside the grid when a card is clicked', () => {
    // Start with Lightning Bolt expanded
    const propsWithExpanded = {
      ...defaultProps,
      expandedCards: { 'Lightning Bolt': true }
    };
    
    const { container } = render(<InventoryTab {...propsWithExpanded} />);
    
    // Find the expanded content - should have the card name header
    const expandedHeader = screen.getByText('Lightning Bolt', { selector: 'h4' });
    expect(expandedHeader).toBeInTheDocument();
    
    // The expanded content should NOT be inside the grid
    const gridContainer = container.querySelector('.grid.grid-cols-3');
    
    // Get the expanded content container (has the close button)
    const closeButton = screen.getByText('✕ Close');
    const expandedContent = closeButton.closest('[class*="border-t"]');
    
    // Verify expanded content is NOT inside the grid
    expect(gridContainer.contains(expandedContent)).toBe(false);
  });

  it('shows set boxes in expanded content at full width', () => {
    const propsWithExpanded = {
      ...defaultProps,
      expandedCards: { 'Lightning Bolt': true }
    };
    
    const { container } = render(<InventoryTab {...propsWithExpanded} />);
    
    // Should show both set codes for Lightning Bolt
    expect(screen.getByText('TLE')).toBeInTheDocument();
    expect(screen.getByText('CLU')).toBeInTheDocument();
    
    // The set boxes should be in a 2-column grid layout
    const expandedSetGrid = container.querySelector('.grid.grid-cols-1.md\\:grid-cols-2');
    expect(expandedSetGrid).toBeInTheDocument();
  });

  it('clicking a different card updates the expanded state', () => {
    const setExpandedCards = vi.fn();
    const props = {
      ...defaultProps,
      setExpandedCards
    };
    
    render(<InventoryTab {...props} />);
    
    // Click on Lightning Bolt card
    const lightningBoltCard = screen.getByText('Lightning Bolt');
    fireEvent.click(lightningBoltCard);
    
    // setExpandedCards should be called with Lightning Bolt expanded
    expect(setExpandedCards).toHaveBeenCalledWith(
      expect.objectContaining({ 'Lightning Bolt': true })
    );
  });

  it('list view renders expanded content inline', () => {
    // Set up list view with expanded card
    const propsWithListAndExpanded = {
      ...defaultProps,
      expandedCards: { 'Lightning Bolt': true }
    };
    
    const { container } = render(<InventoryTab {...propsWithListAndExpanded} />);
    
    // Switch to list view by clicking the list view button
    const listViewButton = screen.getByTitle('List View');
    fireEvent.click(listViewButton);
    
    // In list view, expanded content should still show properly
    // The component re-renders with the list view
  });

  it('close button collapses expanded content', () => {
    const setExpandedCards = vi.fn();
    const propsWithExpanded = {
      ...defaultProps,
      expandedCards: { 'Lightning Bolt': true },
      setExpandedCards
    };
    
    render(<InventoryTab {...propsWithExpanded} />);
    
    // Find and click the close button
    const closeButton = screen.getByText('✕ Close');
    fireEvent.click(closeButton);
    
    // setExpandedCards should be called with Lightning Bolt collapsed
    expect(setExpandedCards).toHaveBeenCalledWith(
      expect.objectContaining({ 'Lightning Bolt': false })
    );
  });
});
