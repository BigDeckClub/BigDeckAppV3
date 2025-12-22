import React, { useState, useEffect, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import AnalyticsDashboard from './autobuy/AnalyticsDashboard';
import SubstitutionGroupsManager from './autobuy/SubstitutionGroupsManager';

import {
  ShoppingCart,
  Package,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Settings,
  Play,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  DollarSign,
  Truck,
  Tag,
  TrendingUp,
  AlertCircle,
  Info,
  BarChart3,
  LayoutDashboard,
  Layers,
  Calendar,
  CheckSquare,
  Square,
} from 'lucide-react';
import { StatsCard } from './ui';
import { normalizeName } from '../utils/deckHelpers';

/**
 * AutobuyTab - Enhanced Auto-Buy Optimization Interface
 * 
 * Features:
 * - User preference controls (price threshold, seller rating, etc.)
 * - Visual purchase plan with seller baskets
 * - Integration with inventory and deck data
 * - Deep links to marketplace carts
 * - Analytics Dashboard for tracking performance
 */
// Stable empty arrays to avoid infinite re-renders when props are undefined
const EMPTY_ARRAY = [];

export function AutobuyTab({ inventory, decks }) {
  // Use stable empty arrays when props are undefined to prevent infinite re-renders
  const safeInventory = inventory ?? EMPTY_ARRAY;
  const safeDecks = decks ?? EMPTY_ARRAY;

  // Default preferences
  const defaultPreferences = {
    priceThresholdPercent: 100,    // % of CK price willing to pay
    minSellerRating: 0.95,         // Minimum seller rating (0-1)
    maxSellersPerOrder: 5,         // Max number of sellers to order from
    allowHotListFiller: true,      // Allow adding hot list cards for shipping
    allowSpeculativeOverbuying: false,
    inventoryTimeHorizon: 30,      // Days of inventory to maintain
    includeQueuedDecks: true,      // Include queued decks in demand
    // Budget controls
    maxTotalSpend: 500,            // Hard cap on total purchase
    maxPerSeller: 100,             // Max spend per seller basket
    maxPerCard: 50,                // Max price for any single card
    maxSpeculativeSpend: 50,       // Cap on Hot List (non-demand) spending
    reserveBudgetPercent: 10,      // Keep X% for Card Kingdom fallback
    enableBudgetLimits: false,     // Toggle budget enforcement
    budgetMode: 'STRICT',          // 'STRICT' or 'SOFT'
  };

  // Load preferences from localStorage on mount
  const [preferences, setPreferences] = useState(() => {
    try {
      const saved = localStorage.getItem('autobuy-preferences');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge with defaults to handle new fields added over time
        return { ...defaultPreferences, ...parsed };
      }
    } catch (e) {
      console.warn('Could not load autobuy preferences:', e);
    }
    return defaultPreferences;
  });

  // Save preferences to localStorage when they change
  useEffect(() => {
    try {
      localStorage.setItem('autobuy-preferences', JSON.stringify(preferences));
    } catch (e) {
      console.warn('Could not save autobuy preferences:', e);
    }
  }, [preferences]);

  // State
  const [activeView, setActiveView] = useState('optimizer'); // 'optimizer' | 'analytics' | 'config'
  const [loading, setLoading] = useState(false);
  const [progressStatus, setProgressStatus] = useState(''); // 'scraping', 'planning', 'analyzing'
  const [error, setError] = useState(null);
  const [plan, setPlan] = useState(null);
  const [expandedBaskets, setExpandedBaskets] = useState(new Set());

  const [showSettings, setShowSettings] = useState(false);

  // Deck selection state
  const [selectedDeckIds, setSelectedDeckIds] = useState([]);
  const [deckQuantities, setDeckQuantities] = useState({}); // { [deckId]: quantity }

  // Toggle deck selection
  const toggleDeckSelection = (deckId) => {
    setSelectedDeckIds(prev =>
      prev.includes(deckId)
        ? prev.filter(id => id !== deckId)
        : [...prev, deckId]
    );
  };

  // Handle quantity change
  const handleQuantityChange = (e, deckId) => {
    e.stopPropagation();
    const headers = Math.max(1, parseInt(e.target.value) || 1);
    setDeckQuantities(prev => ({
      ...prev,
      [deckId]: headers
    }));
  };

  // Select all / deselect all
  const toggleSelectAllDecks = () => {
    if (selectedDeckIds.length === safeDecks.length) {
      setSelectedDeckIds([]);
    } else {
      setSelectedDeckIds(safeDecks.map(d => d.id));
    }
  };

  // Calculate demand summary from inventory and decks using useMemo
  const demandSummary = useMemo(() => {
    // 1. Map inventory for easy lookup
    const inventoryByName = {};
    const inventoryById = {};
    safeInventory.forEach(item => {
      if (item.name) inventoryByName[normalizeName(item.name)] = item;
      const id = item.scryfall_id || item.card_id;
      if (id) inventoryById[id] = item;
    });

    // 2. Aggregate Needs
    const cardNeeds = new Map(); // ID -> Max(Threshold, DeckRequirements)

    // Add alert thresholds
    safeInventory.forEach(item => {
      if (item.low_inventory_alert && item.quantity < (item.low_inventory_threshold || 0)) {
        const id = item.scryfall_id || item.card_id;
        if (id) {
          cardNeeds.set(id, Math.max(cardNeeds.get(id) || 0, item.low_inventory_threshold || 0));
        }
      }
    });

    // Add selected deck requirements
    const relevantDecks = safeDecks.filter(d => selectedDeckIds.includes(d.id));
    relevantDecks.forEach(deck => {
      (deck.cards || []).forEach(card => {
        let id = card.scryfall_id || card.id;
        if (!id) {
          const invItem = inventoryByName[normalizeName(card.name)];
          if (invItem) id = invItem.scryfall_id || invItem.card_id;
        }

        if (id) {
          const currentNeed = cardNeeds.get(id) || 0;
          // Strategy: The total TARGET inventory for this card
          // Since we want to support multiple decks, we sum up deck requirements?
          // Or do we assume decks share cards?
          // The optimizer logic above sums them up: deckNeeds.set(id, (deckNeeds.get(id) || 0) + qty);
          // But wait, the optimizer logic inside useMemo should mirror the 'runOptimizer' logic.
          // runOptimizer sums deck needs. Let's do that.

          // Actually, we can't easily sum inside this loop structure without a separate map for deck usage.
          // Let's create a specific map for deck needs first.
        }
      });
    });

    // Let's restart the logic to be cleaner and match runOptimizer perfectly.
    const deckNeedsMap = new Map(); // ID (or Name) -> Total Deck Quantity Needed
    let deckCardsCount = 0;

    // Helper to resolve a unique key for the card
    const getCardKey = (card) => {
      // Prefer Scryfall ID, then database ID, then Name
      return card.scryfall_id || card.card_id || card.id || (card.name ? normalizeName(card.name) : null);
    };

    // Helper to get inventory quantity for a key
    const getInventoryQuantity = (key) => {
      if (inventoryById[key]) return inventoryById[key].quantity || 0;
      // Fallback to name lookup if key is a normalized name
      const itemByName = inventoryByName[key];
      if (itemByName) return itemByName.quantity || 0;
      return 0;
    };

    // Helper to check if inventory item has alert for a key
    const getInventoryAlertThreshold = (key) => {
      let item = inventoryById[key];
      if (!item) item = inventoryByName[key]; // Check if key itself is a normalized name
      return item && item.low_inventory_alert ? (item.low_inventory_threshold || 0) : 0;
    };

    relevantDecks.forEach(deck => {
      const quantityMultiplier = deckQuantities[deck.id] || 1;
      (deck.cards || []).forEach(card => {
        deckCardsCount += quantityMultiplier;

        // Resolve ID
        let id = card.scryfall_id || card.id;
        if (!id) {
          const invItem = inventoryByName[normalizeName(card.name)];
          if (invItem) id = invItem.scryfall_id || invItem.card_id;
        }

        // If still no ID, use Name as key
        const key = id || normalizeName(card.name);

        if (key) {
          const qty = parseInt(card.quantity || 1) * quantityMultiplier;
          deckNeedsMap.set(key, (deckNeedsMap.get(key) || 0) + qty);
        }
      });
    });

    // Now calculate actual "To Buy" / "Missing" count
    let missingCardCount = 0;
    const allRelevantKeys = new Set([...cardNeeds.keys(), ...deckNeedsMap.keys()]);

    // Add alert cards
    safeInventory.forEach(item => {
      if (item.low_inventory_alert) {
        const key = item.scryfall_id || item.card_id || normalizeName(item.name);
        if (key) allRelevantKeys.add(key);
      }
    });

    allRelevantKeys.forEach(key => {
      const owned = getInventoryQuantity(key);
      const alertThreshold = getInventoryAlertThreshold(key);
      const deckNeed = deckNeedsMap.get(key) || 0;

      const target = Math.max(alertThreshold, deckNeed);
      if (target > owned) {
        missingCardCount++;
      }
    });

    return {
      alertCards: safeInventory.filter(i => i.low_inventory_alert && i.quantity < (i.low_inventory_threshold || 0)).length,
      deckCards: deckCardsCount,
      uniqueCardsNeeded: missingCardCount,
      totalDecks: safeDecks.length,
      selectedDecks: relevantDecks.length,
    };
  }, [safeInventory, safeDecks, selectedDeckIds, deckQuantities]);

  // Run the autobuy optimizer
  const runOptimizer = async () => {
    setLoading(true);
    setError(null);
    setPlan(null);
    setProgressStatus('Initializing...');

    try {
      // Build demands from inventory alerts AND selected decks
      const demandsMap = new Map(); // CardID -> Quantity Needed

      // 1. Process Inventory Inventory Alerts (Thresholds)
      safeInventory.forEach(item => {
        if (item.low_inventory_alert && item.quantity < (item.low_inventory_threshold || 0)) {
          const id = item.scryfall_id || item.card_id || item.id?.toString();
          if (id) {
            const needed = Math.max(0, (item.low_inventory_threshold || 1) - item.quantity);
            if (needed > 0) {
              demandsMap.set(id, needed);
            }
          }
        }
      });

      // 2. Process Selected Decks
      // Create a map of current inventory by normalized name to match deck cards
      const inventoryByName = {};
      const inventoryById = {};

      safeInventory.forEach(item => {
        if (item.name) inventoryByName[normalizeName(item.name)] = item;
        const id = item.scryfall_id || item.card_id;
        if (id) inventoryById[id] = item;
      });

      // Calculate total needed quantity for each card across all selected decks
      const deckNeeds = new Map(); // CardID -> Total Quantity required by selected decks

      selectedDeckIds.forEach(deckId => {
        const deck = safeDecks.find(d => d.id === deckId);
        const quantityMultiplier = deckQuantities[deckId] || 1;

        if (deck && deck.cards) {
          deck.cards.forEach(card => {
            // Resolve ID
            let id = card.scryfall_id || card.id;
            if (!id) {
              const invItem = inventoryByName[normalizeName(card.name)];
              if (invItem) id = invItem.scryfall_id || invItem.card_id;
            }

            // Use ID or fallback to normalized name
            const key = id || normalizeName(card.name);

            if (key) {
              const qty = parseInt(card.quantity || 1) * quantityMultiplier;
              deckNeeds.set(key, (deckNeeds.get(key) || 0) + qty);
            }
          });
        }
      });

      const allKeys = new Set([...demandsMap.keys(), ...deckNeeds.keys()]);
      deckNeeds.forEach((qty, key) => allKeys.add(key));

      // 3. Merge Deck Needs into Demands
      // Helper to get needed info
      const getInventoryQuantity = (key) => {
        if (inventoryById[key]) return inventoryById[key].quantity || 0;
        const itemByName = inventoryByName[key];
        if (itemByName) return itemByName.quantity || 0;
        return 0;
      };
      const getInventoryAlertThreshold = (key) => {
        let item = inventoryById[key];
        if (!item) item = inventoryByName[key];
        return item && item.low_inventory_alert ? (item.low_inventory_threshold || 0) : 0;
      };

      allKeys.forEach((key) => {
        const currentOwned = getInventoryQuantity(key);
        const threshold = getInventoryAlertThreshold(key);
        const deckNeeded = deckNeeds.get(key) || 0;

        const totalTarget = Math.max(threshold, deckNeeded);
        const toBuy = Math.max(0, totalTarget - currentOwned);

        if (toBuy > 0) {
          demandsMap.set(key, toBuy);
        }
      });

      const demands = Array.from(demandsMap.entries()).map(([cardId, quantity]) => ({
        cardId,
        quantity
      }));

      // Build CK prices from inventory
      const cardKingdomPrices = {};
      safeInventory.forEach(item => {
        if (item.ck_price && (item.scryfall_id || item.card_id)) {
          cardKingdomPrices[item.scryfall_id || item.card_id] = item.ck_price;
        }
      });

      // Build current inventory map
      const currentInventory = {};
      safeInventory.forEach(item => {
        const id = item.scryfall_id || item.card_id;
        if (id) {
          currentInventory[id] = item.quantity || 0;
        }
      });

      // Build hot list from high-value cards with alerts
      const hotList = safeInventory
        .filter(item => item.low_inventory_alert && item.ck_price > 1)
        .map(item => ({
          cardId: item.scryfall_id || item.card_id,
          IPS: item.ck_price * 0.1, // Simple IPS approximation
          targetInventory: item.low_inventory_threshold || 4,
        }));

      // Fetch real marketplace offers for demanded cards
      let offers = [];
      const cardIds = demands.map(d => d.cardId).filter(Boolean);

      if (cardIds.length > 0) {
        setProgressStatus(`Scraping live prices for ${cardIds.length} cards...`);
        try {
          // Prepare card requests for scraper
          const cardRequests = demands.map(d => {
            const id = d.cardId;
            let name = id;
            let scryfallId = id;

            if (inventoryById[id]) {
              name = inventoryById[id].name;
              scryfallId = inventoryById[id].scryfall_id || id;
            } else if (inventoryByName[normalizeName(id)]) {
              const item = inventoryByName[normalizeName(id)];
              name = item.name;
              scryfallId = item.scryfall_id || id;
            }
            return { name, scryfallId };
          });

          // Call Playwright Scraper
          console.log('[Autobuy] Invoking TCGPlayer scraper for', cardRequests.length, 'cards');
          const scraperResp = await fetch('/api/autobuy/scrape-tcgplayer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cardRequests, skipCache: false }),
          });

          if (scraperResp.ok) {
            const { offers: scrapedOffers, errors } = await scraperResp.json();
            offers = scrapedOffers || [];
            console.log('[Autobuy] Scraper returned', offers.length, 'offers. Errors:', errors);
            if (errors?.length > 0) {
              console.warn('Scraper reported errors:', errors);
            }
          } else {
            console.warn('Scraper failed', await scraperResp.text());
          }
        } catch (offerErr) {
          console.warn('Could not scrape offers:', offerErr);
        }
      }

      console.log('[Autobuy] Sending to planner. Demands:', demands.length, 'Offers:', offers.length);

      setProgressStatus('Generating optimal purchase plan...');

      const requestBody = {
        demands,
        offers,
        hotList,
        cardKingdomPrices,
        currentInventory,
        directives: [],
        ...(preferences.enableBudgetLimits && {
          budget: {
            maxTotalSpend: preferences.maxTotalSpend,
            maxPerSeller: preferences.maxPerSeller,
            maxPerCard: preferences.maxPerCard,
            maxSpeculativeSpend: preferences.maxSpeculativeSpend,
            reserveBudgetPercent: preferences.reserveBudgetPercent,
            budgetMode: preferences.budgetMode,
          }
        }),
      };

      const resp = await fetch('/api/autobuy/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!resp.ok) {
        throw new Error(`API error: ${resp.status}`);
      }

      const result = await resp.json();

      if (result.error) {
        throw new Error(result.error);
      }

      setPlan(result);

      // Successfully generated plan - start tracking run
      setProgressStatus('Finalizing analytics...');
      try {
        const analyticsItems = [];
        if (result.baskets) {
          result.baskets.forEach(basket => {
            if (basket.items) {
              basket.items.forEach(item => {
                analyticsItems.push({
                  cardId: item.cardId,
                  cardName: item.cardName || item.cardId,
                  predictedPrice: item.price || 0,
                  quantity: item.quantity,
                  sellerId: basket.sellerId,
                  marketplace: basket.marketplace
                });
              });
            }
          });
        }

        const runResp = await fetch('/api/autobuy/analytics/runs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            predictedTotal: result.summary?.overallTotal || 0,
            items: analyticsItems
          })
        });

        if (runResp.ok) {
          const runData = await runResp.json();
          setPlan(prev => ({
            ...prev,
            meta: { ...prev.meta, runId: runData.runId }
          }));
        }
      } catch (analyticsErr) {
        console.error('Failed to start analytics run', analyticsErr);
      }
    } catch (err) {
      setError(err.message || 'Failed to run optimizer');
    } finally {
      setLoading(false);
      setProgressStatus('');
    }
  };

  // Toggle basket expansion
  const toggleBasket = (sellerId) => {
    setExpandedBaskets(prev => {
      const next = new Set(prev);
      if (next.has(sellerId)) {
        next.delete(sellerId);
      } else {
        next.add(sellerId);
      }
      return next;
    });
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount || 0);
  };

  // Get marketplace color
  const getMarketplaceColor = (marketplace) => {
    const colors = {
      TCG: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      MANABOX: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      CK: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    };
    return colors[marketplace] || 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  };

  // Get marketplace deep link
  const getMarketplaceLink = (basket) => {
    const { marketplace, items } = basket;
    const cardIds = items?.map(i => i.cardId).join(',') || '';

    switch (marketplace) {
      case 'TCG':
        return `https://www.tcgplayer.com/massentry?c=${encodeURIComponent(cardIds)}`;
      case 'CK':
        return `https://www.cardkingdom.com/builder?cards=${encodeURIComponent(cardIds)}`;
      case 'MANABOX':
        return `https://manabox.app/`;
      default:
        return '#';
    }
  };

  return (
    <div className="autobuy-tab space-y-6">
      {/* Header */}
      {/* Header */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] items-center gap-4">
        <div className="justify-self-start">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShoppingCart className="w-7 h-7 text-emerald-400" />
            Auto-Buy Optimizer
          </h2>
          <p className="text-slate-400 mt-1">
            Optimize card purchases and track performance
          </p>
        </div>

        <div className="justify-self-center flex items-center gap-2 bg-white/5 backdrop-blur-md p-1.5 rounded-xl border border-white/10 shadow-lg">
          <button
            onClick={() => setActiveView('optimizer')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 relative overflow-hidden group ${activeView === 'optimizer'
              ? 'bg-gradient-to-br from-[var(--primary)] to-purple-600 text-white shadow-lg shadow-indigo-500/25 scale-[1.02]'
              : 'text-[var(--text-muted)] hover:text-white hover:bg-white/5'
              }`}
          >
            <LayoutDashboard className={`w-4 h-4 transition-transform duration-300 ${activeView === 'optimizer' ? 'scale-110' : 'group-hover:scale-110'}`} />
            <span>Optimizer</span>
            {activeView === 'optimizer' && <div className="absolute inset-0 -translate-x-full animate-shine bg-gradient-to-r from-transparent via-white/10 to-transparent" />}
          </button>
          <button
            onClick={() => setActiveView('analytics')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 relative overflow-hidden group ${activeView === 'analytics'
              ? 'bg-gradient-to-br from-[var(--primary)] to-purple-600 text-white shadow-lg shadow-indigo-500/25 scale-[1.02]'
              : 'text-[var(--text-muted)] hover:text-white hover:bg-white/5'
              }`}
          >
            <BarChart3 className={`w-4 h-4 transition-transform duration-300 ${activeView === 'analytics' ? 'scale-110' : 'group-hover:scale-110'}`} />
            <span>Analytics</span>
            {activeView === 'analytics' && <div className="absolute inset-0 -translate-x-full animate-shine bg-gradient-to-r from-transparent via-white/10 to-transparent" />}
          </button>
          <button
            onClick={() => setActiveView('config')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 relative overflow-hidden group ${activeView === 'config'
              ? 'bg-gradient-to-br from-[var(--primary)] to-purple-600 text-white shadow-lg shadow-indigo-500/25 scale-[1.02]'
              : 'text-[var(--text-muted)] hover:text-white hover:bg-white/5'
              }`}
          >
            <Layers className={`w-4 h-4 transition-transform duration-300 ${activeView === 'config' ? 'scale-110' : 'group-hover:scale-110'}`} />
            <span>Config</span>
            {activeView === 'config' && <div className="absolute inset-0 -translate-x-full animate-shine bg-gradient-to-r from-transparent via-white/10 to-transparent" />}
          </button>
        </div>

        <div className="justify-self-end flex gap-2">
          {activeView === 'optimizer' && (
            <>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${showSettings
                  ? 'bg-[var(--surface-active)] text-white'
                  : 'bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover)] border border-[var(--border)]'
                  }`}
              >
                <Settings className="w-4 h-4" />
                Settings
              </button>
              <button
                onClick={runOptimizer}
                disabled={loading}
                className="px-6 py-2 btn-primary disabled:opacity-50 disabled:cursor-not-allowed rounded-lg flex items-center gap-2 font-medium transition-colors shadow-lg shadow-[var(--accent)]/20"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {progressStatus || 'Optimizing...'}
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Run Optimizer
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {activeView === 'optimizer' ? (
        <>
          {/* Settings Panel */}
          {showSettings && (
            <div className="glass-panel p-6 space-y-4 animate-slideIn">
              <h3 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
                <Settings className="w-5 h-5 text-[var(--text-muted)]" />
                Optimization Settings
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Price Threshold */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">
                    Price Threshold (% of CK)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="50"
                      max="120"
                      value={preferences.priceThresholdPercent}
                      onChange={(e) => setPreferences(p => ({ ...p, priceThresholdPercent: Number(e.target.value) }))}
                      className="flex-1"
                    />
                    <span className="text-white font-mono w-12 text-right">
                      {preferences.priceThresholdPercent}%
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Only buy cards priced at or below this % of Card Kingdom price
                  </p>
                </div>

                {/* Min Seller Rating */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">
                    Minimum Seller Rating
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={preferences.minSellerRating * 100}
                      onChange={(e) => setPreferences(p => ({ ...p, minSellerRating: Number(e.target.value) / 100 }))}
                      className="flex-1"
                    />
                    <span className="text-white font-mono w-12 text-right">
                      {(preferences.minSellerRating * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>

                {/* Max Sellers */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">
                    Max Sellers Per Order
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={preferences.maxSellersPerOrder}
                    onChange={(e) => setPreferences(p => ({ ...p, maxSellersPerOrder: Number(e.target.value) }))}
                    className="w-full input"
                  />
                </div>

                {/* Inventory Time Horizon */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">
                    Inventory Time Horizon (days)
                  </label>
                  <input
                    type="number"
                    min="7"
                    max="90"
                    value={preferences.inventoryTimeHorizon}
                    onChange={(e) => setPreferences(p => ({ ...p, inventoryTimeHorizon: Number(e.target.value) }))}
                    className="w-full input"
                  />
                </div>

                {/* Toggle Options */}
                <div className="space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.allowHotListFiller}
                      onChange={(e) => setPreferences(p => ({ ...p, allowHotListFiller: e.target.checked }))}
                      className="rounded border-slate-600 bg-slate-700 text-emerald-500 focus:ring-emerald-500"
                    />
                    <span className="text-sm text-slate-300">Allow Hot List filler cards</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.allowSpeculativeOverbuying}
                      onChange={(e) => setPreferences(p => ({ ...p, allowSpeculativeOverbuying: e.target.checked }))}
                      className="rounded border-slate-600 bg-slate-700 text-emerald-500 focus:ring-emerald-500"
                    />
                    <span className="text-sm text-slate-300">Allow speculative overbuying</span>
                  </label>
                </div>
              </div>

              {/* Budget Controls Section */}
              <div className="border-t border-slate-700 pt-4 mt-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-md font-semibold text-white flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                    Budget Controls
                  </h4>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.enableBudgetLimits}
                      onChange={(e) => setPreferences(p => ({ ...p, enableBudgetLimits: e.target.checked }))}
                      className="rounded border-slate-600 bg-slate-700 text-emerald-500 focus:ring-emerald-500"
                    />
                    <span className="text-sm text-slate-300">Enable Budget Limits</span>
                  </label>
                </div>

                {preferences.enableBudgetLimits && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Budget Mode */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-300">
                        Enforcement Mode
                      </label>
                      <div className="flex bg-slate-700 p-1 rounded-lg">
                        <button
                          onClick={() => setPreferences(p => ({ ...p, budgetMode: 'STRICT' }))}
                          className={`flex-1 py-1.5 px-3 rounded text-xs font-medium transition-colors ${preferences.budgetMode === 'STRICT'
                            ? 'bg-slate-500 text-white shadow-sm'
                            : 'text-slate-400 hover:text-white'
                            }`}
                        >
                          Strict
                        </button>
                        <button
                          onClick={() => setPreferences(p => ({ ...p, budgetMode: 'SOFT' }))}
                          className={`flex-1 py-1.5 px-3 rounded text-xs font-medium transition-colors ${preferences.budgetMode === 'SOFT'
                            ? 'bg-emerald-600/80 text-white shadow-sm'
                            : 'text-slate-400 hover:text-white'
                            }`}
                        >
                          Soft
                        </button>
                      </div>
                      <p className="text-xs text-slate-500">
                        {preferences.budgetMode === 'STRICT'
                          ? 'Stop exactly at limit'
                          : 'Allow overspend for demand'}
                      </p>
                    </div>

                    {/* Max Total Spend */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-300">
                        Max Total Spend
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">$</span>
                        <input
                          type="number"
                          min="1"
                          step="10"
                          value={preferences.maxTotalSpend}
                          onChange={(e) => setPreferences(p => ({ ...p, maxTotalSpend: Number(e.target.value) }))}
                          className="flex-1 input"
                        />
                      </div>
                      <p className="text-xs text-slate-500">Hard cap on total purchase amount</p>
                    </div>

                    {/* Max Per Seller */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-300">
                        Max Per Seller
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">$</span>
                        <input
                          type="number"
                          min="1"
                          step="10"
                          value={preferences.maxPerSeller}
                          onChange={(e) => setPreferences(p => ({ ...p, maxPerSeller: Number(e.target.value) }))}
                          className="flex-1 input"
                        />
                      </div>
                      <p className="text-xs text-slate-500">Maximum spend per seller basket</p>
                    </div>

                    {/* Max Per Card */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-300">
                        Max Per Card
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">$</span>
                        <input
                          type="number"
                          min="1"
                          step="5"
                          value={preferences.maxPerCard}
                          onChange={(e) => setPreferences(p => ({ ...p, maxPerCard: Number(e.target.value) }))}
                          className="flex-1 input"
                        />
                      </div>
                      <p className="text-xs text-slate-500">Skip cards priced above this</p>
                    </div>

                    {/* Max Speculative Spend */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-300">
                        Max Speculative Spend
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">$</span>
                        <input
                          type="number"
                          min="0"
                          step="10"
                          value={preferences.maxSpeculativeSpend}
                          onChange={(e) => setPreferences(p => ({ ...p, maxSpeculativeSpend: Number(e.target.value) }))}
                          className="flex-1 input"
                        />
                      </div>
                      <p className="text-xs text-slate-500">Cap on Hot List (non-demand) spending</p>
                    </div>

                    {/* Reserve Budget Percent */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-300">
                        Reserve Budget
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min="0"
                          max="50"
                          value={preferences.reserveBudgetPercent}
                          onChange={(e) => setPreferences(p => ({ ...p, reserveBudgetPercent: Number(e.target.value) }))}
                          className="flex-1"
                        />
                        <span className="text-white font-mono w-12 text-right">
                          {preferences.reserveBudgetPercent}%
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">Reserved for Card Kingdom fallback</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ... (existing content) ... */}

          {/* Purchase Plan Results */}
          {plan && (
            <div className="space-y-4">
              {/* Summary Header */}
              <div className="bg-gradient-to-r from-[var(--accent)]/20 via-[var(--accent)]/10 to-transparent border border-[var(--accent)]/20 rounded-xl p-6 shadow-lg shadow-[var(--accent)]/5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                      <CheckCircle className="w-6 h-6 text-[var(--accent)]" />
                      Purchase Plan Ready
                    </h3>
                    <p className="text-[var(--text-muted)] mt-1">
                      {plan.summary?.totalBaskets || 0} seller baskets optimized
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="text-right">
                      <div className="text-sm text-slate-400">Total Cost</div>
                      <div className="text-3xl font-bold text-emerald-400">
                        {formatCurrency(plan.summary?.overallTotal)}
                      </div>
                    </div>
                    {/* Mark as Purchased Button */}
                    {!plan.meta?.purchased && (
                      <button
                        onClick={async () => {
                          if (!plan.meta?.runId) return;
                          try {
                            const resp = await fetch(`/api/autobuy/analytics/runs/${plan.meta.runId}`, {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                status: 'purchased',
                                actualTotal: plan.summary?.overallTotal || 0
                              })
                            });
                            if (resp.ok) {
                              setPlan(prev => ({
                                ...prev,
                                meta: { ...prev.meta, purchased: true }
                              }));
                            }
                          } catch (e) {
                            console.error('Failed to mark as purchased', e);
                          }
                        }}
                        className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Mark as Purchased
                      </button>
                    )}
                    {plan.meta?.purchased && (
                      <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded text-sm font-medium border border-emerald-500/20 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        Purchased
                      </span>
                    )}
                  </div>
                </div>
              </div>


              {/* Budget Utilization Display */}
              {plan.budget && (
                <div className="glass-panel p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-[var(--accent)]" />
                      Budget Utilization
                    </h4>
                    <span className={`text-lg font-bold ${plan.budget.budgetUtilization >= 95 ? 'text-red-400' :
                      plan.budget.budgetUtilization >= 80 ? 'text-amber-400' : 'text-emerald-400'
                      }`}>
                      {plan.budget.budgetUtilization.toFixed(1)}%
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${plan.budget.budgetUtilization >= 95 ? 'bg-gradient-to-r from-red-500 to-red-400' :
                        plan.budget.budgetUtilization >= 80 ? 'bg-gradient-to-r from-amber-500 to-amber-400' :
                          'bg-gradient-to-r from-emerald-500 to-emerald-400'
                        }`}
                      style={{ width: `${Math.min(100, plan.budget.budgetUtilization)}%` }}
                    />
                  </div>

                  {/* Spend Breakdown */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div className="bg-slate-700/50 rounded-lg p-2">
                      <div className="text-slate-400 text-xs">Demand Spend</div>
                      <div className="text-white font-medium">{formatCurrency(plan.budget.demandSpend)}</div>
                    </div>
                    <div className="bg-slate-700/50 rounded-lg p-2">
                      <div className="text-slate-400 text-xs">Speculative</div>
                      <div className="text-white font-medium">{formatCurrency(plan.budget.speculativeSpend)}</div>
                    </div>
                    <div className="bg-slate-700/50 rounded-lg p-2">
                      <div className="text-slate-400 text-xs">Reserved</div>
                      <div className="text-white font-medium">{formatCurrency(plan.budget.reservedBudget)}</div>
                    </div>
                    <div className="bg-slate-700/50 rounded-lg p-2">
                      <div className="text-slate-400 text-xs">Total</div>
                      <div className="text-white font-medium">{formatCurrency(plan.budget.totalSpend)}</div>
                    </div>
                  </div>

                  {/* Warnings */}
                  {plan.budget.warnings && plan.budget.warnings.length > 0 && (
                    <div className="space-y-2">
                      {plan.budget.warnings.map((warning, idx) => (
                        <div
                          key={idx}
                          className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${warning.includes('HARD BUDGET EXCEEDED')
                            ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}
                        >
                          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                          <span>{warning}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Hard Budget Exceeded Badge */}
                  {plan.budget.hardBudgetExceeded && (
                    <div className="flex items-center justify-center gap-2 bg-red-500/20 border border-red-500/30 rounded-lg py-2 text-red-400 font-medium">
                      <AlertCircle className="w-5 h-5" />
                      Hard Budget Exceeded - Review Required
                    </div>
                  )}
                </div>
              )}

              {/* Seller Baskets */}
              <div className="space-y-3">
                {(plan.baskets || []).map((basket) => (
                  <div
                    key={basket.sellerId}
                    className="neo-card overflow-hidden transition-all duration-200 hover:shadow-md"
                  >
                    {/* Basket Header */}
                    <button
                      onClick={() => toggleBasket(basket.sellerId)}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-[var(--card-hover)] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium border ${getMarketplaceColor(basket.marketplace)}`}>
                          {basket.marketplace}
                        </span>
                        <span className="font-medium text-white">{basket.sellerId}</span>
                        <span className="text-sm text-slate-400">
                          {basket.items?.length || 0} cards
                        </span>
                        {basket.freeShippingTriggered && (
                          <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">
                            <Truck className="w-3 h-3" />
                            Free Shipping
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-white font-medium">{formatCurrency(basket.totalCost)}</div>
                          {basket.shippingCost > 0 && (
                            <div className="text-xs text-slate-400">
                              +{formatCurrency(basket.shippingCost)} shipping
                            </div>
                          )}
                        </div>
                        {expandedBaskets.has(basket.sellerId) ? (
                          <ChevronUp className="w-5 h-5 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                    </button>

                    {/* Expanded Content */}
                    {expandedBaskets.has(basket.sellerId) && (
                      <div className="border-t border-slate-700">
                        <div className="p-4 space-y-2">
                          {(basket.items || []).map((item, idx) => (
                            <div
                              key={`${item.cardId}-${idx}`}
                              className="flex items-center justify-between py-2 px-3 bg-[var(--background)] rounded-lg border border-[var(--border)]/50"
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-medium text-[var(--text-primary)]">{item.cardId}</span>
                                <span className="text-xs text-[var(--text-muted)]">×{item.quantity}</span>
                              </div>
                              {basket.reasons?.[item.cardId] && (
                                <div className="flex gap-1">
                                  {basket.reasons[item.cardId].map((reason, i) => (
                                    <span
                                      key={i}
                                      className="text-xs px-2 py-0.5 rounded bg-[var(--muted-surface)] text-[var(--text-secondary)] border border-[var(--border)]"
                                    >
                                      {reason}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Action Buttons */}
                        <div className="px-4 py-3 border-t border-[var(--border)] flex justify-end gap-2">
                          <a
                            href={getMarketplaceLink(basket)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-[var(--muted-surface)] hover:bg-[var(--card-hover)] text-[var(--text-primary)] border border-[var(--border)] rounded-lg flex items-center gap-2 text-sm transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                            Open in {basket.marketplace}
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Empty State */}
              {(!plan.baskets || plan.baskets.length === 0) && (
                <div className="surface p-8 text-center">
                  <Info className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3" />
                  <h4 className="text-lg font-medium text-[var(--text-primary)]">No Purchases Needed</h4>
                  <p className="text-sm text-[var(--text-muted)] mt-1">
                    Your inventory is fully stocked based on current demand
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Initial State */}
          {!plan && !loading && !error && (
            <div className="space-y-6 animate-fade-in">
              {/* Demand Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatsCard
                  title="Items Needed"
                  value={demandSummary.uniqueCardsNeeded}
                  icon={ShoppingCart}
                  color="emerald"
                  subtitle="Unique cards across decks & alerts"
                />
                <StatsCard
                  title="Low Inventory Alerts"
                  value={demandSummary.alertCards}
                  icon={AlertTriangle}
                  color="amber"
                  subtitle="Cards below threshold"
                />
                <StatsCard
                  title="Decks Selected"
                  value={demandSummary.selectedDecks}
                  icon={LayoutDashboard}
                  color="blue"
                  subtitle={`${demandSummary.totalDecks} total built/queued decks`}
                />
              </div>

              {/* Deck Selection Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Layers className="w-5 h-5 text-[var(--accent)]" />
                    Select Decks to Optimize
                  </h3>
                  {safeDecks.length > 0 && (
                    <button
                      onClick={toggleSelectAllDecks}
                      className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1"
                    >
                      {selectedDeckIds.length === safeDecks.length ? (
                        <>
                          <Square className="w-4 h-4" /> Deselect All
                        </>
                      ) : (
                        <>
                          <CheckSquare className="w-4 h-4" /> Select All
                        </>
                      )}
                    </button>
                  )}
                </div>

                {safeDecks.length === 0 ? (
                  <div className="p-8 text-center border-2 border-dashed border-[var(--border)] rounded-xl bg-[var(--surface)]/50">
                    <p className="text-[var(--text-muted)]">No decks found. Import or create decks to optimize them.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {safeDecks.map(deck => {
                      const isSelected = selectedDeckIds.includes(deck.id);
                      // Calculate completion for this specific deck locally to show status
                      // (Or rely on passed prop if available, but doing it simple here)
                      const cardCount = deck.cards?.length || 0;
                      const quantity = deckQuantities[deck.id] || 1;

                      return (
                        <div
                          key={deck.id}
                          onClick={() => toggleDeckSelection(deck.id)}
                          className={`
                             cursor-pointer relative overflow-hidden rounded-lg border transition-all duration-200 group
                             ${isSelected
                              ? 'bg-[var(--primary)]/10 border-[var(--primary)] shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                              : 'bg-[var(--surface)] border-[var(--border)] hover:border-[var(--text-muted)] hover:bg-[var(--card-hover)]'
                            }
                           `}
                        >
                          <div className="p-3">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className={`font-medium truncate pr-4 ${isSelected ? 'text-white' : 'text-[var(--text-primary)]'}`}>
                                {deck.name}
                              </h4>
                              <div className={`flex-shrink-0 transition-colors ${isSelected ? 'text-[var(--primary)]' : 'text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]'}`}>
                                {isSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                              </div>
                            </div>
                            <div className="mt-2 flex items-center justify-between text-xs text-[var(--text-muted)]">
                              <span>{deck.format}</span>
                              {isSelected ? (
                                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                  <span className="text-[var(--text-primary)]">Qty:</span>
                                  <input
                                    type="number"
                                    min="1"
                                    max="99"
                                    value={quantity}
                                    onChange={(e) => handleQuantityChange(e, deck.id)}
                                    className="w-12 px-1 py-0.5 text-xs bg-[var(--background)] border border-[var(--border)] rounded text-center focus:border-[var(--primary)] focus:outline-none text-white"
                                  />
                                </div>
                              ) : (
                                <span>{cardCount} cards</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="glass-panel p-12 text-center border-2 border-dashed border-[var(--border)]">
                <div className="w-20 h-20 bg-[var(--primary)]/10 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-[var(--primary)]/5 ring-1 ring-[var(--primary)]/20">
                  <Play className="w-10 h-10 text-[var(--primary)] pl-1" />
                </div>
                <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 mb-3">Ready to Optimize</h3>
                <p className="text-[var(--text-secondary)] text-lg max-w-xl mx-auto mb-8">
                  Click "Run Optimizer" to analyze your inventory against requirements and find the best purchase strategy across TCGPlayer, Card Kingdom, and ManaBox.
                </p>
                <button
                  onClick={runOptimizer}
                  className="px-8 py-4 btn-primary text-white rounded-xl flex items-center gap-3 font-bold text-lg transition-all hover:scale-105 active:scale-95 mx-auto shadow-xl shadow-[var(--accent)]/30"
                >
                  <Play className="w-6 h-6" />
                  Run Optimizer Engine
                </button>
              </div>
            </div>
          )}

          {/* Metadata */}
          {plan?.meta && (
            <div className="text-xs text-[var(--text-muted)] text-center">
              Run ID: {plan.meta.runId} • Generated: {new Date(plan.meta.createdAt).toLocaleString()}
            </div>
          )}
        </>
      ) : activeView === 'analytics' ? (
        <AnalyticsDashboard />
      ) : (
        <div className="space-y-8">
          <SubstitutionGroupsManager />
          <div className="border-t border-[var(--border)]" />

        </div>
      )}
    </div>
  );
}

AutobuyTab.propTypes = {
  inventory: PropTypes.arrayOf(PropTypes.object),
  decks: PropTypes.arrayOf(PropTypes.object),
};

export default AutobuyTab;
