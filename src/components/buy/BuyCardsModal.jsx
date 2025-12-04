import React, { useState, useMemo, memo } from 'react';
import PropTypes from 'prop-types';
import { ShoppingCart, Copy, ExternalLink, Plus, Minus, Check } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { MarketplaceSelector } from './MarketplaceSelector';
import { useMarketplacePreferences } from '../../hooks/useMarketplacePreferences';
import { useToast, TOAST_TYPES } from '../../context/ToastContext';
import { MARKETPLACES, buildCartUrl, buildClipboardText } from '../../utils/marketplaceUrls';

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
  const {
    preferredMarketplace,
    setPreferredMarketplace,
    rememberPreference,
    setRememberPreference,
  } = useMarketplacePreferences();

  // Initialize card selection state with all cards selected
  const [cardSelections, setCardSelections] = useState(() => {
    const selections = {};
    cards.forEach((card, index) => {
      const key = `${card.name}-${index}`;
      selections[key] = {
        selected: true,
        quantity: card.quantity || 1,
      };
    });
    return selections;
  });

  // Reset selections when cards change
  useMemo(() => {
    const selections = {};
    cards.forEach((card, index) => {
      const key = `${card.name}-${index}`;
      selections[key] = {
        selected: true,
        quantity: card.quantity || 1,
      };
    });
    setCardSelections(selections);
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
    } catch {
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

        {/* Cards List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-300">
              Cards to Buy ({cards.length} cards)
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
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto bg-slate-900 rounded-lg border border-slate-700 divide-y divide-slate-700">
            {cards.map((card, index) => {
              const key = `${card.name}-${index}`;
              const selection = cardSelections[key] || { selected: true, quantity: card.quantity || 1 };
              
              return (
                <div
                  key={key}
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

                  <span className="flex-1 text-sm text-slate-200 truncate">
                    {card.name}
                  </span>
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
  })),
  /** Optional deck name to display */
  deckName: PropTypes.string,
};

export default BuyCardsModal;
