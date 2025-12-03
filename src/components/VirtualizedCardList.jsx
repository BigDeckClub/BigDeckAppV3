import React, { memo, useCallback, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { FixedSizeList as List } from 'react-window';

/**
 * Get the number of columns based on screen width
 * Matches the CSS grid breakpoints: grid-cols-3 md:grid-cols-4 lg:grid-cols-6
 */
function getColumnsForWidth(width) {
  if (width >= 1024) return 6; // lg breakpoint
  if (width >= 768) return 4;  // md breakpoint
  return 3; // default mobile
}

/**
 * VirtualizedCardList - Renders large card lists with virtualization
 * Only renders items visible in the viewport for improved performance
 * 
 * @param {Array} items - Array of [cardName, items] entries to render. 
 *   IMPORTANT: For optimal performance, callers should memoize this array 
 *   using useMemo() to prevent unnecessary re-renders.
 * @param {Function} renderCard - Function to render each card entry.
 *   IMPORTANT: For optimal performance, callers should memoize this function
 *   using useCallback() to prevent unnecessary re-renders.
 * @param {number} itemHeight - Height of each item in pixels
 * @param {number} containerHeight - Height of the container in pixels
 * @param {string} viewMode - 'card' or 'list' view mode
 * 
 * @example
 * // Caller should memoize items and renderCard:
 * const memoizedItems = useMemo(() => items, [items]);
 * const memoizedRenderCard = useCallback((item) => <Card item={item} />, []);
 * <VirtualizedCardList items={memoizedItems} renderCard={memoizedRenderCard} />
 */
export const VirtualizedCardList = memo(function VirtualizedCardList({
  items,
  renderCard,
  itemHeight = 160,
  containerHeight = 600,
  viewMode = 'card'
}) {
  // Track window width for responsive column count
  const [columnsPerRow, setColumnsPerRow] = useState(() => 
    typeof window !== 'undefined' ? getColumnsForWidth(window.innerWidth) : 6
  );
  
  // Update columns on window resize
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleResize = () => {
      setColumnsPerRow(getColumnsForWidth(window.innerWidth));
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const effectiveColumns = viewMode === 'card' ? columnsPerRow : 1;
  const adjustedItemHeight = viewMode === 'card' ? 180 : itemHeight;
  
  // Calculate total rows needed
  const totalRows = Math.ceil(items.length / effectiveColumns);
  
  // Memoized row renderer for card grid view
  const CardRowRenderer = useCallback(({ index, style }) => {
    const startIdx = index * effectiveColumns;
    const endIdx = Math.min(startIdx + effectiveColumns, items.length);
    const rowItems = items.slice(startIdx, endIdx);
    
    return (
      <div style={style} className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-3 px-1">
        {rowItems.map(([cardName, cardItems]) => (
          <div key={cardName}>
            {renderCard([cardName, cardItems])}
          </div>
        ))}
      </div>
    );
  }, [items, renderCard, effectiveColumns]);
  
  // Memoized row renderer for list view
  const ListRowRenderer = useCallback(({ index, style }) => {
    const [cardName, cardItems] = items[index];
    
    return (
      <div style={style} className="py-1">
        {renderCard([cardName, cardItems])}
      </div>
    );
  }, [items, renderCard]);

  if (viewMode === 'card') {
    return (
      <List
        height={containerHeight}
        width="100%"
        itemCount={totalRows}
        itemSize={adjustedItemHeight}
        className="virtualized-card-list"
      >
        {CardRowRenderer}
      </List>
    );
  }

  return (
    <List
      height={containerHeight}
      width="100%"
      itemCount={items.length}
      itemSize={itemHeight}
      className="virtualized-list"
    >
      {ListRowRenderer}
    </List>
  );
});

VirtualizedCardList.propTypes = {
  items: PropTypes.arrayOf(PropTypes.array).isRequired,
  renderCard: PropTypes.func.isRequired,
  itemHeight: PropTypes.number,
  containerHeight: PropTypes.number,
  viewMode: PropTypes.oneOf(['card', 'list'])
};

export default VirtualizedCardList;
