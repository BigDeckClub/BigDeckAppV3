/**
 * CardGalleryView - Grid layout for card images with hover effects
 * @module components/ui/CardGalleryView
 */

import React, { memo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Plus, Minus, MoreVertical, DollarSign } from 'lucide-react';

/**
 * Get the appropriate image URL for a card
 */
const getCardImageUrl = (card) => {
  // Scryfall image
  if (card.image_uris?.normal) return card.image_uris.normal;
  if (card.image_uris?.small) return card.image_uris.small;

  // Card faces (double-faced cards)
  if (card.card_faces?.[0]?.image_uris?.normal) {
    return card.card_faces[0].image_uris.normal;
  }

  // Fallback to Scryfall API URL
  if (card.scryfall_id) {
    return `https://api.scryfall.com/cards/${card.scryfall_id}?format=image&version=normal`;
  }

  return null;
};

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
 * Individual card tile in the gallery
 */
const CardTile = memo(function CardTile({
  card,
  isSelected,
  onSelect,
  onQuantityChange,
  onCardClick,
  onContextMenu,
  showPrice = true,
}) {
  const imageUrl = getCardImageUrl(card);
  const price = card.price ?? card.prices?.usd ?? null;
  const quantity = card.quantity ?? 1;

  const handleQuantityClick = useCallback((e, delta) => {
    e.stopPropagation();
    onQuantityChange?.(card, Math.max(0, quantity + delta));
  }, [card, quantity, onQuantityChange]);

  const handleSelect = useCallback((e) => {
    e.stopPropagation();
    onSelect?.(card, !isSelected);
  }, [card, isSelected, onSelect]);

  const handleContextMenu = useCallback((e) => {
    e.preventDefault();
    onContextMenu?.(card, e);
  }, [card, onContextMenu]);

  return (
    <div
      className={`
        group relative rounded-xl overflow-hidden cursor-pointer
        transition-all duration-200 ease-out
        hover:scale-[1.02] hover:z-10
        focus-within:ring-2 focus-within:ring-accent/50
        ${isSelected ? 'ring-2 ring-teal-400 shadow-glow-accent' : ''}
      `}
      onClick={() => onCardClick?.(card)}
      onContextMenu={handleContextMenu}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onCardClick?.(card)}
      aria-label={`${card.name}, ${quantity} copies`}
    >
      {/* Selection checkbox */}
      {onSelect && (
        <div className="absolute top-2 left-2 z-20">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={handleSelect}
            onClick={(e) => e.stopPropagation()}
            className="w-4 h-4 rounded border-slate-600 bg-slate-800/80 text-teal-500
                       focus:ring-teal-500/50 focus:ring-offset-0 cursor-pointer
                       opacity-0 group-hover:opacity-100 checked:opacity-100 transition-opacity"
            aria-label={`Select ${card.name}`}
          />
        </div>
      )}

      {/* Card image */}
      <div className="aspect-[488/680] bg-slate-800 relative">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={card.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-500">
            <span className="text-xs text-center px-2">{card.name}</span>
          </div>
        )}

        {/* Quantity badge */}
        {quantity > 1 && (
          <div className="absolute top-2 right-2 z-10">
            <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5
                           text-sm font-bold text-white bg-slate-900/90 rounded-full
                           border border-slate-700">
              ×{quantity}
            </span>
          </div>
        )}

        {/* Hover overlay with controls */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent
                        opacity-0 group-hover:opacity-100 transition-opacity duration-200
                        flex flex-col justify-end p-3">
          {/* Quick actions */}
          <div className="flex items-center justify-between">
            {/* Quantity controls */}
            {onQuantityChange && (
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => handleQuantityClick(e, -1)}
                  className="p-1.5 rounded-full bg-slate-800/80 text-slate-300 hover:text-white
                             hover:bg-slate-700 transition-colors"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="min-w-[24px] text-center text-sm font-medium text-white">
                  {quantity}
                </span>
                <button
                  onClick={(e) => handleQuantityClick(e, 1)}
                  className="p-1.5 rounded-full bg-slate-800/80 text-slate-300 hover:text-white
                             hover:bg-slate-700 transition-colors"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Context menu trigger */}
            {onContextMenu && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onContextMenu(card, e);
                }}
                className="p-1.5 rounded-full bg-slate-800/80 text-slate-300 hover:text-white
                           hover:bg-slate-700 transition-colors"
                aria-label="More options"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Card info footer */}
      <div className="p-2 bg-slate-800/80 backdrop-blur-sm">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-medium text-white truncate" title={card.name}>
              {card.name}
            </h3>
            <p className="text-xs text-slate-400">{getSetDisplayName(card.set)}</p>
          </div>
          {showPrice && (
            <div className="flex items-center gap-1 text-sm font-medium text-emerald-400">
              <DollarSign className="w-3 h-3" />
              <span>{formatPrice(price).replace('$', '')}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

CardTile.propTypes = {
  card: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    name: PropTypes.string.isRequired,
    set: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
    quantity: PropTypes.number,
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
};

/**
 * CardGalleryView - Responsive grid of card tiles
 */
export const CardGalleryView = memo(function CardGalleryView({
  cards,
  selectedCards = new Set(),
  onSelect,
  onQuantityChange,
  onCardClick,
  onContextMenu,
  showPrice = true,
  emptyMessage = 'No cards found',
  className = '',
}) {
  if (!cards || cards.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center py-16 text-slate-400 ${className}`}>
        <p className="text-lg">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div
      className={`
        grid gap-4
        grid-cols-2
        sm:grid-cols-3
        md:grid-cols-4
        lg:grid-cols-5
        xl:grid-cols-6
        2xl:grid-cols-7
        ${className}
      `}
    >
      {cards.map((card) => (
        <CardTile
          key={card.id || `${card.name}-${card.set}`}
          card={card}
          isSelected={selectedCards.has(card.id)}
          onSelect={onSelect}
          onQuantityChange={onQuantityChange}
          onCardClick={onCardClick}
          onContextMenu={onContextMenu}
          showPrice={showPrice}
        />
      ))}
    </div>
  );
});

CardGalleryView.propTypes = {
  /** Array of card objects to display */
  cards: PropTypes.array.isRequired,
  /** Set of selected card IDs */
  selectedCards: PropTypes.instanceOf(Set),
  /** Callback when card selection changes */
  onSelect: PropTypes.func,
  /** Callback when quantity changes */
  onQuantityChange: PropTypes.func,
  /** Callback when card is clicked */
  onCardClick: PropTypes.func,
  /** Callback for context menu */
  onContextMenu: PropTypes.func,
  /** Whether to show prices */
  showPrice: PropTypes.bool,
  /** Message to show when no cards */
  emptyMessage: PropTypes.string,
  /** Additional CSS classes */
  className: PropTypes.string,
};

export default CardGalleryView;
