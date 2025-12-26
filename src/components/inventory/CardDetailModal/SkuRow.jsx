import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { Bell, BellOff, Package, DollarSign, Calendar, Hash, FolderOpen, Save, XCircle, Edit2, Trash2 } from 'lucide-react';
import { formatCurrency, formatDate } from '../../../utils/cardHelpers';
import { Button } from '../../ui/Button';

/**
 * SkuRow - Displays a single SKU entry in the CardDetailModal
 * Extracted for better code organization and reusability
 */
export const SkuRow = memo(function SkuRow({
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
  thresholdSettings: PropTypes.object.isRequired,
  createdFolders: PropTypes.array.isRequired
};

export default SkuRow;
