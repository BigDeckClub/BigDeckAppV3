import React, { memo, useState } from 'react';
import PropTypes from 'prop-types';
import { Trash2, X, ChevronDown, Wand2, DollarSign, ShoppingCart } from 'lucide-react';
import { getSetDisplayName } from '../../utils/cardHelpers';
import { BuyCardsModal } from '../buy/BuyCardsModal';
import { BuyButton } from '../buy/BuyButton';

/**
 * DeckDetailView - Renders the deck detail view with reserved and missing cards
 * Extracted from InventoryTab for better component organization
 */
export const DeckDetailView = memo(function DeckDetailView({
  deck,
  deckDetails,
  viewMode,
  inventorySearch,
  expandedCards,
  setExpandedCards,
  expandedMissingCards,
  setExpandedMissingCards,
  openDecks,
  activeTab,
  removeCardFromDeck,
  autoFillMissingCards,
  autoFillSingleCard,
  releaseDeck,
  moveCardSkuToDeck,
  setSellModalData,
  setShowSellModal
}) {
  const [showBuyModal, setShowBuyModal] = useState(false);

  if (!deck || !deckDetails) return null;

  const deckId = deck.id;
  const decklistTotal = (deck.cards || []).reduce((sum, c) => sum + (c.quantity || 1), 0);
  const actualMissingCount = Math.max(0, decklistTotal - (deckDetails.reservedCount || 0));

  // Calculate missing cards for the buy modal
  const missingCards = (deck.cards || []).map((card) => {
    const reservedQty = (deckDetails.reservations || [])
      .filter(r => r.name.toLowerCase() === card.name.toLowerCase())
      .reduce((sum, r) => sum + parseInt(r.quantity_reserved || 0), 0);
    const needed = Math.max(0, (card.quantity || 1) - reservedQty);
    if (needed === 0) return null;
    return { name: card.name, quantity: needed, set: card.set };
  }).filter(Boolean);

  // Group reservations by card name for grid view
  const groupedReservations = (deckDetails.reservations || []).reduce((acc, res) => {
    const cardName = res.name;
    if (!acc[cardName]) {
      acc[cardName] = [];
    }
    acc[cardName].push(res);
    return acc;
  }, {});
  const reservationEntries = Object.entries(groupedReservations).filter(([cardName]) => 
    inventorySearch === '' || cardName.toLowerCase().includes(inventorySearch.toLowerCase())
  );

  // Helper function for rendering deck card groups
  const renderDeckCardGroup = ([cardName, items]) => {
    const totalQty = items.reduce((sum, item) => sum + (item.quantity_reserved || 0), 0);
    
    const itemsForAvg = items;
    let avgPrice = 0;
    if (itemsForAvg.length > 0) {
      const totalPrice = itemsForAvg.reduce((sum, item) => sum + (parseFloat(item.purchase_price) || 0), 0);
      avgPrice = totalPrice / itemsForAvg.length;
    }
    
    const totalValue = totalQty * avgPrice;
    const formatTotal = (value) => {
      return value >= 100 ? value.toFixed(0) : value.toFixed(2);
    };
    
    const getStatFontSize = (value) => {
      const strValue = String(value).length;
      if (strValue <= 2) return 'text-[11px] md:text-[13px]';
      if (strValue <= 3) return 'text-[10px] md:text-[11px]';
      if (strValue <= 4) return 'text-[9px] md:text-[10px]';
      return 'text-[8px] md:text-[9px]';
    };
    
    const isExpanded = expandedCards[cardName];
    
    return (
      <div key={cardName}>
        {/* Card View */}
        {viewMode === 'card' ? (
        <div 
          draggable
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = 'move';
            const deckCardData = {
              ...items[0],
              deck_id: deckId
            };
            e.dataTransfer.setData('deckCardData', JSON.stringify(deckCardData));
          }}
          className="relative bg-gradient-to-br from-slate-800 to-slate-900 border border-green-600 hover:border-green-400 rounded-lg p-4 transition-all flex flex-col h-36 md:h-40 hover:shadow-lg hover:shadow-green-500/20 cursor-grab active:cursor-grabbing group" 
          onClick={() => setExpandedCards(isExpanded ? {} : {[cardName]: true})}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              items.forEach(item => removeCardFromDeck(deckId, item.id, item.quantity_reserved));
            }}
            className="absolute top-2 right-2 p-1.5 bg-slate-700/60 hover:bg-slate-600 text-slate-300 hover:text-red-400 rounded-lg transition-all opacity-0 group-hover:opacity-100 z-20"
            title="Remove all from deck"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="text-center px-1 cursor-pointer flex items-center justify-center gap-1 mb-1">
            <h3 className="text-xs md:text-sm font-semibold text-slate-50 line-clamp-2 break-words flex-1">
              {cardName.split('//')[0].trim()}
            </h3>
          </div>
          
          <div className="flex-1 flex items-center justify-center min-h-0 py-2">
            <div className="text-center">
              <div className="text-slate-400 text-[9px] md:text-xs font-semibold uppercase tracking-wider mb-1">Reserved</div>
              <div className="text-2xl md:text-3xl font-bold text-green-400 leading-tight">{totalQty}</div>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-slate-700/50">
            <div className="space-y-1">
              <div className="text-slate-500 text-[7px] md:text-[9px] font-semibold uppercase">Reserved</div>
              <div className="h-4 flex items-center justify-center">
                <div className={`font-bold leading-none text-green-400 ${getStatFontSize(totalQty)}`}>{totalQty}</div>
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-slate-500 text-[7px] md:text-[9px] font-semibold uppercase">Cost</div>
              <div className="h-4 flex items-center justify-center">
                <div className={`font-bold leading-none text-blue-300 ${getStatFontSize(avgPrice.toFixed(2))}`}>${avgPrice.toFixed(2)}</div>
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-slate-500 text-[7px] md:text-[9px] font-semibold uppercase">Total</div>
              <div className="h-4 flex items-center justify-center">
                <div className={`font-bold leading-none text-amber-400 ${getStatFontSize(formatTotal(totalValue))}`}>${formatTotal(totalValue)}</div>
              </div>
            </div>
          </div>
        </div>
        ) : (
        <div>
          {/* List View */}
          <div 
            draggable
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = 'move';
              const deckCardData = {
                ...items[0],
                deck_id: deckId
              };
              e.dataTransfer.setData('deckCardData', JSON.stringify(deckCardData));
            }}
            className="relative bg-gradient-to-br from-slate-800 to-slate-900 border border-green-600 hover:border-green-400 rounded-lg p-4 transition-all cursor-grab active:cursor-grabbing hover:shadow-lg hover:shadow-green-500/20 group"
            onClick={() => setExpandedCards(isExpanded ? {} : {[cardName]: true})}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                items.forEach(item => removeCardFromDeck(deckId, item.id, item.quantity_reserved));
              }}
              className="absolute top-3 right-3 p-1.5 bg-slate-700/60 hover:bg-slate-600 text-slate-300 hover:text-red-400 rounded-lg transition-all opacity-0 group-hover:opacity-100 z-20"
              title="Remove all from deck"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center justify-between gap-6">
              <div className="flex-1 min-w-0 cursor-pointer">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-semibold text-slate-50 break-words">{cardName}</h3>
                </div>
                <div className="flex gap-6 text-xs mt-2">
                  <div><span className="text-slate-400">Reserved:</span> <span className="ml-1 font-semibold text-green-400">{totalQty}</span></div>
                  <div><span className="text-slate-400">Cost/ea:</span> <span className="ml-1 text-blue-300 font-semibold">${avgPrice.toFixed(2)}</span></div>
                  <div><span className="text-slate-400">Total:</span> <span className="ml-1 text-amber-400 font-semibold">${formatTotal(totalValue)}</span></div>
                </div>
              </div>
              <div className="text-green-400 text-sm flex-shrink-0 cursor-pointer">
                {isExpanded ? '▼' : '▶'}
              </div>
            </div>
          </div>

          {isExpanded && renderExpandedSetItems(items, deckId)}
        </div>
        )}
        {isExpanded && viewMode === 'card' && renderExpandedSetItems(items, deckId)}
      </div>
    );
  };

  // Helper function to render expanded set items
  const renderExpandedSetItems = (items, currentDeckId) => (
    <div className="bg-slate-800 rounded-lg border border-slate-600 p-3 shadow-lg mt-2">
      <div className="flex flex-wrap gap-3">
        {Object.values(
          items.reduce((acc, item) => {
            const setKey = `${item.set || 'unknown'}`;
            if (!acc[setKey]) {
              acc[setKey] = [];
            }
            acc[setKey].push(item);
            return acc;
          }, {})
        ).map((setItems) => {
          const firstItem = setItems[0];
          const totalQtyInSet = setItems.reduce((sum, item) => sum + (item.quantity_reserved || 0), 0);
          const avgSetPrice = setItems.reduce((sum, item) => sum + (parseFloat(item.purchase_price) || 0), 0) / setItems.length;
          
          return (
            <div key={`${firstItem.set}-${firstItem.id}`} className="flex-1 min-w-[160px] bg-slate-700 rounded-lg p-2 border border-slate-500">
              <div className="space-y-1">
                <div className="flex justify-between items-center pb-1 border-b border-slate-500">
                  <span className="text-xs font-bold text-green-300">{firstItem.set?.toUpperCase() || 'N/A'}</span>
                  <span className="text-[9px] text-slate-400 bg-slate-600 px-1 py-0.5 rounded">{setItems.length}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <div><span className="text-slate-400">Qty: </span><span className="text-green-300 font-bold">{totalQtyInSet}</span></div>
                  <div><span className="text-slate-400">Avg: </span><span className="text-blue-300 font-bold">${avgSetPrice.toFixed(2)}</span></div>
                </div>
                <div className="space-y-0.5 max-h-16 overflow-y-auto">
                  {setItems.map((item) => (
                    <div 
                      key={item.id} 
                      draggable
                      onDragStart={(e) => {
                        e.stopPropagation();
                        e.dataTransfer.effectAllowed = 'move';
                        const deckCardData = {
                          ...item,
                          deck_id: currentDeckId
                        };
                        e.dataTransfer.setData('deckCardData', JSON.stringify(deckCardData));
                      }}
                      className="text-[9px] text-slate-300 bg-slate-600/50 rounded px-1.5 py-0.5 flex justify-between items-center group hover:bg-slate-600 transition-colors cursor-grab active:cursor-grabbing">
                      <span>{item.quantity_reserved}x @ ${parseFloat(item.purchase_price || 0).toFixed(2)}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400">{item.original_folder}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeCardFromDeck(currentDeckId, item.id, item.quantity_reserved);
                          }}
                          className="close-btn"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div 
        className="space-y-4"
        onDragOver={(e) => {
          e.preventDefault();
          e.currentTarget.classList.add('opacity-50');
        }}
        onDragLeave={(e) => {
          e.currentTarget.classList.remove('opacity-50');
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          e.currentTarget.classList.remove('opacity-50');
          try {
            const skuData = JSON.parse(e.dataTransfer.getData('skuData'));
            moveCardSkuToDeck(skuData, deckId);
          } catch (err) {
            // Handle silently
          }
        }}
      >
        {/* Deck Header */}
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/50 rounded-lg border border-slate-600 hover:border-green-500/50 p-3 transition-all duration-300 shadow-lg shadow-slate-900/50">
          <div className="flex justify-between items-start gap-3">
            <div className="flex-1">
              <div className="flex items-baseline gap-3 mb-1.5 flex-wrap">
                <h2 className="text-xl font-bold text-green-300">{deck.name}</h2>
                <span className="text-xs font-medium px-2 py-1 bg-green-900/40 text-green-300 rounded">{deck.format}</span>
              </div>
              {deckDetails.originalDecklist && (
                <p className="text-xs text-cyan-400 mb-1">
                  From: <span className="font-semibold">{deckDetails.originalDecklist.name}</span> ({deckDetails.originalDecklist.cardCount} cards)
                </p>
              )}
              <div className="flex flex-wrap gap-4 text-xs">
                {deckDetails.totalCost > 0 && (
                  <span className="text-green-400 font-semibold">💰 ${deckDetails.totalCost?.toFixed(2) || '0.00'}</span>
                )}
                <span className="text-slate-400">
                  ✅ {deckDetails.reservedCount} reserved
                  {deckDetails.extraCount > 0 && <span className="text-blue-400"> • +{deckDetails.extraCount} extra</span>}
                  {deckDetails.missingCount > 0 && <span className="text-yellow-400"> • {deckDetails.missingCount} missing</span>}
                </span>
              </div>
            </div>
            <div className="flex gap-1.5">
              {missingCards.length > 0 && (
                <button
                  onClick={() => setShowBuyModal(true)}
                  className="bg-gradient-to-br from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white p-2 rounded-lg transition-all duration-200 hover:shadow-lg hover:shadow-amber-500/30 flex items-center"
                  title="Buy missing cards from marketplace"
                >
                  <ShoppingCart className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => autoFillMissingCards(deck, deck.id)}
                className="bg-gradient-to-br from-teal-600 to-teal-700 hover:from-teal-500 hover:to-teal-600 text-white p-2 rounded-lg transition-all duration-200 hover:shadow-lg hover:shadow-teal-500/30 flex items-center"
                title="Auto-fill missing cards from inventory (oldest & cheapest first)"
              >
                <Wand2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setSellModalData({
                    itemType: 'deck',
                    itemId: deck.id,
                    itemName: deck.name,
                    purchasePrice: parseFloat(deckDetails.totalCost) || 0
                  });
                  setShowSellModal(true);
                }}
                className="bg-gradient-to-br from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white p-2 rounded-lg transition-all duration-200 hover:shadow-lg hover:shadow-green-500/30 flex items-center"
                title="Sell deck and track profit"
              >
                <DollarSign className="w-4 h-4" />
              </button>
              <button
                onClick={() => releaseDeck(deck.id)}
                className="bg-gradient-to-br from-slate-700 to-slate-800 hover:from-red-600 hover:to-red-700 text-slate-300 hover:text-white p-2 rounded-lg transition-all duration-200 hover:shadow-lg hover:shadow-red-500/30 flex items-center"
                title="Delete deck and return cards to unsorted"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Reserved Cards Grid */}
        {reservationEntries.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold px-3 py-2 rounded-lg bg-gradient-to-r from-green-600/30 to-green-700/20 border border-green-600/40 text-green-300 mb-3">✅ Reserved Cards ({deckDetails.reservedCount})</h3>
            {viewMode === 'card' ? (
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-3">
                {reservationEntries.map(renderDeckCardGroup)}
              </div>
            ) : (
              <div className="space-y-1.5">
                {reservationEntries.map(renderDeckCardGroup)}
              </div>
            )}
          </div>
        )}

        {/* Missing Cards */}
        {actualMissingCount > 0 && (
          <div>
            <button
              onClick={() => setExpandedMissingCards(prev => ({
                ...prev,
                [deckId]: !prev[deckId]
              }))}
              className="w-full flex items-center justify-between p-2.5 bg-gradient-to-r from-yellow-600/20 to-yellow-700/10 hover:from-yellow-600/30 hover:to-yellow-700/20 rounded-lg transition-all duration-300 border border-yellow-600/40"
            >
              <h3 className="text-sm font-semibold text-yellow-300">❌ Missing Cards ({actualMissingCount})</h3>
              <ChevronDown className={`w-5 h-5 text-yellow-400 transition-transform ${expandedMissingCards[deckId] ? 'rotate-180' : ''}`} />
            </button>
            {expandedMissingCards[deckId] && (
              <div className="bg-slate-900 rounded-b-lg p-3 space-y-2 max-h-48 overflow-y-auto mt-2">
                <div className="text-sm text-slate-300 p-2">
                  <div className="mb-2 font-semibold text-teal-300">Cards needed to complete this deck:</div>
                  {(deck.cards || []).map((card, idx) => {
                    // Find how many of this card are reserved
                    const reservedQty = (deckDetails.reservations || [])
                      .filter(r => r.name.toLowerCase() === card.name.toLowerCase())
                      .reduce((sum, r) => sum + parseInt(r.quantity_reserved || 0), 0);
                    const needed = Math.max(0, (card.quantity || 1) - reservedQty);
                    if (needed === 0) return null;
                    const matchesSearch = inventorySearch === '' || card.name.toLowerCase().includes(inventorySearch.toLowerCase());
                    if (!matchesSearch) return null;
                    return (
                      <div key={idx} className="flex justify-between items-center text-sm bg-slate-800 p-2 rounded mb-1">
                        <div className="flex-1">
                          <span className="text-white">{needed}x {card.name}</span>
                          <span className="text-xs text-slate-500 ml-2">{getSetDisplayName(card.set, true)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <BuyButton card={card} quantity={needed} size="sm" />
                          <button
                            onClick={() => autoFillSingleCard(card, needed, deck.id)}
                            className="bg-teal-600 hover:bg-teal-500 text-white p-1 rounded transition-colors flex items-center ml-2"
                            title="Auto-fill this card from inventory"
                          >
                            <Wand2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  }).filter(Boolean)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Buy Cards Modal */}
      <BuyCardsModal
        isOpen={showBuyModal}
        onClose={() => setShowBuyModal(false)}
        cards={missingCards}
        deckName={deck.name}
      />
    </div>
  );
});

DeckDetailView.propTypes = {
  deck: PropTypes.object,
  deckDetails: PropTypes.object,
  viewMode: PropTypes.string.isRequired,
  inventorySearch: PropTypes.string.isRequired,
  expandedCards: PropTypes.object.isRequired,
  setExpandedCards: PropTypes.func.isRequired,
  expandedMissingCards: PropTypes.object.isRequired,
  setExpandedMissingCards: PropTypes.func.isRequired,
  openDecks: PropTypes.array.isRequired,
  activeTab: PropTypes.string.isRequired,
  removeCardFromDeck: PropTypes.func.isRequired,
  autoFillMissingCards: PropTypes.func.isRequired,
  autoFillSingleCard: PropTypes.func.isRequired,
  releaseDeck: PropTypes.func.isRequired,
  moveCardSkuToDeck: PropTypes.func.isRequired,
  setSellModalData: PropTypes.func.isRequired,
  setShowSellModal: PropTypes.func.isRequired
};

export default DeckDetailView;
