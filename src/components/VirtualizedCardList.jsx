import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { FixedSizeList as List } from 'react-window';

/**
 * VirtualizedCardList - Renders large card lists with virtualization
 * Only renders items visible in the viewport for improved performance
 * 
 * @param {Array} items - Array of [cardName, items] entries to render
 * @param {Function} renderCard - Function to render each card entry
 * @param {number} itemHeight - Height of each item in pixels
 * @param {number} containerHeight - Height of the container in pixels
 * @param {string} viewMode - 'card' or 'list' view mode
 */
export const VirtualizedCardList = memo(function VirtualizedCardList({
  items,
  renderCard,
  itemHeight = 160,
  containerHeight = 600,
  viewMode = 'card'
}) {
  // For card view, we need to calculate rows based on grid layout
  // Default to 6 columns for large screens (matches existing grid: grid-cols-3 md:grid-cols-4 lg:grid-cols-6)
  const columnsPerRow = viewMode === 'card' ? 6 : 1;
  const adjustedItemHeight = viewMode === 'card' ? 180 : itemHeight;
  
  // Calculate total rows needed
  const totalRows = Math.ceil(items.length / columnsPerRow);
  
  // Row renderer for card grid view
  const CardRowRenderer = ({ index, style }) => {
    const startIdx = index * columnsPerRow;
    const endIdx = Math.min(startIdx + columnsPerRow, items.length);
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
  };
  
  // Row renderer for list view
  const ListRowRenderer = ({ index, style }) => {
    const [cardName, cardItems] = items[index];
    
    return (
      <div style={style} className="py-1">
        {renderCard([cardName, cardItems])}
      </div>
    );
  };

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
