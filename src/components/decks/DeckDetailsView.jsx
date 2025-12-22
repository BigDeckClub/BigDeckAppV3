import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { X, Trash2, ChevronDown, FileEdit, Link2, ShoppingCart, Tag, Crown } from 'lucide-react';
import EbayListingModal from '../ebay/EbayListingModal';
import { getSetDisplayName } from '../../utils/cardHelpers';
import { normalizeName, computeCompletion } from '../../utils/deckHelpers';
import { BuyButton } from '../buy/BuyButton';
import { BuyCardsModal } from '../buy/BuyCardsModal';
import { ManaCurveChart, DeckColorPie, DeckStatsPanel } from '../ui';
import { useCardMetadata } from '../../hooks/useCardMetadata';

/**
 * DeckDetailsView component - Displays detailed view of a single deck
 */
export function DeckDetailsView({
  deck,
  inventoryByName,
  onBack,
  onDelete,
  onUpdateDescription,
  onEditCards,
  onArchidektSync
}) {
  const [showMissing, setShowMissing] = useState(false);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [showEbayModal, setShowEbayModal] = useState(false);
  const [commanderLocal, setCommanderLocal] = useState(deck.commander || '');
  const [settingCommanderFor, setSettingCommanderFor] = useState(null);
  const [enrichedCards, setEnrichedCards] = useState([]);
  const { fetchMetadata, loading: metadataLoading } = useCardMetadata();

  // Load metadata for cards to enable charts
  React.useEffect(() => {
    const loadMetadata = async () => {
      const cards = Array.isArray(deck.cards) ? deck.cards : [];
      if (cards.length === 0) return;

      const names = cards.map(c => c.name);
      const metadataMap = await fetchMetadata(names);

      const enriched = cards.map(card => {
        // metadataMap is keyed by original card name
        const metadata = metadataMap[card.name];
        if (metadata) {
          return {
            ...card,
            cmc: metadata.cmc,
            mana_value: metadata.cmc,
            colors: metadata.colors,
            color_identity: metadata.colorIdentity || metadata.colors,
            type_line: metadata.typeLine,
            mana_cost: metadata.manaCost
          };
        }
        return card;
      });

      setEnrichedCards(enriched);
    };

    loadMetadata();
  }, [deck.cards, fetchMetadata]);

  // Compute missing cards using shared helpers
  const cards = Array.isArray(deck.cards) ? deck.cards : [];
  const { totalCards, totalMissing } = computeCompletion(cards, inventoryByName || {});
  const missingEntries = cards.map((card) => {
    const nameKey = normalizeName(card.name);
    const available = inventoryByName?.[nameKey] || 0;
    const needed = Math.max(0, (card.quantity || 1) - available);
    return { name: card.name, quantity: needed, set: card.set };
  }).filter(m => m.quantity > 0);
  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="text-teal-300 hover:text-teal-200 flex items-center gap-2 mb-4"
      >
        <X className="w-4 h-4" />
        Back to Decks
      </button>

      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-[var(--border)] rounded-lg p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold text-teal-300">{deck.name}</h2>
            <p className="text-[var(--text-muted)] mt-1">
              {deck.format} • {(deck.cards && deck.cards.length) || 0} cards
              {totalMissing > 0 && (
                <span className="ml-2 text-red-400 font-semibold">• {totalMissing} missing</span>
              )}
            </p>
            {commanderLocal ? (
              <p className="text-[var(--text-muted)] mt-1 flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-300" />
                <span className="font-medium">Commander:</span>
                <span className="text-white ml-1">{commanderLocal}</span>
              </p>
            ) : null}
          </div>
          <div className="flex gap-2">
            {totalMissing > 0 && (
              <button
                onClick={() => setShowBuyModal(true)}
                className="text-slate-100 bg-amber-600 hover:bg-amber-500 transition-colors px-3 py-2 rounded-lg flex items-center gap-2 font-medium"
                title="Buy missing cards from marketplace"
              >
                <ShoppingCart className="w-4 h-4" />
                Buy Missing
              </button>
            )}
            {onArchidektSync && (
              <button
                onClick={() => onArchidektSync(deck)}
                className="text-slate-100 bg-blue-600 hover:bg-blue-500 transition-colors px-3 py-2 rounded-lg flex items-center gap-2 font-medium"
                title="Sync with Archidekt"
              >
                <Link2 className="w-4 h-4" />
                Archidekt
              </button>
            )}
            {onEditCards && (
              <button
                onClick={() => onEditCards(deck)}
                className="text-slate-100 bg-purple-600 hover:bg-purple-500 transition-colors px-3 py-2 rounded-lg flex items-center gap-2 font-medium"
                title="Edit Deck Cards"
              >
                <FileEdit className="w-4 h-4" />
                Edit Cards
              </button>
            )}
            <button
              onClick={() => setShowEbayModal(true)}
              className="text-slate-100 bg-emerald-600 hover:bg-emerald-500 transition-colors px-3 py-2 rounded-lg flex items-center gap-2 font-medium"
              title="Create eBay listing"
            >
              <Tag className="w-4 h-4" />
              List on eBay
            </button>
            <button
              onClick={() => onDelete(deck.id)}
              className="text-[var(--text-muted)] hover:text-red-400 transition-colors"
              title="Delete"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Deck Statistics Charts */}
        {deck.cards && deck.cards.length > 0 && (() => {
          // Use enrichedCards for stats when available (has CMC/color data from MTGJSON)
          const cardsForStats = enrichedCards.length > 0 ? enrichedCards : deck.cards;
          const totalCards = deck.cards.reduce((s, c) => s + (c.quantity || 1), 0);
          const ownedCount = totalCards - totalMissing;
          const completionPercentage = totalCards > 0 ? (ownedCount / totalCards) * 100 : 100;
          const averageCmc = cardsForStats.reduce((s, c) => s + ((c.cmc || c.mana_value || 0) * (c.quantity || 1)), 0) / Math.max(1, totalCards);
          const typeBreakdown = {};
          return (
            <div className="space-y-4 mb-6">
              {/* Compact stats row */}
              <DeckStatsPanel
                cards={cardsForStats}
                totalValue={0}
                completionPercentage={completionPercentage}
                missingCount={totalMissing}
                ownedCount={ownedCount}
                averageCmc={averageCmc}
                typeBreakdown={typeBreakdown}
                compact={true}
              />
              {/* Charts row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ManaCurveChart
                  cards={enrichedCards.length > 0 ? enrichedCards : deck.cards}
                  showStats={true}
                  title="Mana Curve"
                />
                <DeckColorPie
                  cards={enrichedCards.length > 0 ? enrichedCards : deck.cards}
                  showLegend={true}
                  size="md"
                  title="Color Distribution"
                />
              </div>
            </div>
          );
        })()}

        <div className="mb-4">
          <label className="block text-sm text-[var(--text-muted)] mb-2">Description</label>
          <textarea
            value={deck.description || ''}
            onChange={(e) => onUpdateDescription(deck.id, e.target.value)}
            placeholder="Add deck notes, strategy, etc."
            className="w-full bg-[var(--muted-surface)] border border-[var(--border)] rounded px-3 py-2 text-white placeholder-slate-500 resize-none"
            rows="3"
          />
        </div>

        {(!deck.cards || deck.cards.length === 0) ? (
          <div className="text-center py-8">
            <p className="text-[var(--text-muted)]">No cards in this deck yet. Add cards from your inventory!</p>
          </div>
        ) : (
          <div className="bg-[var(--bg-page)] rounded p-4 max-h-96 overflow-y-auto">
            <h3 className="text-teal-300 font-semibold mb-3">Deck Cards</h3>
            <div className="space-y-2">
              {deck.cards.map((card, idx) => {
                const nameKey = normalizeName(card.name);
                const available = inventoryByName?.[nameKey] || 0;
                const needed = Math.max(0, (card.quantity || 1) - available);
                const isMissing = needed > 0;
                return (
                  <div
                    key={idx}
                    className={`flex justify-between text-sm p-2 rounded ${isMissing
                      ? 'bg-red-900/40 text-red-200 border border-red-700/30'
                      : 'bg-[var(--surface)] text-[var(--text-muted)]'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <span>
                        {card.quantity}x {card.name}
                        {isMissing && <span className="ml-2 text-xs text-red-300">(need {needed})</span>}
                      </span>
                      <span className="text-[var(--text-muted)]">{getSetDisplayName(card.set, true)}</span>
                      {/* Set as commander action */}
                      <button
                        onClick={async () => {
                          if (settingCommanderFor) return;
                          const cardName = typeof card === 'string' ? card : card.name || '';
                          setSettingCommanderFor(cardName);
                          try {
                            const res = await fetch(`/api/decks/${deck.id}`, {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ name: deck.name || '', commander: cardName }),
                            });
                            if (!res.ok) {
                              const err = await res.json().catch(() => ({}));
                              throw new Error(err.error || 'Failed to set commander');
                            }
                            const json = await res.json();
                            setCommanderLocal(json.commander || cardName);
                          } catch (err) {
                            console.error('Set commander failed', err);
                            alert('Failed to set commander: ' + (err.message || 'unknown'));
                          } finally {
                            setSettingCommanderFor(null);
                          }
                        }}
                        className="ml-2 text-xs bg-[var(--bg-page)] border border-[var(--border)] hover:bg-[var(--muted-surface)] px-2 py-1 rounded text-[var(--text-muted)]"
                        title="Set as commander"
                      >
                        {settingCommanderFor === (typeof card === 'string' ? card : card.name || '') ? 'Saving...' : 'Set as commander'}
                      </button>
                    </div>
                    <div />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {totalMissing > 0 && (
          <div className="mt-4">
            <button
              onClick={() => setShowMissing(prev => !prev)}
              className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-red-700/20 to-red-800/10 hover:from-red-700/30 hover:to-red-800/20 rounded-lg text-sm font-semibold text-red-300 border border-red-700/30"
            >
              <span>❌ Missing Cards ({totalMissing})</span>
              <ChevronDown className={`w-5 h-5 transition-transform ${showMissing ? 'rotate-180' : ''}`} />
            </button>
            {showMissing && (
              <div className="mt-2 bg-[var(--bg-page)] rounded-lg p-3 max-h-48 overflow-y-auto border border-red-700/20">
                {missingEntries.map((m, i) => (
                  <div key={i} className="flex justify-between items-center text-sm bg-red-900/40 text-red-200 rounded px-3 py-2 mb-1">
                    <div className="flex-1">
                      <span><span className="font-bold">{m.quantity}x</span> {m.name}</span>
                      <span className="text-xs text-red-300 ml-2">{getSetDisplayName(m.set, true)}</span>
                    </div>
                    <BuyButton card={m} quantity={m.quantity} size="sm" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <p className="text-xs text-[var(--text-muted)] mt-4">
          Created: {new Date(deck.created_at).toLocaleDateString()}
        </p>
      </div>

      {/* Buy Cards Modal */}
      <BuyCardsModal
        isOpen={showBuyModal}
        onClose={() => setShowBuyModal(false)}
        cards={missingEntries}
        deckName={deck.name}
      />

      <EbayListingModal
        open={showEbayModal}
        onClose={() => setShowEbayModal(false)}
        deckId={deck.id}
        initialPrice={0}
        deckName={deck.name}
        commander={commanderLocal || deck.commander}
      />
    </div>
  );
}

DeckDetailsView.propTypes = {
  deck: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    name: PropTypes.string.isRequired,
    commander: PropTypes.string,
    format: PropTypes.string,
    description: PropTypes.string,
    created_at: PropTypes.string,
    cards: PropTypes.arrayOf(PropTypes.shape({
      quantity: PropTypes.number,
      name: PropTypes.string,
      set: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.shape({
          editioncode: PropTypes.string,
          editionname: PropTypes.string,
          editiondate: PropTypes.string,
          editiontype: PropTypes.string,
          mtgoCode: PropTypes.string
        })
      ])
    }))
  }).isRequired,
  inventoryByName: PropTypes.object,
  onBack: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onUpdateDescription: PropTypes.func.isRequired,
  onEditCards: PropTypes.func,
  onArchidektSync: PropTypes.func
};

export default DeckDetailsView;
