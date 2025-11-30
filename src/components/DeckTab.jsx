import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { BookOpen, Plus, Trash2, Edit2, X, Download } from 'lucide-react';

const API_BASE = '/api';

export const DeckTab = ({ onDeckCreatedOrDeleted, onInventoryUpdate }) => {
  const [decks, setDecks] = useState([]);
  const [showImportDecklist, setShowImportDecklist] = useState(false);
  const [newDeckName, setNewDeckName] = useState('');
  const [newDeckFormat, setNewDeckFormat] = useState('Standard');
  const [deckListText, setDeckListText] = useState('');
  const [selectedDeck, setSelectedDeck] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [editingDeck, setEditingDeck] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showImportArchidekt, setShowImportArchidekt] = useState(false);
  const [archidektUrl, setArchidektUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copyingDeck, setCopyingDeck] = useState(null);
  const [copyDeckName, setCopyDeckName] = useState('');
  const [isCopying, setIsCopying] = useState(false);

  const formats = ['Standard', 'Modern', 'Commander', 'Casual', 'Limited', 'Pioneer'];

  const previewCopyToDeck = (deck) => {
    setCopyingDeck(deck);
    setCopyDeckName(deck.name);
    setShowCopyModal(true);
  };

  const executeCopyToDeck = async () => {
    if (!copyingDeck || !copyDeckName.trim()) return;
    
    setIsCopying(true);
    try {
      const response = await fetch(`${API_BASE}/decks/${copyingDeck.id}/copy-to-inventory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: copyDeckName })
      });
      
      if (!response.ok) throw new Error('Failed to copy deck');
      
      const result = await response.json();
      
      setShowCopyModal(false);
      setCopyingDeck(null);
      setCopyDeckName('');
      setSuccessMessage(`Deck created! ${result.reservedCount} cards reserved, ${result.missingCount} cards missing.`);
      setTimeout(() => setSuccessMessage(''), 5000);
      
      // Refresh deck instances and inventory in parent components
      if (onDeckCreatedOrDeleted) {
        onDeckCreatedOrDeleted();
      }
      if (onInventoryUpdate) {
        onInventoryUpdate();
      }
      
    } catch (error) {

      alert('Error copying deck to inventory');
    } finally {
      setIsCopying(false);
    }
  };

  const importFromArchidekt = async () => {
    if (!archidektUrl.trim()) {
      alert('Please enter an Archidekt deck URL');
      return;
    }

    setIsImporting(true);
    try {
      // Extract deck ID from URL
      // Archidekt URLs look like: archidekt.com/decks/1234567 or archidekt.com/decks/1234567/
      const match = archidektUrl.match(/archidekt\.com\/decks\/(\d+)/i);
      if (!match) {
        alert('Invalid Archidekt URL. Please use a URL like: archidekt.com/decks/123456');
        setIsImporting(false);
        return;
      }

      const deckId = match[1];
      
      // Fetch deck data from Archidekt API
      const response = await fetch(`https://api.archidekt.com/v1/decks/${deckId}/`);
      if (!response.ok) {
        throw new Error('Failed to fetch deck from Archidekt');
      }

      const deckData = await response.json();
      
      // Extract cards from the deck
      const cards = [];
      if (deckData.cards && Array.isArray(deckData.cards)) {
        deckData.cards.forEach(cardEntry => {
          if (cardEntry.card) {
            const cardObj = cardEntry.card;
            const card = {
              quantity: cardEntry.quantity || 1,
              name: cardObj.name || 'Unknown Card',
              set: cardObj.edition?.abbreviation || cardObj.edition || 'Unknown',
              scryfall_id: cardObj.scryfall_id || null,
              image_url: cardObj.image_url || null
            };
            cards.push(card);
          }
        });
      }

      if (cards.length === 0) {
        alert('No cards found in this deck');
        setIsImporting(false);
        return;
      }

      // Get deck name and format
      const deckName = deckData.name || 'Imported Deck';
      const deckFormat = deckData.format || 'Casual';
      const deckDescription = deckData.description || '';

      // Create the deck with imported cards
      const createResponse = await fetch(`${API_BASE}/decks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: deckName,
          format: deckFormat,
          description: deckDescription
        })
      });

      if (!createResponse.ok) {
        throw new Error('Failed to create deck');
      }

      const newDeck = await createResponse.json();

      // Update deck with cards
      const updateResponse = await fetch(`${API_BASE}/decks/${newDeck.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cards })
      });

      if (!updateResponse.ok) {
        throw new Error('Failed to add cards to deck');
      }

      await loadDecks();
      setArchidektUrl('');
      setShowImportArchidekt(false);
      setSuccessMessage(`Deck imported successfully! ${cards.length} cards added.`);
      setTimeout(() => setSuccessMessage(''), 3000);
      
      // Refresh inventory after deck import
      if (onInventoryUpdate) {
        onInventoryUpdate();
      }
    } catch (error) {

      alert(`Error importing deck: ${error.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  // Load decks from API
  const loadDecks = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE}/decks`);
      if (response.ok) {
        const data = await response.json();
        setDecks(Array.isArray(data) ? data : []);
      } else {

        setDecks([]);
      }
    } catch (error) {

      setDecks([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Load decks on mount
  useEffect(() => {
    loadDecks();
  }, []);

  // Parse deck list text in MTG format (e.g., "4 Black Lotus" or "4x Black Lotus")
  const parseDeckList = (text) => {
    const cards = [];
    const lines = text.split('\n');

    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;

      // Skip comment lines
      if (trimmed.startsWith('//')) return;

      // Match patterns: "4 Card Name", "4x Card Name", "4X Card Name"
      const match = trimmed.match(/^(\d+)\s*x?\s+(.+)$/i);
      if (match) {
        const quantity = parseInt(match[1], 10);
        const name = match[2].trim();

        // Try to extract set code from parentheses: "Card Name (MH2)" or "Card Name (MH2) 123"
        const setMatch = name.match(/^(.+?)\s*\(\s*([A-Z0-9]{2,})\s*\)(?:\s+\d+)?$/);
        
        if (setMatch) {
          cards.push({
            quantity,
            name: setMatch[1].trim(),
            set: setMatch[2].toUpperCase(),
            scryfall_id: null,
            image_url: null
          });
        } else {
          cards.push({
            quantity,
            name,
            set: 'Unknown',
            scryfall_id: null,
            image_url: null
          });
        }
      }
    });

    return cards;
  };

  const importFromTextDeck = async () => {
    if (!newDeckName.trim()) {
      alert('Please enter a deck name');
      return;
    }

    if (!deckListText.trim()) {
      alert('Please paste a deck list');
      return;
    }

    const cards = parseDeckList(deckListText);

    if (cards.length === 0) {
      alert('No cards found in deck list. Format: "4 Card Name" or "4x Card Name"');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/decks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newDeckName,
          format: newDeckFormat,
          description: ''
        })
      });

      if (!response.ok) throw new Error('Failed to create deck');

      const newDeck = await response.json();

      // Add cards to the deck
      const updateResponse = await fetch(`${API_BASE}/decks/${newDeck.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cards })
      });

      if (!updateResponse.ok) throw new Error('Failed to add cards');

      await loadDecks();
      setNewDeckName('');
      setDeckListText('');
      setNewDeckFormat('Standard');
      setShowImportDecklist(false);
      setSuccessMessage(`Deck created with ${cards.length} cards!`);
      setTimeout(() => setSuccessMessage(''), 3000);
      
      // Refresh inventory after deck creation
      if (onInventoryUpdate) {
        onInventoryUpdate();
      }
    } catch (error) {

      alert('Error creating deck');
    }
  };

  const deleteDeck = async (id) => {
    if (window.confirm('Are you sure you want to delete this deck?')) {
      try {
        const response = await fetch(`${API_BASE}/decks/${id}`, { method: 'DELETE' });
        if (response.ok) {
          await loadDecks();
          if (selectedDeck?.id === id) {
            setSelectedDeck(null);
          }
          setSuccessMessage('Deck deleted!');
          setTimeout(() => setSuccessMessage(''), 3000);
          
          // Refresh deck instances and inventory after deletion
          if (onDeckCreatedOrDeleted) {
            onDeckCreatedOrDeleted();
          }
          if (onInventoryUpdate) {
            onInventoryUpdate();
          }
        }
      } catch (error) {

        alert('Error deleting deck');
      }
    }
  };

  const updateDeckName = async (id, newName) => {
    const trimmedName = newName.trim();
    if (!trimmedName) {
      setEditingDeck(null);
      return;
    }
    try {
      const response = await fetch(`${API_BASE}/decks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedName })
      });

      if (response.ok) {
        setEditingDeck(null);
        await loadDecks();
        setSuccessMessage('Deck updated!');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setEditingDeck(null);
        alert('Failed to update deck');
      }
    } catch (error) {

      setEditingDeck(null);
      alert('Error updating deck');
    }
  };

  const updateDeckDescription = async (id, newDescription) => {
    try {
      const response = await fetch(`${API_BASE}/decks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: newDescription })
      });

      if (response.ok) {
        // Update selected deck locally first for immediate feedback
        setSelectedDeck(prev => prev?.id === id ? { ...prev, description: newDescription } : prev);
        await loadDecks();
        setSuccessMessage('Deck updated!');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        alert('Failed to update deck');
      }
    } catch (error) {

      alert('Error updating deck');
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
          <div className="w-8 h-8 animate-spin mx-auto text-teal-400 border-2 border-teal-400 border-t-transparent rounded-full"></div>
        </div>
      ) : !selectedDeck ? (
        // Deck List View
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
            <div className="bg-slate-800 rounded-lg border border-blue-500/50 p-4 mb-4">
              <h3 className="text-lg font-semibold text-blue-300 mb-4">Import Deck from Archidekt</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Archidekt Deck URL</label>
                  <input
                    type="text"
                    placeholder="e.g., https://archidekt.com/decks/1234567"
                    value={archidektUrl}
                    onChange={(e) => setArchidektUrl(e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-slate-500"
                    onKeyDown={(e) => e.key === 'Enter' && importFromArchidekt()}
                    autoFocus
                    disabled={isImporting}
                  />
                  <p className="text-xs text-slate-500 mt-1">Paste the full URL of any public Archidekt deck</p>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={importFromArchidekt}
                    disabled={isImporting}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white px-3 py-2 rounded font-semibold transition-colors"
                  >
                    {isImporting ? 'Importing...' : 'Import'}
                  </button>
                  <button
                    onClick={() => {
                      setShowImportArchidekt(false);
                      setArchidektUrl('');
                    }}
                    disabled={isImporting}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-600 text-white px-3 py-2 rounded transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {showImportDecklist && (
            <div className="bg-slate-800 rounded-lg border border-purple-500/50 p-4 mb-4">
              <h3 className="text-lg font-semibold text-purple-300 mb-4">Import Deck from Text</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Deck Name</label>
                  <input
                    type="text"
                    placeholder="e.g., Mono Red Aggro"
                    value={newDeckName}
                    onChange={(e) => setNewDeckName(e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-slate-500"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Format</label>
                  <select
                    value={newDeckFormat}
                    onChange={(e) => setNewDeckFormat(e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                  >
                    {formats.map(fmt => (
                      <option key={fmt} value={fmt}>{fmt}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Deck List</label>
                  <textarea
                    placeholder={`4 Black Lotus\n4 Ancestral Recall\n4 Time Walk\n\nOne card per line. Format: "4 Card Name" or "4x Card Name (SET)"`}
                    value={deckListText}
                    onChange={(e) => setDeckListText(e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-slate-500 resize-none font-mono text-sm"
                    rows="8"
                  />
                  <p className="text-xs text-slate-500 mt-1">One card per line. Optional set code in parentheses: "Card Name (MH2)"</p>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={importFromTextDeck}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded font-semibold transition-colors"
                  >
                    Import
                  </button>
                  <button
                    onClick={() => {
                      setShowImportDecklist(false);
                      setNewDeckName('');
                      setDeckListText('');
                      setNewDeckFormat('Standard');
                    }}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}


          {decks.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">No decks yet. Create your first deck to get started!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {decks.map(deck => (
                <div
                  key={deck.id}
                  className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-600 hover:border-teal-500 rounded-lg p-4 cursor-pointer transition-all hover:shadow-lg hover:shadow-teal-500/20"
                  onClick={() => setSelectedDeck(deck)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-teal-300 break-words">{deck.name}</h3>
                      <p className="text-xs text-slate-400 mt-1">{deck.format}</p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0 ml-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          previewCopyToDeck(deck);
                        }}
                        className="text-slate-300 hover:text-green-400 hover:bg-green-600/20 px-2.5 py-1.5 rounded text-xs font-semibold transition-colors flex items-center gap-1.5"
                        title="Copy to Inventory - Name your deck instance"
                      >
                        <Download className="w-4 h-4" />
                        Copy
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingDeck(deck.id);
                        }}
                        className="text-slate-400 hover:text-teal-400 transition-colors bg-slate-700 hover:bg-slate-600 p-1.5 rounded"
                        title="Edit deck name"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteDeck(deck.id);
                        }}
                        className="text-slate-400 hover:text-cyan-400 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {editingDeck === deck.id ? (
                    <input
                      type="text"
                      defaultValue={deck.name}
                      placeholder="Deck name"
                      className="w-full bg-slate-700 border border-teal-600 rounded px-2 py-1 text-white text-sm mb-2"
                      onBlur={(e) => {
                        updateDeckName(deck.id, e.target.value);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          updateDeckName(deck.id, e.currentTarget.value);
                        }
                        if (e.key === 'Escape') {
                          setEditingDeck(null);
                        }
                      }}
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : null}

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Cards:</span>
                      <span className="text-teal-300 font-semibold">{(deck.cards && deck.cards.length) || 0}</span>
                    </div>
                    <div className="text-xs text-slate-500">
                      Created: {new Date(deck.created_at).toLocaleDateString()}
                    </div>
                    {deck.description && (
                      <p className="text-xs text-slate-400 italic mt-2">{deck.description}</p>
                    )}
                  </div>

                  <button
                    onClick={() => setSelectedDeck(deck)}
                    className="w-full mt-4 bg-slate-700 hover:bg-teal-600 text-white px-3 py-1 rounded text-sm transition-colors"
                  >
                    View Details
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        // Deck Details View
        <div className="space-y-4">
          <button
            onClick={() => setSelectedDeck(null)}
            className="text-teal-300 hover:text-teal-200 flex items-center gap-2 mb-4"
          >
            <X className="w-4 h-4" />
            Back to Decks
          </button>

          <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-600 rounded-lg p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-2xl font-bold text-teal-300">{selectedDeck.name}</h2>
                <p className="text-slate-400 mt-1">{selectedDeck.format} • {(selectedDeck.cards && selectedDeck.cards.length) || 0} cards</p>
              </div>
              <button
                onClick={() => deleteDeck(selectedDeck.id)}
                className="text-slate-400 hover:text-cyan-400 transition-colors"
                title="Delete"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm text-slate-400 mb-2">Description</label>
              <textarea
                value={selectedDeck.description || ''}
                onChange={(e) => updateDeckDescription(selectedDeck.id, e.target.value)}
                placeholder="Add deck notes, strategy, etc."
                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-slate-500 resize-none"
                rows="3"
              />
            </div>

            {(!selectedDeck.cards || selectedDeck.cards.length === 0) ? (
              <div className="text-center py-8">
                <p className="text-slate-400">No cards in this deck yet. Add cards from your inventory!</p>
              </div>
            ) : (
              <div className="bg-slate-900 rounded p-4 max-h-96 overflow-y-auto">
                <h3 className="text-teal-300 font-semibold mb-3">Deck Cards</h3>
                <div className="space-y-2">
                  {selectedDeck.cards.map((card, idx) => (
                    <div key={idx} className="flex justify-between text-sm text-slate-300 bg-slate-800 p-2 rounded">
                      <span>{card.quantity}x {card.name}</span>
                      <span className="text-slate-500">{card.set}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs text-slate-500 mt-4">
              Created: {new Date(selectedDeck.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      )}

      {/* Copy to Deck Modal */}
      {showCopyModal && copyingDeck && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg border border-teal-500 p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-teal-300">Copy to Inventory Deck</h2>
              <button
                onClick={() => {
                  setShowCopyModal(false);
                  setCopyingDeck(null);
                  setCopyDeckName('');
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-slate-300 mb-4">
              This will create a deck in your Inventory tab and reserve the cheapest available copies of each card.
            </p>
            
            <div className="mb-4">
              <label className="block text-sm text-slate-400 mb-1">Deck Name</label>
              <input
                type="text"
                value={copyDeckName}
                onChange={(e) => setCopyDeckName(e.target.value)}
                placeholder="Enter deck name"
                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                autoFocus
              />
            </div>
            
            <div className="bg-slate-900 rounded p-3 mb-4">
              <p className="text-sm text-slate-400">
                Source: <span className="text-teal-300">{copyingDeck.name}</span>
              </p>
              <p className="text-sm text-slate-400">
                Cards: <span className="text-teal-300">{(copyingDeck.cards || []).reduce((sum, c) => sum + (c.quantity || 1), 0)}</span>
              </p>
              <p className="text-sm text-slate-400">
                Format: <span className="text-teal-300">{copyingDeck.format}</span>
              </p>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowCopyModal(false);
                  setCopyingDeck(null);
                  setCopyDeckName('');
                }}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded font-medium transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed"
                disabled={isCopying}
              >
                Cancel
              </button>
              <button
                onClick={executeCopyToDeck}
                disabled={isCopying || !copyDeckName.trim()}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-medium transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed"
              >
                {isCopying ? 'Copying...' : 'Copy to Deck'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

DeckTab.propTypes = {
  successMessage: PropTypes.string,
  setSuccessMessage: PropTypes.func,
};
