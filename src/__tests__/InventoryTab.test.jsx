import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { InventoryTab } from '../components/InventoryTab';
import { PriceCacheProvider } from '../context/PriceCacheContext';

// Wrap component with required providers
const renderWithProviders = (component) => {
  return render(
    <PriceCacheProvider>
      {component}
    </PriceCacheProvider>
  );
};

// Mock fetch for API calls
beforeEach(() => {
  global.fetch = vi.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve([]),
    })
  );
  // Mock localStorage
  const localStorageMock = {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  };
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// Default props for InventoryTab
const defaultProps = {
  inventory: [],
  successMessage: '',
  setSuccessMessage: vi.fn(),
  newEntry: { name: '', set: '', quantity: 1, condition: 'Near Mint', folder: '', language: 'English' },
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
  handleSearch: vi.fn(),
  deckRefreshTrigger: 0,
  onLoadInventory: vi.fn(),
};

describe('InventoryTab Folder Tabs', () => {
  it('renders All Cards tab by default', async () => {
    renderWithProviders(<InventoryTab {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('All Cards')).toBeInTheDocument();
    });
  });

  it('should not display folder tabs when no folders are open', async () => {
    // Create inventory with a folder
    const inventoryWithFolder = [
      { id: 1, name: 'Test Card', set_code: 'TST', quantity: 1, folder: 'Test Folder' }
    ];
    
    renderWithProviders(<InventoryTab {...defaultProps} inventory={inventoryWithFolder} />);
    
    await waitFor(() => {
      // The folder should exist in the sidebar but not as a tab in the tab bar
      // since no folders are open by default
      expect(screen.getByText('All Cards')).toBeInTheDocument();
    });
    
    // Verify the folder tab is not rendered (📁 prefix indicates tab bar)
    const folderTabs = screen.queryAllByText(/📁 Test Folder/);
    expect(folderTabs.length).toBe(0);
  });

  it('opens folder tab when clicking folder in sidebar', async () => {
    // Create inventory with a folder
    const inventoryWithFolder = [
      { id: 1, name: 'Test Card', set_code: 'TST', quantity: 1, folder: 'MyFolder' }
    ];
    
    renderWithProviders(<InventoryTab {...defaultProps} inventory={inventoryWithFolder} />);
    
    // Wait for the component to render
    await waitFor(() => {
      expect(screen.getByText('All Cards')).toBeInTheDocument();
    });
    
    // Find the sidebar folder button and click it
    const sidebarButtons = screen.getAllByText('MyFolder');
    // The first one should be in the sidebar
    if (sidebarButtons.length > 0) {
      fireEvent.click(sidebarButtons[0]);
      
      // After clicking, the folder tab should appear in the tab bar
      await waitFor(() => {
        const folderTabs = screen.getAllByText(/📁 MyFolder/);
        expect(folderTabs.length).toBeGreaterThan(0);
      });
    }
  });

  it('closes folder tab when clicking close button', async () => {
    // Create inventory with a folder
    const inventoryWithFolder = [
      { id: 1, name: 'Test Card', set_code: 'TST', quantity: 1, folder: 'CloseTestFolder' }
    ];
    
    renderWithProviders(<InventoryTab {...defaultProps} inventory={inventoryWithFolder} />);
    
    // Wait for the component to render
    await waitFor(() => {
      expect(screen.getByText('All Cards')).toBeInTheDocument();
    });
    
    // Find the sidebar folder button and click it to open the tab
    const sidebarButtons = screen.getAllByText('CloseTestFolder');
    if (sidebarButtons.length > 0) {
      fireEvent.click(sidebarButtons[0]);
      
      // Wait for the folder tab to appear
      await waitFor(() => {
        const folderTabs = screen.getAllByText(/📁 CloseTestFolder/);
        expect(folderTabs.length).toBeGreaterThan(0);
      });
      
      // Find and click the close button (X icon in the tab bar)
      const closeButton = screen.getByTitle('Close folder');
      fireEvent.click(closeButton);
      
      // After clicking close, the folder tab should disappear
      await waitFor(() => {
        const folderTabs = screen.queryAllByText(/📁 CloseTestFolder/);
        expect(folderTabs.length).toBe(0);
      });
    }
  });
});
