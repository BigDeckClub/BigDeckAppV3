import React, { memo, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { X, Trash2, Edit2, Bell, BellOff, ChevronDown, ChevronUp, Package, DollarSign, Calendar, Hash, FolderOpen, Save, XCircle, Image } from 'lucide-react';
import { calculateSmartThreshold } from '../../utils/thresholdCalculator';
import { EXTERNAL_APIS } from '../../config/api';
import scryfallClient from '../../utils/scryfallClient';
import { Button } from '../ui/Button';
import { useAuthFetch } from '../../hooks/useAuthFetch';

/**
 * Get card image URL from Scryfall
 * @param {string} cardName - Name of the card
 * @param {string} setCode - Set code (optional)
 * @returns {string} - Scryfall image URL
 */
// Helper to construct named lookup URL when needed
function getNamedImageUrl(cardName, setCode) {
  const encodedName = encodeURIComponent(cardName.split('//')[0].trim());
  const safeSet = (typeof setCode === 'string'
    ? setCode.toString().trim()
    : (setCode?.editioncode || setCode?.mtgoCode || '')).toString().trim();
  const includeSet = safeSet && safeSet.toLowerCase() !== 'unknown';
  if (includeSet) {
    return `${EXTERNAL_APIS.SCRYFALL}/cards/named?exact=${encodedName}&set=${safeSet.toLowerCase()}&format=image&version=normal`;
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
      <div className="bg-ui-surface rounded-xl p-4 border border-ui-border space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-ui-primary">Editing SKU</span>
          <span className="text-xs text-ui-muted bg-ui-card px-2 py-1 rounded">ID: {item.id}</span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-ui-muted mb-1">Folder</label>
            <select
              value={editForm.folder || 'Uncategorized'}
              onChange={(e) => setEditForm({...editForm, folder: e.target.value})}
              className="w-full bg-ui-card border border-ui-border rounded-lg px-3 py-2.5 text-ui-text text-sm min-h-[44px] focus:ring-2 focus:ring-ui-primary focus:border-transparent"
            >
              <option value="Uncategorized">Uncategorized</option>
              {createdFolders.map(folder => (
                <option key={folder} value={folder}>{folder}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-ui-muted mb-1">Quantity</label>
            <input
              type="number"
              min="1"
              value={editForm.quantity}
              onChange={(e) => setEditForm({...editForm, quantity: e.target.value})}
              className="w-full bg-ui-card border border-ui-border rounded-lg px-3 py-2.5 text-ui-text text-sm min-h-[44px] focus:ring-2 focus:ring-ui-primary focus:border-transparent"
              placeholder="Quantity"
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-ui-muted mb-1">Purchase Price</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ui-muted">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={editForm.purchase_price}
                onChange={(e) => setEditForm({...editForm, purchase_price: e.target.value})}
                className="w-full bg-ui-card border border-ui-border rounded-lg pl-7 pr-3 py-2.5 text-ui-text text-sm min-h-[44px] focus:ring-2 focus:ring-ui-primary focus:border-transparent"
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
    className="bg-ui-surface rounded-xl p-4 border border-ui-border hover:border-ui-primary transition-colors group"
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
            <span className="text-xs font-bold text-ui-primary bg-ui-primary/10 px-2 py-1 rounded">
              {item.set?.toUpperCase() || 'N/A'}
            </span>
            {item.set_name && (
              <span className="text-xs text-ui-muted truncate">{item.set_name}</span>
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
              : 'bg-slate-600/50 text-[var(--text-muted)] hover:bg-slate-600 hover:text-yellow-400'
          }`}
          title={item.low_inventory_alert ? 'Low inventory alert enabled' : 'Enable low inventory alert'}
          disabled={togglingId === item.id}
        >
          {item.low_inventory_alert ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
        </button>
      </div>
      
        {/* SKU Details Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
        <div className="bg-ui-card rounded-lg p-2.5">
          <div className="flex items-center gap-1.5 text-ui-muted mb-1">
            <Package className="w-3.5 h-3.5" />
            <span className="text-[10px] font-medium uppercase tracking-wide">Quantity</span>
          </div>
          <div className="text-lg font-bold text-ui-primary">{item.quantity} <span className="text-xs font-normal text-ui-muted">copies</span></div>
        </div>
        
        <div className="bg-ui-card rounded-lg p-2.5">
          <div className="flex items-center gap-1.5 text-ui-muted mb-1">
            <DollarSign className="w-3.5 h-3.5" />
            <span className="text-[10px] font-medium uppercase tracking-wide">Unit Cost</span>
          </div>
          <div className="text-lg font-bold text-ui-accent">{formatCurrency(parseFloat(item.purchase_price) || 0)}</div>
        </div>
        
        <div className="bg-ui-card rounded-lg p-2.5">
          <div className="flex items-center gap-1.5 text-ui-muted mb-1">
            <Hash className="w-3.5 h-3.5" />
            <span className="text-[10px] font-medium uppercase tracking-wide">Total Value</span>
          </div>
          <div className="text-lg font-bold text-ui-accent">{formatCurrency((item.quantity || 0) * (parseFloat(item.purchase_price) || 0))}</div>
        </div>
        
        <div className="bg-ui-card rounded-lg p-2.5">
          <div className="flex items-center gap-1.5 text-ui-muted mb-1">
            <Calendar className="w-3.5 h-3.5" />
            <span className="text-[10px] font-medium uppercase tracking-wide">Purchased</span>
          </div>
          <div className="text-sm font-medium text-ui-text">{formatDate(item.purchase_date)}</div>
        </div>
      </div>
      
      {/* Folder info */}
      {item.folder && item.folder !== 'Uncategorized' && (
        <div className="flex items-center gap-2 text-xs text-ui-muted mb-3">
          <FolderOpen className="w-3.5 h-3.5" />
          <span>In folder: <span className="text-ui-text">{item.folder}</span></span>
        </div>
      )}
      
      {/* Low Inventory Threshold */}
      {item.low_inventory_alert && (
        <div className="bg-ui-surface/50 rounded-lg p-3 mb-3 border border-yellow-600/30">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-yellow-400" />
              <span className="text-xs font-medium text-ui-text">Low Inventory Threshold</span>
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
                className="w-20 bg-ui-card border border-ui-border rounded-lg px-2 py-1.5 text-ui-text text-sm text-center min-h-[36px] focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                disabled={settingThresholdId === item.id}
              />
              {smartThreshold && (
                <div className="text-xs text-ui-muted">
                  Suggested: <span className="text-yellow-300 font-medium">{smartThreshold.suggested}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Actions */}
      <div className="flex gap-2 pt-2 border-t border-ui-border">
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
  const { authFetch } = useAuthFetch();
  const [togglingId, setTogglingId] = useState(null);
  const [settingThresholdId, setSettingThresholdId] = useState(null);
  const [thresholdInput, setThresholdInput] = useState({});
  const [salesHistory, setSalesHistory] = useState([]);
  const [thresholdSettings, setThresholdSettings] = useState({ baseStock: 10, landMultiplier: 10, velocityWeeks: 4 });
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [showAllSkus, setShowAllSkus] = useState(false);
  const [expandedMerged, setExpandedMerged] = useState({});
  
  // Refs for focus management
  const modalRef = useRef(null);
  const previousActiveElement = useRef(null);
  const salesFetchedRef = useRef(false);
  
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
  
  // Load threshold settings from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('thresholdSettings');
    if (saved) {
      try {
        setThresholdSettings(JSON.parse(saved));
      } catch (err) {
        console.error('[CardDetailModal] Error loading settings:', err);
      }
    }
  }, []);

  // Load sales history only when modal opens (and only once per open)
  useEffect(() => {
    if (!isOpen) {
      salesFetchedRef.current = false;
      return;
    }

    if (salesFetchedRef.current) return;
    salesFetchedRef.current = true;

    authFetch('/api/sales')
      .then(res => res.json())
      .then(data => {
        setSalesHistory(data || []);
      })
      .catch(err => console.error('[CardDetailModal] Error loading sales:', err));
  }, [isOpen, authFetch]);

  // Reset image state when card changes
  useEffect(() => {
    setImageError(false);
    setImageLoading(true);
  }, [cardName]);

  // Helper to get normalized set name (defined before useMemo)
  const getSetName = useCallback((set) => {
    if (!set) return 'unknown';
    if (typeof set === 'string') return set.toLowerCase().trim();
    return (set.editioncode || set.editionname || 'unknown').toLowerCase().trim();
  }, []);

  // Merge duplicate items (same set/foil/quality) - MUST be before early return
  const mergedItems = useMemo(() => {
    // Return empty array if no items to process
    if (!items || items.length === 0) return [];
    
    const variantMap = {};
    
    items.forEach(item => {
      const setName = getSetName(item.set);
      const foilStatus = item.foil ? 'foil' : 'nonfoil';
      const qualityValue = (item.quality || 'NM').toLowerCase().trim();
      const variantKey = `${setName}_${foilStatus}_${qualityValue}`;
      
      if (!variantMap[variantKey]) {
        variantMap[variantKey] = [];
      }
      variantMap[variantKey].push(item);
    });
    
    // Create merged items with stable keys
    return Object.entries(variantMap).map(([variantKey, variantItems]) => {
      if (variantItems.length > 1) {
        return {
          ...variantItems[0],
          _variantKey: variantKey,
          _mergedCount: variantItems.length,
          _mergedIds: variantItems.map(i => i.id),
          _mergedItems: variantItems,
          _totalQuantity: variantItems.reduce((sum, i) => sum + (i.quantity || 0), 0),
          _totalReserved: variantItems.reduce((sum, i) => sum + (parseInt(i.reserved_quantity) || 0), 0),
          quantity: variantItems.reduce((sum, i) => sum + (i.quantity || 0), 0),
          reserved_quantity: variantItems.reduce((sum, i) => sum + (parseInt(i.reserved_quantity) || 0), 0)
        };
      }
      return {
        ...variantItems[0],
        _variantKey: variantKey
      };
    });
  }, [items, getSetName]);

  // Early return AFTER all hooks are called
  if (!isOpen || !items || items.length === 0) return null;

  // Calculate totals using merged items
  const totalQty = mergedItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const reservedQty = mergedItems.reduce((sum, item) => sum + (parseInt(item.reserved_quantity) || 0), 0);
  const availableQty = totalQty - reservedQty;
  const avgPrice = calculateAvgPrice(items);
  const totalValue = totalQty * avgPrice;

  // Get unique sets from merged items
  const uniqueSets = [...new Set(mergedItems.map(item => {
    const set = item.set;
    if (!set) return 'UNKNOWN';
    if (typeof set === 'string') return set.toUpperCase();
    return (set.editioncode || set.editionname || 'UNKNOWN').toUpperCase();
  }).filter(Boolean))];
  const firstItem = mergedItems[0];

  // Determine which SKUs to show (using merged items)
  const maxInitialSkus = 3;
  const displayedItems = showAllSkus ? mergedItems : mergedItems.slice(0, maxInitialSkus);
  const hasMoreSkus = mergedItems.length > maxInitialSkus;

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

  // Prefer direct URIs or id-based images via centralized client, else fallback to named lookup
  const candidate = scryfallClient.getImageUrl({
    image_uris: firstItem?.image_uris,
    card_faces: firstItem?.card_faces,
    scryfall_id: firstItem?.scryfall_id,
    name: cardName,
    set: firstItem?.set,
  }, { version: 'normal' });

  const safeSet = (typeof firstItem?.set === 'string'
    ? firstItem?.set.toString().trim()
    : (firstItem?.set?.editioncode || firstItem?.set?.mtgoCode || '')).toString().trim();

  const imageUrl = candidate || getNamedImageUrl(cardName, safeSet);

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
        className="bg-ui-surface rounded-2xl border border-ui-border shadow-2xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col mt-12 animate-slideIn"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-4 md:p-6 border-b border-ui-border flex-shrink-0">
          <div className="flex-1 min-w-0">
            <h2 id="card-detail-title" className="text-xl md:text-2xl font-bold text-ui-heading truncate">
              {cardName}
            </h2>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {uniqueSets.map(set => (
                <span key={set} className="text-xs font-bold text-teal-300 bg-teal-900/40 px-2 py-1 rounded">
                  {set}
                </span>
              ))}
              <span className="text-xs text-ui-muted">
                {items.length} {items.length === 1 ? 'SKU' : 'SKUs'}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-ui-muted hover:text-ui-text hover:bg-ui-surface rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center flex-shrink-0"
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
              <div className="aspect-[488/680] bg-ui-card/50 rounded-xl overflow-hidden border border-ui-border relative">
                {imageLoading && !imageError && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="animate-pulse flex flex-col items-center gap-2">
                      <Image className="w-8 h-8 text-ui-muted" />
                      <span className="text-xs text-ui-muted">Loading...</span>
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
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-ui-muted p-4">
                    <Image className="w-12 h-12 mb-2" />
                    <span className="text-xs text-center">Image not available</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Summary Stats */}
            <div className="flex-1 grid grid-cols-2 gap-3">
              <div className="bg-ui-card/50 rounded-xl p-4 border border-ui-border">
                <div className="text-xs font-medium text-ui-muted uppercase tracking-wide mb-1">Total Quantity</div>
                <div className="text-2xl md:text-3xl font-bold text-teal-300">{totalQty}</div>
                <div className="text-xs text-ui-muted mt-1">copies in inventory</div>
              </div>
              
              <div className="bg-ui-card/50 rounded-xl p-4 border border-ui-border">
                <div className="text-xs font-medium text-ui-muted uppercase tracking-wide mb-1">Available</div>
                <div className="text-2xl md:text-3xl font-bold text-green-400">{availableQty}</div>
                <div className="text-xs text-ui-muted mt-1">{reservedQty > 0 ? `${reservedQty} reserved` : 'none reserved'}</div>
              </div>
              
              <div className="bg-ui-card/50 rounded-xl p-4 border border-ui-border">
                <div className="text-xs font-medium text-ui-muted uppercase tracking-wide mb-1">Avg. Cost</div>
                <div className="text-2xl md:text-3xl font-bold text-blue-300">{formatCurrency(avgPrice)}</div>
                <div className="text-xs text-ui-muted mt-1">per copy</div>
              </div>
              
              <div className="bg-ui-card/50 rounded-xl p-4 border border-ui-border">
                <div className="text-xs font-medium text-ui-muted uppercase tracking-wide mb-1">Total Value</div>
                <div className="text-2xl md:text-3xl font-bold text-amber-400">{formatCurrency(totalValue)}</div>
                <div className="text-xs text-ui-muted mt-1">inventory value</div>
              </div>
            </div>
          </div>
          
          {/* SKU List Section */}
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3 flex items-center gap-2">
              <Package className="w-4 h-4" />
              Individual SKUs
            </h3>
            <div className="space-y-3">
              {displayedItems.map(item => (
                <div key={item._variantKey || item.id}>
                  <SkuRow
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
                  
                  {/* Merged items badge and dropdown */}
                  {item._mergedCount > 1 && (
                    <div className="mt-2 ml-4">
                      <button
                        onClick={() => setExpandedMerged(prev => ({ ...prev, [item._variantKey]: !prev[item._variantKey] }))}
                        className="text-xs bg-teal-600/30 text-teal-300 px-3 py-1.5 rounded hover:bg-teal-600/50 transition-colors flex items-center gap-2"
                      >
                        <Package className="w-3 h-3" />
                        {item._mergedCount} identical SKUs merged
                        {expandedMerged[item._variantKey] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                      
                      {/* Expanded dropdown showing individual entries */}
                      {expandedMerged[item._variantKey] && (
                        <div className="mt-2 ml-4 space-y-1 bg-ui-card/30 rounded p-3 border-l-2 border-teal-500/30">
                          {item._mergedItems.map((subItem, idx) => (
                            <div key={subItem.id} className="flex items-center gap-3 text-xs text-ui-muted py-2 border-b border-ui-border/30 last:border-0">
                              <span className="text-ui-muted font-mono">#{idx + 1}</span>
                              <span className="font-mono text-ui-muted">ID: {subItem.id}</span>
                              <span className="text-ui-muted">Qty: {subItem.quantity || 0}</span>
                              <span className="text-ui-muted">Reserved: {subItem.reserved_quantity || 0}</span>
                              <span className="text-ui-muted">Cost: {formatCurrency(parseFloat(subItem.purchase_price) || 0)}</span>
                              {subItem.purchase_date && (
                                <span className="text-ui-muted">Added: {formatDate(subItem.purchase_date)}</span>
                              )}
                              {subItem.folder && subItem.folder !== 'Uncategorized' && (
                                <span className="bg-ui-card px-2 py-0.5 rounded text-ui-text">{subItem.folder}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {/* Show More/Less Toggle */}
            {hasMoreSkus && (
              <button
                onClick={() => setShowAllSkus(!showAllSkus)}
                className="w-full mt-3 py-3 px-4 bg-ui-surface/50 hover:bg-ui-surface rounded-xl border border-ui-border text-sm font-medium text-ui-muted hover:text-ui-text transition-colors flex items-center justify-center gap-2 min-h-[44px]"
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
        <div className="flex items-center justify-between gap-3 p-4 md:p-6 border-t border-ui-border flex-shrink-0 bg-ui-surface/50">
          <div className="text-xs text-ui-muted">
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
