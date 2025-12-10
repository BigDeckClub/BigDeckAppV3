import React, { useState, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { 
  BarChart3, CheckCircle2, AlertCircle, TrendingUp, Package, 
  Search, Filter, ChevronDown, ChevronUp, Download,
  DollarSign, Eye, X, List, Grid3X3, SortAsc, SortDesc,
  ShoppingCart, Copy, Check
} from 'lucide-react';
import { EXTERNAL_APIS } from '../../config/api';
import { BuyCardsModal } from '../buy/BuyCardsModal';

/**
 * DeckAnalysisView - Advanced multi-deck analysis and comparison
 * Shows shared cards, missing cards, bulk calculations with deck quantity sliders
 */
export function DeckAnalysisView({ decks, selectedDeckIds, inventoryByName }) {
  // State for deck quantities (how many copies of each deck)
  const [deckQuantities, setDeckQuantities] = useState(
    selectedDeckIds.reduce((acc, id) => ({ ...acc, [id]: 1 }), {})
  );

  // UI State
  const [activeTab, setActiveTab] = useState('overview'); // overview, missing, shared, breakdown
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('missing'); // missing, name, quantity, decks
  const [sortOrder, setSortOrder] = useState('desc');
  const [filterMissingOnly, setFilterMissingOnly] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    quantities: true,
    stats: true,
    shared: true,
    missing: true,
    breakdown: false
  });
  const [hoveredCard, setHoveredCard] = useState(null);
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // list, grid
  const [showBuyModal, setShowBuyModal] = useState(false);

  // Get selected decks
  const selectedDecks = useMemo(() => {
    return decks.filter(d => selectedDeckIds.includes(d.id));
  }, [decks, selectedDeckIds]);

  // Calculate comprehensive analysis
  const analysis = useMemo(() => {
    if (selectedDecks.length === 0) {
      return {
        sharedCards: [],
        missingFromAll: [],
        missingCards: [],
        cardRequirements: [],
        totalCardsNeeded: 0,
        totalCardsOwned: 0,
        completionRate: 0,
        deckStats: [],
        estimatedCost: 0
      };
    }

    // Build card requirements considering quantities
    const cardRequirements = {};
    const cardAppearances = {}; // Track which decks use each card
    
    selectedDecks.forEach(deck => {
      const deckQty = deckQuantities[deck.id] || 1;
      (deck.cards || []).forEach(card => {
        const cardKey = card.name.toLowerCase().trim();
        const requiredQty = (card.quantity || 1) * deckQty;
        
        if (!cardRequirements[cardKey]) {
          cardRequirements[cardKey] = {
            name: card.name,
            totalRequired: 0,
            available: inventoryByName?.[cardKey] || 0,
            set: card.set,
            decks: [],
            estimatedPrice: card.price || 0.50 // Default estimate if no price
          };
          cardAppearances[cardKey] = new Set();
        }
        
        cardRequirements[cardKey].totalRequired += requiredQty;
        cardRequirements[cardKey].decks.push({
          deckName: deck.name,
          deckId: deck.id,
          quantity: card.quantity || 1,
          copies: deckQty
        });
        cardAppearances[cardKey].add(deck.id);
      });
    });

    // Calculate shared cards (appear in 2+ decks)
    const sharedCards = Object.values(cardRequirements)
      .filter(card => card.decks.length > 1)
      .sort((a, b) => b.decks.length - a.decks.length);

    // Calculate missing cards (needed but not available)
    const missingCards = Object.values(cardRequirements)
      .map(card => ({
        ...card,
        missing: Math.max(0, card.totalRequired - card.available)
      }))
      .filter(card => card.missing > 0)
      .sort((a, b) => b.missing - a.missing);

    // Cards missing from ALL selected decks
    const missingFromAll = missingCards.filter(card => 
      card.decks.length === selectedDecks.length
    );

    // Calculate totals
    const totalCardsNeeded = Object.values(cardRequirements)
      .reduce((sum, card) => sum + card.totalRequired, 0);
    
    const totalCardsOwned = Object.values(cardRequirements)
      .reduce((sum, card) => sum + Math.min(card.available, card.totalRequired), 0);

    const completionRate = totalCardsNeeded > 0 
      ? (totalCardsOwned / totalCardsNeeded) * 100 
      : 100;

    // Estimate cost to complete
    const estimatedCost = missingCards.reduce((sum, card) => 
      sum + (card.missing * card.estimatedPrice), 0
    );

    // Per-deck statistics
    const deckStats = selectedDecks.map(deck => {
      const deckQty = deckQuantities[deck.id] || 1;
      const cards = deck.cards || [];
      
      const required = cards.reduce((sum, card) => 
        sum + ((card.quantity || 1) * deckQty), 0
      );
      
      const owned = cards.reduce((sum, card) => {
        const cardKey = card.name.toLowerCase().trim();
        const available = inventoryByName?.[cardKey] || 0;
        const needed = (card.quantity || 1) * deckQty;
        return sum + Math.min(available, needed);
      }, 0);

      const missing = required - owned;
      const completion = required > 0 ? (owned / required) * 100 : 100;

      return {
        deckId: deck.id,
        deckName: deck.name,
        copies: deckQty,
        required,
        owned,
        missing,
        completion
      };
    });

    return {
      sharedCards,
      missingFromAll,
      missingCards,
      cardRequirements: Object.values(cardRequirements),
      totalCardsNeeded,
      totalCardsOwned,
      completionRate,
      deckStats,
      estimatedCost
    };
  }, [selectedDecks, deckQuantities, inventoryByName]);

  // Filter and sort cards based on current settings
  const filteredCards = useMemo(() => {
    let cards = [...analysis.cardRequirements];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      cards = cards.filter(card => 
        card.name.toLowerCase().includes(query)
      );
    }
    
    // Apply missing only filter
    if (filterMissingOnly) {
      cards = cards.filter(card => card.totalRequired > card.available);
    }
    
    // Apply sorting
    cards.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'missing':
          comparison = (b.totalRequired - b.available) - (a.totalRequired - a.available);
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'quantity':
          comparison = b.totalRequired - a.totalRequired;
          break;
        case 'decks':
          comparison = b.decks.length - a.decks.length;
          break;
        default:
          comparison = 0;
      }
      return sortOrder === 'desc' ? comparison : -comparison;
    });
    
    return cards;
  }, [analysis.cardRequirements, searchQuery, filterMissingOnly, sortBy, sortOrder]);

  // Handle quantity slider change
  const handleQuantityChange = (deckId, quantity) => {
    setDeckQuantities(prev => ({
      ...prev,
      [deckId]: Math.max(1, Math.min(10, quantity))
    }));
  };

  // Toggle section expansion
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Export missing cards to CSV
  const exportToCSV = useCallback(() => {
    const headers = ['Card Name', 'Quantity Needed', 'Quantity Owned', 'Missing', 'Estimated Price', 'Decks'];
    const rows = analysis.missingCards.map(card => [
      card.name,
      card.totalRequired,
      card.available,
      card.missing,
      `$${card.estimatedPrice.toFixed(2)}`,
      card.decks.map(d => d.deckName).join('; ')
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deck-analysis-missing-cards-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [analysis.missingCards]);

  // Copy missing cards list to clipboard
  const copyToClipboard = useCallback(() => {
    const text = analysis.missingCards
      .map(card => `${card.missing}x ${card.name}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopiedToClipboard(true);
    setTimeout(() => setCopiedToClipboard(false), 2000);
  }, [analysis.missingCards]);

  // Prepare missing cards payload for buy modal
  const missingCardsForBuy = useMemo(() => (
    analysis.missingCards.map(card => ({
      name: card.name,
      quantity: card.missing,
      set: card.set,
      price: card.estimatedPrice ?? card.price ?? 0
    }))
  ), [analysis.missingCards]);

  // Get card image URL
  const getCardImageUrl = (cardName) => {
    const encodedName = encodeURIComponent(cardName.split('//')[0].trim());
    return `${EXTERNAL_APIS.SCRYFALL}/cards/named?exact=${encodedName}&format=image&version=normal`;
  };

  if (selectedDeckIds.length === 0) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="w-16 h-16 text-ui-muted mx-auto mb-4" />
        <p className="text-ui-muted">Select at least one deck to see analysis</p>
      </div>
    );
  }

  // Tab navigation
  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'missing', label: `Missing (${analysis.missingCards.length})`, icon: AlertCircle },
    { id: 'shared', label: `Shared (${analysis.sharedCards.length})`, icon: CheckCircle2 },
    { id: 'breakdown', label: 'Full Breakdown', icon: List }
  ];

  return (
    <div className="space-y-4">
      {/* Card Preview Tooltip */}
      {hoveredCard && (
        <div 
          className="fixed z-50 pointer-events-none"
          style={{ 
            left: Math.min(window.innerWidth - 260, Math.max(10, hoveredCard.x)),
            top: Math.min(window.innerHeight - 370, Math.max(10, hoveredCard.y - 180))
          }}
        >
          <div className="bg-ui-card rounded-lg shadow-2xl border border-ui-border p-2">
            <img
              src={getCardImageUrl(hoveredCard.name)}
              alt={hoveredCard.name}
              className="w-60 h-auto rounded"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="bg-ui-card rounded-lg border border-ui-border p-2">
        <div className="flex flex-wrap gap-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm font-medium ${
                activeTab === tab.id
                  ? 'bg-ui-primary text-ui-primary-foreground shadow-lg'
                  : 'bg-ui-surface text-ui-muted hover:bg-ui-surface/60'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          {/* Overall Summary */}
          <div className="bg-ui-card rounded-lg border border-ui-border p-6">
            <h2 className="text-2xl font-bold text-teal-300 mb-4 flex items-center gap-2">
              <BarChart3 className="w-6 h-6" />
              Multi-Deck Analysis
            </h2>
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <div className="bg-ui-card/50 rounded-lg p-4">
                <div className="text-ui-muted text-sm mb-1">Decks</div>
                <div className="text-2xl font-bold text-ui-primary">{selectedDecks.length}</div>
              </div>
              <div className="bg-ui-card/50 rounded-lg p-4">
                <div className="text-ui-muted text-sm mb-1">Cards Needed</div>
                <div className="text-2xl font-bold text-ui-accent">{analysis.totalCardsNeeded}</div>
              </div>
              <div className="bg-ui-card/50 rounded-lg p-4">
                <div className="text-ui-muted text-sm mb-1">Cards Owned</div>
                <div className="text-2xl font-bold text-ui-primary">{analysis.totalCardsOwned}</div>
              </div>
              <div className="bg-ui-card/50 rounded-lg p-4">
                <div className="text-ui-muted text-sm mb-1">Completion</div>
                <div className="text-2xl font-bold text-ui-accent">
                  {analysis.completionRate.toFixed(1)}%
                </div>
              </div>
              <div className="bg-ui-card/50 rounded-lg p-4">
                <div className="text-ui-muted text-sm mb-1 flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  Est. Cost
                </div>
                <div className="text-2xl font-bold text-ui-primary">
                  ${analysis.estimatedCost.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Completion Progress Bar */}
            <div className="bg-ui-surface rounded-full h-4 overflow-hidden">
              <div
                className="h-full bg-ui-primary transition-all duration-500"
                style={{ width: `${Math.min(100, analysis.completionRate)}%` }}
              />
            </div>
          </div>

          {/* Deck Quantity Sliders - Collapsible */}
          <div className="bg-ui-card rounded-lg border border-ui-border overflow-hidden">
            <button
              onClick={() => toggleSection('quantities')}
              className="w-full flex items-center justify-between p-4 hover:bg-ui-surface/60 transition-colors"
            >
              <h3 className="text-lg font-semibold text-teal-300 flex items-center gap-2">
                <Package className="w-5 h-5" />
                Deck Quantities
              </h3>
              {expandedSections.quantities ? (
                <ChevronUp className="w-5 h-5 text-ui-muted" />
              ) : (
                <ChevronDown className="w-5 h-5 text-ui-muted" />
              )}
            </button>
            {expandedSections.quantities && (
              <div className="p-4 pt-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {selectedDecks.map(deck => (
                  <div key={deck.id} className="bg-ui-card/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-ui-text font-medium truncate">{deck.name}</span>
                      <span className="text-teal-300 font-bold text-lg ml-2">
                        {deckQuantities[deck.id] || 1}x
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={deckQuantities[deck.id] || 1}
                      onChange={(e) => handleQuantityChange(deck.id, parseInt(e.target.value))}
                      className="w-full h-2 bg-ui-surface rounded-lg appearance-none cursor-pointer accent-teal-500"
                    />
                    <div className="flex justify-between text-xs text-ui-muted mt-1">
                      <span>1</span>
                      <span>10</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Per-Deck Statistics - Collapsible */}
          <div className="bg-ui-card rounded-lg border border-ui-border overflow-hidden">
            <button
              onClick={() => toggleSection('stats')}
              className="w-full flex items-center justify-between p-4 hover:bg-ui-surface/60 transition-colors"
            >
              <h3 className="text-lg font-semibold text-teal-300 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Individual Deck Stats
              </h3>
              {expandedSections.stats ? (
                <ChevronUp className="w-5 h-5 text-ui-muted" />
              ) : (
                <ChevronDown className="w-5 h-5 text-ui-muted" />
              )}
            </button>
            {expandedSections.stats && (
              <div className="p-4 pt-0 space-y-3">
                {analysis.deckStats.map(stat => (
                  <div key={stat.deckId} className="bg-ui-card/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-ui-text font-medium">{stat.deckName}</span>
                        {stat.copies > 1 && (
                          <span className="text-xs bg-teal-600 text-white px-2 py-0.5 rounded">
                            {stat.copies}x
                          </span>
                        )}
                      </div>
                      <span className={`font-bold ${
                        stat.completion === 100 ? 'text-green-400' : 
                        stat.completion >= 75 ? 'text-amber-400' : 'text-red-400'
                      }`}>
                        {stat.completion.toFixed(0)}%
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm mb-2">
                      <div>
                        <div className="text-ui-muted">Required</div>
                        <div className="text-blue-300 font-semibold">{stat.required}</div>
                      </div>
                      <div>
                        <div className="text-ui-muted">Owned</div>
                        <div className="text-green-300 font-semibold">{stat.owned}</div>
                      </div>
                      <div>
                        <div className="text-ui-muted">Missing</div>
                        <div className="text-red-300 font-semibold">{stat.missing}</div>
                      </div>
                    </div>
                    <div className="bg-ui-card/50 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          stat.completion === 100 ? 'bg-green-500' : 
                          stat.completion >= 75 ? 'bg-amber-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(100, stat.completion)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Stats Summary */}
          {analysis.missingCards.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-ui-card/50 rounded-lg border border-red-600/30 p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-red-300 font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Top Missing Cards
                  </h4>
                  <button
                    onClick={() => setActiveTab('missing')}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    View All →
                  </button>
                </div>
                <div className="space-y-1">
                  {analysis.missingCards.slice(0, 5).map((card, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span className="text-ui-text truncate">{card.name}</span>
                      <span className="text-red-400 font-medium ml-2">-{card.missing}</span>
                    </div>
                  ))}
                </div>
              </div>

              {analysis.sharedCards.length > 0 && (
                <div className="bg-ui-card/50 rounded-lg border border-teal-600/30 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-teal-300 font-semibold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      Most Shared Cards
                    </h4>
                    <button
                      onClick={() => setActiveTab('shared')}
                      className="text-xs text-teal-400 hover:text-teal-300"
                    >
                      View All →
                    </button>
                  </div>
                  <div className="space-y-1">
                    {analysis.sharedCards.slice(0, 5).map((card, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <span className="text-ui-text truncate">{card.name}</span>
                        <span className="text-teal-400 font-medium ml-2">{card.decks.length} decks</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Missing Cards Tab */}
      {activeTab === 'missing' && (
        <div className="space-y-4">
          {/* Actions Bar */}
          <div className="bg-ui-card rounded-lg border border-ui-border p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h3 className="text-lg font-semibold text-red-300 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Missing Cards ({analysis.missingCards.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                  {analysis.missingCards.length > 0 && (
                    <button
                      onClick={() => setShowBuyModal(true)}
                      className="flex items-center gap-2 px-3 py-2 bg-amber-700 hover:bg-amber-600 text-white rounded-lg transition-colors text-sm"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      Buy Missing
                    </button>
                  )}
                <button
                  onClick={copyToClipboard}
                  className="flex items-center gap-2 px-3 py-2 bg-ui-surface hover:bg-ui-surface/60 text-ui-text rounded-lg transition-colors text-sm"
                >
                  {copiedToClipboard ? (
                    <>
                      <Check className="w-4 h-4 text-green-400" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy List
                    </>
                  )}
                </button>
                <button
                  onClick={exportToCSV}
                  className="flex items-center gap-2 px-3 py-2 bg-ui-surface hover:bg-ui-surface/60 text-ui-text rounded-lg transition-colors text-sm"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </button>
              </div>
            </div>
            
            {/* Estimated Cost Banner */}
            <div className="mt-4 p-3 bg-emerald-900/30 rounded-lg border border-emerald-600/30">
              <div className="flex items-center justify-between">
                <span className="text-emerald-300 flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4" />
                  Estimated Cost to Complete
                </span>
                <span className="text-2xl font-bold text-emerald-300">
                  ${analysis.estimatedCost.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="bg-ui-card rounded-lg border border-ui-border p-4">
            <div className="flex flex-wrap gap-3">
              <div className="flex-1 min-w-[200px] relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ui-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search cards..."
                  className="w-full pl-10 pr-4 py-2 bg-ui-card/50 border border-ui-border rounded-lg text-ui-text placeholder-ui-muted focus:border-teal-500 focus:outline-none"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ui-muted hover:text-ui-text"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 bg-ui-card/50 border border-ui-border rounded-lg text-ui-text focus:border-teal-500 focus:outline-none"
              >
                <option value="missing">Sort by Missing</option>
                <option value="name">Sort by Name</option>
                <option value="quantity">Sort by Quantity</option>
                <option value="decks">Sort by # Decks</option>
              </select>
              <button
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                className="p-2 bg-ui-card/50 border border-ui-border rounded-lg text-ui-muted hover:text-ui-text"
              >
                {sortOrder === 'asc' ? <SortAsc className="w-5 h-5" /> : <SortDesc className="w-5 h-5" />}
              </button>
              <div className="flex gap-1 bg-ui-card/50 border border-ui-border rounded-lg p-1">
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded ${viewMode === 'list' ? 'bg-teal-600 text-white' : 'text-ui-muted hover:text-ui-text'}`}
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded ${viewMode === 'grid' ? 'bg-teal-600 text-white' : 'text-ui-muted hover:text-ui-text'}`}
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Missing Cards List/Grid */}
          {(() => {
            const filteredCards = analysis.missingCards
              .filter(card => !searchQuery || card.name.toLowerCase().includes(searchQuery.toLowerCase()))
              .sort((a, b) => {
                let comparison = 0;
                switch (sortBy) {
                  case 'name':
                    comparison = a.name.localeCompare(b.name);
                    break;
                  case 'quantity':
                    comparison = b.totalRequired - a.totalRequired;
                    break;
                  case 'decks':
                    comparison = b.decks.length - a.decks.length;
                    break;
                  case 'missing':
                  default:
                    comparison = b.missing - a.missing;
                }
                return sortOrder === 'asc' ? -comparison : comparison;
              });
            
            const totalMissingCount = filteredCards.reduce((sum, card) => sum + card.missing, 0);
            
            return (
              <div className="bg-ui-card rounded-lg border border-ui-border">
                {/* Header with count */}
                <div className="bg-ui-card/50 px-4 py-3 border-b border-ui-border">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm text-ui-muted">
                      Showing <span className="text-red-300 font-semibold">{filteredCards.length}</span> unique cards
                      {searchQuery && ` matching "${searchQuery}"`}
                    </div>
                    <div className="text-sm text-ui-muted">
                      Total missing: <span className="text-red-300 font-bold">{totalMissingCount}</span> cards
                    </div>
                  </div>
                  {filteredCards.length > 6 && (
                    <div className="text-xs text-amber-400 bg-amber-900/30 px-3 py-1.5 rounded border border-amber-600/30 text-center">
                      ⬇️ Scroll down to see all {filteredCards.length} cards ⬇️
                    </div>
                  )}
                </div>
                
                {/* Scrollable container - simple overflow with border indicator */}
                <div 
                  className="overflow-auto border-l-4 border-red-500"
                  style={{ maxHeight: '60vh' }}
                >
                  {viewMode === 'list' ? (
                    <div>
                      {filteredCards.map((card, idx) => (
                        <div
                            key={idx}
                            className={`flex items-center justify-between p-4 hover:bg-ui-surface/60 transition-colors ${idx !== filteredCards.length - 1 ? 'border-b border-ui-border' : ''}`}
                            onMouseEnter={(e) => setHoveredCard({ name: card.name, x: e.clientX, y: e.clientY })}
                          onMouseLeave={() => setHoveredCard(null)}
                        >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-red-400 font-bold text-lg">#{idx + 1}</span>
                                <span className="text-ui-text font-medium">{card.name}</span>
                              </div>
                              <div className="text-xs text-ui-muted mt-1 ml-8">
                                Used in {card.decks.map(d => d.deckName).join(', ')}
                              </div>
                            </div>
                          <div className="flex items-center gap-4">
                            <div className="text-sm text-right">
                                <div className="text-ui-muted">
                                  Need <span className="text-blue-300 font-semibold">{card.totalRequired}</span>
                                  {' / '}
                                  Have <span className="text-green-300 font-semibold">{card.available}</span>
                                </div>
                            </div>
                            <div className="text-2xl font-bold text-red-400 w-16 text-right">
                              -{card.missing}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 p-4">
                      {filteredCards.map((card, idx) => (
                        <div
                          key={idx}
                          className="bg-ui-card rounded-lg border border-ui-border overflow-hidden hover:border-red-500/50 transition-colors"
                          onMouseEnter={(e) => setHoveredCard({ name: card.name, x: e.clientX, y: e.clientY })}
                          onMouseLeave={() => setHoveredCard(null)}
                        >
                            <div className="aspect-[3/4] bg-ui-card/50 relative">
                            <img
                              src={getCardImageUrl(card.name)}
                              alt={card.name}
                              className="w-full h-full object-cover"
                              onError={(e) => { 
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                              <div className="absolute inset-0 hidden items-center justify-center bg-ui-card text-ui-muted text-sm p-2 text-center">
                              {card.name}
                            </div>
                              <div className="absolute top-2 right-2 bg-red-600 text-white font-bold px-2 py-1 rounded text-sm">
                              -{card.missing}
                            </div>
                          </div>
                            <div className="p-2">
                              <div className="text-xs text-ui-text truncate font-medium">{card.name}</div>
                              <div className="text-xs text-ui-muted">{card.decks.length} deck(s)</div>
                            </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Empty state */}
                  {filteredCards.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-ui-muted">
                      <AlertCircle className="w-12 h-12 mb-3 opacity-50" />
                      {searchQuery ? (
                        <p>No missing cards match "{searchQuery}"</p>
                      ) : (
                        <p>No missing cards found - your decks are complete!</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Shared Cards Tab */}
      {activeTab === 'shared' && (
        <div className="space-y-4">
          <div className="bg-ui-card rounded-lg border border-ui-border p-4">
            <h3 className="text-lg font-semibold text-teal-300 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              Shared Cards ({analysis.sharedCards.length})
            </h3>
            <p className="text-sm text-ui-muted mt-1">
              Cards that appear in multiple selected decks - these share inventory across decks
            </p>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ui-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search shared cards..."
              className="w-full pl-10 pr-4 py-2 bg-ui-card/50 border border-ui-border rounded-lg text-ui-text placeholder-ui-muted focus:border-teal-500 focus:outline-none"
            />
          </div>

          <div className="bg-ui-card rounded-lg border border-ui-border overflow-hidden">
            <div className="max-h-[600px] overflow-y-auto divide-y divide-ui-border">
              {analysis.sharedCards
                .filter(card => !searchQuery || card.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((card, idx) => (
                  <div
                    key={idx}
                    className="p-4 hover:bg-ui-surface/60 transition-colors"
                    onMouseEnter={(e) => setHoveredCard({ name: card.name, x: e.clientX, y: e.clientY })}
                    onMouseLeave={() => setHoveredCard(null)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Eye className="w-4 h-4 text-ui-muted" />
                          <span className="text-ui-text font-medium">{card.name}</span>
                          <span className="text-xs bg-teal-600 text-white px-2 py-0.5 rounded">
                            {card.decks.length} decks
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm">
                          <span className="text-blue-300 font-semibold">{card.totalRequired}</span>
                          <span className="text-ui-muted mx-1">/</span>
                          <span className="text-green-300 font-semibold">{card.available}</span>
                        </div>
                        {card.totalRequired > card.available && (
                          <div className="text-xs text-red-400 mt-1">
                            Need {card.totalRequired - card.available} more
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {card.decks.map((deckInfo, i) => (
                        <span
                          key={i}
                          className="text-xs bg-ui-surface text-ui-text px-2 py-1 rounded"
                        >
                          {deckInfo.deckName}: {deckInfo.quantity}×{deckInfo.copies}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Full Breakdown Tab */}
      {activeTab === 'breakdown' && (
        <div className="space-y-4">
          {/* Search and Filters */}
          <div className="bg-ui-card rounded-lg border border-ui-border p-4">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex-1 min-w-[200px] relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ui-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search all cards..."
                  className="w-full pl-10 pr-4 py-2 bg-ui-card/50 border border-ui-border rounded-lg text-ui-text placeholder-ui-muted focus:border-teal-500 focus:outline-none"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-ui-muted cursor-pointer">
                <input
                  type="checkbox"
                  checked={filterMissingOnly}
                  onChange={(e) => setFilterMissingOnly(e.target.checked)}
                  className="w-4 h-4 rounded border-ui-border text-teal-500 focus:ring-teal-500"
                />
                <Filter className="w-4 h-4" />
                Missing only
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 bg-ui-card/50 border border-ui-border rounded-lg text-ui-text focus:border-teal-500 focus:outline-none"
              >
                <option value="missing">Sort by Missing</option>
                <option value="name">Sort by Name</option>
                <option value="quantity">Sort by Quantity</option>
                <option value="decks">Sort by # Decks</option>
              </select>
              <button
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                className="p-2 bg-ui-card/50 border border-ui-border rounded-lg text-ui-muted hover:text-ui-text"
              >
                {sortOrder === 'asc' ? <SortAsc className="w-5 h-5" /> : <SortDesc className="w-5 h-5" />}
              </button>
            </div>
            <div className="mt-3 text-sm text-ui-muted">
              Showing {filteredCards.length} of {analysis.cardRequirements.length} unique cards
            </div>
          </div>

          {/* All Cards List */}
          <div className="bg-ui-card rounded-lg border border-ui-border overflow-hidden">
            <div className="max-h-[600px] overflow-y-auto">
              {filteredCards.map((card, idx) => {
                const missing = Math.max(0, card.totalRequired - card.available);
                const isComplete = missing === 0;
                
                return (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-3 border-b border-ui-border last:border-0 hover:bg-ui-surface/30 transition-colors ${
                      isComplete ? 'bg-green-900/10' : ''
                    }`}
                    onMouseEnter={(e) => setHoveredCard({ name: card.name, x: e.clientX, y: e.clientY })}
                    onMouseLeave={() => setHoveredCard(null)}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <Eye className="w-4 h-4 text-ui-muted flex-shrink-0" />
                      <span className="text-ui-text">{card.name}</span>
                      {card.decks.length > 1 && (
                        <span className="text-xs bg-teal-600/50 text-teal-200 px-1.5 py-0.5 rounded">
                          {card.decks.length} decks
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm">
                        <span className="text-blue-300">{card.totalRequired}</span>
                        <span className="text-ui-muted mx-1">/</span>
                        <span className="text-green-300">{card.available}</span>
                      </span>
                      {isComplete ? (
                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                      ) : (
                        <span className="text-red-400 font-semibold w-12 text-right">-{missing}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Buy Missing Cards Modal */}
      <BuyCardsModal
        isOpen={showBuyModal}
        onClose={() => setShowBuyModal(false)}
        cards={missingCardsForBuy}
        deckName={selectedDecks.length === 1 ? selectedDecks[0]?.name : 'Selected Decks'}
      />
    </div>
  );
}

DeckAnalysisView.propTypes = {
  decks: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    name: PropTypes.string.isRequired,
    cards: PropTypes.arrayOf(PropTypes.shape({
      name: PropTypes.string,
      quantity: PropTypes.number,
      set: PropTypes.string,
      price: PropTypes.number
    }))
  })).isRequired,
  selectedDeckIds: PropTypes.arrayOf(
    PropTypes.oneOfType([PropTypes.string, PropTypes.number])
  ).isRequired,
  inventoryByName: PropTypes.object
};

export default DeckAnalysisView;
