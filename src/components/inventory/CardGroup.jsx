import React, { memo, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { X, Trash2, Bell, BellOff, Lightbulb, RotateCcw } from 'lucide-react';
import { calculateSmartThreshold } from '../../utils/thresholdCalculator';
import { useConfirm } from '../../context/ConfirmContext';

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
  onCancelEdit,
  onToggleLowInventory,
  onSetThreshold
}) {
  const { confirm } = useConfirm();
  const [togglingId, setTogglingId] = useState(null);
  const [settingThresholdId, setSettingThresholdId] = useState(null);
  const [thresholdInput, setThresholdInput] = useState({});
  const [salesHistory, setSalesHistory] = useState([]);
  const [thresholdSettings, setThresholdSettings] = useState({ baseStock: 10, landMultiplier: 10, velocityWeeks: 4 });
  
  // Step 5: Load sales history and threshold settings on mount
  useEffect(() => {
    // Load threshold settings from localStorage
    const saved = localStorage.getItem('thresholdSettings');
    if (saved) {
      try {
        setThresholdSettings(JSON.parse(saved));
      } catch (err) {
        console.error('[CardGroup] Error loading settings:', err);
      }
    }
    
    // Fetch sales history
    fetch('/api/sales')
      .then(res => res.json())
      .then(data => {
        setSalesHistory(data || []);
        console.log('[CardGroup Step 5] Loaded', data?.length || 0, 'sales records');
      })
      .catch(err => console.error('[CardGroup Step 5] Error loading sales:', err));
  }, []);
  
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

  // Handle toggle low inventory alert
  const handleToggleLowInventory = async (item, e) => {
    console.log('=== BELL DEBUG START ===');
    console.log('1. Handler fired');
    console.log('2. Item received:', item);
    console.log('3. Item ID:', item?.id);
    console.log('4. onToggleLowInventory exists:', typeof onToggleLowInventory, !!onToggleLowInventory);
    console.log('5. items array:', items);
    console.log('6. items[0]:', items?.[0]);
    
    e.stopPropagation();
    setTogglingId(item?.id);
    
    try {
      if (onToggleLowInventory) {
        console.log('7. Calling onToggleLowInventory with ID:', item.id);
        await onToggleLowInventory(item.id);
        console.log('8. onToggleLowInventory completed successfully');
      } else {
        console.log('7. SKIPPED - onToggleLowInventory is falsy!');
      }
    } catch (error) {
      console.error('ERROR in handleToggleLowInventory:', error);
    } finally {
      setTogglingId(null);
      console.log('=== BELL DEBUG END ===');
    }
  };

  // Handle set threshold
  const handleSetThreshold = async (itemId, e) => {
    e.stopPropagation();
    const threshold = parseInt(thresholdInput[itemId]) || 0;
    setSettingThresholdId(itemId);
    try {
      if (onSetThreshold) {
        await onSetThreshold(itemId, threshold);
        setThresholdInput(prev => ({ ...prev, [itemId]: '' }));
      }
    } finally {
      setSettingThresholdId(null);
    }
  };

  // Handle delete with confirmation
  const handleDelete = async (itemId, e) => {
    if (e) e.stopPropagation();
    
    if (isTrashView) {
      // In trash view, permanently delete
      const confirmed = await confirm({
        title: 'Permanently Delete?',
        message: 'This card will be permanently deleted. This action cannot be undone.',
        confirmText: 'Delete Permanently',
        cancelText: 'Cancel',
        variant: 'danger'
      });
      if (confirmed && permanentlyDeleteItem) {
        await permanentlyDeleteItem(itemId);
      }
    } else {
      // Regular view, move to trash with confirmation
      const confirmed = await confirm({
        title: 'Move to Trash?',
        message: 'This card will be moved to Trash. You can restore it later or permanently delete it.',
        confirmText: 'Move to Trash',
        cancelText: 'Cancel',
        variant: 'warning'
      });
      if (confirmed) {
        await deleteInventoryItem(itemId);
      }
    }
  };

  // Handle delete all copies with confirmation
  const handleDeleteAll = async (e) => {
    if (e) e.stopPropagation();
    
    if (isTrashView) {
      const confirmed = await confirm({
        title: 'Permanently Delete All?',
        message: `This will permanently delete all ${items.length} copies of ${cardName}. This action cannot be undone.`,
        confirmText: 'Delete All Permanently',
        cancelText: 'Cancel',
        variant: 'danger'
      });
      if (confirmed && permanentlyDeleteItem) {
        for (const item of items) {
          await permanentlyDeleteItem(item.id);
        }
      }
    } else {
      const confirmed = await confirm({
        title: 'Move All to Trash?',
        message: `This will move all ${items.length} copies of ${cardName} to Trash.`,
        confirmText: 'Move All to Trash',
        cancelText: 'Cancel',
        variant: 'warning'
      });
      if (confirmed) {
        for (const item of items) {
          await deleteInventoryItem(item.id);
        }
      }
    }
  };

  // Handle restore from trash
  const handleRestore = async (itemId, e) => {
    if (e) e.stopPropagation();
    if (restoreFromTrash) {
      await restoreFromTrash(itemId);
    }
  };

  // Handle restore all from trash
  const handleRestoreAll = async (e) => {
    if (e) e.stopPropagation();
    if (restoreFromTrash) {
      for (const item of items) {
        await restoreFromTrash(item.id);
      }
    }
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
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={(e) => handleToggleLowInventory(item, e)}
                        className={`p-0.5 rounded transition-colors ${item.low_inventory_alert ? 'text-yellow-400 hover:text-yellow-300' : 'text-slate-500 hover:text-yellow-400'}`}
                        title={item.low_inventory_alert ? 'Alert enabled' : 'Enable alert'}
                        disabled={togglingId === item.id}
                      >
                        {item.low_inventory_alert ? <Bell className="w-3 h-3" /> : <BellOff className="w-3 h-3" />}
                      </button>
                      {item.low_inventory_alert && (
                        <div className="flex flex-col gap-0.5">
                          <input
                            type="number"
                            min="0"
                            value={thresholdInput[item.id] !== undefined ? thresholdInput[item.id] : item.low_inventory_threshold || ''}
                            onChange={(e) => setThresholdInput(prev => ({ ...prev, [item.id]: e.target.value }))}
                            onBlur={(e) => handleSetThreshold(item.id, e)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSetThreshold(item.id, e)}
                            placeholder="qty"
                            className="w-6 bg-slate-600 border border-slate-500 rounded px-1 py-0 text-white text-[8px] text-center"
                            disabled={settingThresholdId === item.id}
                          />
                          {salesHistory.length > 0 && (() => {
                            const { suggested, reason } = calculateSmartThreshold(item, salesHistory, thresholdSettings);
                            return (
                              <div className="text-[7px] text-slate-400 whitespace-nowrap">
                                <span className="text-yellow-300 font-medium">{suggested}</span>
                                <span className="text-slate-500"> suggested</span>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                    <span className="text-slate-400">{new Date(item.purchase_date).toLocaleDateString()}</span>
                    {isTrashView ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => handleRestore(item.id, e)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-green-400 hover:text-green-300 p-0.5"
                          title="Restore card"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => handleDelete(item.id, e)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300 p-0.5"
                          title="Delete permanently"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => handleDelete(item.id, e)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300 p-0.5"
                        title="Move to trash"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
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
        className={`relative bg-gradient-to-br ${isTrashView ? 'from-red-900/30 to-slate-900' : 'from-slate-800 to-slate-900'} border ${isTrashView ? 'border-red-600/50 hover:border-red-400' : 'border-slate-600 hover:border-teal-400'} rounded-lg p-3 md:p-4 transition-all duration-300 flex flex-col h-32 sm:h-36 md:h-40 hover:shadow-2xl ${isTrashView ? 'hover:shadow-red-500/30' : 'hover:shadow-teal-500/30'} hover:-translate-y-1 cursor-grab active:cursor-grabbing group active:scale-95`}
        onClick={() => setExpandedCards(isExpanded ? {} : {[cardName]: true})}
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
          onClick={handleDeleteAll}
          className="absolute top-2 right-2 p-1.5 bg-slate-700/80 hover:bg-red-600/60 text-slate-300 hover:text-white rounded-lg transition-all opacity-0 group-hover:opacity-100 z-20 duration-200"
          title={isTrashView ? "Delete all permanently" : "Move all to trash"}
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
          className={`relative bg-gradient-to-br ${isTrashView ? 'from-red-900/30 to-slate-900' : 'from-slate-800 to-slate-900'} border ${isTrashView ? 'border-red-600/50 hover:border-red-400' : 'border-slate-600 hover:border-teal-400'} rounded-lg p-4 transition-all duration-300 cursor-grab active:cursor-grabbing hover:shadow-2xl ${isTrashView ? 'hover:shadow-red-500/30' : 'hover:shadow-teal-500/30'} group`}>
          {isTrashView && (
            <button
              onClick={handleRestoreAll}
              className="absolute top-3 left-3 p-1.5 bg-slate-700/60 hover:bg-green-600/60 text-slate-300 hover:text-green-300 rounded-lg transition-all opacity-0 group-hover:opacity-100 z-20"
              title="Restore all copies"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={handleDeleteAll}
            className="absolute top-3 right-3 p-1.5 bg-slate-700/60 hover:bg-slate-600 text-slate-300 hover:text-red-400 rounded-lg transition-all opacity-0 group-hover:opacity-100 z-20"
            title={isTrashView ? "Delete all permanently" : "Move all to trash"}
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center justify-between gap-6">
            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpandedCards(isExpanded ? {} : {[cardName]: true})}>
              <div className="flex items-center gap-3">
                <h3 className={`text-sm font-semibold ${isTrashView ? 'text-red-200' : 'text-slate-50'} break-words`}>{cardName}</h3>
              </div>
                <div className="flex gap-6 text-xs mt-2">
                  <div><span className="text-slate-400">Qty:</span> <span className={`ml-1 font-semibold ${totalQty === 0 ? 'text-slate-500' : isTrashView ? 'text-red-300' : 'text-teal-300'}`}>{totalQty}</span></div>
                  <div><span className="text-slate-400">{isTrashView ? 'In Trash:' : 'Available:'}</span> <span className={`ml-1 ${isTrashView ? 'text-red-400' : 'text-green-400'} font-semibold`}>{available}</span></div>
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
  onCancelEdit: PropTypes.func
};

export default CardGroup;
