/**
 * CardTableView - Sortable table view for cards
 * @module components/ui/CardTableView
 */

import React, { memo, useCallback, useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { ChevronUp, ChevronDown, ChevronsUpDown, Plus, Minus } from 'lucide-react';

/**
 * Sort directions
 */
const SORT_DIR = {
  ASC: 'asc',
  DESC: 'desc',
  NONE: null,
};

/**
 * Column definitions
 */
const COLUMNS = [
  { id: 'name', label: 'Name', sortable: true, width: 'flex-1 min-w-[200px]' },
  { id: 'set', label: 'Set', sortable: true, width: 'w-24' },
  { id: 'rarity', label: 'Rarity', sortable: true, width: 'w-24' },
  { id: 'quantity', label: 'Qty', sortable: true, width: 'w-24', align: 'center' },
  { id: 'price', label: 'Price', sortable: true, width: 'w-24', align: 'right' },
  { id: 'total', label: 'Total', sortable: true, width: 'w-24', align: 'right' },
];

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
    case 'uncommon': return 'text-slate-300';
    case 'common': return 'text-slate-500';
    default: return 'text-slate-400';
  }
};

/**
 * Get sort value for a card field
 */
const getSortValue = (card, columnId) => {
  switch (columnId) {
    case 'name':
      return card.name?.toLowerCase() || '';
    case 'set':
      return getSetDisplayName(card.set).toLowerCase();
    case 'rarity': {
      const order = { mythic: 0, rare: 1, uncommon: 2, common: 3 };
      return order[card.rarity?.toLowerCase()] ?? 4;
    }
    case 'quantity':
      return card.quantity ?? 1;
    case 'price': {
      const price = card.price ?? card.prices?.usd;
      return price ? parseFloat(price) : 0;
    }
    case 'total': {
      const price = card.price ?? card.prices?.usd;
      const qty = card.quantity ?? 1;
      return price ? parseFloat(price) * qty : 0;
    }
    default:
      return 0;
  }
};

/**
 * Sort icon component
 */
const SortIcon = memo(function SortIcon({ direction }) {
  if (direction === SORT_DIR.ASC) {
    return <ChevronUp className="w-4 h-4" />;
  }
  if (direction === SORT_DIR.DESC) {
    return <ChevronDown className="w-4 h-4" />;
  }
  return <ChevronsUpDown className="w-4 h-4 opacity-40" />;
});

SortIcon.propTypes = {
  direction: PropTypes.oneOf([SORT_DIR.ASC, SORT_DIR.DESC, SORT_DIR.NONE]),
};

/**
 * Table header cell
 */
const TableHeaderCell = memo(function TableHeaderCell({
  column,
  sortColumn,
  sortDirection,
  onSort,
}) {
  const isActive = sortColumn === column.id;

  const handleClick = useCallback(() => {
    if (!column.sortable) return;
    onSort(column.id);
  }, [column, onSort]);

  return (
    <th
      className={`
        px-3 py-2 text-left text-xs font-medium text-slate-400 uppercase tracking-wider
        ${column.width}
        ${column.align === 'center' ? 'text-center' : ''}
        ${column.align === 'right' ? 'text-right' : ''}
        ${column.sortable ? 'cursor-pointer hover:text-white select-none' : ''}
        ${isActive ? 'text-teal-400' : ''}
      `}
      onClick={handleClick}
      role={column.sortable ? 'button' : undefined}
      aria-sort={isActive ? (sortDirection === SORT_DIR.ASC ? 'ascending' : 'descending') : undefined}
    >
      <div className={`flex items-center gap-1 ${column.align === 'right' ? 'justify-end' : ''} ${column.align === 'center' ? 'justify-center' : ''}`}>
        <span>{column.label}</span>
        {column.sortable && (
          <SortIcon direction={isActive ? sortDirection : SORT_DIR.NONE} />
        )}
      </div>
    </th>
  );
});

TableHeaderCell.propTypes = {
  column: PropTypes.object.isRequired,
  sortColumn: PropTypes.string,
  sortDirection: PropTypes.string,
  onSort: PropTypes.func.isRequired,
};

