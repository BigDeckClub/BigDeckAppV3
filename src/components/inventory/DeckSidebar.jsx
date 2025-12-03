import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { DollarSign } from 'lucide-react';

/**
 * DeckSidebar - Deck section of the sidebar for deck navigation
 * Extracted from FolderSidebar for better component organization
 */
export const DeckSidebar = memo(function DeckSidebar({
  deckInstances,
  openDecks,
  openDeckTab,
  moveCardBetweenDecks,
  moveCardSkuToDeck,
  setShowSellModal,
  setSellModalData
}) {
  if (deckInstances.length === 0) {
    return null;
  }

  return (
    <div className="pt-3 border-t border-slate-700 mt-3">
      <h3 className="text-sm font-semibold text-teal-300 mb-2">🎴 Decks</h3>
      {deckInstances.map((deck) => {
        const isDeckOpen = openDecks.includes(deck.id);
        const decklistTotal = (deck.cards || []).reduce((sum, c) => sum + (c.quantity || 1), 0);
        const deckCost = parseFloat(deck.total_cost) || 0;
        
        return (
          <div
            key={`deck-${deck.id}`}
            className={`group text-left p-2.5 rounded-lg transition-all duration-200 mb-1.5 border-l-4 cursor-pointer ${
              isDeckOpen
                ? 'bg-gradient-to-r from-green-600/40 to-green-700/30 border-l-4 border-green-400 shadow-md shadow-green-500/10'
                : 'bg-gradient-to-r from-slate-700 to-slate-800 border-l-4 border-transparent hover:from-slate-600 hover:to-slate-700 hover:shadow-md hover:shadow-slate-600/20'
            }`}
            onClick={() => openDeckTab(deck)}
            onDragOver={(e) => {
              e.preventDefault();
              e.currentTarget.classList.add('bg-green-700/60', 'border-green-300');
            }}
            onDragLeave={(e) => {
              e.currentTarget?.classList?.remove('bg-green-700/60', 'border-green-300');
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.currentTarget?.classList?.remove('bg-green-700/60', 'border-green-300');
              try {
                const deckCardDataStr = e.dataTransfer.getData('deckCardData');
                const skuDataStr = e.dataTransfer.getData('skuData');
                
                if (deckCardDataStr) {
                  const deckCardData = JSON.parse(deckCardDataStr);
                  moveCardBetweenDecks(deckCardData, deck.id);
                } else if (skuDataStr) {
                  const skuData = JSON.parse(skuDataStr);
                  moveCardSkuToDeck(skuData, deck.id);
                }
              } catch (err) {
                // Handle silently
              }
            }}
          >
            <div className="flex justify-between items-start mb-1">
              <div className="flex-1 text-left">
                <div className="font-medium text-sm text-slate-100">{deck.name}</div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSellModalData({
                    itemType: 'deck',
                    itemId: deck.id,
                    itemName: deck.name,
                    purchasePrice: deckCost
                  });
                  setShowSellModal(true);
                }}
                className="ml-2 text-green-400 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:text-green-200 hover:scale-125 hover:drop-shadow-lg"
                title="Sell this deck"
              >
                <DollarSign className="w-4 h-4" />
              </button>
            </div>
            <div className="text-xs flex flex-wrap gap-1">
              {(() => {
                const reserved = deck.reserved_count;
                const missing = Math.max(0, decklistTotal - reserved);
                const extras = Math.max(0, reserved - decklistTotal);
                
                if (missing > 0) {
                  return (
                    <>
                      <span className="text-green-300">{reserved} reserved</span>
                      <span className="text-red-400">{missing} missing</span>
                    </>
                  );
                } else {
                  const displayReserved = decklistTotal > 0 ? decklistTotal : reserved;
                  return (
                    <>
                      <span className="text-green-300">{displayReserved} reserved</span>
                      {extras > 0 && <span className="text-purple-400">+{extras} extra</span>}
                    </>
                  );
                }
              })()}
            </div>
            <div className="text-xs text-amber-300 mt-1">
              Cost: ${deckCost.toFixed(2)}
            </div>
          </div>
        );
      })}
    </div>
  );
});

DeckSidebar.propTypes = {
  deckInstances: PropTypes.array.isRequired,
  openDecks: PropTypes.array.isRequired,
  openDeckTab: PropTypes.func.isRequired,
  moveCardBetweenDecks: PropTypes.func.isRequired,
  moveCardSkuToDeck: PropTypes.func.isRequired,
  setShowSellModal: PropTypes.func.isRequired,
  setSellModalData: PropTypes.func.isRequired
};

export default DeckSidebar;
