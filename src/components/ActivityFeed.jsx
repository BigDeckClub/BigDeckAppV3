import React, { useState, useEffect, useCallback } from 'react';
import { Activity, Package, FileUp, Trash2, FolderPlus, LayoutGrid, RefreshCw } from 'lucide-react';
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
 * Get icon for activity type
 */
const getActivityIcon = (activityType) => {
  const icons = {
    card_added: Package,
    import_created: FileUp,
    import_completed: FileUp,
    deck_created: LayoutGrid,
    deck_deleted: LayoutGrid,
    folder_created: FolderPlus,
    trash_operation: Trash2
  };
  const IconComponent = icons[activityType] || Activity;
  return IconComponent;
};

/**
 * Get color class for activity type
 */
const getActivityColor = (activityType) => {
  const colors = {
    card_added: 'text-green-400 bg-green-400/10',
    import_created: 'text-blue-400 bg-blue-400/10',
    import_completed: 'text-teal-400 bg-teal-400/10',
    deck_created: 'text-purple-400 bg-purple-400/10',
    deck_deleted: 'text-red-400 bg-red-400/10',
    folder_created: 'text-amber-400 bg-amber-400/10',
    trash_operation: 'text-red-400 bg-red-400/10'
  };
  return colors[activityType] || 'text-slate-400 bg-slate-400/10';
};

export const ActivityFeed = () => {
  const { get } = useApi();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [total, setTotal] = useState(0);

  const activityTypeOptions = [
    { value: 'all', label: 'All Activity' },
    { value: 'card_added', label: 'Cards Added' },
    { value: 'import_created', label: 'Imports Created' },
    { value: 'import_completed', label: 'Imports Completed' },
    { value: 'deck_created', label: 'Decks Created' }
  ];

  const loadActivities = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (filterType !== 'all') {
        params.append('activity_type', filterType);
      }
      const data = await get(`/history/activity?${params.toString()}`);
      setActivities(data.activities || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Failed to load activity feed:', error);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }, [get, filterType]);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3 items-start md:items-end">
        <div className="flex-1">
          <label className="block text-sm text-slate-400 mb-2">Filter by Activity Type</label>
          <select 
            value={filterType} 
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white text-sm hover:border-teal-500 transition-colors"
          >
            {activityTypeOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={loadActivities}
          disabled={loading}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Results count */}
      <div className="text-sm text-slate-400">
        {loading ? 'Loading...' : `${total} activit${total !== 1 ? 'ies' : 'y'} recorded`}
      </div>

      {/* Activity List */}
      {!loading && activities.length > 0 ? (
        <div className="space-y-3 max-h-[500px] overflow-y-auto">
          {activities.map((activity) => {
            const IconComponent = getActivityIcon(activity.activity_type);
            const colorClass = getActivityColor(activity.activity_type);
            
            return (
              <div 
                key={activity.id}
                className="flex items-start gap-4 p-4 bg-gradient-to-r from-slate-800 to-slate-900 border border-slate-600 rounded-lg hover:border-teal-500 transition-colors"
              >
                <div className={`p-2 rounded-lg shrink-0 ${colorClass}`}>
                  <IconComponent className="w-5 h-5" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white truncate">{activity.title}</div>
                  {activity.description && (
                    <div className="text-sm text-slate-400 mt-1">{activity.description}</div>
                  )}
                </div>
                
                <div className="text-right shrink-0">
                  <div className="text-sm text-amber-400">{getRelativeTime(activity.created_at)}</div>
                </div>
              </div>
            );
          })}
        </div>
      ) : !loading ? (
        <div className="bg-slate-800 border border-slate-600 rounded-lg p-8 text-center">
          <Activity className="w-12 h-12 text-slate-500 mx-auto mb-4" />
          <p className="text-slate-400">No recent activity.</p>
          <p className="text-slate-500 text-sm mt-2">
            Your activity will appear here as you use the app.
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

export default ActivityFeed;
