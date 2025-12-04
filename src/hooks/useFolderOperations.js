import { useState, useEffect, useCallback, useContext } from 'react';
import { useToast, TOAST_TYPES } from '../context/ToastContext';
import { fetchWithAuth } from '../utils/apiClient';
import UndoContext, { UNDO_ACTION_TYPES } from '../context/UndoContext';

// Reserved folder names that cannot be created by users (case-insensitive)
const RESERVED_FOLDER_NAMES = ['unsorted', 'uncategorized', 'all cards', 'all', 'trash'];

/**
 * Hook to safely get undo context (returns null if not available)
 */
function useUndoSafe() {
  return useContext(UndoContext);
}

/**
 * useFolderOperations - Custom hook for folder-related operations
 * Extracted from InventoryTab for better code organization
 */
export function useFolderOperations({ inventory, onLoadInventory }) {
  const { showToast } = useToast();
  const undoContext = useUndoSafe();
  
  // Folder state
  const [newFolderName, setNewFolderName] = useState('');
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [createdFolders, setCreatedFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [openFolders, setOpenFolders] = useState([]);
  const [folderMetadata, setFolderMetadata] = useState({});
  const [editingFolderName, setEditingFolderName] = useState(null);
  const [editingFolderDesc, setEditingFolderDesc] = useState('');

  // Load created folders from server
  const loadFolders = useCallback(async () => {
    try {
      const response = await fetchWithAuth('/api/folders');
      if (response.ok) {
        const data = await response.json();
        setCreatedFolders(data.map(f => f.name));
      }
    } catch (error) {
      console.error('Error loading folders:', error);
      showToast('Error loading folders', TOAST_TYPES.ERROR);
    }
  }, [showToast]);

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  // Add a new folder and persist to server
  // Returns true on success, false on failure
  const addCreatedFolder = useCallback(async (folderName) => {
    const trimmedName = folderName.trim();
    if (!trimmedName) return false;
    
    // Check for reserved folder names (case-insensitive)
    if (RESERVED_FOLDER_NAMES.includes(trimmedName.toLowerCase())) {
      showToast(`"${trimmedName}" is a reserved folder name`, TOAST_TYPES.ERROR);
      return false;
    }
    
    if (createdFolders.includes(trimmedName)) {
      showToast('A folder with this name already exists', TOAST_TYPES.ERROR);
      return false;
    }
    
    try {
      const response = await fetchWithAuth('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedName })
      });
      
      if (response.ok) {
        const data = await response.json();
        const actualName = data.name || trimmedName;
        setCreatedFolders(prev => [...prev, actualName]);
        setOpenFolders(prev => [...prev, actualName]);
        showToast(`Folder "${actualName}" created!`, TOAST_TYPES.SUCCESS);
        return true;
      } else {
        showToast('Failed to create folder', TOAST_TYPES.ERROR);
        return false;
      }
    } catch (error) {
      showToast(`Error creating folder: ${error.message}`, TOAST_TYPES.ERROR);
      return false;
    }
  }, [showToast, createdFolders]);

  // Move a single inventory item to folder
  const moveInventoryItemToFolder = useCallback(async (itemId, targetFolder) => {
    try {
      const item = inventory.find(i => i.id === itemId);
      if (!item) {
        showToast('Item not found', TOAST_TYPES.ERROR);
        return;
      }

      const previousFolder = item.folder || 'Uncategorized';
      const itemName = item.name;
      
      // Update API first
      const response = await fetchWithAuth(`/api/inventory/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder: targetFolder })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update folder');
      }
      
      // Refresh inventory to show changes
      if (onLoadInventory) {
        await onLoadInventory();
      }

      // Register undo action if undo context is available
      if (undoContext?.registerAction) {
        undoContext.registerAction({
          type: UNDO_ACTION_TYPES.MOVE_TO_FOLDER,
          description: `Moved ${itemName} to ${targetFolder}`,
          data: { itemId, previousFolder, targetFolder, itemName },
          undoFn: async () => {
            const undoResponse = await fetchWithAuth(`/api/inventory/${itemId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ folder: previousFolder })
            });
            if (!undoResponse.ok) {
              throw new Error('Failed to undo move');
            }
            if (onLoadInventory) {
              await onLoadInventory();
            }
          },
          redoFn: async () => {
            const redoResponse = await fetchWithAuth(`/api/inventory/${itemId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ folder: targetFolder })
            });
            if (!redoResponse.ok) {
              throw new Error('Failed to redo move');
            }
            if (onLoadInventory) {
              await onLoadInventory();
            }
          },
        });
      } else {
        // Show success toast after API call succeeds (only if no undo context)
        showToast(`Moved ${item.quantity}x ${itemName} to ${targetFolder}`, TOAST_TYPES.SUCCESS);
      }
    } catch (error) {
      showToast(`Error moving item: ${error.message}`, TOAST_TYPES.ERROR);
    }
  }, [inventory, onLoadInventory, showToast, undoContext]);

  // Move cards to folder via drag-drop
  const moveCardToFolder = useCallback(async (cardName, targetFolder) => {
    try {
      const cardItems = inventory.filter(item => item.name === cardName);
      if (cardItems.length === 0) {
        showToast('Card not found', TOAST_TYPES.ERROR);
        return;
      }
      
      // Update API in the background
      for (const item of cardItems) {
        const response = await fetchWithAuth(`/api/inventory/${item.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folder: targetFolder })
        });
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to update folder');
        }
      }
      
      // Show success toast after all API calls complete
      showToast(`Moved "${cardName}" to ${targetFolder}`, TOAST_TYPES.SUCCESS);
      
      // Refresh inventory to show changes
      if (onLoadInventory) {
        await onLoadInventory();
      }
    } catch (error) {
      showToast(`Error moving card: ${error.message}`, TOAST_TYPES.ERROR);
    }
  }, [inventory, onLoadInventory, showToast]);

  // Open a folder in a new tab
  const openFolderTab = useCallback((folderName) => {
    if (!openFolders.includes(folderName)) {
      setOpenFolders(prev => [...prev, folderName]);
    }
  }, [openFolders]);

  // Close a folder tab
  const closeFolderTab = useCallback((folderName, activeTab, setActiveTab) => {
    setOpenFolders(prev => prev.filter(f => f !== folderName));
    if (activeTab === folderName) {
      setActiveTab('all');
    }
    if (selectedFolder === folderName) {
      setSelectedFolder(null);
    }
  }, [selectedFolder]);

  // Delete a folder
  const deleteFolder = useCallback(async (folderName, activeTab, setActiveTab) => {
    try {
      const response = await fetchWithAuth(`/api/folders/${encodeURIComponent(folderName)}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setCreatedFolders(prev => prev.filter(f => f !== folderName));
        closeFolderTab(folderName, activeTab, setActiveTab);
        showToast(`Folder "${folderName}" deleted`, TOAST_TYPES.SUCCESS);
        return true;
      } else {
        showToast('Failed to delete folder', TOAST_TYPES.ERROR);
        return false;
      }
    } catch (error) {
      showToast(`Error deleting folder: ${error.message}`, TOAST_TYPES.ERROR);
      return false;
    }
  }, [closeFolderTab, showToast, setCreatedFolders]);

  return {
    // State
    newFolderName,
    setNewFolderName,
    showCreateFolder,
    setShowCreateFolder,
    createdFolders,
    selectedFolder,
    setSelectedFolder,
    openFolders,
    setOpenFolders,
    folderMetadata,
    setFolderMetadata,
    editingFolderName,
    setEditingFolderName,
    editingFolderDesc,
    setEditingFolderDesc,
    
    // Operations
    loadFolders,
    addCreatedFolder,
    moveInventoryItemToFolder,
    moveCardToFolder,
    openFolderTab,
    closeFolderTab,
    deleteFolder
  };
}

export default useFolderOperations;
