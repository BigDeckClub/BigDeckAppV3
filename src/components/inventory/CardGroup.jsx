import React, { memo, useState } from 'react';
import PropTypes from 'prop-types';
import { X, Bell, BellOff, ChevronRight, Eye } from 'lucide-react';
import { CardDetailModal } from './CardDetailModal';
import { useConfirm } from '../../context/ConfirmContext';

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
  onSetThreshold
}) {
  const { confirm } = useConfirm();
  const [togglingId, setTogglingId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
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

      {/* Card View */}
      {viewMode === 'card' ? (
      <div 
        draggable
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('cardName', cardName);
          // Also set skuData for deck drops (use first item as representative)
          if (items.length > 0) {
            e.dataTransfer.setData('skuData', JSON.stringify(items[0]));
          }
        }}
        className="relative bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-600 hover:border-teal-400 rounded-lg p-3 md:p-4 transition-all duration-300 flex flex-col h-32 sm:h-36 md:h-40 hover:shadow-2xl hover:shadow-teal-500/30 hover:-translate-y-1 cursor-grab active:cursor-grabbing group active:scale-95" 
        onClick={handleOpenModal}
      >
        {isTrashView ? (
          <button
            type="button"
            onClick={handleRestoreAll}
            className="absolute top-2 left-2 p-1.5 bg-slate-700/80 hover:bg-green-600/60 text-slate-300 hover:text-green-300 rounded-lg transition-all z-20 duration-200"
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
            className="absolute top-2 left-2 p-1.5 bg-slate-700/80 hover:bg-yellow-600/60 text-slate-300 hover:text-yellow-300 rounded-lg transition-all z-20 duration-200"
            title={items[0]?.low_inventory_alert ? "Alert enabled" : "Enable low inventory alert"}
            disabled={togglingId === items[0]?.id}
          >
            {items[0]?.low_inventory_alert ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
          </button>
        )}
        <button
          type="button"
          onClick={(e) => {
            handleToggleLowInventory(items[0], e);
          }}
          className="absolute top-2 left-2 p-1.5 bg-slate-700/80 hover:bg-yellow-600/60 text-slate-300 hover:text-yellow-300 rounded-lg transition-all z-20 duration-200 min-w-[36px] min-h-[36px] flex items-center justify-center"
          title={items[0]?.low_inventory_alert ? "Alert enabled" : "Enable low inventory alert"}
          disabled={togglingId === items[0]?.id}
        >
          {items[0]?.low_inventory_alert ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            items.forEach(item => deleteInventoryItem(item.id));
          }}
          className="absolute top-2 right-2 p-1.5 bg-slate-700/80 hover:bg-red-600/60 text-slate-300 hover:text-white rounded-lg transition-all opacity-0 group-hover:opacity-100 z-20 duration-200 min-w-[36px] min-h-[36px] flex items-center justify-center"
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
        <div className="absolute bottom-2 right-2 flex items-center gap-1 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
          <Eye className="w-3 h-3" />
          <span className="text-[9px] font-medium">View</span>
        </div>
        
        {/* SKU Count Badge */}
        {items.length > 1 && (
          <div className="absolute bottom-2 left-2 bg-teal-600/80 text-white text-[9px] font-bold px-1.5 py-0.5 rounded" title={`${items.length} SKUs`}>
            {items.length} SKUs
          </div>
        )}
        
        <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-slate-700/50">
          <div className="space-y-1">
            <div className="text-slate-500 text-[7px] md:text-[9px] font-semibold uppercase">Qty</div>
            <div className="h-4 flex items-center justify-center">
              <div className={`font-bold leading-none ${getStatFontSize(totalQty)} ${totalQty === 0 ? 'text-slate-500' : 'text-teal-300'}`}>{totalQty}</div>
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
      ) : (
      <div>
        {/* List View */}
        <div 
          draggable
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('cardName', cardName);
            if (items.length > 0) {
              e.dataTransfer.setData('skuData', JSON.stringify(items[0]));
            }
          }}
          className="relative bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-600 hover:border-teal-400 rounded-lg p-4 transition-all duration-300 cursor-grab active:cursor-grabbing hover:shadow-2xl hover:shadow-teal-500/30 group"
          onClick={handleOpenModal}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              items.forEach(item => deleteInventoryItem(item.id));
            }}
            className="absolute top-3 right-3 p-1.5 bg-slate-700/60 hover:bg-slate-600 text-slate-300 hover:text-red-400 rounded-lg transition-all opacity-0 group-hover:opacity-100 z-20 min-w-[36px] min-h-[36px] flex items-center justify-center"
            title="Delete all copies"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center justify-between gap-6">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-semibold text-slate-50 break-words">{cardName}</h3>
                {items.length > 1 && (
                  <span className="bg-teal-600/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded" title={`${items.length} SKUs`}>
                    {items.length} SKUs
                  </span>
                )}
              </div>
              <div className="flex gap-4 md:gap-6 text-xs mt-2 flex-wrap">
                <div><span className="text-slate-400">Qty:</span> <span className={`ml-1 font-semibold ${totalQty === 0 ? 'text-slate-500' : 'text-teal-300'}`}>{totalQty} copies</span></div>
                <div><span className="text-slate-400">Available:</span> <span className="ml-1 text-green-400 font-semibold">{available}</span></div>
                <div><span className="text-slate-400">Cost/ea:</span> <span className="ml-1 text-blue-300 font-semibold">${avgPrice.toFixed(2)}</span></div>
                <div><span className="text-slate-400">Total:</span> <span className="ml-1 text-amber-400 font-semibold">${formatTotal(totalValue)}</span></div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-teal-400 text-sm flex-shrink-0">
              <Eye className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
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
  onSetThreshold: PropTypes.func
};

export default CardGroup;
