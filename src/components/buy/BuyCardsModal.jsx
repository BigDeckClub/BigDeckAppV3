import React, { useState, useMemo, useEffect, memo } from 'react';
import PropTypes from 'prop-types';
import { ShoppingCart, Copy, ExternalLink, Plus, Minus, Check, Search } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { MarketplaceSelector } from './MarketplaceSelector';
import { useMarketplacePreferences } from '../../hooks/useMarketplacePreferences';
import { useToast, TOAST_TYPES } from '../../context/ToastContext';
import { usePriceCache } from '../../context/PriceCacheContext';
import { MARKETPLACES, buildCartUrl, buildClipboardText } from '../../utils/marketplaceUrls';
import { ColorFilterChips } from '../ui/ColorFilterChips';
import { useColorFilter } from '../../hooks/useColorFilter';

/**
 * Helper function to create initial card selections
 */
const createInitialSelections = (cards) => {
  const selections = {};
  cards.forEach((card, index) => {
    const key = `${card.name}-${index}`;
    selections[key] = {
      selected: true,
      quantity: card.quantity || 1,
    };
  });
  return selections;
};

/**
 * BuyCardsModal - Modal for purchasing missing cards from marketplaces
 */
export const BuyCardsModal = memo(function BuyCardsModal({
  isOpen,
  onClose,
  cards = [],
  deckName,
}) {
  const { showToast } = useToast();
  const priceCache = usePriceCache?.();
  const getPrice = priceCache?.getPrice;
  const {
    preferredMarketplace,
    setPreferredMarketplace,
    rememberPreference,
    setRememberPreference,
  } = useMarketplacePreferences();

  // Initialize card selection state with all cards selected
  const [cardSelections, setCardSelections] = useState(() => createInitialSelections(cards));
  const [sortDirection, setSortDirection] = useState('desc'); // 'asc' | 'desc'
  const [searchQuery, setSearchQuery] = useState('');
  const [priceData, setPriceData] = useState({});

  // Color filter hook
  const {
    selectedFilters: colorFilters,
    toggleFilter: toggleColorFilter,
    clearFilters: clearColorFilters,
    filterCard: matchesColorFilter,
    isLoading: colorFilterLoading,
  } = useColorFilter({ cards, enabled: isOpen });

  // Reset selections when cards change
  useEffect(() => {
    setCardSelections(createInitialSelections(cards));
  }, [cards]);

  // Get selected cards with their quantities
  const selectedCards = useMemo(() => {
    return cards
      .map((card, index) => {
        const key = `${card.name}-${index}`;
        const selection = cardSelections[key];
        if (selection?.selected) {
          return {
            name: card.name,
            quantity: selection.quantity,
            set: card.set,
          };
        }
        return null;
      })
      .filter(Boolean);
  }, [cards, cardSelections]);

  const getSetCode = (set) => {
    if (!set) return '';
    if (typeof set === 'string') return set;
    return set.editioncode || set.mtgoCode || set.code || '';
  };

  const priceToNumber = (value) => {
    if (value === undefined || value === null) return null;
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value.replace(/[^0-9.]/g, ''));
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  };

  const formatPrice = (value) => {
    if (value === undefined || value === null) return 'N/A';
    if (typeof value === 'number' && Number.isFinite(value)) return `$${value.toFixed(2)}`;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return 'N/A';
      if (trimmed.startsWith('$')) return trimmed;
      const parsed = parseFloat(trimmed);
      return Number.isFinite(parsed) ? `$${parsed.toFixed(2)}` : 'N/A';
    }
    return 'N/A';
  };

  const getTcgPrice = (key, card) => priceData[key]?.tcg ?? card.tcgPrice ?? card.tcg ?? null;
  const getPrimaryPrice = (key, card) => {
    const tcg = getTcgPrice(key, card);
    if (tcg !== undefined && tcg !== null) return tcg;
    return card.price ?? card.estimatedPrice ?? null;
  };

  const filteredCards = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return cards
      .map((card, index) => {
        const selectionKey = `${card.name}-${index}`;
        const priceKey = `${card.name}-${getSetCode(card.set) || index}`;
        return { card, index, selectionKey, priceKey };
      })
      .filter(({ card }) => {
        const matchesSearch = !query || card.name.toLowerCase().includes(query);
        const passesColorFilter = colorFilters.length === 0 || matchesColorFilter(card);
        return matchesSearch && passesColorFilter;
      });
  }, [cards, searchQuery, colorFilters, matchesColorFilter]);

  const cardsNeedingPrices = useMemo(() => {
    return cards
      .map((card, index) => {
        const setCode = getSetCode(card.set);
        const priceKey = `${card.name}-${setCode || index}`;
        return { card, priceKey, setCode };
      })
      .filter(({ priceKey }) => !priceData[priceKey]);
  }, [cards, priceData]);

  // Sort cards by available TCG price (fallback to estimated price)
  const sortedCards = useMemo(() => {
    return [...filteredCards]
      .sort((a, b) => {
        const paRaw = getPrimaryPrice(a.priceKey, a.card);
        const pbRaw = getPrimaryPrice(b.priceKey, b.card);
        const pa = priceToNumber(paRaw);
        const pb = priceToNumber(pbRaw);

        if (pa === null && pb === null) return a.card.name.localeCompare(b.card.name);
        if (pa === null) return 1;
        if (pb === null) return -1;

        const diff = sortDirection === 'asc' ? pa - pb : pb - pa;
        return diff !== 0 ? diff : a.card.name.localeCompare(b.card.name);
      });
  }, [filteredCards, sortDirection]);

  // Prefetch TCG prices for all cards when modal is open (throttled to avoid rate limiting)
  useEffect(() => {
    if (!isOpen || !getPrice) return undefined;
    let cancelled = false;

    const fetchPricesThrottled = async () => {
      const queue = [...cardsNeedingPrices];
      const concurrency = 8; // keep burst under server rate limit

      const workers = Array.from({ length: concurrency }, async () => {
        while (queue.length && !cancelled) {
          const next = queue.shift();
          if (!next) break;
          const { card, priceKey, setCode } = next;
          try {
            const result = await getPrice(card.name, setCode);
            if (!cancelled) {
              setPriceData(prev => (prev[priceKey] ? prev : { ...prev, [priceKey]: { tcg: result?.tcg ?? result ?? null } }));
            }
          } catch (error) {
            if (!cancelled) {
              setPriceData(prev => (prev[priceKey] ? prev : { ...prev, [priceKey]: { tcg: null } }));
            }
          }
        }
      });

      await Promise.all(workers);
    };

    fetchPricesThrottled();
    return () => {
      cancelled = true;
    };
  }, [cardsNeedingPrices, getPrice, isOpen]);

  const selectedCount = selectedCards.length;
  const totalQuantity = selectedCards.reduce((sum, c) => sum + c.quantity, 0);

  const handleSelectAll = () => {
    const newSelections = {};
    cards.forEach((card, index) => {
      const key = `${card.name}-${index}`;
      newSelections[key] = {
        selected: true,
        quantity: cardSelections[key]?.quantity || card.quantity || 1,
      };
    });
    setCardSelections(newSelections);
  };

  const handleDeselectAll = () => {
    const newSelections = {};
    cards.forEach((card, index) => {
      const key = `${card.name}-${index}`;
      newSelections[key] = {
        selected: false,
        quantity: cardSelections[key]?.quantity || card.quantity || 1,
      };
    });
    setCardSelections(newSelections);
  };

  const handleToggleCard = (card, index) => {
    const key = `${card.name}-${index}`;
    setCardSelections(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        selected: !prev[key]?.selected,
      },
    }));
  };

  const handleQuantityChange = (card, index, delta) => {
    const key = `${card.name}-${index}`;
    setCardSelections(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        quantity: Math.max(1, (prev[key]?.quantity || 1) + delta),
      },
    }));
  };

  const handleCopyToClipboard = async () => {
    if (selectedCards.length === 0) {
      showToast('⚠️ No cards selected', TOAST_TYPES.WARNING);
      return;
    }

    const text = buildClipboardText(preferredMarketplace, selectedCards);
    try {
      await navigator.clipboard.writeText(text);
      showToast(`📋 ${totalQuantity} cards copied to clipboard!`, TOAST_TYPES.SUCCESS);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      showToast('Failed to copy to clipboard', TOAST_TYPES.ERROR);
    }
  };

  const handleOpenMarketplace = () => {
    if (selectedCards.length === 0) {
      showToast('⚠️ No cards selected', TOAST_TYPES.WARNING);
      return;
    }

    const url = buildCartUrl(preferredMarketplace, selectedCards);
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
      showToast(`🔗 Opening ${MARKETPLACES[preferredMarketplace].name} with ${totalQuantity} cards...`, TOAST_TYPES.SUCCESS);
    }
  };

  const marketplace = MARKETPLACES[preferredMarketplace];

  const modalTitle = (
    <div className="flex items-center gap-2">
      <ShoppingCart className="w-5 h-5 text-teal-400" />
      <span>Buy Missing Cards</span>
    </div>
  );

  const footer = (
    <>
      <button
        onClick={handleCopyToClipboard}
        disabled={selectedCards.length === 0}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Copy className="w-4 h-4" />
        Copy to Clipboard
      </button>
      <button
        onClick={handleOpenMarketplace}
        disabled={selectedCards.length === 0}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-teal-600 to-teal-700 hover:from-teal-500 hover:to-teal-600 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <ExternalLink className="w-4 h-4" />
        Open {marketplace?.name} with {totalQuantity} Cards
      </button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      footer={footer}
      size="lg"
    >
      <div className="space-y-4">
        {deckName && (
          <p className="text-sm text-slate-400">
            For: <span className="text-teal-300 font-semibold">{deckName}</span>
          </p>
        )}

        <MarketplaceSelector
          selectedMarketplace={preferredMarketplace}
          onSelect={setPreferredMarketplace}
          showRememberOption
          remember={rememberPreference}
          onRememberChange={setRememberPreference}
        />

        {/* Color Filter */}
        <ColorFilterChips
          selectedFilters={colorFilters}
          onToggleFilter={toggleColorFilter}
          onClearFilters={clearColorFilters}
          isLoading={colorFilterLoading}
          variant="compact"
          size="sm"
          showLabel={true}
        />

        {/* Cards List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className="text-sm font-medium text-slate-300">
              Cards to Buy ({filteredCards.length === cards.length ? cards.length : `${filteredCards.length}/${cards.length}`} cards)
            </h3>
            <div className="flex gap-2">
              <button
                onClick={handleSelectAll}
                className="text-xs px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors"
              >
                Select All
              </button>
              <button
                onClick={handleDeselectAll}
                className="text-xs px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors"
              >
                Deselect All
              </button>
              <button
                onClick={() => setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'))}
                className="text-xs px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors"
                title="Sort by TCG/Card Kingdom price"
              >
                Price {sortDirection === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search cards..."
              className="w-full pl-10 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:border-teal-500 focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                x
              </button>
            )}
          </div>

          <div className="max-h-64 overflow-y-auto bg-slate-900 rounded-lg border border-slate-700 divide-y divide-slate-700">
            {sortedCards.map(({ card, index, selectionKey, priceKey }) => {
              const selection = cardSelections[selectionKey] || { selected: true, quantity: card.quantity || 1 };
              const tcgPrice = getTcgPrice(priceKey, card);
              
              return (
                <div
                  key={selectionKey}
                  className={`flex items-center gap-3 p-3 transition-colors ${
                    selection.selected ? 'bg-slate-800/50' : 'bg-slate-900/50 opacity-60'
                  }`}
                >
                  <button
                    onClick={() => handleToggleCard(card, index)}
                    className={`flex-shrink-0 w-5 h-5 rounded border transition-colors ${
                      selection.selected
                        ? 'bg-teal-600 border-teal-500'
                        : 'bg-slate-700 border-slate-500 hover:border-slate-400'
                    }`}
                  >
                    {selection.selected && <Check className="w-4 h-4 text-white" />}
                  </button>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleQuantityChange(card, index, -1)}
                      disabled={selection.quantity <= 1}
                      className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center text-sm font-medium text-slate-200">
                      {selection.quantity}
                    </span>
                    <button
                      onClick={() => handleQuantityChange(card, index, 1)}
                      className="p-1 text-slate-400 hover:text-white"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-slate-200 truncate">{card.name}</div>
                    <div className="text-xs text-slate-400">
                      TCG: <span className="text-slate-200">{formatPrice(tcgPrice)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="text-sm text-slate-400">
          Selected: <span className="text-teal-400 font-semibold">{selectedCount} cards ({totalQuantity} total)</span>
        </div>
      </div>
    </Modal>
  );
});

BuyCardsModal.propTypes = {
  /** Whether the modal is open */
  isOpen: PropTypes.bool.isRequired,
  /** Callback to close the modal */
  onClose: PropTypes.func.isRequired,
  /** Array of cards to potentially buy */
  cards: PropTypes.arrayOf(PropTypes.shape({
    name: PropTypes.string.isRequired,
    quantity: PropTypes.number,
    set: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
    price: PropTypes.number,
    tcgPrice: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    cardKingdomPrice: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    ckPrice: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    tcg: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    ck: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  })),
  /** Optional deck name to display */
  deckName: PropTypes.string,
};

export default BuyCardsModal;
