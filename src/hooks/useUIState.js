import { useState, useCallback } from 'react';

/**
 * useUIState - Manages UI-related state for inventory view
 * Extracted from useInventoryState for better separation of concerns
 */
export function useUIState() {
  // View settings
  const [viewMode, setViewMode] = useState('image');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [inventorySearch, setInventorySearch] = useState('');

  // Folder state
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [editingFolderName, setEditingFolderName] = useState(null);
  const [editingFolderDesc, setEditingFolderDesc] = useState('');
  const [folderMetadata, setFolderMetadata] = useState({});

  // Modal state
  const [showSellModal, setShowSellModal] = useState(false);
  const [sellModalData, setSellModalData] = useState(null);

  // Open sell modal with data
  const openSellModal = useCallback((data) => {
    setSellModalData(data);
    setShowSellModal(true);
  }, []);

  // Close sell modal
  const closeSellModal = useCallback(() => {
    setShowSellModal(false);
    setSellModalData(null);
  }, []);

  // Toggle sidebar
  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  // Start editing folder
  const startEditingFolder = useCallback((folderName, description = '') => {
    setEditingFolderName(folderName);
    setEditingFolderDesc(description);
  }, []);

  // Cancel editing folder
  const cancelEditingFolder = useCallback(() => {
    setEditingFolderName(null);
    setEditingFolderDesc('');
  }, []);

  return {
    // View settings
    viewMode,
    setViewMode,
    sidebarOpen,
    setSidebarOpen,
    toggleSidebar,
    inventorySearch,
    setInventorySearch,

    // Folder state
    selectedFolder,
    setSelectedFolder,
    newFolderName,
    setNewFolderName,
    showCreateFolder,
    setShowCreateFolder,
    editingFolderName,
    setEditingFolderName,
    editingFolderDesc,
    setEditingFolderDesc,
    folderMetadata,
    setFolderMetadata,
    startEditingFolder,
    cancelEditingFolder,

    // Modal state
    showSellModal,
    setShowSellModal,
    sellModalData,
    setSellModalData,
    openSellModal,
    closeSellModal
  };
}

export default useUIState;
