import React, { memo, useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import { X, Trash2, Edit2, Bell, BellOff, ChevronDown, ChevronUp, Package, DollarSign, Calendar, Hash, FolderOpen, Save, XCircle, Image } from 'lucide-react';
import { calculateSmartThreshold } from '../../utils/thresholdCalculator';
import { EXTERNAL_APIS } from '../../config/api';
import { Button } from '../ui/Button';

/**
 * Get card image URL from Scryfall
 * @param {string} cardName - Name of the card
 * @param {string} setCode - Set code (optional)
 * @returns {string} - Scryfall image URL
 */
function getCardImageUrl(cardName, setCode) {
  // Use Scryfall's named lookup for reliability
  const encodedName = encodeURIComponent(cardName.split('//')[0].trim());
  // If we have a set code, include it for more accurate results
  if (setCode) {
    return `${EXTERNAL_APIS.SCRYFALL}/cards/named?exact=${encodedName}&set=${setCode.toLowerCase()}&format=image&version=normal`;
  }
  return `${EXTERNAL_APIS.SCRYFALL}/cards/named?exact=${encodedName}&format=image&version=normal`;
}

/**
 * Calculate average price for a set of items
 * @param {Array} items - Array of items with purchase_price
 * @returns {number} - Average price
 */
function calculateAvgPrice(items) {
  if (items.length === 0) return 0;
  return items.reduce((sum, item) => sum + (parseFloat(item.purchase_price) || 0), 0) / items.length;
}

/**
 * Format currency value
 * @param {number} value - Value to format
 * @returns {string} - Formatted currency string
 */
function formatCurrency(value) {
  return value >= 100 ? `$${value.toFixed(0)}` : `$${value.toFixed(2)}`;
}

/**
 * Format date to readable string
 * @param {string} dateString - ISO date string
 * @returns {string} - Formatted date
 */
function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

/**
 * SKU Row Component - Displays a single SKU entry in the modal
 */
const SkuRow = memo(function SkuRow({
  item,
  isEditing,
  editForm,
  setEditForm,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onToggleAlert,
  onSetThreshold,
  togglingId,
  settingThresholdId,
  thresholdInput,
  setThresholdInput,
  salesHistory,
  thresholdSettings,
  createdFolders
}) {
  const handleThresholdBlur = (e) => {
    const threshold = parseInt(thresholdInput[item.id]) || 0;
    onSetThreshold(item.id, threshold, e);
  };

  if (isEditing) {
    return (
      <div className="bg-slate-700/80 rounded-xl p-4 border border-teal-500/50 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-teal-300">Editing SKU</span>
          <span className="text-xs text-slate-400 bg-slate-600 px-2 py-1 rounded">ID: {item.id}</span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Folder</label>
            <select
              value={editForm.folder || 'Uncategorized'}
              onChange={(e) => setEditForm({...editForm, folder: e.target.value})}
              className="w-full bg-slate-600 border border-slate-500 rounded-lg px-3 py-2.5 text-white text-sm min-h-[44px] focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            >
              <option value="Uncategorized">Uncategorized</option>
              {createdFolders.map(folder => (
                <option key={folder} value={folder}>{folder}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Quantity</label>
            <input
              type="number"
              min="1"
              value={editForm.quantity}
              onChange={(e) => setEditForm({...editForm, quantity: e.target.value})}
              className="w-full bg-slate-600 border border-slate-500 rounded-lg px-3 py-2.5 text-white text-sm min-h-[44px] focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="Quantity"
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Purchase Price</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={editForm.purchase_price}
                onChange={(e) => setEditForm({...editForm, purchase_price: e.target.value})}
                className="w-full bg-slate-600 border border-slate-500 rounded-lg pl-7 pr-3 py-2.5 text-white text-sm min-h-[44px] focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="0.00"
              />
            </div>
          </div>
        </div>
        
        <div className="flex gap-2 pt-2">
          <Button
            variant="success"
            size="md"
            onClick={() => onSaveEdit(item.id)}
            iconLeft={<Save className="w-4 h-4" />}
            className="flex-1"
          >
            Save Changes
          </Button>
          <Button
            variant="secondary"
            size="md"
            onClick={onCancelEdit}
            iconLeft={<XCircle className="w-4 h-4" />}
            className="flex-1"
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  const smartThreshold = salesHistory.length > 0 
    ? calculateSmartThreshold(item, salesHistory, thresholdSettings)
    : null;

  return (
    <div 
      className="bg-slate-700/60 rounded-xl p-4 border border-slate-600 hover:border-slate-500 transition-colors group"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('skuData', JSON.stringify(item));
        e.dataTransfer.setData('inventoryItemId', item.id.toString());
      }}
    >
      {/* SKU Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-teal-300 bg-teal-900/40 px-2 py-1 rounded">
              {item.set?.toUpperCase() || 'N/A'}
            </span>
            {item.set_name && (
              <span className="text-xs text-slate-400 truncate">{item.set_name}</span>
            )}
          </div>
        </div>
        
        {/* Alert Toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleAlert(item, e);
          }}
          className={`p-2 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center ${
            item.low_inventory_alert 
              ? 'bg-yellow-600/30 text-yellow-400 hover:bg-yellow-600/50' 
              : 'bg-slate-600/50 text-slate-400 hover:bg-slate-600 hover:text-yellow-400'
          }`}
          title={item.low_inventory_alert ? 'Low inventory alert enabled' : 'Enable low inventory alert'}
          disabled={togglingId === item.id}
        >
          {item.low_inventory_alert ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
        </button>
      </div>
      
      {/* SKU Details Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
        <div className="bg-slate-800/50 rounded-lg p-2.5">
          <div className="flex items-center gap-1.5 text-slate-400 mb-1">
            <Package className="w-3.5 h-3.5" />
            <span className="text-[10px] font-medium uppercase tracking-wide">Quantity</span>
          </div>
          <div className="text-lg font-bold text-teal-300">{item.quantity} <span className="text-xs font-normal text-slate-400">copies</span></div>
        </div>
        
        <div className="bg-slate-800/50 rounded-lg p-2.5">
          <div className="flex items-center gap-1.5 text-slate-400 mb-1">
            <DollarSign className="w-3.5 h-3.5" />
            <span className="text-[10px] font-medium uppercase tracking-wide">Unit Cost</span>
          </div>
          <div className="text-lg font-bold text-green-400">{formatCurrency(parseFloat(item.purchase_price) || 0)}</div>
        </div>
        
        <div className="bg-slate-800/50 rounded-lg p-2.5">
          <div className="flex items-center gap-1.5 text-slate-400 mb-1">
            <Hash className="w-3.5 h-3.5" />
            <span className="text-[10px] font-medium uppercase tracking-wide">Total Value</span>
          </div>
          <div className="text-lg font-bold text-amber-400">{formatCurrency((item.quantity || 0) * (parseFloat(item.purchase_price) || 0))}</div>
        </div>
        
        <div className="bg-slate-800/50 rounded-lg p-2.5">
          <div className="flex items-center gap-1.5 text-slate-400 mb-1">
            <Calendar className="w-3.5 h-3.5" />
            <span className="text-[10px] font-medium uppercase tracking-wide">Purchased</span>
          </div>
          <div className="text-sm font-medium text-slate-200">{formatDate(item.purchase_date)}</div>
        </div>
      </div>
      
      {/* Folder info */}
      {item.folder && item.folder !== 'Uncategorized' && (
        <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
          <FolderOpen className="w-3.5 h-3.5" />
          <span>In folder: <span className="text-slate-300">{item.folder}</span></span>
        </div>
      )}
      
      {/* Low Inventory Threshold */}
      {item.low_inventory_alert && (
        <div className="bg-slate-800/50 rounded-lg p-3 mb-3 border border-yellow-600/30">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-yellow-400" />
              <span className="text-xs font-medium text-slate-300">Low Inventory Threshold</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                value={thresholdInput[item.id] !== undefined ? thresholdInput[item.id] : item.low_inventory_threshold || ''}
                onChange={(e) => setThresholdInput(prev => ({ ...prev, [item.id]: e.target.value }))}
                onBlur={handleThresholdBlur}
                onKeyDown={(e) => e.key === 'Enter' && handleThresholdBlur(e)}
                placeholder="Set threshold"
                className="w-20 bg-slate-600 border border-slate-500 rounded-lg px-2 py-1.5 text-white text-sm text-center min-h-[36px] focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                disabled={settingThresholdId === item.id}
              />
              {smartThreshold && (
                <div className="text-xs text-slate-400">
                  Suggested: <span className="text-yellow-300 font-medium">{smartThreshold.suggested}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Actions */}
      <div className="flex gap-2 pt-2 border-t border-slate-600/50">
        <Button
          variant="secondary"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onStartEdit(item);
          }}
          iconLeft={<Edit2 className="w-4 h-4" />}
          className="flex-1"
        >
          Edit
        </Button>
        <Button
          variant="danger"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(item.id);
          }}
          iconLeft={<Trash2 className="w-4 h-4" />}
          className="flex-1"
        >
          Delete
        </Button>
      </div>
    </div>
  );
});

SkuRow.propTypes = {
  item: PropTypes.object.isRequired,
  isEditing: PropTypes.bool.isRequired,
  editForm: PropTypes.object.isRequired,
  setEditForm: PropTypes.func.isRequired,
  onStartEdit: PropTypes.func.isRequired,
  onSaveEdit: PropTypes.func.isRequired,
  onCancelEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onToggleAlert: PropTypes.func.isRequired,
  onSetThreshold: PropTypes.func.isRequired,
  togglingId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  settingThresholdId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  thresholdInput: PropTypes.object.isRequired,
  setThresholdInput: PropTypes.func.isRequired,
  salesHistory: PropTypes.array.isRequired,
  thresholdSettings: PropTypes.object.isRequired,
  createdFolders: PropTypes.array.isRequired
};

/**
 * CardDetailModal - A modal/slide-out panel for displaying card details
 * Provides a better UX than the inline dropdown
 */
export const CardDetailModal = memo(function CardDetailModal({
  isOpen,
  onClose,
  cardName,
  items,
  editingId,
  editForm,
  setEditForm,
  startEditingItem,
  updateInventoryItem,
  deleteInventoryItem,
  createdFolders,
  onToggleLowInventory,
  onSetThreshold
}) {
  const [togglingId, setTogglingId] = useState(null);
  const [settingThresholdId, setSettingThresholdId] = useState(null);
  const [thresholdInput, setThresholdInput] = useState({});
  const [salesHistory, setSalesHistory] = useState([]);
  const [thresholdSettings, setThresholdSettings] = useState({ baseStock: 10, landMultiplier: 10, velocityWeeks: 4 });
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [showAllSkus, setShowAllSkus] = useState(false);
  
  // Refs for focus management
  const modalRef = useRef(null);
  const previousActiveElement = useRef(null);
  
  // Get all focusable elements within a container
  const getFocusableElements = useCallback((container) => {
    const focusableSelectors = [
      'button:not([disabled])',
      'a[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ');
    return container ? Array.from(container.querySelectorAll(focusableSelectors)) : [];
  }, []);

  // Keyboard accessibility: Escape key to close and focus trap
  useEffect(() => {
    if (!isOpen) return;
    
    // Store the previously focused element
    previousActiveElement.current = document.activeElement;
    
    // Handle keyboard events
    const handleKeyDown = (e) => {
      // Close on Escape
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      
      // Focus trap
      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = getFocusableElements(modalRef.current);
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        if (focusableElements.length === 0) {
          e.preventDefault();
          return;
        }
        
        if (e.shiftKey) {
          // Shift + Tab: if on first element, go to last
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement?.focus();
          }
        } else {
          // Tab: if on last element, go to first
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement?.focus();
          }
        }
      }
    };
    
    // Add event listener
    document.addEventListener('keydown', handleKeyDown);
    
    // Focus the first focusable element in the modal
    if (modalRef.current) {
      const focusableElements = getFocusableElements(modalRef.current);
      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      } else {
        modalRef.current.focus();
      }
    }
    
    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // Restore focus to the previously focused element
      if (previousActiveElement.current && typeof previousActiveElement.current.focus === 'function') {
        previousActiveElement.current.focus();
      }
    };
  }, [isOpen, onClose, getFocusableElements]);
  
  // Load sales history and threshold settings on mount
  useEffect(() => {
    const saved = localStorage.getItem('thresholdSettings');
    if (saved) {
      try {
        setThresholdSettings(JSON.parse(saved));
      } catch (err) {
        console.error('[CardDetailModal] Error loading settings:', err);
      }
    }
    
    fetch('/api/sales')
      .then(res => res.json())
      .then(data => {
        setSalesHistory(data || []);
      })
      .catch(err => console.error('[CardDetailModal] Error loading sales:', err));
  }, []);

  // Reset image state when card changes
  useEffect(() => {
    setImageError(false);
    setImageLoading(true);
  }, [cardName]);

  if (!isOpen || !items || items.length === 0) return null;

  // Calculate totals
  const totalQty = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const reservedQty = items.reduce((sum, item) => sum + (parseInt(item.reserved_quantity) || 0), 0);
  const availableQty = totalQty - reservedQty;
  const avgPrice = calculateAvgPrice(items);
  const totalValue = totalQty * avgPrice;

  // Get unique sets
  const uniqueSets = [...new Set(items.map(item => item.set?.toUpperCase()).filter(Boolean))];
  const firstItem = items[0];

  // Determine which SKUs to show
  const maxInitialSkus = 3;
  const displayedItems = showAllSkus ? items : items.slice(0, maxInitialSkus);
  const hasMoreSkus = items.length > maxInitialSkus;

  // Handlers
  const handleToggleLowInventory = async (item, e) => {
    e?.stopPropagation();
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

  const handleSetThreshold = async (itemId, threshold, e) => {
    e?.stopPropagation();
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

  const handleCancelEdit = () => {
    setEditForm({});
  };

  const handleSaveEdit = (itemId) => {
    updateInventoryItem(itemId, {
      ...editForm,
      quantity: parseInt(editForm.quantity),
      purchase_price: parseFloat(editForm.purchase_price)
    });
  };

  const imageUrl = getCardImageUrl(cardName, firstItem?.set);

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-start justify-end p-4 md:p-6 animate-fadeIn"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="card-detail-title"
    >
      <div 
        ref={modalRef}
        tabIndex={-1}
        className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl border border-slate-700 shadow-2xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col mt-12 animate-slideIn"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-4 md:p-6 border-b border-slate-700 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <h2 id="card-detail-title" className="text-xl md:text-2xl font-bold text-white truncate">
              {cardName}
            </h2>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {uniqueSets.map(set => (
                <span key={set} className="text-xs font-bold text-teal-300 bg-teal-900/40 px-2 py-1 rounded">
                  {set}
                </span>
              ))}
              <span className="text-xs text-slate-400">
                {items.length} {items.length === 1 ? 'SKU' : 'SKUs'}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center flex-shrink-0"
            aria-label="Close modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {/* Card Overview Section */}
          <div className="flex flex-col sm:flex-row gap-4 md:gap-6">
            {/* Card Image */}
            <div className="w-full sm:w-48 md:w-56 flex-shrink-0">
              <div className="aspect-[488/680] bg-slate-700/50 rounded-xl overflow-hidden border border-slate-600 relative">
                {imageLoading && !imageError && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="animate-pulse flex flex-col items-center gap-2">
                      <Image className="w-8 h-8 text-slate-500" />
                      <span className="text-xs text-slate-500">Loading...</span>
                    </div>
                  </div>
                )}
                {!imageError ? (
                  <img
                    src={imageUrl}
                    alt={cardName}
                    className={`w-full h-full object-cover transition-opacity ${imageLoading ? 'opacity-0' : 'opacity-100'}`}
                    onLoad={() => setImageLoading(false)}
                    onError={() => {
                      setImageError(true);
                      setImageLoading(false);
                    }}
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 p-4">
                    <Image className="w-12 h-12 mb-2" />
                    <span className="text-xs text-center">Image not available</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Summary Stats */}
            <div className="flex-1 grid grid-cols-2 gap-3">
              <div className="bg-slate-700/50 rounded-xl p-4 border border-slate-600">
                <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Total Quantity</div>
                <div className="text-2xl md:text-3xl font-bold text-teal-300">{totalQty}</div>
                <div className="text-xs text-slate-400 mt-1">copies in inventory</div>
              </div>
              
              <div className="bg-slate-700/50 rounded-xl p-4 border border-slate-600">
                <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Available</div>
                <div className="text-2xl md:text-3xl font-bold text-green-400">{availableQty}</div>
                <div className="text-xs text-slate-400 mt-1">{reservedQty > 0 ? `${reservedQty} reserved` : 'none reserved'}</div>
              </div>
              
              <div className="bg-slate-700/50 rounded-xl p-4 border border-slate-600">
                <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Avg. Cost</div>
                <div className="text-2xl md:text-3xl font-bold text-blue-300">{formatCurrency(avgPrice)}</div>
                <div className="text-xs text-slate-400 mt-1">per copy</div>
              </div>
              
              <div className="bg-slate-700/50 rounded-xl p-4 border border-slate-600">
                <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Total Value</div>
                <div className="text-2xl md:text-3xl font-bold text-amber-400">{formatCurrency(totalValue)}</div>
                <div className="text-xs text-slate-400 mt-1">inventory value</div>
              </div>
            </div>
          </div>
          
          {/* SKU List Section */}
          <div>
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-3 flex items-center gap-2">
              <Package className="w-4 h-4" />
              Individual SKUs
            </h3>
            <div className="space-y-3">
              {displayedItems.map(item => (
                <SkuRow
                  key={item.id}
                  item={item}
                  isEditing={editingId === item.id}
                  editForm={editForm}
                  setEditForm={setEditForm}
                  onStartEdit={startEditingItem}
                  onSaveEdit={handleSaveEdit}
                  onCancelEdit={handleCancelEdit}
                  onDelete={deleteInventoryItem}
                  onToggleAlert={handleToggleLowInventory}
                  onSetThreshold={handleSetThreshold}
                  togglingId={togglingId}
                  settingThresholdId={settingThresholdId}
                  thresholdInput={thresholdInput}
                  setThresholdInput={setThresholdInput}
                  salesHistory={salesHistory}
                  thresholdSettings={thresholdSettings}
                  createdFolders={createdFolders}
                />
              ))}
            </div>
            
            {/* Show More/Less Toggle */}
            {hasMoreSkus && (
              <button
                onClick={() => setShowAllSkus(!showAllSkus)}
                className="w-full mt-3 py-3 px-4 bg-slate-700/50 hover:bg-slate-700 rounded-xl border border-slate-600 text-sm font-medium text-slate-300 hover:text-white transition-colors flex items-center justify-center gap-2 min-h-[44px]"
              >
                {showAllSkus ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    Show Less
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    Show {items.length - maxInitialSkus} More {items.length - maxInitialSkus === 1 ? 'SKU' : 'SKUs'}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-4 md:p-6 border-t border-slate-700 flex-shrink-0 bg-slate-800/50">
          <div className="text-xs text-slate-400">
            Drag SKUs to move them to folders or decks
          </div>
          <Button
            variant="secondary"
            size="md"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
});

CardDetailModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  cardName: PropTypes.string.isRequired,
  items: PropTypes.array.isRequired,
  editingId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  editForm: PropTypes.object.isRequired,
  setEditForm: PropTypes.func.isRequired,
  startEditingItem: PropTypes.func.isRequired,
  updateInventoryItem: PropTypes.func.isRequired,
  deleteInventoryItem: PropTypes.func.isRequired,
  createdFolders: PropTypes.array.isRequired,
  onToggleLowInventory: PropTypes.func,
  onSetThreshold: PropTypes.func
};

export default CardDetailModal;
