import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { BookOpen, Plus, Trash2, Edit2, X } from 'lucide-react';

export const DeckTab = () => {
  const [decks, setDecks] = useState([]);
  const [showCreateDeck, setShowCreateDeck] = useState(false);
  const [newDeckName, setNewDeckName] = useState('');
  const [newDeckFormat, setNewDeckFormat] = useState('Standard');
  const [selectedDeck, setSelectedDeck] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [editingDeck, setEditingDeck] = useState(null);

  const formats = ['Standard', 'Modern', 'Commander', 'Casual', 'Limited', 'Pioneer'];

  // Load decks from localStorage
  useEffect(() => {
    const savedDecks = localStorage.getItem('mtg_decks');
    if (savedDecks) {
      setDecks(JSON.parse(savedDecks));
    }
  }, []);

  // Save decks to localStorage
  const saveDecks = (updatedDecks) => {
    localStorage.setItem('mtg_decks', JSON.stringify(updatedDecks));
    setDecks(updatedDecks);
  };

  const createDeck = () => {
    if (!newDeckName.trim()) {
      alert('Please enter a deck name');
      return;
    }

    const newDeck = {
      id: Date.now(),
      name: newDeckName,
      format: newDeckFormat,
      cards: [],
      createdAt: new Date().toISOString(),
      description: ''
    };

    const updatedDecks = [...decks, newDeck];
    saveDecks(updatedDecks);
    setNewDeckName('');
    setNewDeckFormat('Standard');
    setShowCreateDeck(false);
    setSuccessMessage('Deck created successfully!');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const deleteDeck = (id) => {
    if (window.confirm('Are you sure you want to delete this deck?')) {
      const updatedDecks = decks.filter(d => d.id !== id);
      saveDecks(updatedDecks);
      if (selectedDeck?.id === id) {
        setSelectedDeck(null);
      }
      setSuccessMessage('Deck deleted!');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  const updateDeckName = (id, newName) => {
    if (!newName.trim()) return;
    const updatedDecks = decks.map(d => d.id === id ? { ...d, name: newName } : d);
    saveDecks(updatedDecks);
    setEditingDeck(null);
    setSuccessMessage('Deck updated!');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const updateDeckDescription = (id, newDescription) => {
    const updatedDecks = decks.map(d => d.id === id ? { ...d, description: newDescription } : d);
    saveDecks(updatedDecks);
    setSuccessMessage('Deck description updated!');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  return (
    <div className="flex-1">
      {successMessage && (
        <div className="fixed top-4 right-4 z-50 rounded-lg p-4 border bg-green-900 bg-opacity-30 border-green-500 text-green-200">
          {successMessage}
        </div>
      )}

      {!selectedDeck ? (
        // Deck List View
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-teal-300 flex items-center gap-2">
              <BookOpen className="w-6 h-6" />
              Your Decks
            </h2>
            <button
              onClick={() => setShowCreateDeck(true)}
              className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Deck
            </button>
          </div>

          {showCreateDeck && (
            <div className="bg-slate-800 rounded-lg border border-teal-500/50 p-4 mb-4">
              <h3 className="text-lg font-semibold text-teal-300 mb-4">Create New Deck</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Deck Name</label>
                  <input
                    type="text"
                    placeholder="e.g., Mono Red Aggro"
                    value={newDeckName}
                    onChange={(e) => setNewDeckName(e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-slate-500"
                    onKeyDown={(e) => e.key === 'Enter' && createDeck()}
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
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={createDeck}
                    className="flex-1 bg-teal-600 hover:bg-teal-700 text-white px-3 py-2 rounded font-semibold transition-colors"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateDeck(false);
                      setNewDeckName('');
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
                      <span className="text-teal-300 font-semibold">{deck.cards.length}</span>
                    </div>
                    <div className="text-xs text-slate-500">
                      Created: {new Date(deck.createdAt).toLocaleDateString()}
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
                <p className="text-slate-400 mt-1">{selectedDeck.format} • {selectedDeck.cards.length} cards</p>
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
                value={selectedDeck.description}
                onChange={(e) => updateDeckDescription(selectedDeck.id, e.target.value)}
                placeholder="Add deck notes, strategy, etc."
                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-slate-500 resize-none"
                rows="3"
              />
            </div>

            {selectedDeck.cards.length === 0 ? (
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
              Created: {new Date(selectedDeck.createdAt).toLocaleDateString()}
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
