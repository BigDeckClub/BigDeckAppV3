/**
 * CardListView - Compact list view for cards
 * @module components/ui/CardListView
 */

import React, { memo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Plus, Minus, MoreVertical, ChevronRight } from 'lucide-react';
import scryfallClient from '../../utils/scryfallClient';

/**
 * Thumbnail selection delegated to centralized scryfallClient.getImageUrl
 */

/**
 * Format price for display
 */
const formatPrice = (price) => {
  if (price === null || price === undefined) return '—';
  const num = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(num)) return '—';
  return `$${num.toFixed(2)}`;
};

/**
 * Get set display name safely
 */
const getSetDisplayName = (set) => {
  if (!set) return 'Unknown';
  if (typeof set === 'string') return set.toUpperCase();
  return (set.editioncode || set.editionname || 'Unknown').toUpperCase();
};

/**
 * Get rarity color class
 */
const getRarityColor = (rarity) => {
  switch (rarity?.toLowerCase()) {
    case 'mythic': return 'text-orange-400';
    case 'rare': return 'text-yellow-400';
    case 'uncommon': return 'text-[var(--text-muted)]';
    case 'common': return 'text-[var(--text-muted)]';
    default: return 'text-[var(--text-muted)]';
  }
};

/**
 * Individual card row in the list
 */
const CardRow = memo(function CardRow({
  card,
  isSelected,
  onSelect,
  onQuantityChange,
  onCardClick,
  onContextMenu,
  showPrice = true,
  showThumbnail = true,
}) {
  const thumbnailUrl = scryfallClient.getImageUrl(card, { version: 'small' });
  const price = card.price ?? card.prices?.usd ?? null;
  const quantity = card.quantity ?? 1;
  const totalPrice = price ? (parseFloat(price) * quantity) : null;

  const handleQuantityClick = useCallback((e, delta) => {
    e.stopPropagation();
    onQuantityChange?.(card, Math.max(0, quantity + delta));
  }, [card, quantity, onQuantityChange]);

  const handleSelect = useCallback((e) => {
    e.stopPropagation();
    onSelect?.(card, e.target.checked);
  }, [card, onSelect]);

  const handleContextMenu = useCallback((e) => {
    e.preventDefault();
    onContextMenu?.(card, e);
  }, [card, onContextMenu]);

  return (
    <div
      className={`
        group flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer
        transition-all duration-150 ease-out
        hover:bg-[var(--surface)]
        ${isSelected ? 'bg-teal-500/10 ring-1 ring-teal-500/30' : ''}
      `}
      onClick={() => onCardClick?.(card)}
      onContextMenu={handleContextMenu}
      role="row"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onCardClick?.(card)}
      aria-selected={isSelected}
    >
      {/* Selection checkbox */}
      {onSelect && (
        <div className="flex-shrink-0">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={handleSelect}
            onClick={(e) => e.stopPropagation()}
            className="w-4 h-4 rounded border-[var(--border)] bg-[var(--surface)] text-teal-500
                       focus:ring-teal-500/50 focus:ring-offset-0 cursor-pointer"
            aria-label={`Select ${card.name}`}
          />
        </div>
      )}

      {/* Thumbnail */}
      {showThumbnail && (
        <div className="flex-shrink-0 w-10 h-14 rounded overflow-hidden bg-[var(--surface)]">
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-600">
              <span className="text-[8px]">No img</span>
            </div>
          )}
        </div>
      )}

      {/* Card info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-white truncate">
            {card.name}
          </h3>
          {card.foil && (
            <span className="flex-shrink-0 px-1.5 py-0.5 text-[10px] font-medium uppercase
                           bg-gradient-to-r from-purple-500/20 to-pink-500/20
                           text-purple-300 rounded">
              Foil
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <span>{getSetDisplayName(card.set)}</span>
          <span className="text-slate-600">•</span>
          <span className={getRarityColor(card.rarity)}>
            {card.rarity || 'Unknown'}
          </span>
          {card.collector_number && (
            <>
              <span className="text-slate-600">•</span>
              <span>#{card.collector_number}</span>
            </>
          )}
        </div>
      </div>

      {/* Quantity controls */}
      {onQuantityChange && (
        <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => handleQuantityClick(e, -1)}
            className="p-1 rounded bg-[var(--muted-surface)] text-[var(--text-muted)] hover:text-white
                       hover:bg-[var(--muted-surface)] transition-colors"
            aria-label="Decrease quantity"
          >
            <Minus className="w-3 h-3" />
          </button>
          <span className="min-w-[28px] text-center text-sm font-medium text-white">
            {quantity}
          </span>
          <button
            onClick={(e) => handleQuantityClick(e, 1)}
            className="p-1 rounded bg-[var(--muted-surface)] text-[var(--text-muted)] hover:text-white
                       hover:bg-[var(--muted-surface)] transition-colors"
            aria-label="Increase quantity"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Static quantity display when no controls */}
      {!onQuantityChange && quantity > 1 && (
        <div className="flex-shrink-0">
          <span className="px-2 py-1 text-sm font-medium text-[var(--text-muted)] bg-[var(--surface)] rounded">
            ×{quantity}
          </span>
        </div>
      )}

      {/* Price */}
      {showPrice && (
        <div className="flex-shrink-0 text-right min-w-[70px]">
          <div className="text-sm font-medium text-emerald-400">
            {formatPrice(price)}
          </div>
          {quantity > 1 && totalPrice !== null && (
            <div className="text-xs text-[var(--text-muted)]">
              {formatPrice(totalPrice)} total
            </div>
          )}
        </div>
      )}

      {/* Actions / Chevron */}
      <div className="flex-shrink-0 flex items-center gap-1">
        {onContextMenu && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onContextMenu(card, e);
            }}
            className="p-1.5 rounded text-[var(--text-muted)] hover:text-white
                       hover:bg-[var(--muted-surface)] transition-colors
                       opacity-0 group-hover:opacity-100"
            aria-label="More options"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        )}
        <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-[var(--text-muted)] transition-colors" />
      </div>
    </div>
  );
});

