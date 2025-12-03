import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RapidEntryTable } from '../components/RapidEntryTable';

describe('RapidEntryTable Component', () => {
  const mockProps = {
    onAddCard: vi.fn().mockResolvedValue(true),
    allSets: [
      { code: '2X2', name: 'Double Masters 2022' },
      { code: 'CMM', name: 'Commander Masters' }
    ],
    createdFolders: ['Trade', 'Keep', 'Sell'],
    handleSearch: vi.fn(),
    searchResults: [],
    showDropdown: false,
    setShowDropdown: vi.fn(),
    searchIsLoading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the table with initial empty row', () => {
    render(<RapidEntryTable {...mockProps} />);
    
    // Check for input placeholder
    expect(screen.getByPlaceholderText('Search card...')).toBeInTheDocument();
    
    // Check for running totals
    expect(screen.getByText(/Running total:/)).toBeInTheDocument();
    expect(screen.getByText('0 cards')).toBeInTheDocument();
    expect(screen.getByText('$0.00')).toBeInTheDocument();
  });

  it('renders keyboard shortcuts help', () => {
    render(<RapidEntryTable {...mockProps} />);
    
    expect(screen.getByText('Select card')).toBeInTheDocument();
    expect(screen.getByText('Add & new row')).toBeInTheDocument();
    expect(screen.getByText('Next field')).toBeInTheDocument();
    expect(screen.getByText('Clear row')).toBeInTheDocument();
    expect(screen.getByText('Duplicate previous')).toBeInTheDocument();
  });

  it('triggers search when typing in card name', async () => {
    render(<RapidEntryTable {...mockProps} />);
    
    const input = screen.getByPlaceholderText('Search card...');
    fireEvent.change(input, { target: { value: 'Lightning Bolt' } });
    
    expect(mockProps.handleSearch).toHaveBeenCalledWith('Lightning Bolt');
  });

  it('parses quantity from card name input', async () => {
    render(<RapidEntryTable {...mockProps} />);
    
    const input = screen.getByPlaceholderText('Search card...');
    fireEvent.change(input, { target: { value: '4 Lightning Bolt' } });
    
    // The quantity should be parsed
    const qtyInput = screen.getByDisplayValue('4');
    expect(qtyInput).toBeInTheDocument();
    expect(mockProps.handleSearch).toHaveBeenCalledWith('Lightning Bolt');
  });

  it('displays search results dropdown when available', () => {
    const propsWithResults = {
      ...mockProps,
      showDropdown: true,
      searchResults: [
        { name: 'Lightning Bolt', set: '2X2', setName: 'Double Masters 2022', imageUrl: '/test.jpg' },
        { name: 'Lightning Helix', set: 'CMM', setName: 'Commander Masters', imageUrl: '/test2.jpg' },
      ],
    };
    
    render(<RapidEntryTable {...propsWithResults} />);
    
    // Focus the input to show dropdown
    const input = screen.getByPlaceholderText('Search card...');
    fireEvent.focus(input);
    
    expect(screen.getByText('Lightning Bolt')).toBeInTheDocument();
    expect(screen.getByText('Lightning Helix')).toBeInTheDocument();
  });

  it('selects a card from search results', () => {
    const propsWithResults = {
      ...mockProps,
      showDropdown: true,
      searchResults: [
        { name: 'Lightning Bolt', set: '2X2', setName: 'Double Masters 2022', imageUrl: '/test.jpg' },
      ],
    };
    
    render(<RapidEntryTable {...propsWithResults} />);
    
    const input = screen.getByPlaceholderText('Search card...');
    fireEvent.focus(input);
    
    const result = screen.getByText('Lightning Bolt');
    fireEvent.click(result);
    
    expect(mockProps.setShowDropdown).toHaveBeenCalledWith(false);
  });

  it('shows quality dropdown with all options', () => {
    render(<RapidEntryTable {...mockProps} />);
    
    const qualitySelect = screen.getAllByRole('combobox')[1]; // Second select is quality
    
    // Check for all quality options
    expect(screen.getByText('NM')).toBeInTheDocument();
    expect(screen.getByText('LP')).toBeInTheDocument();
    expect(screen.getByText('MP')).toBeInTheDocument();
    expect(screen.getByText('HP')).toBeInTheDocument();
    expect(screen.getByText('DMG')).toBeInTheDocument();
  });

  it('shows folder dropdown with created folders', () => {
    render(<RapidEntryTable {...mockProps} />);
    
    // Check for folder options
    expect(screen.getByText('Unsorted')).toBeInTheDocument();
    expect(screen.getByText('Trade')).toBeInTheDocument();
    expect(screen.getByText('Keep')).toBeInTheDocument();
    expect(screen.getByText('Sell')).toBeInTheDocument();
  });

  it('has foil checkbox that can be toggled', () => {
    render(<RapidEntryTable {...mockProps} />);
    
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();
    
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
  });

  it('clears row when clear button is clicked', async () => {
    render(<RapidEntryTable {...mockProps} />);
    
    const input = screen.getByPlaceholderText('Search card...');
    fireEvent.change(input, { target: { value: 'Test Card' } });
    expect(input).toHaveValue('Test Card');
    
    // Click the clear button (X button)
    const clearButton = screen.getByTitle('Clear row (Escape)');
    fireEvent.click(clearButton);
    
    // Get the input again (it might be a new element)
    const clearedInput = screen.getByPlaceholderText('Search card...');
    expect(clearedInput).toHaveValue('');
  });

  it('updates price input', () => {
    render(<RapidEntryTable {...mockProps} />);
    
    const priceInput = screen.getByPlaceholderText('0.00');
    fireEvent.change(priceInput, { target: { value: '5.99' } });
    expect(priceInput).toHaveValue(5.99);
  });

  it('updates quantity input', () => {
    render(<RapidEntryTable {...mockProps} />);
    
    const qtyInput = screen.getByDisplayValue('1');
    fireEvent.change(qtyInput, { target: { value: '4' } });
    expect(qtyInput).toHaveValue(4);
  });

  it('clears row when Escape key is pressed on price input', async () => {
    render(<RapidEntryTable {...mockProps} />);
    
    const priceInput = screen.getByPlaceholderText('0.00');
    fireEvent.change(priceInput, { target: { value: '5.99' } });
    expect(priceInput).toHaveValue(5.99);
    
    // Press Escape on price input
    fireEvent.keyDown(priceInput, { key: 'Escape', code: 'Escape' });
    
    // After clearing, price should be reset to empty
    await waitFor(() => {
      const clearedPriceInput = screen.getByPlaceholderText('0.00');
      expect(clearedPriceInput).toHaveValue(null);
    });
  });

  it('clears row when Escape key is pressed on foil checkbox', () => {
    render(<RapidEntryTable {...mockProps} />);
    
    const input = screen.getByPlaceholderText('Search card...');
    fireEvent.change(input, { target: { value: 'Test Card' } });
    expect(input).toHaveValue('Test Card');
    
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
    
    // Press Escape on foil checkbox
    fireEvent.keyDown(checkbox, { key: 'Escape', code: 'Escape' });
    
    // After clearing, row should be reset
    const clearedInput = screen.getByPlaceholderText('Search card...');
    expect(clearedInput).toHaveValue('');
  });

  it('clears row when Escape key is pressed on quality dropdown', () => {
    render(<RapidEntryTable {...mockProps} />);
    
    const input = screen.getByPlaceholderText('Search card...');
    fireEvent.change(input, { target: { value: 'Test Card' } });
    
    const qualitySelect = screen.getAllByRole('combobox')[1]; // Second select is quality
    
    // Press Escape on quality dropdown
    fireEvent.keyDown(qualitySelect, { key: 'Escape', code: 'Escape' });
    
    // After clearing, row should be reset
    const clearedInput = screen.getByPlaceholderText('Search card...');
    expect(clearedInput).toHaveValue('');
  });

  it('clears row when Escape key is pressed on folder dropdown', () => {
    render(<RapidEntryTable {...mockProps} />);
    
    const input = screen.getByPlaceholderText('Search card...');
    fireEvent.change(input, { target: { value: 'Test Card' } });
    
    const folderSelect = screen.getAllByRole('combobox')[2]; // Third select is folder
    
    // Press Escape on folder dropdown
    fireEvent.keyDown(folderSelect, { key: 'Escape', code: 'Escape' });
    
    // After clearing, row should be reset
    const clearedInput = screen.getByPlaceholderText('Search card...');
    expect(clearedInput).toHaveValue('');
  });

  it('clears row when Escape key is pressed on set dropdown', () => {
    const propsWithResults = {
      ...mockProps,
      showDropdown: true,
      searchResults: [
        { name: 'Lightning Bolt', set: '2X2', setName: 'Double Masters 2022', imageUrl: '/test.jpg' },
      ],
    };
    
    render(<RapidEntryTable {...propsWithResults} />);
    
    const input = screen.getByPlaceholderText('Search card...');
    fireEvent.focus(input);
    
    // Select a card first so the set dropdown is enabled
    const result = screen.getByText('Lightning Bolt');
    fireEvent.click(result);
    
    // Now find the set dropdown (first combobox after card selection)
    const setSelect = screen.getAllByRole('combobox')[0];
    
    // Press Escape on set dropdown
    fireEvent.keyDown(setSelect, { key: 'Escape', code: 'Escape' });
    
    // After clearing, row should be reset
    const clearedInput = screen.getByPlaceholderText('Search card...');
    expect(clearedInput).toHaveValue('');
  });

  it('handles Ctrl+D on price input for duplicating previous row', () => {
    render(<RapidEntryTable {...mockProps} />);
    
    const priceInput = screen.getByPlaceholderText('0.00');
    
    // Press Ctrl+D on price input (should not throw, even if no previous row)
    fireEvent.keyDown(priceInput, { key: 'd', code: 'KeyD', ctrlKey: true });
    
    // Should not crash - with no previous row, nothing happens
    expect(priceInput).toBeInTheDocument();
  });

  it('row container has tabIndex and can receive keyboard events', () => {
    render(<RapidEntryTable {...mockProps} />);
    
    // The row container should have tabIndex=0
    const rowContainers = document.querySelectorAll('[tabindex="0"]');
    expect(rowContainers.length).toBeGreaterThan(0);
  });

  it('shows shake animation when Shift+Enter is pressed without valid card', async () => {
    render(<RapidEntryTable {...mockProps} />);
    
    const input = screen.getByPlaceholderText('Search card...');
    fireEvent.change(input, { target: { value: 'Test' } });
    
    // Press Shift+Enter without selecting a valid card
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', shiftKey: true });
    
    // The row container should have the animate-shake class
    const rowContainer = input.closest('[tabindex="0"]');
    expect(rowContainer).toHaveClass('animate-shake');
    
    // After 500ms, the class should be removed
    await waitFor(() => {
      expect(rowContainer).not.toHaveClass('animate-shake');
    }, { timeout: 600 });
  });

  it('Shift+Enter only calls onAddCard once (no event bubbling)', async () => {
    const propsWithResults = {
      ...mockProps,
      showDropdown: true,
      searchResults: [
        { name: 'Lightning Bolt', set: '2X2', setName: 'Double Masters 2022', imageUrl: '/test.jpg' },
      ],
    };
    
    render(<RapidEntryTable {...propsWithResults} />);
    
    // Focus and select a card to make the row "valid"
    const input = screen.getByPlaceholderText('Search card...');
    fireEvent.focus(input);
    
    const result = screen.getByText('Lightning Bolt');
    fireEvent.click(result);
    
    // Find the quantity input (a focused element after card selection)
    const qtyInput = screen.getByDisplayValue('1');
    
    // Press Shift+Enter on the qty input - should only call onAddCard once
    fireEvent.keyDown(qtyInput, { key: 'Enter', code: 'Enter', shiftKey: true });
    
    // Wait for the async onAddCard to complete
    await waitFor(() => {
      // onAddCard should have been called exactly once, not twice
      expect(mockProps.onAddCard).toHaveBeenCalledTimes(1);
    });
    
    // Verify the correct card data was passed
    expect(mockProps.onAddCard).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Lightning Bolt',
        set: '2X2',
      })
    );
  });
});
