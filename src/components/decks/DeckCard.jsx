import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Download, Edit2, Trash2, FileEdit, Link2, ShoppingCart } from 'lucide-react';
import { BuyButton } from '../buy/BuyButton';
import { BuyCardsModal } from '../buy/BuyCardsModal';
import DeckColorGradientBar from './DeckColorGradientBar';

/**
 * DeckCard component - Displays a single deck in the deck list grid
 */
export function DeckCard({
  deck,
  editingDeck,
  inventoryByName,
  onSelect,
  onCopy,
  onEdit,
  onEditCards,
  onArchidektSync,
  onDelete,
  onUpdateName,
  onCancelEdit
}) {
  const [showMissing, setShowMissing] = useState(false);
  const [showBuyModal, setShowBuyModal] = useState(false);

  // Dev-only: derive color keys and mana curve for quick debugging in the UI
  const colorLetterMap = { W: 'white', U: 'blue', B: 'black', R: 'red', G: 'green', C: 'colorless' };
  const derivedColorKeys = (() => {
    const fromDeck = deck.colorIdentity || deck.color_identity || deck.colorIdentityRaw;
    if (Array.isArray(fromDeck) && fromDeck.length > 0) return Array.from(new Set(fromDeck.map(c => (typeof c === 'string' ? (colorLetterMap[c.toUpperCase()] || c.toLowerCase()) : c))));
    const setKeys = new Set();
    (deck.cards || []).forEach(card => {
      const ci = card.color_identity || card.colorIdentity || card.colors || [];
      if (Array.isArray(ci)) {
        ci.forEach(c => {
          const key = (typeof c === 'string') ? (colorLetterMap[c.toUpperCase()] || c.toLowerCase()) : null;
          if (key) setKeys.add(key);
        });
      }
    });
    return Array.from(setKeys);
  })();

  const manaCurveCounts = (() => {
    const counts = {};
    (deck.cards || []).forEach(card => {
      const qty = Number(card.quantity || 1) || 1;
      const raw = card.cmc ?? card.mana_value ?? card.manaValue ?? 0;
      const cmc = Math.max(0, Math.floor(Number(raw) || 0));
      counts[cmc] = (counts[cmc] || 0) + qty;
    });
    return counts;
  })();

  // Compute missing cards based on inventory mapping passed from parent
  const missingEntries = (deck.cards || []).map((card) => {
    const nameKey = (card.name || '').toLowerCase().trim();
    const available = inventoryByName?.[nameKey] || 0;
    const needed = Math.max(0, (card.quantity || 1) - available);
    return { name: card.name, quantity: needed, set: card.set };
  }).filter(m => m.quantity > 0);
  const totalMissing = missingEntries.reduce((sum, m) => sum + m.quantity, 0);
  return (
    <>
      <div
        className="relative overflow-hidden bg-[var(--bda-card)] border border-[var(--bda-border)] hover:border-[var(--bda-primary)] rounded-lg p-4 pt-6 cursor-pointer transition-all hover:shadow-lg hover:shadow-[var(--bda-primary)]/20"
        onClick={() => onSelect(deck)}
      >
        {/* Absolute top gradient strip - ensure parent is relative + overflow-hidden */}
        <DeckColorGradientBar
          colors={(derivedColorKeys && derivedColorKeys.length) ? derivedColorKeys : ['colorless']}
          height={12}
          radius={8}
          debug={process.env.NODE_ENV !== 'production'}
          className="absolute top-0 left-0 right-0 z-50"
        />
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-[var(--bda-primary)] break-words">{deck.name}</h3>
            <p className="text-xs text-[var(--bda-muted)] mt-1">{deck.format}</p>
          </div>
          <div className="flex gap-2 flex-shrink-0 ml-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCopy(deck);
              }}
              className="text-[var(--bda-muted)] hover:text-green-400 hover:bg-green-600/20 px-2.5 py-1.5 rounded text-xs font-semibold transition-colors flex items-center gap-1.5"
              title="Copy to Inventory - Name your deck instance"
            >
              <Download className="w-4 h-4" />
              Copy
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(deck.id);
              }}
              className="text-[var(--bda-muted)] hover:text-[var(--bda-primary)] transition-colors bg-[var(--muted-surface)] hover:bg-[var(--card-hover)] p-1.5 rounded"
              title="Edit deck name"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(deck.id);
              }}
              className="text-[var(--bda-muted)] hover:text-red-400 transition-colors"
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
            className="w-full bg-[var(--input-bg)] border border-[var(--bda-primary)] rounded px-2 py-1 text-[var(--bda-text)] text-sm mb-2"
            onBlur={(e) => {
              onUpdateName(deck.id, e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onUpdateName(deck.id, e.currentTarget.value);
              }
              if (e.key === 'Escape') {
                onCancelEdit();
              }
            }}
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : null}

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-[var(--bda-muted)]">Cards:</span>
            <span className="text-[var(--bda-primary)] font-semibold">{(deck.cards && deck.cards.length) || 0}</span>
          </div>
          <div className="text-xs text-[var(--bda-muted)]">
            Created: {new Date(deck.created_at).toLocaleDateString()}
          </div>
          {deck.description && (
            <p className="text-xs text-[var(--bda-muted)] italic mt-2">{deck.description}</p>
          )}
          {process.env.NODE_ENV !== 'production' && (
            <div className="mt-2 text-xs text-[var(--bda-muted)] bg-[var(--input-bg)] p-2 rounded">
              <div className="text-[var(--bda-text)] font-semibold">Dev:</div>
              <div className="mt-1">Colors: {(derivedColorKeys && derivedColorKeys.length) ? derivedColorKeys.join(', ') : 'none'}</div>
              <div className="mt-1">Curve: {Object.keys(manaCurveCounts).length ? JSON.stringify(manaCurveCounts) : '{}'} </div>
            </div>
          )}
        </div>

        {totalMissing > 0 && (
          <div className="mt-3">
            <button
              onClick={(e) => { e.stopPropagation(); setShowMissing(prev => !prev); }}
              className="w-full flex items-center justify-between p-2 bg-gradient-to-r from-red-700/20 to-red-800/10 hover:from-red-700/30 hover:to-red-800/20 rounded text-sm font-semibold text-red-300 border border-red-700/30"
            >
              <span>Missing to complete: {totalMissing}</span>
              <span className="text-xs text-red-200">{showMissing ? '▲' : '▼'}</span>
            </button>
            {showMissing && (
              <div className="mt-2 bg-[var(--bda-background)] rounded p-2 max-h-40 overflow-y-auto border border-red-700/20">
                <div className="flex justify-end mb-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowBuyModal(true); }}
                    className="flex items-center gap-1 px-2 py-1 bg-amber-600 hover:bg-amber-500 text-white text-xs rounded transition-colors"
                    title="Buy all missing cards"
                  >
                    <ShoppingCart className="w-3 h-3" />
                    Buy Missing
                  </button>
                </div>
                {missingEntries.map((m, i) => (
                  <div key={i} className="flex justify-between items-center text-sm bg-red-900/40 text-red-200 rounded px-2 py-1 mb-1">
                    <div className="flex-1">
                      <span className="font-semibold">{m.quantity}x</span>
                      <span className="ml-2">{m.name}</span>
                      <span className="text-xs text-red-200 ml-2">{(m.set && (typeof m.set === 'string' ? m.set : (m.set.editioncode || m.set.editionname))) || ''}</span>
                    </div>
                    <BuyButton card={m} quantity={m.quantity} size="sm" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <button
          onClick={() => onSelect(deck)}
          className="w-full mt-4 bg-[var(--bda-surface)] hover:bg-[var(--bda-primary)] text-[var(--bda-text)] hover:text-white px-3 py-1 rounded text-sm transition-colors"
        >
          View Details
        </button>

        {onEditCards && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEditCards(deck);
            }}
            className="w-full mt-2 bg-purple-600 hover:bg-purple-500 text-white px-3 py-1 rounded text-sm transition-colors flex items-center justify-center gap-2"
          >
            <FileEdit className="w-4 h-4" />
            Edit Cards
          </button>
        )}

        {onArchidektSync && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onArchidektSync(deck);
            }}
            className="w-full mt-2 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded text-sm transition-colors flex items-center justify-center gap-2"
          >
            <Link2 className="w-4 h-4" />
            Archidekt Sync
          </button>
        )}
      </div>

      {/* Buy Cards Modal */}
      <BuyCardsModal
        isOpen={showBuyModal}
        onClose={() => setShowBuyModal(false)}
        cards={missingEntries}
        deckName={deck.name}
      />
    </>
  );
}

DeckCard.propTypes = {
  deck: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    name: PropTypes.string.isRequired,
    format: PropTypes.string,
    description: PropTypes.string,
    created_at: PropTypes.string,
    cards: PropTypes.array
  }).isRequired,
  editingDeck: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  inventoryByName: PropTypes.object,
  onSelect: PropTypes.func.isRequired,
  onCopy: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  onEditCards: PropTypes.func,
  onArchidektSync: PropTypes.func,
  onDelete: PropTypes.func.isRequired,
  onUpdateName: PropTypes.func.isRequired,
  onCancelEdit: PropTypes.func.isRequired
};

export default DeckCard;
