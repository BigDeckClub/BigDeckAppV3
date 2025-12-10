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
    <div className="pt-3 border-t border-ui-border mt-3">
      <h3 className="text-sm font-semibold text-ui-primary mb-2">🎴 Decks</h3>
      {deckInstances.map((deck) => {
        const isDeckOpen = openDecks.includes(deck.id);
        const decklistTotal = (deck.cards || []).reduce((sum, c) => sum + (c.quantity || 1), 0);
        const deckCost = parseFloat(deck.total_cost) || 0;
        
        return (
          <div
            key={`deck-${deck.id}`}
            className={`group text-left p-2.5 rounded-lg transition-all duration-200 mb-1.5 border-l-4 cursor-pointer ${
              isDeckOpen
                ? 'bg-ui-primary/40 border-l-4 border-ui-primary shadow-md'
                : 'bg-ui-surface border-l-4 border-transparent hover:bg-ui-surface/90 hover:shadow-md'
            }`}
            onClick={() => openDeckTab(deck)}
            onDragOver={(e) => {
              e.preventDefault();
              e.currentTarget.classList.add('bg-ui-primary/60', 'border-ui-primary');
            }}
            onDragLeave={(e) => {
              e.currentTarget.classList.remove('bg-ui-primary/60', 'border-ui-primary');
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.currentTarget.classList.remove('bg-ui-primary/60', 'border-ui-primary');
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
                console.error('Error in drop handler:', err);
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
                    purchasePrice: deckCost,
                    quantity: deck.reserved_count || 1
                  });
                  setShowSellModal(true);
                }}
                className="ml-2 text-ui-muted opacity-0 group-hover:opacity-100 transition-all duration-200 hover:text-ui-primary hover:scale-125 hover:drop-shadow-lg"
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
                      <span className="text-ui-primary">{reserved} reserved</span>
                      <span className="text-ui-accent">{missing} missing</span>
                    </>
                  );
                } else {
                  const displayReserved = decklistTotal > 0 ? decklistTotal : reserved;
                  return (
                    <>
                      <span className="text-ui-primary">{displayReserved} reserved</span>
                      {extras > 0 && <span className="text-ui-muted">+{extras} extra</span>}
                    </>
                  );
                }
              })()}
            </div>
            <div className="text-xs text-ui-accent mt-1">
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