/**
 * Table row component
 */
const TableRow = memo(function TableRow({
  card,
  isSelected,
  onSelect,
  onQuantityChange,
  onCardClick,
}) {
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

  return (
    <tr
      className={`
        group cursor-pointer transition-colors
        hover:bg-slate-800/60
        ${isSelected ? 'bg-teal-500/10' : ''}
      `}
      onClick={() => onCardClick?.(card)}
      role="row"
      aria-selected={isSelected}
    >
      {/* Checkbox */}
      {onSelect && (
        <td className="px-3 py-2 w-10">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={handleSelect}
            onClick={(e) => e.stopPropagation()}
            className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-teal-500
                       focus:ring-teal-500/50 focus:ring-offset-0 cursor-pointer"
            aria-label={`Select ${card.name}`}
          />
        </td>
      )}

      {/* Name */}
      <td className="px-3 py-2 flex-1 min-w-[200px]">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white truncate">
            {card.name}
          </span>
          {card.foil && (
            <span className="flex-shrink-0 px-1.5 py-0.5 text-[10px] font-medium uppercase
                           bg-gradient-to-r from-purple-500/20 to-pink-500/20
                           text-purple-300 rounded">
              Foil
            </span>
          )}
        </div>
      </td>

      {/* Set */}
      <td className="px-3 py-2 w-24 text-sm text-slate-400">
        {getSetDisplayName(card.set)}
      </td>

      {/* Rarity */}
      <td className={`px-3 py-2 w-24 text-sm capitalize ${getRarityColor(card.rarity)}`}>
        {card.rarity || '—'}
      </td>

      {/* Quantity */}
      <td className="px-3 py-2 w-24">
        {onQuantityChange ? (
          <div className="flex items-center justify-center gap-1">
            <button
              onClick={(e) => handleQuantityClick(e, -1)}
              className="p-0.5 rounded text-slate-500 hover:text-white hover:bg-slate-700
                         opacity-0 group-hover:opacity-100 transition-all"
              aria-label="Decrease quantity"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="min-w-[24px] text-center text-sm font-medium text-white">
              {quantity}
            </span>
            <button
              onClick={(e) => handleQuantityClick(e, 1)}
              className="p-0.5 rounded text-slate-500 hover:text-white hover:bg-slate-700
                         opacity-0 group-hover:opacity-100 transition-all"
              aria-label="Increase quantity"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <span className="text-sm text-center block text-white">{quantity}</span>
        )}
      </td>

      {/* Price */}
      <td className="px-3 py-2 w-24 text-sm text-right text-emerald-400 font-medium">
        {formatPrice(price)}
      </td>

      {/* Total */}
      <td className="px-3 py-2 w-24 text-sm text-right text-emerald-400 font-medium">
        {formatPrice(totalPrice)}
      </td>
    </tr>
  );
});

TableRow.propTypes = {
  card: PropTypes.object.isRequired,
  isSelected: PropTypes.bool,
  onSelect: PropTypes.func,
  onQuantityChange: PropTypes.func,
  onCardClick: PropTypes.func,
};

/**
 * CardTableView - Sortable table of cards
 */
