import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { BookOpen, Plus, Trash2, X, Link, FileText, ChevronDown, ChevronRight, ExternalLink, Loader2 } from 'lucide-react';

export const DecksTab = ({ successMessage, setSuccessMessage }) => {
  const [decks, setDecks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showImportForm, setShowImportForm] = useState(false);
  const [importMode, setImportMode] = useState('archidekt'); // 'archidekt' or 'manual'
  const [expandedDecks, setExpandedDecks] = useState({});
  const [isImporting, setIsImporting] = useState(false);
  
  // Form state
  const [archidektUrl, setArchidektUrl] = useState('');
  const [manualForm, setManualForm] = useState({
    name: '',
    description: '',
    decklist: ''
  });

  // Load decks on mount
  useEffect(() => {
    loadDecks();
  }, []);

  const loadDecks = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/decks');
      if (!response.ok) throw new Error('Failed to fetch decks');
      const data = await response.json();
      setDecks(data || []);
    } catch (error) {
      console.error('Error loading decks:', error);
      setDecks([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleArchidektImport = async () => {
    if (!archidektUrl.trim()) {
      setSuccessMessage('Error: Please enter an Archidekt URL');
      setTimeout(() => setSuccessMessage(''), 3000);
      return;
    }

    setIsImporting(true);
    try {
      const response = await fetch('/api/decks/import/archidekt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: archidektUrl })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to import deck');
      }

      setArchidektUrl('');
      setShowImportForm(false);
      setSuccessMessage(`Deck "${data.name}" imported successfully!`);
      setTimeout(() => setSuccessMessage(''), 3000);
      loadDecks();
    } catch (error) {
      setSuccessMessage('Error: ' + error.message);
      setTimeout(() => setSuccessMessage(''), 5000);
    } finally {
      setIsImporting(false);
    }
  };

  const handleManualImport = async () => {
    if (!manualForm.name.trim()) {
      setSuccessMessage('Error: Please enter a deck name');
      setTimeout(() => setSuccessMessage(''), 3000);
      return;
    }
    if (!manualForm.decklist.trim()) {
      setSuccessMessage('Error: Please enter a decklist');
      setTimeout(() => setSuccessMessage(''), 3000);
      return;
    }

    setIsImporting(true);
    try {
      const response = await fetch('/api/decks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(manualForm)
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create deck');
      }

      setManualForm({ name: '', description: '', decklist: '' });
      setShowImportForm(false);
      setSuccessMessage(`Deck "${data.name}" created successfully!`);
      setTimeout(() => setSuccessMessage(''), 3000);
      loadDecks();
    } catch (error) {
      setSuccessMessage('Error: ' + error.message);
      setTimeout(() => setSuccessMessage(''), 5000);
    } finally {
      setIsImporting(false);
    }
  };

  const handleDeleteDeck = async (id, name) => {
    if (!confirm(`Delete deck "${name}"?`)) return;

    try {
      const response = await fetch(`/api/decks/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete deck');
      
      setSuccessMessage('Deck deleted');
      setTimeout(() => setSuccessMessage(''), 3000);
      loadDecks();
    } catch (error) {
      setSuccessMessage('Error: ' + error.message);
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  const toggleDeckExpanded = async (deckId) => {
    if (expandedDecks[deckId]) {
      setExpandedDecks({ ...expandedDecks, [deckId]: null });
      return;
    }

    // Fetch full deck data with cards
    try {
      const response = await fetch(`/api/decks/${deckId}`);
      if (!response.ok) throw new Error('Failed to fetch deck');
      const deckData = await response.json();
      setExpandedDecks({ ...expandedDecks, [deckId]: deckData });
    } catch (error) {
      console.error('Error fetching deck:', error);
    }
  };

  // Group cards by category for display
  const groupCardsByCategory = (cards) => {
    if (!cards || cards.length === 0) return {};
    return cards.reduce((acc, card) => {
      const category = card.category || 'Other';
      if (!acc[category]) acc[category] = [];
      acc[category].push(card);
      return acc;
    }, {});
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpen className="w-6 h-6 text-teal-400" />
          <h2 className="text-2xl font-bold">Decks</h2>
        </div>
        <button
          onClick={() => setShowImportForm(!showImportForm)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Deck
        </button>
      </div>

      {/* Import Form */}
      {showImportForm && (
        <div className="card p-6 space-y-4 border border-teal-500/30 bg-slate-800/50">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold">Import Deck</h3>
            <button
              onClick={() => setShowImportForm(false)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Import Mode Tabs */}
          <div className="flex gap-2 border-b border-slate-700 pb-2">
            <button
              onClick={() => setImportMode('archidekt')}
              className={`px-4 py-2 rounded-t-lg font-medium transition-colors flex items-center gap-2 ${
                importMode === 'archidekt'
                  ? 'bg-teal-600/40 text-teal-300 border-b-2 border-teal-400'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Link className="w-4 h-4" />
              Archidekt Import
            </button>
            <button
              onClick={() => setImportMode('manual')}
              className={`px-4 py-2 rounded-t-lg font-medium transition-colors flex items-center gap-2 ${
                importMode === 'manual'
                  ? 'bg-teal-600/40 text-teal-300 border-b-2 border-teal-400'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4" />
              Manual Import
            </button>
          </div>

          {/* Archidekt Import Form */}
          {importMode === 'archidekt' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Archidekt Deck URL</label>
                <input
                  type="text"
                  placeholder="https://archidekt.com/decks/365563/deck-name"
                  value={archidektUrl}
                  onChange={(e) => setArchidektUrl(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-teal-400"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Paste a public Archidekt deck URL to import the deck and all its cards.
                </p>
              </div>
              <button
                onClick={handleArchidektImport}
                disabled={isImporting || !archidektUrl.trim()}
                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Link className="w-4 h-4" />
                    Import from Archidekt
                  </>
                )}
              </button>
            </div>
          )}

          {/* Manual Import Form */}
          {importMode === 'manual' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Deck Name *</label>
                <input
                  type="text"
                  placeholder="My Awesome Deck"
                  value={manualForm.name}
                  onChange={(e) => setManualForm({ ...manualForm, name: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-teal-400"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Description (optional)</label>
                <input
                  type="text"
                  placeholder="A brief description of your deck"
                  value={manualForm.description}
                  onChange={(e) => setManualForm({ ...manualForm, description: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-teal-400"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Decklist *</label>
                <textarea
                  placeholder={`1 Sol Ring\n1 Command Tower\n4 Lightning Bolt\n2 Island\n\n// Sideboard\n2 Pyroblast`}
                  value={manualForm.decklist}
                  onChange={(e) => setManualForm({ ...manualForm, decklist: e.target.value })}
                  rows="10"
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-teal-400 font-mono text-sm"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Format: "quantity cardname" (e.g., "4 Lightning Bolt"). Use "// Category" for section headers.
                </p>
              </div>
              <button
                onClick={handleManualImport}
                disabled={isImporting || !manualForm.name.trim() || !manualForm.decklist.trim()}
                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Create Deck
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Success/Error Message */}
      {successMessage && (
        <div className={`rounded p-3 ${
          successMessage.includes('Error')
            ? 'bg-red-500/20 border border-red-500/50 text-red-300'
            : 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-300'
        }`}>
          {successMessage}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-8">
          <div className="w-8 h-8 animate-spin mx-auto text-teal-400 border-2 border-teal-400 border-t-transparent rounded-full"></div>
          <p className="text-slate-400 mt-2">Loading decks...</p>
        </div>
      )}

      {/* Decks List */}
      {!isLoading && decks.length > 0 ? (
        <div className="space-y-3">
          {decks.map((deck) => {
            const isExpanded = !!expandedDecks[deck.id];
            const deckData = expandedDecks[deck.id];
            const cardsByCategory = deckData ? groupCardsByCategory(deckData.cards) : {};
            
            return (
              <div
                key={deck.id}
                className="card p-4 border border-slate-600 hover:border-slate-500 transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div 
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => toggleDeckExpanded(deck.id)}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-teal-400 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0" />
                      )}
                      <h3 className="text-lg font-bold truncate">{deck.name}</h3>
                      <div className={`px-2 py-1 rounded text-xs font-bold ${
                        deck.source === 'archidekt'
                          ? 'bg-purple-500/20 text-purple-300'
                          : 'bg-blue-500/20 text-blue-300'
                      }`}>
                        {deck.source === 'archidekt' ? 'Archidekt' : 'Manual'}
                      </div>
                    </div>
                    
                    {deck.description && (
                      <p className="text-sm text-slate-400 mb-2 ml-7">{deck.description}</p>
                    )}
                    
                    <div className="flex flex-wrap gap-3 text-xs text-slate-400 ml-7">
                      <span>{deck.card_count || 0} cards</span>
                      <span>Created: {new Date(deck.created_at).toLocaleDateString()}</span>
                      {deck.source_url && (
                        <a
                          href={deck.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-purple-400 hover:text-purple-300 flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="w-3 h-3" />
                          View on Archidekt
                        </a>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteDeck(deck.id, deck.name);
                    }}
                    className="px-3 py-1 bg-red-500/20 text-red-300 rounded hover:bg-red-500/30 transition flex items-center gap-1 text-sm flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>

                {/* Expanded Deck View */}
                {isExpanded && deckData && (
                  <div className="mt-4 pt-4 border-t border-slate-700">
                    {Object.keys(cardsByCategory).length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.entries(cardsByCategory).map(([category, cards]) => (
                          <div key={category} className="bg-slate-800/50 rounded-lg p-3">
                            <h4 className="text-sm font-bold text-teal-300 mb-2">
                              {category} ({cards.reduce((sum, c) => sum + c.quantity, 0)})
                            </h4>
                            <ul className="space-y-1 text-sm">
                              {cards.map((card) => (
                                <li key={card.id} className="flex justify-between text-slate-300">
                                  <span className="truncate">{card.card_name}</span>
                                  <span className="text-slate-500 ml-2 flex-shrink-0">
                                    x{card.quantity}
                                    {card.set_code && (
                                      <span className="text-xs ml-1">({card.set_code})</span>
                                    )}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-400 text-center py-4">No cards in this deck.</p>
                    )}
                    
                    {/* Total card count */}
                    <div className="mt-4 pt-3 border-t border-slate-700 text-right">
                      <span className="text-sm text-slate-400">
                        Total: <span className="font-bold text-teal-300">
                          {deckData.cards?.reduce((sum, c) => sum + c.quantity, 0) || 0}
                        </span> cards
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : !isLoading && (
        <div className="card p-8 text-center text-slate-400">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No decks yet. Create one to get started!</p>
        </div>
      )}
    </div>
  );
};

DecksTab.propTypes = {
  successMessage: PropTypes.string,
  setSuccessMessage: PropTypes.func.isRequired,
};

export default DecksTab;
