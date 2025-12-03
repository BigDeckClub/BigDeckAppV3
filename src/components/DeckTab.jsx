import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { BookOpen, Download } from 'lucide-react';
import { useDeckOperations } from '../hooks/useDeckOperations';
import { useArchidektImport } from '../hooks/useArchidektImport';
import {
  DeckCard,
  DeckDetailsView,
  ImportArchidektModal,
  ImportDecklistModal,
  CopyToDeckModal
} from './decks';


export const DeckTab = ({ onDeckCreatedOrDeleted, onInventoryUpdate }) => {
  // Import modals visibility state
  const [showImportDecklist, setShowImportDecklist] = useState(false);
  const [showImportArchidekt, setShowImportArchidekt] = useState(false);
  
  // Decklist import form state
  const [newDeckName, setNewDeckName] = useState('');
  const [newDeckFormat, setNewDeckFormat] = useState('Standard');
  const [deckListText, setDeckListText] = useState('');
  const [inventoryByName, setInventoryByName] = useState({});

  // Deck operations hook
  const {
    decks,
    isLoading,
    selectedDeck,
    setSelectedDeck,
    editingDeck,
    setEditingDeck,
    successMessage,
    showCopyModal,
    copyingDeck,
    copyDeckName,
    setCopyDeckName,
    isCopying,
    loadDecks,
    deleteDeck,
    updateDeckName,
    updateDeckDescription,
    importFromTextDeck,
    previewCopyToDeck,
    executeCopyToDeck,
    cancelCopyToDeck
  } = useDeckOperations({ onDeckCreatedOrDeleted, onInventoryUpdate });

  // Archidekt import hook
  const {
    archidektUrl,
    setArchidektUrl,
    isImporting,
    importFromArchidekt,
    resetImport
  } = useArchidektImport({
    onSuccess: () => {
      loadDecks();
      setShowImportArchidekt(false);
    },
    onInventoryUpdate
  });

  // Reusable function to load inventory mapping (name -> available quantity)
  const refreshInventoryMap = useCallback(async () => {
    try {
      const res = await fetch('/api/inventory');
      if (!res.ok) return;
      const items = await res.json();
      const map = {};
      (items || []).forEach(i => {
        const key = (i.name || '').toLowerCase().trim();
        const qty = (parseInt(i.quantity || 0) || 0) - (parseInt(i.reserved_quantity || 0) || 0);
        map[key] = (map[key] || 0) + Math.max(0, qty);
      });
      setInventoryByName(map);
    } catch (err) {
      // ignore
    }
  }, []);

  // Load inventory mapping on mount
  useEffect(() => {
    refreshInventoryMap();
  }, [refreshInventoryMap]);

  // Handle text deck import
  const handleImportFromText = async () => {
    const success = await importFromTextDeck(newDeckName, newDeckFormat, deckListText);
    if (success) {
      setNewDeckName('');
      setDeckListText('');
      setNewDeckFormat('Standard');
      setShowImportDecklist(false);
    }
  };

  // Handle cancel text import
  const handleCancelTextImport = () => {
    setShowImportDecklist(false);
    setNewDeckName('');
    setDeckListText('');
    setNewDeckFormat('Standard');
  };

  // Handle cancel Archidekt import
  const handleCancelArchidektImport = () => {
    setShowImportArchidekt(false);
    resetImport();
  };

  return (
    <div className="flex-1">
      {successMessage && (
        <div className="fixed top-4 right-4 z-50 rounded-lg p-4 border bg-green-900 bg-opacity-30 border-green-500 text-green-200">
          {successMessage}
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 animate-spin mx-auto text-teal-400 border-2 border-teal-400 border-t-transparent rounded-full"></div>
        </div>
      ) : !selectedDeck ? (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
            <h2 className="text-xl md:text-2xl font-bold text-teal-300 flex items-center gap-2">
              <BookOpen className="w-5 h-5 md:w-6 md:h-6" />
              Your Decks
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:flex md:gap-2">
              <button
                onClick={() => {
                  setShowImportArchidekt(!showImportArchidekt);
                  setShowImportDecklist(false);
                }}
                className={`px-3 sm:px-4 py-2 rounded-lg flex items-center justify-center sm:justify-start gap-2 transition-colors text-white text-sm sm:text-base ${
                  showImportArchidekt
                    ? 'bg-blue-500 shadow-lg shadow-blue-500/50'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                <Download className="w-4 h-4 flex-shrink-0" />
                <span className="hidden sm:inline">Import from Archidekt</span>
                <span className="sm:hidden">Archidekt</span>
              </button>
              <button
                onClick={() => {
                  setShowImportDecklist(!showImportDecklist);
                  setShowImportArchidekt(false);
                }}
                className={`px-3 sm:px-4 py-2 rounded-lg flex items-center justify-center sm:justify-start gap-2 transition-colors text-white text-sm sm:text-base ${
                  showImportDecklist
                    ? 'bg-purple-500 shadow-lg shadow-purple-500/50'
                    : 'bg-purple-600 hover:bg-purple-700'
                }`}
              >
                <Download className="w-4 h-4 flex-shrink-0" />
                <span className="hidden sm:inline">Import Decklist</span>
                <span className="sm:hidden">Decklist</span>
              </button>
            </div>
          </div>

          {showImportArchidekt && (
            <ImportArchidektModal
              archidektUrl={archidektUrl}
              onUrlChange={setArchidektUrl}
              isImporting={isImporting}
              onImport={importFromArchidekt}
              onCancel={handleCancelArchidektImport}
            />
          )}

          {showImportDecklist && (
            <ImportDecklistModal
              deckName={newDeckName}
              onDeckNameChange={setNewDeckName}
              format={newDeckFormat}
              onFormatChange={setNewDeckFormat}
              deckListText={deckListText}
              onDeckListTextChange={setDeckListText}
              onImport={handleImportFromText}
              onCancel={handleCancelTextImport}
            />
          )}

          {decks.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">No decks yet. Create your first deck to get started!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {decks.map(deck => (
                <DeckCard
                  key={deck.id}
                  deck={deck}
                  editingDeck={editingDeck}
                  inventoryByName={inventoryByName}
                  onSelect={setSelectedDeck}
                  onCopy={previewCopyToDeck}
                  onEdit={setEditingDeck}
                  onDelete={deleteDeck}
                  onUpdateName={updateDeckName}
                  onCancelEdit={() => setEditingDeck(null)}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <DeckDetailsView
          deck={selectedDeck}
          inventoryByName={inventoryByName}
          onBack={() => setSelectedDeck(null)}
          onDelete={deleteDeck}
          onUpdateDescription={updateDeckDescription}
        />
      )}

      {showCopyModal && copyingDeck && (
        <CopyToDeckModal
          deck={copyingDeck}
          copyDeckName={copyDeckName}
          onCopyDeckNameChange={setCopyDeckName}
          isCopying={isCopying}
          onCopy={executeCopyToDeck}
          onCancel={cancelCopyToDeck}
        />
      )}
    </div>
  );
};

DeckTab.propTypes = {
  onDeckCreatedOrDeleted: PropTypes.func,
  onInventoryUpdate: PropTypes.func
};

export default DeckTab;
