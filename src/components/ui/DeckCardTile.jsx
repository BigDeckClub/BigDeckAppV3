/**
 * DeckCardTile - Enhanced deck card display with better visuals
 * @module components/ui/DeckCardTile
 */

import React, { memo, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  Download,
  Edit2,
  Trash2,
  FileEdit,
  Link2,
  ShoppingCart,
  ChevronDown,
  ChevronUp,
  Calendar,
  Layers,
  AlertTriangle,
  CheckCircle2,
  MoreVertical,
  Copy,
} from 'lucide-react';
import DeckColorGradientBar from '../decks/DeckColorGradientBar';

/**
 * Format date for display
 */
const formatDate = (dateString) => {
  if (!dateString) return 'Unknown';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

/**
 * Get completion status color
 */
const getCompletionColor = (percentage) => {
  if (percentage >= 100) return 'text-emerald-400';
  if (percentage >= 75) return 'text-amber-400';
  if (percentage >= 50) return 'text-orange-400';
  return 'text-red-400';
};

/**
 * Get completion background gradient
 */
const getCompletionBg = (percentage) => {
  if (percentage >= 100) return 'from-emerald-500';
  if (percentage >= 75) return 'from-amber-500';
  if (percentage >= 50) return 'from-orange-500';
  return 'from-red-500';
};

/**
 * Mana symbol component
 */
const ManaSymbol = memo(function ManaSymbol({ symbol, size = 'sm' }) {
  const colors = {
    W: 'bg-mtg-W-dark text-ui-text',
    U: 'bg-mtg-U text-white',
    B: 'bg-mtg-B-light text-white',
    R: 'bg-mtg-R text-white',
    G: 'bg-mtg-G text-white',
    C: 'bg-mtg-C text-ui-text',
  };

  const sizes = {
    sm: 'w-5 h-5 text-xs',
    md: 'w-6 h-6 text-sm',
  };

  return (
    <span
      className={`
        inline-flex items-center justify-center rounded-full font-bold
        ${colors[symbol] || 'bg-ui-surface text-ui-text'}
        ${sizes[size]}
      `}
    >
      {symbol}
    </span>
  );
});

ManaSymbol.propTypes = {
  symbol: PropTypes.string.isRequired,
  size: PropTypes.oneOf(['sm', 'md']),
};

/**
 * Action button component
 */
const ActionButton = memo(function ActionButton({
  icon: Icon,
  label,
  onClick,
  variant = 'default',
  disabled = false,
}) {
  const variants = {
    default: 'bg-ui-surface text-ui-text hover:bg-ui-card border border-ui-border',
    primary: 'bg-ui-primary text-ui-primary-foreground hover:opacity-95',
    secondary: 'bg-ui-card text-ui-text hover:bg-ui-surface',
    danger: 'bg-ui-surface text-ui-accent hover:bg-ui-card',
    warning: 'bg-ui-primary text-ui-primary-foreground',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
        transition-all duration-150
        ${variants[variant]}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <Icon className="w-4 h-4" />
      <span>{label}</span>
    </button>
  );
});

ActionButton.propTypes = {
  icon: PropTypes.elementType.isRequired,
  label: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
  variant: PropTypes.oneOf(['default', 'primary', 'secondary', 'danger', 'warning']),
  disabled: PropTypes.bool,
};

/**
 * Missing card row
 */
const MissingCardRow = memo(function MissingCardRow({ card, onBuy }) {
  const setDisplay = typeof card.set === 'string'
    ? card.set
    : card.set?.editioncode || card.set?.editionname || '';

  return (
    <div className="flex items-center justify-between py-2 px-3 bg-ui-surface rounded-lg border border-ui-border">
      <div className="flex-1 min-w-0">
        <span className="text-ui-accent font-medium">{card.quantity}×</span>
        <span className="text-ui-text ml-2 truncate">{card.name}</span>
        {setDisplay && (
          <span className="text-ui-muted text-xs ml-2">[{setDisplay}]</span>
        )}
      </div>
      {onBuy && (
        <button
          onClick={() => onBuy(card)}
          className="p-1.5 text-ui-accent hover:text-ui-primary hover:bg-ui-card rounded transition-colors"
          title="Buy this card"
        >
          <ShoppingCart className="w-4 h-4" />
        </button>
      )}
    </div>
  );
});

MissingCardRow.propTypes = {
  card: PropTypes.object.isRequired,
  onBuy: PropTypes.func,
};

/**
 * DeckCardTile - Enhanced deck card component
 */
export const DeckCardTile = memo(function DeckCardTile({
  deck,
  completionPercentage = 100,
  missingCards = [],
  totalMissing = 0,
  colorIdentity = [],
  isEditing = false,
  onSelect,
  onCopy,
  onEdit,
  onEditCards,
  onDelete,
  onArchidektSync,
  onBuyMissing,
  onUpdateName,
  onCancelEdit,
  className = '',
}) {
  const [showMissing, setShowMissing] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const actionsRef = React.useRef(null);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    if (!showActions) return;

    const handleClickOutside = (e) => {
      if (actionsRef.current && !actionsRef.current.contains(e.target)) {
        setShowActions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showActions]);

  const cardCount = deck.cards?.length || 0;
  const totalCards = deck.cards?.reduce((sum, c) => sum + (c.quantity || 1), 0) || 0;
  const isComplete = completionPercentage >= 100;

  const handleToggleMissing = useCallback((e) => {
    e.stopPropagation();
    setShowMissing((prev) => !prev);
  }, []);

  const handleAction = useCallback((action) => (e) => {
    e.stopPropagation();
    action(deck);
    setShowActions(false);
  }, [deck]);

  return (
    <div
      className={`
        group relative bg-ui-card
        border border-ui-border hover:border-ui-primary
        rounded-xl overflow-hidden cursor-pointer
        transition-all duration-200
        hover:shadow-card
        ${className}
      `}
      onClick={() => onSelect?.(deck)}
    >
      {/* Top color gradient strip (deck color pie) */}
      <div className="absolute top-0 left-0 right-0 z-20">
        {(() => {
          // Compute color keys: prefer provided colorIdentity (from server), then deck.colorIdentity, otherwise derive from cards
          let keys = (colorIdentity && colorIdentity.length > 0)
            ? colorIdentity.slice()
            : (deck.colorIdentity && deck.colorIdentity.length > 0)
              ? deck.colorIdentity.slice()
              : [];

          // Fallback: derive from card color_identity if still empty
          if ((!keys || keys.length === 0) && Array.isArray(deck.cards)) {
            const set = new Set();
            deck.cards.forEach((c) => {
              const cardColors = c.color_identity || c.colorIdentity || c.colors || [];
              (cardColors || []).forEach((ch) => set.add(String(ch).toUpperCase()));
            });
            keys = Array.from(set);
          }

          // Default to colorless if no colors found
          if (!keys || keys.length === 0) keys = ['C'];

          // Map single-letter mana symbols to pie token keys expected by the gradient bar
          const letterToKey = { W: 'white', U: 'blue', B: 'black', R: 'red', G: 'green', C: 'colorless' };
          const mapped = (keys || []).map((k) => {
            if (!k) return 'colorless';
            const up = String(k).toUpperCase();
            return letterToKey[up] || String(k).toLowerCase();
          });

          return (
            <DeckColorGradientBar
              colors={mapped}
              height={6}
              radius={12}
              className="z-20"
            />
          );
        })()}
      </div>

      {/* Completion indicator bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-ui-border">
        <div
          className={`h-full bg-gradient-to-r ${getCompletionBg(completionPercentage)} to-transparent transition-all duration-500`}
          style={{ width: `${Math.min(100, completionPercentage)}%` }}
        />
      </div>

      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <input
                type="text"
                defaultValue={deck.name}
                placeholder="Deck name"
                className="w-full bg-ui-card border border-ui-accent rounded-lg px-3 py-2 text-ui-text font-semibold focus:outline-none focus:ring-2 ring-ui-accent/50"
                onBlur={(e) => onUpdateName?.(deck.id, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onUpdateName?.(deck.id, e.currentTarget.value);
                  if (e.key === 'Escape') onCancelEdit?.();
                }}
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <>
                <h3 className="text-lg font-bold text-ui-heading truncate group-hover:text-ui-accent transition-colors">
                  {deck.name}
                </h3>
                <p className="text-xs text-ui-muted mt-0.5">{deck.format || 'No format'}</p>
              </>
            )}
          </div>

          {/* Actions dropdown */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowActions(!showActions);
              }}
              className="p-2 text-ui-muted hover:text-ui-text hover:bg-ui-surface rounded-lg transition-colors"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {showActions && (
              <div
                ref={actionsRef}
                className="absolute right-0 top-full mt-1 z-50 w-48 bg-ui-surface border border-ui-border rounded-lg shadow-xl py-1 animate-fade-in">
                  {onEdit && (
                    <button
                      onClick={handleAction(() => onEdit(deck.id))}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-ui-muted hover:bg-ui-surface hover:text-ui-text"
                    >
                      <Edit2 className="w-4 h-4" />
                      Rename Deck
                    </button>
                  )}
                  {onEditCards && (
                    <button
                      onClick={handleAction(onEditCards)}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-ui-muted hover:bg-ui-surface hover:text-ui-text"
                    >
                      <FileEdit className="w-4 h-4" />
                      Edit Cards
                    </button>
                  )}
                  {onCopy && (
                    <button
                      onClick={handleAction(onCopy)}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-ui-muted hover:bg-ui-surface hover:text-ui-text"
                    >
                      <Copy className="w-4 h-4" />
                      Copy to Inventory
                    </button>
                  )}
                  {onArchidektSync && (
                    <button
                      onClick={handleAction(onArchidektSync)}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-ui-muted hover:bg-ui-surface hover:text-ui-text"
                    >
                      <Link2 className="w-4 h-4" />
                      Archidekt Sync
                    </button>
                  )}
                  {onDelete && (
                    <>
                      <div className="my-1 border-t border-ui-border" />
                      <button
                        onClick={handleAction(() => onDelete(deck.id))}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-red-900/30"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete Deck
                      </button>
                    </>
                  )}
                </div>
            )}
          </div>
        </div>

        {/* Color identity */}
        {colorIdentity.length > 0 && (
          <div className="flex items-center gap-1 mt-3">
            {colorIdentity.map((color) => (
              <ManaSymbol key={color} symbol={color} />
            ))}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="px-4 py-3 border-t border-ui-border bg-ui-surface/30">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-ui-accent">{totalCards}</div>
            <div className="text-xs text-ui-muted">Cards</div>
          </div>
          <div>
            <div className="text-lg font-bold text-ui-text">{cardCount}</div>
            <div className="text-xs text-ui-muted">Unique</div>
          </div>
          <div>
            <div className={`text-lg font-bold ${getCompletionColor(completionPercentage)}`}>
              {completionPercentage.toFixed(0)}%
            </div>
            <div className="text-xs text-ui-muted">Complete</div>
          </div>
        </div>
      </div>

      {/* Missing cards section */}
      {totalMissing > 0 && (
        <div className="border-t border-ui-border">
          <button
            onClick={handleToggleMissing}
            className="w-full flex items-center justify-between px-4 py-3 bg-red-900/10 hover:bg-red-900/20 transition-colors"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span className="text-sm font-medium text-red-300">
                Missing {totalMissing} cards
              </span>
            </div>
            {showMissing ? (
              <ChevronUp className="w-4 h-4 text-red-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-red-400" />
            )}
          </button>

            {showMissing && (
            <div className="px-4 py-3 space-y-2 max-h-48 overflow-y-auto bg-ui-surface/50">
              {onBuyMissing && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onBuyMissing(missingCards);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 mb-2
                             bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-medium
                             transition-colors"
                >
                  <ShoppingCart className="w-4 h-4" />
                  Buy All Missing
                </button>
              )}
              {missingCards.slice(0, 10).map((card, idx) => (
                <MissingCardRow key={idx} card={card} />
              ))}
              {missingCards.length > 10 && (
                <p className="text-center text-xs text-ui-muted py-2">
                  +{missingCards.length - 10} more missing cards
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Complete badge */}
      {isComplete && (
        <div className="absolute top-3 right-12 bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          Complete
        </div>
      )}

      {/* Footer */}
      <div className="px-4 py-3 border-t border-ui-border flex items-center justify-between">
        <div className="flex items-center gap-1 text-xs text-ui-muted">
          <Calendar className="w-3 h-3" />
          {formatDate(deck.created_at)}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect?.(deck);
          }}
          className="text-sm font-medium text-ui-accent hover:text-ui-accent/80 transition-colors"
        >
          View Details →
        </button>
      </div>
    </div>
  );
});

DeckCardTile.propTypes = {
  /** Deck object */
  deck: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    name: PropTypes.string.isRequired,
    format: PropTypes.string,
    description: PropTypes.string,
    created_at: PropTypes.string,
    cards: PropTypes.array,
  }).isRequired,
  /** Completion percentage (0-100) */
  completionPercentage: PropTypes.number,
  /** Array of missing cards */
  missingCards: PropTypes.array,
  /** Total number of missing cards */
  totalMissing: PropTypes.number,
  /** Color identity array (e.g., ['W', 'U', 'B']) */
  colorIdentity: PropTypes.array,
  /** Whether the deck name is being edited */
  isEditing: PropTypes.bool,
  /** Callback when deck is selected */
  onSelect: PropTypes.func,
  /** Callback to copy deck to inventory */
  onCopy: PropTypes.func,
  /** Callback to start editing deck name */
  onEdit: PropTypes.func,
  /** Callback to edit deck cards */
  onEditCards: PropTypes.func,
  /** Callback to delete deck */
  onDelete: PropTypes.func,
  /** Callback for Archidekt sync */
  onArchidektSync: PropTypes.func,
  /** Callback to buy missing cards */
  onBuyMissing: PropTypes.func,
  /** Callback when deck name is updated */
  onUpdateName: PropTypes.func,
  /** Callback to cancel editing */
  onCancelEdit: PropTypes.func,
  /** Additional CSS classes */
  className: PropTypes.string,
};

export default DeckCardTile;
