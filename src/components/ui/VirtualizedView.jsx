/**
 * VirtualizedView - Wrapper for virtualized rendering of card views
 * Supports gallery, list, and table modes with automatic virtualization for large datasets
 * @module components/ui/VirtualizedView
 */

import React, { memo, useCallback, useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { FixedSizeList as List, FixedSizeGrid as Grid } from 'react-window';
import { VIEW_MODES } from './ViewModeToggle';

/**
 * Threshold for enabling virtualization
 */
const VIRTUALIZATION_THRESHOLD = 300;

/**
 * Default row heights by view mode
 */
const DEFAULT_ROW_HEIGHTS = {
  [VIEW_MODES.GALLERY]: 320, // Card tile height + padding
  [VIEW_MODES.LIST]: 72,    // List row height
  [VIEW_MODES.TABLE]: 48,   // Table row height
};

/**
 * Get the number of columns based on screen width for gallery view
 */
function getColumnsForWidth(width) {
  if (width >= 1536) return 7; // 2xl
  if (width >= 1280) return 6; // xl
  if (width >= 1024) return 5; // lg
  if (width >= 768) return 4;  // md
  if (width >= 640) return 3;  // sm
  return 2; // mobile
}

/**
 * Hook to track container dimensions
 */
function useContainerSize(ref) {
  const [size, setSize] = useState({ width: 0, height: 600 });

  useEffect(() => {
    if (!ref.current) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height || 600,
        });
      }
    });

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return size;
}

/**
 * VirtualizedGallery - Virtualized grid for gallery view
 */
const VirtualizedGallery = memo(function VirtualizedGallery({
  cards,
  renderCard,
  height,
  width,
  rowHeight,
}) {
  const columnCount = getColumnsForWidth(width);
  const rowCount = Math.ceil(cards.length / columnCount);
  const columnWidth = Math.floor(width / columnCount);

  const Cell = useCallback(({ columnIndex, rowIndex, style }) => {
    const cardIndex = rowIndex * columnCount + columnIndex;
    if (cardIndex >= cards.length) return null;

    const card = cards[cardIndex];
    return (
      <div style={{ ...style, padding: '8px' }}>
        {renderCard(card, cardIndex)}
      </div>
    );
  }, [cards, columnCount, renderCard]);

  return (
    <Grid
      columnCount={columnCount}
      columnWidth={columnWidth}
      height={height}
      rowCount={rowCount}
      rowHeight={rowHeight}
      width={width}
      className="virtualized-gallery"
    >
      {Cell}
    </Grid>
  );
});

VirtualizedGallery.propTypes = {
  cards: PropTypes.array.isRequired,
  renderCard: PropTypes.func.isRequired,
  height: PropTypes.number.isRequired,
  width: PropTypes.number.isRequired,
  rowHeight: PropTypes.number.isRequired,
};

/**
 * VirtualizedList - Virtualized list for list/table views
 */
const VirtualizedList = memo(function VirtualizedList({
  cards,
  renderCard,
  height,
  width,
  rowHeight,
}) {
  const Row = useCallback(({ index, style }) => {
    const card = cards[index];
    return (
      <div style={style}>
        {renderCard(card, index)}
      </div>
    );
  }, [cards, renderCard]);

  return (
    <List
      height={height}
      width={width}
      itemCount={cards.length}
      itemSize={rowHeight}
      className="virtualized-list"
    >
      {Row}
    </List>
  );
});

VirtualizedList.propTypes = {
  cards: PropTypes.array.isRequired,
  renderCard: PropTypes.func.isRequired,
  height: PropTypes.number.isRequired,
  width: PropTypes.number.isRequired,
  rowHeight: PropTypes.number.isRequired,
};

/**
 * VirtualizedView - Main component that wraps views with virtualization when needed
 */
export const VirtualizedView = memo(function VirtualizedView({
  cards,
  viewMode = VIEW_MODES.GALLERY,
  renderCard,
  renderFallback,
  minHeight = 400,
  maxHeight = 800,
  rowHeight: customRowHeight,
  threshold = VIRTUALIZATION_THRESHOLD,
  className = '',
}) {
  const containerRef = useRef(null);
  const { width, height: containerHeight } = useContainerSize(containerRef);

  // Determine if virtualization should be used
  const shouldVirtualize = cards.length > threshold;
  const rowHeight = customRowHeight || DEFAULT_ROW_HEIGHTS[viewMode];
  const height = Math.min(Math.max(containerHeight, minHeight), maxHeight);

  // If below threshold, render fallback (non-virtualized)
  if (!shouldVirtualize && renderFallback) {
    return (
      <div ref={containerRef} className={className}>
        {renderFallback(cards)}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      style={{ height, minHeight }}
    >
      {width > 0 && (
        viewMode === VIEW_MODES.GALLERY ? (
          <VirtualizedGallery
            cards={cards}
            renderCard={renderCard}
            height={height}
            width={width}
            rowHeight={rowHeight}
          />
        ) : (
          <VirtualizedList
            cards={cards}
            renderCard={renderCard}
            height={height}
            width={width}
            rowHeight={rowHeight}
          />
        )
      )}
    </div>
  );
});

VirtualizedView.propTypes = {
  /** Array of cards to render */
  cards: PropTypes.array.isRequired,
  /** Current view mode */
  viewMode: PropTypes.oneOf(Object.values(VIEW_MODES)),
  /** Function to render a single card (card, index) => ReactNode */
  renderCard: PropTypes.func.isRequired,
  /** Optional fallback renderer for non-virtualized view */
  renderFallback: PropTypes.func,
  /** Minimum container height */
  minHeight: PropTypes.number,
  /** Maximum container height */
  maxHeight: PropTypes.number,
  /** Custom row height (overrides defaults) */
  rowHeight: PropTypes.number,
  /** Threshold for enabling virtualization */
  threshold: PropTypes.number,
  /** Additional CSS classes */
  className: PropTypes.string,
};

export default VirtualizedView;
