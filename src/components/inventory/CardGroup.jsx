import React, { memo, useState, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import { X, Bell, BellOff, ChevronRight, Eye, RotateCcw, CheckSquare, Square, ImageOff } from 'lucide-react';
import { CardDetailModal } from './CardDetailModal';
import { CardPreviewTooltip } from './CardPreviewTooltip';
import { useConfirm } from '../../context/ConfirmContext';
import { useHoverPreview } from '../../hooks/useHoverPreview';
import { EXTERNAL_APIS } from '../../config/api';
import { getSetCode } from '../../utils/cardHelpers';

/**
 * Get card image URL from Scryfall
 * @param {string} cardName - Name of the card
 * @param {string|Object} set - Set code (string) or set object with editioncode/editionname properties (optional)
 * @param {string} version - Image version (small, normal, large)
 * @param {boolean} skipSetCode - If true, don't include set code (fallback for mismatched set codes)
 * @returns {string} - Scryfall image URL
 */
function getCardImageUrl(cardName, set, version = 'normal', skipSetCode = false) {
  const encodedName = encodeURIComponent(cardName.split('//')[0].trim());
  const setCode = getSetCode(set);
  if (setCode && !skipSetCode) {
    return `${EXTERNAL_APIS.SCRYFALL}/cards/named?exact=${encodedName}&set=${setCode.toLowerCase()}&format=image&version=${version}`;
  }
  return `${EXTERNAL_APIS.SCRYFALL}/cards/named?exact=${encodedName}&format=image&version=${version}`;
}

/**
 * Get dynamic font size based on value length
 * Larger numbers get smaller text to fit properly
 */
function getStatFontSize(value) {
  const strValue = String(value).length;
  if (strValue <= 2) return 'text-[11px] md:text-[13px]';
  if (strValue <= 3) return 'text-[10px] md:text-[11px]';
  if (strValue <= 4) return 'text-[9px] md:text-[10px]';
  return 'text-[8px] md:text-[9px]';
}

/**
 * CardGroup - A memoized component for rendering a group of inventory cards
 * Extracted from InventoryTab for performance optimization
 * Custom memo comparison to force re-render when low_inventory_alert changes
 */
export const CardGroup = memo(function CardGroup({
  cardName,
  items,
  viewMode,
  expandedCards,
  setExpandedCards,
  editingId,
  editForm,
  setEditForm,
  startEditingItem,
  updateInventoryItem,
  deleteInventoryItem,
  permanentlyDeleteItem,
  restoreFromTrash,
  isTrashView,
  createdFolders,
  onToggleLowInventory,
  onSetThreshold,
  selectedCardIds,
  setSelectedCardIds
}) {
  const { confirm } = useConfirm();
  const [togglingId, setTogglingId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [skipSetCode, setSkipSetCode] = useState(false);

  // Reset image states when cardName changes or entering image view
  useEffect(() => {
    if (viewMode === 'image') {
      setImageError(false);
      setImageLoading(true);
      setSkipSetCode(false);
    }
  }, [cardName, viewMode]);

  // Hover preview hook - only for card and list views (not image view)
  const {
    isVisible: isPreviewVisible,
    targetRect,
    showPreview,
    hidePreview
  } = useHoverPreview(300, 0); // 300ms delay to show, hide immediately

  const totalQty = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const reservedQty = items.reduce((sum, item) => sum + (parseInt(item.reserved_quantity) || 0), 0);
  const available = totalQty - reservedQty;

  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  const recentItems = items.filter(item => new Date(item.purchase_date) >= sixtyDaysAgo);
  const itemsForAvg = recentItems.length > 0 ? recentItems : items;
  let avgPrice = 0;
  if (itemsForAvg.length > 0) {
    const totalPrice = itemsForAvg.reduce((sum, item) => sum + (parseFloat(item.purchase_price) || 0), 0);
    avgPrice = totalPrice / itemsForAvg.length;
  }

  const totalValue = totalQty * avgPrice;
  const formatTotal = (value) => {
    return value >= 100 ? value.toFixed(0) : value.toFixed(2);
  };

  // Check if selection mode is enabled
  const isSelectionMode = selectedCardIds && setSelectedCardIds;

  // Check if all items from this card are selected
  const allItemsSelected = isSelectionMode && items.every(item => selectedCardIds.has(item.id));

  // Toggle selection for all items in this card group
  const handleToggleSelection = useCallback((e) => {
    e.stopPropagation();
    if (!isSelectionMode) return;

    const newSelection = new Set(selectedCardIds);
    const allSelected = items.every(item => selectedCardIds.has(item.id));

    if (allSelected) {
      // Deselect all items
      items.forEach(item => newSelection.delete(item.id));
    } else {
      // Select all items
      items.forEach(item => newSelection.add(item.id));
    }

    setSelectedCardIds(newSelection);
  }, [isSelectionMode, selectedCardIds, setSelectedCardIds, items]);

  // Handle toggle low inventory alert
  const handleToggleLowInventory = async (item, e) => {
    e.stopPropagation();
    setTogglingId(item?.id);

    try {
      if (onToggleLowInventory) {
        await onToggleLowInventory(item.id);
      }
    } catch (error) {
      console.error('Error toggling alert:', error);
    } finally {
      setTogglingId(null);
    }
  };

  // Handle opening the card detail modal
  const handleOpenModal = (e) => {
    e.stopPropagation();
    setIsModalOpen(true);
  };

  // Handle closing the card detail modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  // Handle restoring all items from trash
  const handleRestoreAll = (e) => {
    e.stopPropagation();
    if (restoreFromTrash) {
      items.forEach(item => restoreFromTrash(item.id));
    }
  };

  // Handle mouse enter for hover preview
  const handleMouseEnter = useCallback((e) => {
    // Only show preview in card and list views
    if (viewMode === 'image') return;
    const rect = e.currentTarget.getBoundingClientRect();
    showPreview(e, rect);
  }, [viewMode, showPreview]);

  // Handle mouse leave for hover preview
  const handleMouseLeave = useCallback(() => {
    hidePreview();
  }, [hidePreview]);

  // Get the first item's image URI or set code for preview
  const firstItem = items[0];
  const previewImageUri = firstItem?.image_uri || firstItem?.image_uris?.normal || null;
  const previewSetCode = firstItem?.set || null;

  return (
    <div>
      {/* Card Detail Modal */}
      <CardDetailModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        cardName={cardName}
        items={items}
        editingId={editingId}
        editForm={editForm}
        setEditForm={setEditForm}
        startEditingItem={startEditingItem}
        updateInventoryItem={updateInventoryItem}
        deleteInventoryItem={deleteInventoryItem}
        createdFolders={createdFolders}
        onToggleLowInventory={onToggleLowInventory}
        onSetThreshold={onSetThreshold}
      />

      {/* Card Preview Tooltip */}
      {viewMode !== 'image' && (
        <CardPreviewTooltip
          isVisible={isPreviewVisible && !isModalOpen}
          cardName={cardName}
          setCode={previewSetCode}
          imageUri={previewImageUri}
          targetRect={targetRect}
        />
      )}

      {/* Card View */}
      {viewMode === 'card' && (
        <div
          draggable
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('cardName', cardName);
            // Also set skuData for deck drops (use first item as representative)
            if (items.length > 0) {
              e.dataTransfer.setData('skuData', JSON.stringify(items[0]));
            }
            // Hide preview when dragging starts
            hidePreview();
          }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={`relative bg-gradient-to-br from-slate-800 to-slate-900 border ${allItemsSelected ? 'border-[var(--bda-primary)] ring-2 ring-[var(--bda-primary)]/50' : 'border-slate-600 hover:border-[var(--bda-primary)]'} rounded-lg p-3 md:p-4 transition-all duration-300 flex flex-col h-32 sm:h-36 md:h-40 hover:shadow-2xl hover:shadow-[var(--bda-primary)]/30 hover:-translate-y-1 cursor-grab active:cursor-grabbing group active:scale-95`}
          onClick={handleOpenModal}
        >
          {/* Selection Checkbox (when selection mode enabled) */}
          {isSelectionMode && (
            <button
              type="button"
              onClick={handleToggleSelection}
              className={`absolute top-1 right-1 p-1 rounded transition-all z-30 ${allItemsSelected
                ? 'bg-[var(--bda-primary)] text-[var(--bda-primary-foreground)]'
                : 'bg-slate-700/80 text-slate-300 hover:bg-slate-600'
                }`}
              title={allItemsSelected ? "Deselect" : "Select"}
            >
              {allItemsSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
            </button>
          )}

          {isTrashView ? (
            <button
              type="button"
              onClick={handleRestoreAll}
              className="absolute top-2 left-2 p-1.5 bg-slate-700/80 hover:bg-green-600/60 text-slate-300 hover:text-green-300 rounded-lg transition-all z-20 duration-200 min-w-[44px] min-h-[44px] flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100"
              title="Restore all copies"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                handleToggleLowInventory(items[0], e);
              }}
              className="absolute top-2 left-2 p-1.5 bg-slate-700/80 hover:bg-yellow-600/60 text-slate-300 hover:text-yellow-300 rounded-lg transition-all z-20 duration-200 min-w-[44px] min-h-[44px] flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100"
              title={items[0]?.low_inventory_alert ? "Alert enabled" : "Enable low inventory alert"}
              disabled={togglingId === items[0]?.id}
            >
              {items[0]?.low_inventory_alert ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              items.forEach(item => deleteInventoryItem(item.id));
            }}
            className="absolute top-2 right-2 p-1.5 bg-slate-700/80 hover:bg-red-600/60 text-slate-300 hover:text-white rounded-lg transition-all z-20 duration-200 min-w-[44px] min-h-[44px] flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100"
            title="Delete all copies"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="text-center px-1 cursor-pointer flex items-center justify-center gap-1 mb-1">
            <h3 className={`text-xs md:text-sm font-semibold ${isTrashView ? 'text-red-200' : 'text-slate-50'} line-clamp-2 break-words flex-1`}>
              {cardName.split('//')[0].trim()}
            </h3>
          </div>

          <div className="flex-1 flex items-center justify-center min-h-0 py-2">
            <div className="text-center">
              <div className={`${isTrashView ? 'text-red-400' : 'text-slate-400'} text-[9px] md:text-xs font-semibold uppercase tracking-wider mb-1`}>{isTrashView ? 'In Trash' : 'Available'}</div>
              <div className={`text-2xl md:text-3xl font-bold ${isTrashView ? 'text-red-400' : 'text-green-400'} leading-tight`}>{available}</div>
            </div>
          </div>

          {/* View Details Indicator */}
          <div className="absolute bottom-2 right-2 flex items-center gap-1 text-slate-400 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
            <Eye className="w-3 h-3" />
            <span className="text-[9px] font-medium">View</span>
          </div>

          {/* SKU Count Badge */}
          {items.length > 1 && (
            <div className="absolute bottom-2 left-2 bg-[var(--bda-primary)]/80 text-white text-[9px] font-bold px-1.5 py-0.5 rounded" title={`${items.length} SKUs`}>
              {items.length} SKUs
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-slate-700/50">
            <div className="space-y-1">
              <div className="text-slate-500 text-[7px] md:text-[9px] font-semibold uppercase">Qty</div>
              <div className="h-4 flex items-center justify-center">
                <div className={`font-bold leading-none ${getStatFontSize(totalQty)} ${totalQty === 0 ? 'text-slate-500' : 'text-[var(--bda-primary)]'}`}>{totalQty}</div>
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
      )}

      {/* Image View */}
      {viewMode === 'image' && (
        <div
          draggable
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('cardName', cardName);
            if (items.length > 0) {
              e.dataTransfer.setData('skuData', JSON.stringify(items[0]));
            }
          }}
          className={`relative rounded-xl overflow-hidden border ${allItemsSelected ? 'border-[var(--bda-primary)] ring-2 ring-[var(--bda-primary)]/50' : 'border-slate-600 hover:border-[var(--bda-primary)]'} transition-all duration-300 cursor-grab active:cursor-grabbing group hover:shadow-2xl hover:shadow-[var(--bda-primary)]/30 hover:-translate-y-1 active:scale-95`}
          onClick={handleOpenModal}
        >
          {/* Card Image */}
          <div className="aspect-[5/7] bg-slate-800 relative">
            {/* Loading skeleton */}
            {imageLoading && !imageError && (
              <div className="absolute inset-0 bg-slate-800 animate-pulse">
                <div className="h-full w-full bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 bg-[length:200%_100%] animate-[shimmer_1.5s_infinite]" />
              </div>
            )}

            {/* Card image */}
            {!imageError ? (
              <img
                src={getCardImageUrl(cardName, items[0]?.set, 'normal', skipSetCode)}
                alt={cardName}
                className={`w-full h-full object-cover transition-opacity ${imageLoading ? 'opacity-0' : 'opacity-100'}`}
                onLoad={() => setImageLoading(false)}
                onError={() => {
                  // If we haven't tried without set code yet, retry without it
                  if (!skipSetCode && getSetCode(items[0]?.set)) {
                    setSkipSetCode(true);
                    setImageLoading(true);
                  } else {
                    setImageError(true);
                    setImageLoading(false);
                  }
                }}
                loading="lazy"
              />
            ) : (
              <div className="absolute inset-0 bg-slate-800 flex flex-col items-center justify-center text-slate-400 p-4">
                <ImageOff className="w-10 h-10 mb-2" />
                <span className="text-xs text-center line-clamp-2">{cardName}</span>
              </div>
            )}

            {/* Hover overlay with card name */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
              <h3 className="text-white text-sm font-semibold line-clamp-2">{cardName}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Eye className="w-3 h-3 text-slate-300" />
                <span className="text-slate-300 text-xs">Click for details</span>
              </div>
            </div>

            {/* Quantity badge */}
            <div className="absolute bottom-2 right-2 bg-black/70 text-white text-sm font-bold px-2 py-1 rounded-lg backdrop-blur-sm">
              ×{totalQty}
            </div>

            {/* Selection Checkbox (when selection mode enabled) */}
            {isSelectionMode && (
              <button
                type="button"
                onClick={handleToggleSelection}
                className={`absolute top-2 left-2 p-1.5 rounded transition-all z-30 ${allItemsSelected
                  ? 'bg-[var(--bda-primary)] text-[var(--bda-primary-foreground)]'
                  : 'bg-black/50 text-slate-300 hover:bg-slate-600'
                  }`}
                title={allItemsSelected ? "Deselect" : "Select"}
              >
                {allItemsSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
              </button>
            )}

            {/* Delete button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                items.forEach(item => deleteInventoryItem(item.id));
              }}
              className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-red-600/80 text-slate-300 hover:text-white rounded-lg transition-all z-20 opacity-100 md:opacity-0 md:group-hover:opacity-100 min-w-[44px] min-h-[44px] flex items-center justify-center"
              title="Delete all copies"
            >
              <X className="w-4 h-4" />
            </button>

            {/* SKU Count Badge */}
            {items.length > 1 && (
              <div className="absolute bottom-2 left-2 bg-[var(--bda-primary)]/90 text-white text-[10px] font-bold px-1.5 py-0.5 rounded backdrop-blur-sm" title={`${items.length} SKUs`}>
                {items.length} SKUs
              </div>
            )}
          </div>
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div>
          <div
            draggable
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = 'move';
              e.dataTransfer.setData('cardName', cardName);
              if (items.length > 0) {
                e.dataTransfer.setData('skuData', JSON.stringify(items[0]));
              }
              // Hide preview when dragging starts
              hidePreview();
            }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className="relative bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-600 hover:border-[var(--bda-primary)] rounded-lg p-4 transition-all duration-300 cursor-grab active:cursor-grabbing hover:shadow-2xl hover:shadow-[var(--bda-primary)]/30 group"
            onClick={handleOpenModal}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                items.forEach(item => deleteInventoryItem(item.id));
              }}
              className="absolute top-3 right-3 p-1.5 bg-slate-700/60 hover:bg-slate-600 text-slate-300 hover:text-red-400 rounded-lg transition-all z-20 min-w-[44px] min-h-[44px] flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100"
              title="Delete all copies"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center justify-between gap-6">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-semibold text-slate-50 break-words">{cardName}</h3>
                  {items.length > 1 && (
                    <span className="bg-[var(--bda-primary)]/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded" title={`${items.length} SKUs`}>
                      {items.length} SKUs
                    </span>
                  )}
                </div>
                <div className="flex gap-4 md:gap-6 text-xs mt-2 flex-wrap">
                  <div><span className="text-slate-400">Qty:</span> <span className={`ml-1 font-semibold ${totalQty === 0 ? 'text-slate-500' : 'text-[var(--bda-primary)]'}`}>{totalQty} copies</span></div>
                  <div><span className="text-slate-400">Available:</span> <span className="ml-1 text-green-400 font-semibold">{available}</span></div>
                  <div><span className="text-slate-400">Cost/ea:</span> <span className="ml-1 text-blue-300 font-semibold">${avgPrice.toFixed(2)}</span></div>
                  <div><span className="text-slate-400">Total:</span> <span className="ml-1 text-amber-400 font-semibold">${formatTotal(totalValue)}</span></div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[var(--bda-primary)] text-sm flex-shrink-0">
                <Eye className="w-4 h-4 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity" />
                <ChevronRight className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom memo comparison - force re-render if low_inventory_alert changes on any item
  const prevAlerts = (prevProps.items || []).map(i => i.low_inventory_alert).join(',');
  const nextAlerts = (nextProps.items || []).map(i => i.low_inventory_alert).join(',');

  if (prevAlerts !== nextAlerts) {
    console.log('CardGroup: Re-rendering due to low_inventory_alert change');
    return false; // Force re-render
  }

  // For other prop changes, use shallow comparison
  return (
    prevProps.cardName === nextProps.cardName &&
    prevProps.viewMode === nextProps.viewMode &&
    prevProps.items.length === nextProps.items.length &&
    prevProps.editingId === nextProps.editingId &&
    prevProps.expandedCards === nextProps.expandedCards
  );
});

CardGroup.propTypes = {
  cardName: PropTypes.string.isRequired,
  items: PropTypes.array.isRequired,
  viewMode: PropTypes.string.isRequired,
  expandedCards: PropTypes.object.isRequired,
  setExpandedCards: PropTypes.func.isRequired,
  editingId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  editForm: PropTypes.object.isRequired,
  setEditForm: PropTypes.func.isRequired,
  startEditingItem: PropTypes.func.isRequired,
  updateInventoryItem: PropTypes.func.isRequired,
  deleteInventoryItem: PropTypes.func.isRequired,
  permanentlyDeleteItem: PropTypes.func,
  restoreFromTrash: PropTypes.func,
  isTrashView: PropTypes.bool,
  createdFolders: PropTypes.array.isRequired,
  onToggleLowInventory: PropTypes.func,
  onSetThreshold: PropTypes.func,
  selectedCardIds: PropTypes.instanceOf(Set),
  setSelectedCardIds: PropTypes.func
};

export default CardGroup;
