import React, { useState, useEffect, useCallback } from 'react';
import { Shield, FileUp, Trash2, LayoutGrid, FolderPlus, Package, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import PropTypes from 'prop-types';
import { useApi } from '../hooks/useApi';

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
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(date).toLocaleDateString();
};

/**
 * Get icon for action type
 */
const getActionIcon = (actionType) => {
  const icons = {
    bulk_import: FileUp,
    import_completed: FileUp,
    trash_empty: Trash2,
    item_deleted: Trash2,
    deck_created: LayoutGrid,
    deck_deleted: LayoutGrid,
    folder_created: FolderPlus,
    bulk_folder_move: FolderPlus
  };
  const IconComponent = icons[actionType] || Package;
  return IconComponent;
};

/**
 * Get color class for action type
 */
const getActionColor = (actionType) => {
  const colors = {
    bulk_import: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
    import_completed: 'text-teal-400 bg-teal-400/10 border-teal-400/30',
    trash_empty: 'text-red-400 bg-red-400/10 border-red-400/30',
    item_deleted: 'text-red-400 bg-red-400/10 border-red-400/30',
    deck_created: 'text-purple-400 bg-purple-400/10 border-purple-400/30',
    deck_deleted: 'text-orange-400 bg-orange-400/10 border-orange-400/30',
    folder_created: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
    bulk_folder_move: 'text-amber-400 bg-amber-400/10 border-amber-400/30'
  };
  return colors[actionType] || 'text-slate-400 bg-slate-400/10 border-slate-400/30';
};

/**
 * Format action type for display
 */
const formatActionType = (actionType) => {
  const labels = {
    bulk_import: 'Bulk Import',
    import_completed: 'Import Completed',
    trash_empty: 'Trash Emptied',
    item_deleted: 'Item Deleted',
    deck_created: 'Deck Created',
    deck_deleted: 'Deck Deleted',
    folder_created: 'Folder Created',
    bulk_folder_move: 'Bulk Folder Move'
  };
  return labels[actionType] || actionType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};

/**
 * Audit entry with expandable metadata
 */
const AuditEntry = ({ entry }) => {
  const [expanded, setExpanded] = useState(false);
  const IconComponent = getActionIcon(entry.action_type);
  const colorClass = getActionColor(entry.action_type);
  
  const metadata = entry.metadata || {};
  const hasMetadata = Object.keys(metadata).length > 0;
  
  return (
    <div className={`border rounded-lg overflow-hidden ${colorClass}`}>
      <div 
        className={`flex items-start gap-4 p-4 cursor-pointer hover:bg-white/5 transition-colors ${hasMetadata ? '' : 'cursor-default'}`}
        onClick={() => hasMetadata && setExpanded(!expanded)}
      >
        <div className={`p-2 rounded-lg shrink-0 ${colorClass}`}>
          <IconComponent className="w-5 h-5" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-700/50 text-slate-300">
              {formatActionType(entry.action_type)}
            </span>
          </div>
          <div className="font-medium text-white mt-1">{entry.description || 'No description'}</div>
          {entry.entity_type && (
            <div className="text-xs text-slate-500 mt-1">
              {entry.entity_type.charAt(0).toUpperCase() + entry.entity_type.slice(1)}
              {entry.entity_id && ` #${entry.entity_id}`}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right">
            <div className="text-sm text-amber-400">{getRelativeTime(entry.created_at)}</div>
            <div className="text-xs text-slate-500">
              {new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
          {hasMetadata && (
            <div className="text-slate-500">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          )}
        </div>
      </div>
      
      {expanded && hasMetadata && (
        <div className="border-t border-slate-700 bg-slate-900/50 p-4">
          <div className="text-xs text-slate-400 font-medium mb-2">Details</div>
          <div className="space-y-1">
            {Object.entries(metadata).map(([key, value]) => (
              <div key={key} className="flex gap-2 text-sm">
                <span className="text-slate-500">{key.replace(/_/g, ' ')}:</span>
                <span className="text-slate-300">
                  {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

AuditEntry.propTypes = {
  entry: PropTypes.shape({
    id: PropTypes.number.isRequired,
    action_type: PropTypes.string.isRequired,
    description: PropTypes.string,
    entity_type: PropTypes.string,
    entity_id: PropTypes.number,
    metadata: PropTypes.object,
    created_at: PropTypes.string.isRequired
  }).isRequired
};

export const AuditLog = () => {
  const { get } = useApi();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [total, setTotal] = useState(0);

  const actionTypeOptions = [
    { value: 'all', label: 'All Actions' },
    { value: 'bulk_import', label: 'Bulk Imports' },
    { value: 'import_completed', label: 'Imports Completed' },
    { value: 'trash_empty', label: 'Trash Operations' },
    { value: 'item_deleted', label: 'Item Deletions' }
  ];

  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (filterType !== 'all') {
        params.append('action_type', filterType);
      }
      const data = await get(`/history/audit?${params.toString()}`);
      setEntries(data.entries || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Failed to load audit log:', error);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [get, filterType]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3 items-start md:items-end">
        <div className="flex-1">
          <label className="block text-sm text-slate-400 mb-2">Filter by Action Type</label>
          <select 
            value={filterType} 
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white text-sm hover:border-teal-500 transition-colors"
          >
            {actionTypeOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={loadEntries}
          disabled={loading}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Results count */}
      <div className="text-sm text-slate-400">
        {loading ? 'Loading...' : `${total} audit entr${total !== 1 ? 'ies' : 'y'} recorded`}
      </div>

      {/* Audit List */}
      {!loading && entries.length > 0 ? (
        <div className="space-y-3 max-h-[500px] overflow-y-auto">
          {entries.map((entry) => (
            <AuditEntry key={entry.id} entry={entry} />
          ))}
        </div>
      ) : !loading ? (
        <div className="bg-slate-800 border border-slate-600 rounded-lg p-8 text-center">
          <Shield className="w-12 h-12 text-slate-500 mx-auto mb-4" />
          <p className="text-slate-400">No audit entries recorded.</p>
          <p className="text-slate-500 text-sm mt-2">
            System actions will be logged here for your reference.
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

AuditLog.propTypes = {};

export default AuditLog;
