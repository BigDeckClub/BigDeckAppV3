import { useState, useCallback } from 'react';

/**
 * useTabState - Manages tab navigation state for inventory view
 * Extracted from useInventoryState for better separation of concerns
 */
export function useTabState() {
  const [activeTab, setActiveTab] = useState('all');
  const [openDecks, setOpenDecks] = useState([]);
  const [openFolders, setOpenFolders] = useState([]);
  const [draggedTabData, setDraggedTabData] = useState(null);

  // Tab reordering
  const reorderTabs = useCallback((sourceType, sourceIndex, destIndex) => {
    if (sourceIndex === destIndex) return;
    if (sourceType === 'folder') {
      setOpenFolders(prev => {
        const newFolders = [...prev];
        const [moved] = newFolders.splice(sourceIndex, 1);
        newFolders.splice(destIndex, 0, moved);
        return newFolders;
      });
    } else if (sourceType === 'deck') {
      setOpenDecks(prev => {
        const newDecks = [...prev];
        const [moved] = newDecks.splice(sourceIndex, 1);
        newDecks.splice(destIndex, 0, moved);
        return newDecks;
      });
    }
  }, []);

  // Folder tab management
  const openFolderTab = useCallback((folderName) => {
    setOpenFolders(prev => {
      if (!prev.includes(folderName)) {
        return [...prev, folderName];
      }
      return prev;
    });
    setActiveTab(folderName);
  }, []);

  const closeFolderTab = useCallback((folderName) => {
    setOpenFolders(prev => prev.filter(f => f !== folderName));
    setActiveTab(prev => prev === folderName ? 'all' : prev);
  }, []);

  // Deck tab management
  const openDeckTab = useCallback((deckId) => {
    setOpenDecks(prev => {
      if (!prev.includes(deckId)) {
        return [...prev, deckId];
      }
      return prev;
    });
    setActiveTab(`deck-${deckId}`);
  }, []);

  const closeDeckTab = useCallback((deckId) => {
    setOpenDecks(prev => prev.filter(id => id !== deckId));
    setActiveTab(prev => prev === `deck-${deckId}` ? 'all' : prev);
  }, []);

  return {
    // State
    activeTab,
    setActiveTab,
    openDecks,
    setOpenDecks,
    openFolders,
    setOpenFolders,
    draggedTabData,
    setDraggedTabData,

    // Actions
    reorderTabs,
    openFolderTab,
    closeFolderTab,
    openDeckTab,
    closeDeckTab
  };
}

export default useTabState;
