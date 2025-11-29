import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { BookOpen, Plus, Trash2, Edit2, X, Download } from 'lucide-react';

const API_BASE = '/api';

export const DeckTab = () => {
  const [decks, setDecks] = useState([]);
  const [showCreateDeck, setShowCreateDeck] = useState(false);
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

  const formats = ['Standard', 'Modern', 'Commander', 'Casual', 'Limited', 'Pioneer'];

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
    } catch (error) {
      console.error('Error importing from Archidekt:', error);
      alert(`Error importing deck: ${error.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  // Load decks from API
  useEffect(() => {
    loadDecks();
  }, []);

  const loadDecks = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE}/decks`);
      if (response.ok) {
        const data = await response.json();
        setDecks(data);
      }
    } catch (error) {
      console.error('Failed to load decks:', error);
    } finally {
      setIsLoading(false);
    }
  };

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
      setShowCreateDeck(false);
      setSuccessMessage(`Deck created with ${cards.length} cards!`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Failed to create deck:', error);
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
        }
      } catch (error) {
        console.error('Failed to delete deck:', error);
        alert('Error deleting deck');
      }
    }
  };

  const updateDeckName = async (id, newName) => {
    if (!newName.trim()) return;
    try {
      const response = await fetch(`${API_BASE}/decks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName })
      });

      if (response.ok) {
        await loadDecks();
        setEditingDeck(null);
        setSuccessMessage('Deck updated!');
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (error) {
      console.error('Failed to update deck:', error);
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
        await loadDecks();
        // Update selected deck if it's the one being edited
        if (selectedDeck?.id === id) {
          const updated = decks.find(d => d.id === id);
          if (updated) setSelectedDeck(updated);
        }
        setSuccessMessage('Deck description updated!');
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (error) {
      console.error('Failed to update description:', error);
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
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-teal-300 flex items-center gap-2">
              <BookOpen className="w-6 h-6" />
              Your Decks
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => setShowImportArchidekt(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Download className="w-4 h-4" />
                Import from Archidekt
              </button>
              <button
                onClick={() => setShowCreateDeck(true)}
                className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4" />
                New Deck
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

          {showCreateDeck && (
            <div className="bg-slate-800 rounded-lg border border-teal-500/50 p-4 mb-4">
              <h3 className="text-lg font-semibold text-teal-300 mb-4">Import Deck from Text</h3>
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
                    className="flex-1 bg-teal-600 hover:bg-teal-700 text-white px-3 py-2 rounded font-semibold transition-colors"
                  >
                    Import
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateDeck(false);
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
                          setEditingDeck(deck.id);
                        }}
                        className="text-slate-400 hover:text-teal-300 transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteDeck(deck.id);
                        }}
                        className="text-slate-400 hover:text-red-400 transition-colors"
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
                        if (e.target.value.trim()) {
                          updateDeckName(deck.id, e.target.value);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          updateDeckName(deck.id, e.target.value);
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
                className="text-slate-400 hover:text-red-400 transition-colors"
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
    </div>
  );
};

DeckTab.propTypes = {
  successMessage: PropTypes.string,
  setSuccessMessage: PropTypes.func,
};
