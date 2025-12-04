import React, { memo, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Home, ChevronRight, Folder, Layers } from 'lucide-react';

/**
 * Truncates a string to a maximum length, adding ellipsis if needed
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length before truncation
 * @returns {string} - Truncated text
 */
const truncateText = (text, maxLength = 20) => {
  if (!text || text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}…`;
};

/**
 * Breadcrumb - Navigation breadcrumb for inventory views
 * Displays current location path and allows navigation to parent levels
 */
export const Breadcrumb = memo(function Breadcrumb({
  navigationPath,
  onNavigate
}) {
  // Determine icon for each segment based on its type
  const getSegmentIcon = useMemo(() => (segment, isFirst) => {
    if (isFirst || segment.tab === 'all') {
      return <Home className="w-4 h-4" />;
    }
    if (segment.tab.startsWith('deck-')) {
      return <Layers className="w-4 h-4" />;
    }
    return <Folder className="w-4 h-4" />;
  }, []);

  if (!navigationPath || navigationPath.length === 0) {
    return null;
  }

  return (
    <nav 
      aria-label="Breadcrumb"
      className="bg-slate-800/50 rounded-lg px-3 py-2 mb-4 border border-slate-700 overflow-x-auto"
    >
      <ol className="flex items-center gap-1 min-w-0 text-sm">
        {navigationPath.map((segment, index) => {
          const isLast = index === navigationPath.length - 1;
          const isFirst = index === 0;
          
          return (
            <li key={segment.tab} className="flex items-center gap-1 min-w-0">
              {/* Separator (except for first item) */}
              {!isFirst && (
                <ChevronRight 
                  className="w-4 h-4 text-slate-500 flex-shrink-0" 
                  aria-hidden="true"
                />
              )}
              
              {isLast ? (
                /* Current page - not clickable */
                <span 
                  className="flex items-center gap-1.5 text-slate-300 truncate"
                  aria-current="page"
                >
                  {getSegmentIcon(segment, isFirst)}
                  <span className="truncate" title={segment.label}>
                    {truncateText(segment.label)}
                  </span>
                </span>
              ) : (
                /* Clickable navigation link */
                <button
                  type="button"
                  onClick={() => onNavigate(segment.tab)}
                  className="flex items-center gap-1.5 text-teal-400 hover:text-teal-300 transition-colors truncate"
                >
                  {getSegmentIcon(segment, isFirst)}
                  <span className="truncate" title={segment.label}>
                    {truncateText(segment.label)}
                  </span>
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
});

Breadcrumb.propTypes = {
  navigationPath: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      tab: PropTypes.string.isRequired
    })
  ).isRequired,
  onNavigate: PropTypes.func.isRequired
};

export default Breadcrumb;
