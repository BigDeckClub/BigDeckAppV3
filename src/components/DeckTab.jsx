import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { BookOpen, Download, BarChart3, CheckSquare, Square } from 'lucide-react';
import { useDeckOperations } from '../hooks/useDeckOperations';
import { useArchidektImport } from '../hooks/useArchidektImport';
import { fetchWithAuth } from '../utils/apiClient';
import {
  DeckCard,
  DeckDetailsView,
  ImportArchidektModal,
  ImportDecklistModal,
  CopyToDeckModal,
  DeckEditorModal,
  DeckAnalysisView,
  ArchidektSyncModal
} from './decks';
import { DeckCardTile } from './ui';
import { normalizeName, computeCompletion } from '../utils/deckHelpers';


export const DeckTab = ({ onDeckCreatedOrDeleted, onInventoryUpdate, decks: externalDecks, onReloadDecks }) => {
  // Import modals visibility state
  const [showImportDecklist, setShowImportDecklist] = useState(false);
  const [showImportArchidekt, setShowImportArchidekt] = useState(false);

  // Analysis mode state
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [selectedDeckIds, setSelectedDeckIds] = useState([]);

  // Deck editor state
  const [editingDeckForModal, setEditingDeckForModal] = useState(null);

  // Archidekt sync state
  const [syncingDeck, setSyncingDeck] = useState(null);

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
  } = useDeckOperations({
    onDeckCreatedOrDeleted,
    onInventoryUpdate,
    externalDecks,
    onReloadDecks
  });

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
      const res = await fetchWithAuth('/api/inventory');
      if (!res.ok) return;
      const items = await res.json();
      const map = {};
      (items || []).forEach(i => {
        const key = normalizeName(i.name);
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

  // Refresh inventory when entering analysis mode
  useEffect(() => {
    if (showAnalysis) {
      refreshInventoryMap();
    }
  }, [showAnalysis, refreshInventoryMap]);

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

  // Handle deck edit save
  const handleSaveDeckEdit = async (updatedCards) => {
    if (!editingDeckForModal) return;

    const response = await fetch(`/api/decks/${editingDeckForModal.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cards: updatedCards })
    });

    if (response.ok) {
      await loadDecks();
    } else {
      throw new Error('Failed to update deck');
    }
  };

  // Handle Archidekt sync complete
  const handleSyncComplete = async (updatedDeck) => {
    await loadDecks();
    // If we're viewing the synced deck, update the selected deck
    if (selectedDeck && selectedDeck.id === updatedDeck.id) {
      setSelectedDeck(updatedDeck);
    }
  };

  // Toggle deck selection
  const toggleDeckSelection = (deckId) => {
    setSelectedDeckIds(prev =>
      prev.includes(deckId)
        ? prev.filter(id => id !== deckId)
        : [...prev, deckId]
    );
  };

  // Select all / deselect all
  const toggleSelectAll = () => {
    if (selectedDeckIds.length === decks.length) {
      setSelectedDeckIds([]);
    } else {
      setSelectedDeckIds(decks.map(d => d.id));
    }
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
          <div className="w-8 h-8 animate-spin mx-auto text-[var(--bda-primary)] border-2 border-[var(--bda-primary)] border-t-transparent rounded-full"></div>
        </div>
      ) : !selectedDeck ? (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
            <h2 className="text-xl md:text-2xl font-bold text-[var(--bda-primary)] flex items-center gap-2">
              <BookOpen className="w-5 h-5 md:w-6 md:h-6" />
              Your Decks
            </h2>
            <div className="flex flex-wrap gap-2">
              {!showAnalysis && (
                <>
                  <button
                    onClick={() => {
                      setShowImportDecklist(!showImportDecklist);
                      setShowImportArchidekt(false);
                    }}
                    className={`px-3 sm:px-4 py-2 rounded-lg flex items-center justify-center sm:justify-start gap-2 transition-colors text-[var(--bda-primary-foreground)] text-sm ${showImportDecklist
                      ? 'bg-purple-500 shadow-lg shadow-purple-500/50'
                      : 'bg-purple-600 hover:bg-purple-700'
                      }`}
                  >
                    <Download className="w-4 h-4 flex-shrink-0" />
                    <span className="hidden sm:inline">Import Decklist</span>
                    <span className="sm:hidden">Decklist</span>
                  </button>
                </>
              )}
              {decks.length > 0 && (
                <button
                  onClick={() => {
                    setShowAnalysis(!showAnalysis);
                    setShowImportDecklist(false);
                    setShowImportArchidekt(false);
                    if (showAnalysis) {
                      setSelectedDeckIds([]);
                    }
                  }}
                  className={`px-3 sm:px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-[var(--bda-primary-foreground)] text-sm font-semibold ${showAnalysis
                    ? 'bg-[var(--bda-primary)] shadow-lg shadow-[var(--bda-primary)]/50'
                    : 'bg-[var(--bda-primary)] hover:opacity-90'
                    }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  {showAnalysis ? 'Back to Decks' : 'Analyze Decks'}
                </button>
              )}
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
            <div className="flex flex-col items-center justify-center py-20 text-center glass-panel rounded-xl animate-fade-in border-2 border-dashed border-[var(--bda-border)]">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-blue-500/10 ring-1 ring-blue-500/30">
                <BookOpen className="w-10 h-10 text-[var(--bda-primary)]" />
              </div>
              <h3 className="text-2xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">Your Deck Library is Empty</h3>
              <p className="text-[var(--bda-muted)] max-w-md mb-8 text-lg">
                Start by pasting a decklist to begin tracking your collection.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setShowImportDecklist(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold shadow-lg shadow-purple-500/20 transition-all hover:scale-105 active:scale-95"
                >
                  <Download className="w-5 h-5" />
                  Import Decklist
                </button>
              </div>
            </div>
          ) : showAnalysis ? (
            <>
              {/* Selection Controls */}
              <div className="glass-panel rounded-xl p-4 mb-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <button
                    onClick={toggleSelectAll}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--muted-surface)] hover:bg-slate-600 text-slate-200 rounded-lg transition-colors font-medium"
                  >
                    {selectedDeckIds.length === decks.length ? (
                      <>
                        <Square className="w-5 h-5" />
                        Deselect All
                      </>
                    ) : (
                      <>
                        <CheckSquare className="w-5 h-5" />
                        Select All
                      </>
                    )}
                  </button>
                  {selectedDeckIds.length > 0 && (
                    <span className="text-[var(--text-muted)]">
                      {selectedDeckIds.length} deck{selectedDeckIds.length !== 1 ? 's' : ''} selected
                    </span>
                  )}
                </div>
              </div>

              {/* Deck Selection Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6 animate-fade-in">
                {decks.map(deck => {
                  const isSelected = selectedDeckIds.includes(deck.id);
                  return (
                    <div
                      key={deck.id}
                      onClick={() => toggleDeckSelection(deck.id)}
                      className={`cursor-pointer rounded-lg border-2 p-4 transition-all ${isSelected
                        ? 'border-[var(--bda-primary)] bg-[var(--bda-primary)]/20 ring-2 ring-[var(--bda-primary)]/30'
                        : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--bda-muted)]'
                        }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-slate-100">{deck.name}</h3>
                        <div className="flex-shrink-0">
                          {isSelected ? (
                            <CheckSquare className="w-5 h-5 text-[var(--bda-primary)]" />
                          ) : (
                            <Square className="w-5 h-5 text-[var(--text-muted)]" />
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-[var(--text-muted)]">
                        {(deck.cards && deck.cards.length) || 0} cards • {deck.format}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Analysis View */}
              <DeckAnalysisView
                decks={decks}
                selectedDeckIds={selectedDeckIds}
                inventoryByName={inventoryByName}
              />
            </>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-fade-in">
              {decks.map(deck => {
                // compute deck completion stats using inventoryByName
                const cards = Array.isArray(deck.cards) ? deck.cards : [];
                const inventoryMap = Object.keys(inventoryByName || {}).length > 0 ? inventoryByName : {};
                const { totalCards, totalMissing, ownedCount, completionPercentage: clientCompletion } = computeCompletion(cards, inventoryMap);

                // Prefer server-provided completion if available, otherwise use client calculation
                const serverCompletion = typeof deck.completionPercentage === 'number' ? deck.completionPercentage : undefined;
                const completionPercentage = serverCompletion !== undefined ? serverCompletion : clientCompletion;

                const missingCards = cards.map((c) => {
                  const key = normalizeName(c.name);
                  const available = inventoryMap?.[key] || 0;
                  const needed = Math.max(0, (c.quantity || 1) - available);
                  return { name: c.name, quantity: needed, set: c.set };
                }).filter(m => m.quantity > 0);

                // (debug logging removed)
                const colorIdentity = deck.color_identity || deck.colorIdentity || [];

                return (
                  <DeckCardTile
                    key={deck.id}
                    deck={deck}
                    isEditing={editingDeck === deck.id}
                    completionPercentage={completionPercentage}
                    missingCards={missingCards}
                    totalMissing={totalMissing}
                    colorIdentity={colorIdentity}
                    onSelect={setSelectedDeck}
                    onCopy={previewCopyToDeck}
                    onEdit={(id) => setEditingDeck(id)}
                    onEditCards={() => setEditingDeckForModal(deck)}
                    onArchidektSync={() => setSyncingDeck(deck)}
                    onDelete={deleteDeck}
                    onUpdateName={updateDeckName}
                    onCancelEdit={() => setEditingDeck(null)}
                  />
                );
              })}
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
          onEditCards={setEditingDeckForModal}
          onArchidektSync={setSyncingDeck}
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

      {editingDeckForModal && (
        <DeckEditorModal
          deck={editingDeckForModal}
          onClose={() => setEditingDeckForModal(null)}
          onSave={handleSaveDeckEdit}
        />
      )}

      {syncingDeck && (
        <ArchidektSyncModal
          deck={syncingDeck}
          onClose={() => setSyncingDeck(null)}
          onSyncComplete={handleSyncComplete}
        />
      )}
    </div>
  );
};

DeckTab.propTypes = {
  onDeckCreatedOrDeleted: PropTypes.func,
  onInventoryUpdate: PropTypes.func,
  decks: PropTypes.array,
  onReloadDecks: PropTypes.func
};

export default DeckTab;