CardRow.propTypes = {
  card: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    name: PropTypes.string.isRequired,
    set: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
    rarity: PropTypes.string,
    collector_number: PropTypes.string,
    quantity: PropTypes.number,
    foil: PropTypes.bool,
    price: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    prices: PropTypes.object,
    image_uris: PropTypes.object,
    card_faces: PropTypes.array,
    scryfall_id: PropTypes.string,
  }).isRequired,
  isSelected: PropTypes.bool,
  onSelect: PropTypes.func,
  onQuantityChange: PropTypes.func,
  onCardClick: PropTypes.func,
  onContextMenu: PropTypes.func,
  showPrice: PropTypes.bool,
  showThumbnail: PropTypes.bool,
};

/**
 * CardListView - Compact list of card rows
 */
export const CardListView = memo(function CardListView({
  cards,
  selectedCards = new Set(),
  onSelect,
  onSelectAll,
  onQuantityChange,
  onCardClick,
  onContextMenu,
  showPrice = true,
  showThumbnail = true,
  emptyMessage = 'No cards found',
  className = '',
}) {
  const allSelected = cards.length > 0 && cards.every(c => selectedCards.has(c.id));
  const someSelected = cards.some(c => selectedCards.has(c.id));

  const handleSelectAll = useCallback((e) => {
    onSelectAll?.(e.target.checked);
  }, [onSelectAll]);

  if (!cards || cards.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center py-16 text-[var(--text-muted)] ${className}`}>
        <p className="text-lg">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${className}`} role="grid" aria-label="Card list">
      {/* Header with select all */}
      {onSelectAll && (
        <div className="flex items-center gap-3 px-3 py-2 border-b border-[var(--border)] sticky top-0 bg-[var(--bg-page)] backdrop-blur-sm z-10">
          <input
            type="checkbox"
            checked={allSelected}
            ref={(el) => {
              if (el) el.indeterminate = someSelected && !allSelected;
            }}
            onChange={handleSelectAll}
            className="w-4 h-4 rounded border-[var(--border)] bg-[var(--surface)] text-teal-500
                       focus:ring-teal-500/50 focus:ring-offset-0 cursor-pointer"
            aria-label="Select all cards"
          />
          <span className="text-sm text-[var(--text-muted)]">
            {selectedCards.size > 0
              ? `${selectedCards.size} of ${cards.length} selected`
              : `${cards.length} cards`
            }
          </span>
        </div>
      )}

      {/* Card rows */}
      <div className="divide-y divide-slate-800/50">
        {cards.map((card) => (
          <CardRow
            key={card.id || `${card.name}-${card.set}`}
            card={card}
            isSelected={selectedCards.has(card.id)}
            onSelect={onSelect}
            onQuantityChange={onQuantityChange}
            onCardClick={onCardClick}
            onContextMenu={onContextMenu}
            showPrice={showPrice}
            showThumbnail={showThumbnail}
          />
        ))}
      </div>
    </div>
  );
});

CardListView.propTypes = {
  /** Array of card objects to display */
  cards: PropTypes.array.isRequired,
  /** Set of selected card IDs */
  selectedCards: PropTypes.instanceOf(Set),
  /** Callback when card selection changes */
  onSelect: PropTypes.func,
  /** Callback when select all is toggled */
  onSelectAll: PropTypes.func,
  /** Callback when quantity changes */
  onQuantityChange: PropTypes.func,
  /** Callback when card is clicked */
  onCardClick: PropTypes.func,
  /** Callback for context menu */
  onContextMenu: PropTypes.func,
  /** Whether to show prices */
  showPrice: PropTypes.bool,
  /** Whether to show thumbnails */
  showThumbnail: PropTypes.bool,
  /** Message to show when no cards */
  emptyMessage: PropTypes.string,
  /** Additional CSS classes */
  className: PropTypes.string,
};

export default CardListView;
