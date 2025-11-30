import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { X, Trash2 } from 'lucide-react';

/**
 * Calculate average price for a set of items
 * @param {Array} setItems - Array of items with purchase_price
 * @returns {number} - Average price
 */
function calculateSetAvgPrice(setItems) {
  if (setItems.length === 0) return 0;
  return setItems.reduce((sum, item) => sum + (parseFloat(item.purchase_price) || 0), 0) / setItems.length;
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
  createdFolders,
  onCancelEdit
}) {
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
  
  const isExpanded = expandedCards[cardName];

  // Handle cancel edit - clear form and notify parent if handler provided
  const handleCancelEdit = () => {
    setEditForm({});
    if (onCancelEdit) onCancelEdit();
  };

  // Render set items section - shared between list and card view to reduce duplication
  const renderSetItems = (setItems, firstItem, totalQtyInSet, setAvgPrice, isEditing) => (
    <div key={`${firstItem.set}-${firstItem.id}`} className="flex-1 min-w-[160px] bg-slate-700 rounded-lg p-2 border border-slate-500">
      {isEditing ? (
        <div className="space-y-1.5">
          <div className="text-xs font-bold text-teal-300 mb-1">{firstItem.set?.toUpperCase() || 'N/A'}</div>
          <div className="space-y-1">
            <select value={editForm.folder || 'Uncategorized'} onChange={(e) => setEditForm({...editForm, folder: e.target.value})} className="w-full bg-slate-600 border border-slate-500 rounded px-2 py-0.5 text-white text-xs">
              <option value="Uncategorized">Uncategorized</option>
              {createdFolders.map(folder => (
                <option key={folder} value={folder}>{folder}</option>
              ))}
            </select>
            <div className="flex gap-1">
              <input type="number" min="1" placeholder="Qty" value={editForm.quantity} onChange={(e) => setEditForm({...editForm, quantity: e.target.value})} className="w-1/2 bg-slate-600 border border-slate-500 rounded px-2 py-0.5 text-white text-xs" />
              <input type="number" step="0.01" placeholder="$" value={editForm.purchase_price} onChange={(e) => setEditForm({...editForm, purchase_price: e.target.value})} className="w-1/2 bg-slate-600 border border-slate-500 rounded px-2 py-0.5 text-white text-xs" />
            </div>
          </div>
          <div className="flex gap-1 mt-1">
            <button onClick={() => updateInventoryItem(firstItem.id, {...editForm, quantity: parseInt(editForm.quantity), purchase_price: parseFloat(editForm.purchase_price)})} className="flex-1 bg-green-600 hover:bg-green-700 rounded px-2 py-0.5 text-xs font-semibold">Save</button>
            <button onClick={handleCancelEdit} className="flex-1 bg-slate-500 hover:bg-slate-400 rounded px-2 py-0.5 text-xs">Cancel</button>
          </div>
        </div>
      ) : (
        <div className="space-y-1">
          <div className="flex justify-between items-center pb-1 border-b border-slate-500">
            <span className="text-xs font-bold text-teal-300">{firstItem.set?.toUpperCase() || 'N/A'}</span>
            <span className="text-[9px] text-slate-400 bg-slate-600 px-1 py-0.5 rounded">{setItems.length}</span>
          </div>
          <div className="flex justify-between text-xs">
            <div><span className="text-slate-400">Qty: </span><span className="text-teal-300 font-bold">{totalQtyInSet}</span></div>
            <div><span className="text-slate-400">Avg: </span><span className="text-green-300 font-bold">${setAvgPrice.toFixed(2)}</span></div>
          </div>
          {setItems.length > 1 && (
            <div className="space-y-0.5 max-h-16 overflow-y-auto">
              {setItems.map((item) => (
                <div 
                  key={item.id} 
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('skuData', JSON.stringify(item));
                    e.dataTransfer.setData('inventoryItemId', item.id.toString());
                  }}
                  className="text-[9px] text-slate-300 bg-slate-600/50 rounded px-1.5 py-0.5 flex justify-between items-center cursor-grab active:cursor-grabbing hover:bg-slate-600 group"
                  title="Drag to a folder or deck tab"
                >
                  <span>{item.quantity}x @ ${parseFloat(item.purchase_price || 0).toFixed(2)}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400">{new Date(item.purchase_date).toLocaleDateString()}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteInventoryItem(item.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300 p-0.5"
                      title="Delete card - moves to unsorted"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <button 
            onClick={(e) => { e.stopPropagation(); startEditingItem(firstItem); }}
            className="w-full text-[9px] text-teal-400 hover:text-teal-300 hover:bg-slate-600 py-0.5 rounded border border-slate-500"
          >
            Edit
          </button>
        </div>
      )}
    </div>
  );

  // Group items by set
  const groupItemsBySet = (itemsToGroup) => {
    return Object.values(
      itemsToGroup.reduce((acc, item) => {
        const setKey = `${item.set || 'unknown'}-${item.set_name || 'unknown'}`;
        if (!acc[setKey]) {
          acc[setKey] = [];
        }
        acc[setKey].push(item);
        return acc;
      }, {})
    );
  };
  
  return (
    <div>
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
        onClick={() => setExpandedCards(isExpanded ? {} : {[cardName]: true})}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            items.forEach(item => deleteInventoryItem(item.id));
          }}
          className="absolute top-2 right-2 p-1.5 bg-slate-700/80 hover:bg-red-600/60 text-slate-300 hover:text-white rounded-lg transition-all opacity-0 group-hover:opacity-100 z-20 duration-200"
          title="Delete all copies"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="text-center px-1 cursor-pointer flex items-center justify-center gap-1 mb-1">
          <h3 className="text-xs md:text-sm font-semibold text-slate-50 line-clamp-2 break-words flex-1">
            {cardName.split('//')[0].trim()}
          </h3>
        </div>
        
        <div className="flex-1 flex items-center justify-center min-h-0 py-2">
          <div className="text-center">
            <div className="text-slate-400 text-[9px] md:text-xs font-semibold uppercase tracking-wider mb-1">Available</div>
            <div className="text-2xl md:text-3xl font-bold text-green-400 leading-tight">{available}</div>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-slate-700/50">
          <div className="space-y-0.5">
            <div className="text-slate-500 text-[7px] md:text-[8px] font-semibold uppercase">Qty</div>
            <div className="h-5 md:h-6 flex items-center justify-center">
              <div className={`font-bold leading-tight ${getStatFontSize(totalQty)} ${totalQty === 0 ? 'text-slate-500' : 'text-teal-300'}`}>{totalQty}</div>
            </div>
          </div>
          <div className="space-y-0.5">
            <div className="text-slate-500 text-[7px] md:text-[8px] font-semibold uppercase">Cost</div>
            <div className="h-5 md:h-6 flex items-center justify-center">
              <div className={`font-bold leading-tight text-blue-300 ${getStatFontSize(avgPrice.toFixed(2))}`}>${avgPrice.toFixed(2)}</div>
            </div>
          </div>
          <div className="space-y-0.5">
            <div className="text-slate-500 text-[7px] md:text-[8px] font-semibold uppercase">Total</div>
            <div className="h-5 md:h-6 flex items-center justify-center">
              <div className={`font-bold leading-tight text-amber-400 ${getStatFontSize(formatTotal(totalValue))}`}>${formatTotal(totalValue)}</div>
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
          className="relative bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-600 hover:border-teal-400 rounded-lg p-4 transition-all duration-300 cursor-grab active:cursor-grabbing hover:shadow-2xl hover:shadow-teal-500/30 group">
          <button
            onClick={(e) => {
              e.stopPropagation();
              items.forEach(item => deleteInventoryItem(item.id));
            }}
            className="absolute top-3 right-3 p-1.5 bg-slate-700/60 hover:bg-slate-600 text-slate-300 hover:text-red-400 rounded-lg transition-all opacity-0 group-hover:opacity-100 z-20"
            title="Delete all copies"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center justify-between gap-6">
            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpandedCards(isExpanded ? {} : {[cardName]: true})}>
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-semibold text-slate-50 break-words">{cardName}</h3>
              </div>
                <div className="flex gap-6 text-xs mt-2">
                  <div><span className="text-slate-400">Qty:</span> <span className={`ml-1 font-semibold ${totalQty === 0 ? 'text-slate-500' : 'text-teal-300'}`}>{totalQty}</span></div>
                  <div><span className="text-slate-400">Available:</span> <span className="ml-1 text-green-400 font-semibold">{available}</span></div>
                  <div><span className="text-slate-400">Cost/ea:</span> <span className="ml-1 text-blue-300 font-semibold">${avgPrice.toFixed(2)}</span></div>
                  <div><span className="text-slate-400">Total:</span> <span className="ml-1 text-amber-400 font-semibold">${formatTotal(totalValue)}</span></div>
                </div>
            </div>
            <div className="text-teal-400 text-sm flex-shrink-0 cursor-pointer" onClick={() => setExpandedCards(isExpanded ? {} : {[cardName]: true})}>
              {isExpanded ? '▼' : '▶'}
            </div>
          </div>
        </div>

        {isExpanded && (
          <div className="bg-slate-800 rounded-lg border border-slate-600 p-3 shadow-lg mt-2">
            <div className="flex flex-wrap gap-3">
              {groupItemsBySet(items).map((setItems) => {
                const firstItem = setItems[0];
                const totalQtyInSet = setItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
                const setAvgPrice = calculateSetAvgPrice(setItems);
                const isEditing = editingId === firstItem.id;
                return renderSetItems(setItems, firstItem, totalQtyInSet, setAvgPrice, isEditing);
              })}
            </div>
          </div>
        )}
      </div>
      )}
      {isExpanded && viewMode === 'card' && (
        <div className="bg-slate-800 rounded-lg border border-slate-600 p-3 shadow-lg mt-2">
          <div className="flex flex-wrap gap-3">
            {groupItemsBySet(items).map((setItems) => {
              const firstItem = setItems[0];
              const totalQtyInSet = setItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
              const setAvgPrice = calculateSetAvgPrice(setItems);
              const isEditing = editingId === firstItem.id;
              return renderSetItems(setItems, firstItem, totalQtyInSet, setAvgPrice, isEditing);
            })}
          </div>
        </div>
      )}
    </div>
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
  createdFolders: PropTypes.array.isRequired,
  onCancelEdit: PropTypes.func
};

export default CardGroup;