export const CardTableView = memo(function CardTableView({
  cards,
  selectedCards = new Set(),
  onSelect,
  onSelectAll,
  onQuantityChange,
  onCardClick,
  showPrice = true,
  emptyMessage = 'No cards found',
  className = '',
  defaultSortColumn = 'name',
  defaultSortDirection = SORT_DIR.ASC,
}) {
  const [sortColumn, setSortColumn] = useState(defaultSortColumn);
  const [sortDirection, setSortDirection] = useState(defaultSortDirection);

  // Filter columns based on showPrice
  const visibleColumns = useMemo(() => {
    if (!showPrice) {
      return COLUMNS.filter(c => c.id !== 'price' && c.id !== 'total');
    }
    return COLUMNS;
  }, [showPrice]);

  // Sort cards
  const sortedCards = useMemo(() => {
    if (!sortColumn || !sortDirection) return cards;

    return [...cards].sort((a, b) => {
      const aVal = getSortValue(a, sortColumn);
      const bVal = getSortValue(b, sortColumn);

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        const cmp = aVal.localeCompare(bVal);
        return sortDirection === SORT_DIR.ASC ? cmp : -cmp;
      }

      const cmp = aVal - bVal;
      return sortDirection === SORT_DIR.ASC ? cmp : -cmp;
    });
  }, [cards, sortColumn, sortDirection]);

  const handleSort = useCallback((columnId) => {
    if (sortColumn === columnId) {
      // Cycle through: ASC -> DESC -> NONE -> ASC
      if (sortDirection === SORT_DIR.ASC) {
        setSortDirection(SORT_DIR.DESC);
      } else if (sortDirection === SORT_DIR.DESC) {
        setSortDirection(SORT_DIR.NONE);
        setSortColumn(null);
      } else {
        setSortDirection(SORT_DIR.ASC);
        setSortColumn(columnId);
      }
    } else {
      setSortColumn(columnId);
      setSortDirection(SORT_DIR.ASC);
    }
  }, [sortColumn, sortDirection]);

  const allSelected = cards.length > 0 && cards.every(c => selectedCards.has(c.id));
  const someSelected = cards.some(c => selectedCards.has(c.id));

  const handleSelectAll = useCallback((e) => {
    onSelectAll?.(e.target.checked);
  }, [onSelectAll]);

  // Calculate totals
  const totals = useMemo(() => {
    let totalQty = 0;
    let totalValue = 0;

    cards.forEach(card => {
      const qty = card.quantity ?? 1;
      const price = card.price ?? card.prices?.usd;
      totalQty += qty;
      if (price) {
        totalValue += parseFloat(price) * qty;
      }
    });

    return { totalQty, totalValue };
  }, [cards]);

  if (!cards || cards.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center py-16 text-slate-400 ${className}`}>
        <p className="text-lg">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full min-w-[700px]" role="grid">
        <thead className="bg-slate-800/50 sticky top-0 z-10">
          <tr>
            {/* Select all checkbox */}
            {onSelectAll && (
              <th className="px-3 py-2 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected && !allSelected;
                  }}
                  onChange={handleSelectAll}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-teal-500
                             focus:ring-teal-500/50 focus:ring-offset-0 cursor-pointer"
                  aria-label="Select all cards"
                />
              </th>
            )}
            {visibleColumns.map((column) => (
              <TableHeaderCell
                key={column.id}
                column={column}
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
              />
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/50">
          {sortedCards.map((card) => (
            <TableRow
              key={card.id || `${card.name}-${card.set}`}
              card={card}
              isSelected={selectedCards.has(card.id)}
              onSelect={onSelect}
              onQuantityChange={onQuantityChange}
              onCardClick={onCardClick}
            />
          ))}
        </tbody>
        {/* Footer with totals */}
        {showPrice && (
          <tfoot className="bg-slate-800/30 border-t border-slate-700">
            <tr>
              {onSelectAll && <td className="px-3 py-2" />}
              <td className="px-3 py-2 text-sm font-medium text-slate-300" colSpan={3}>
                {cards.length} unique cards
              </td>
              <td className="px-3 py-2 text-sm text-center font-medium text-white">
                {totals.totalQty}
              </td>
              <td className="px-3 py-2" />
              <td className="px-3 py-2 text-sm text-right font-medium text-emerald-400">
                {formatPrice(totals.totalValue)}
              </td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
});

CardTableView.propTypes = {
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
  /** Whether to show prices */
  showPrice: PropTypes.bool,
  /** Message to show when no cards */
  emptyMessage: PropTypes.string,
  /** Additional CSS classes */
  className: PropTypes.string,
  /** Default sort column */
  defaultSortColumn: PropTypes.string,
  /** Default sort direction */
  defaultSortDirection: PropTypes.oneOf([SORT_DIR.ASC, SORT_DIR.DESC, SORT_DIR.NONE]),
};

export default CardTableView;
