import { useState, useEffect, useCallback } from 'react';
import { useToast, TOAST_TYPES } from '../context/ToastContext';

/**
 * useFolderOperations - Custom hook for folder-related operations
 * Extracted from InventoryTab for better code organization
 */
export function useFolderOperations({ inventory, onLoadInventory }) {
  const { showToast } = useToast();
  
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
      const response = await fetch('/api/folders');
      if (response.ok) {
        const data = await response.json();
        setCreatedFolders(data.map(f => f.name));
      }
    } catch (error) {
      // Error handled silently
    }
  }, []);

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  // Add a new folder and persist to server
  const addCreatedFolder = useCallback(async (folderName) => {
    const trimmedName = folderName.trim();
    if (!trimmedName) return;
    
    if (createdFolders.includes(trimmedName)) {
      showToast('A folder with this name already exists', TOAST_TYPES.ERROR);
      return;
    }
    
    try {
      const response = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedName })
      });
      
      if (response.ok) {
        const data = await response.json();
        setCreatedFolders(prev => [...prev, data.name || trimmedName]);
        setOpenFolders(prev => [...prev, trimmedName]);
      } else {
        showToast('Failed to create folder', TOAST_TYPES.ERROR);
      }
    } catch (error) {
      showToast(`Error creating folder: ${error.message}`, TOAST_TYPES.ERROR);
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
      
      // Show the change immediately
      showToast(`Moved ${item.quantity}x ${item.name} to ${targetFolder}`, TOAST_TYPES.SUCCESS);
      
      // Update API
      const response = await fetch(`/api/inventory/${itemId}`, {
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
    } catch (error) {
      showToast(`Error moving item: ${error.message}`, TOAST_TYPES.ERROR);
    }
  }, [inventory, onLoadInventory, showToast]);

  // Move cards to folder via drag-drop (with optimistic updates)
  const moveCardToFolder = useCallback(async (cardName, targetFolder) => {
    try {
      const cardItems = inventory.filter(item => item.name === cardName);
      if (cardItems.length === 0) {
        showToast('Card not found', TOAST_TYPES.ERROR);
        return;
      }
      
      // Show the change immediately
      showToast(`Moved "${cardName}" to ${targetFolder}`, TOAST_TYPES.SUCCESS);
      
      // Update API in the background
      for (const item of cardItems) {
        const response = await fetch(`/api/inventory/${item.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folder: targetFolder })
        });
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to update folder');
        }
      }
      
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
    closeFolderTab
  };
}

export default useFolderOperations;
