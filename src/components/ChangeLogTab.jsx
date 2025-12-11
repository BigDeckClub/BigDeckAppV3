import React, { useState, useEffect, useCallback } from 'react';
import { Filter, ArrowRight, RefreshCw } from 'lucide-react';
import { useApi } from '../hooks/useApi';

/**
 * Format a field name for display
 */
const formatFieldName = (field) => {
  const fieldNames = {
    quantity: 'Quantity',
    purchase_price: 'Price',
    folder: 'Folder',
    quality: 'Condition',
    foil: 'Foil',
    set: 'Set',
    set_name: 'Set Name'
  };
  return fieldNames[field] || field.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};

/**
 * Format a value for display
 */
const formatValue = (field, value) => {
  if (value === null || value === undefined || value === '') {
    return '(empty)';
  }
  if (field === 'purchase_price') {
    return `$${parseFloat(value).toFixed(2)}`;
  }
  if (field === 'foil') {
    return value === 'true' || value === true ? 'Yes' : 'No';
  }
  return String(value);
};

/**
 * Get relative time string
 */
const getRelativeTime = (date) => {
  const now = new Date();
  const diff = now - new Date(date);
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  if (days < 7) return `${days} day${days !== 1 ? 's' : ''} ago`;
  return new Date(date).toLocaleDateString();
};

/**
 * Get color class for field type
 */
const getFieldColorClass = (field) => {
  const colors = {
    quantity: 'text-teal-400',
    purchase_price: 'text-blue-400',
    folder: 'text-purple-400',
    quality: 'text-amber-400',
    foil: 'text-pink-400'
  };
  return colors[field] || 'text-[var(--text-muted)]';
};

export const ChangeLogTab = () => {
  const { get } = useApi();
  const [changes, setChanges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [total, setTotal] = useState(0);

  const fieldTypeOptions = [
    { value: 'all', label: 'All Changes' },
    { value: 'quantity', label: 'Quantity Changes' },
    { value: 'purchase_price', label: 'Price Changes' },
    { value: 'folder', label: 'Folder Changes' },
    { value: 'quality', label: 'Condition Changes' },
    { value: 'foil', label: 'Foil Changes' }
  ];

  const loadChanges = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (filterType !== 'all') {
        params.append('field_changed', filterType);
      }
      const data = await get(`/history/changes?${params.toString()}`);
      setChanges(data.changes || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Failed to load change history:', error);
      setChanges([]);
    } finally {
      setLoading(false);
    }
  }, [get, filterType]);

  useEffect(() => {
    loadChanges();
  }, [loadChanges]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3 items-start md:items-end">
        <div className="flex-1">
          <label className="block text-sm text-[var(--text-muted)] mb-2">Filter by Change Type</label>
          <select 
            value={filterType} 
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full bg-[var(--surface)] border border-[var(--border)] rounded px-3 py-2 text-white text-sm hover:border-teal-500 transition-colors"
          >
            {fieldTypeOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={loadChanges}
          disabled={loading}
          className="px-4 py-2 bg-[var(--muted-surface)] hover:bg-slate-600 text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Results count */}
      <div className="text-sm text-[var(--text-muted)]">
        {loading ? 'Loading...' : `${total} change${total !== 1 ? 's' : ''} recorded`}
      </div>

      {/* Change List */}
      {!loading && changes.length > 0 ? (
        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {changes.map((change) => (
            <div 
              key={change.id}
              className="bg-gradient-to-r from-slate-800 to-slate-900 border border-[var(--border)] rounded-lg p-4 hover:border-teal-500 transition-colors"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="flex-1">
                  <div className="font-bold text-teal-300 text-lg mb-2">{change.card_name}</div>
                  <div className="flex items-center gap-2 flex-wrap text-sm">
                    <span className={`font-semibold ${getFieldColorClass(change.field_changed)}`}>
                      {formatFieldName(change.field_changed)}:
                    </span>
                    <span className="text-red-400 line-through">
                      {formatValue(change.field_changed, change.old_value)}
                    </span>
                    <ArrowRight className="w-4 h-4 text-[var(--text-muted)]" />
                    <span className="text-green-400 font-semibold">
                      {formatValue(change.field_changed, change.new_value)}
                    </span>
                  </div>
                </div>
                
                <div className="md:text-right shrink-0">
                  <div className="text-sm text-amber-400">{getRelativeTime(change.changed_at)}</div>
                  <div className="text-xs text-[var(--text-muted)]">
                    {new Date(change.changed_at).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : !loading ? (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-8 text-center">
          <Filter className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4" />
          <p className="text-[var(--text-muted)]">No changes recorded yet.</p>
          <p className="text-[var(--text-muted)] text-sm mt-2">
            Start editing cards to see their change history here!
          </p>
        </div>
      ) : (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 animate-spin mx-auto text-teal-400 border-2 border-teal-400 border-t-transparent rounded-full"></div>
        </div>
      )}
    </div>
  );
};

export default ChangeLogTab;
