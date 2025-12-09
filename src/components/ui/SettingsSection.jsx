import React, { memo, useState } from 'react';
import PropTypes from 'prop-types';
import { ChevronDown, ChevronRight } from 'lucide-react';

/**
 * SettingItem - Individual setting row with label, description, and control
 */
const SettingItem = memo(function SettingItem({
  label,
  description,
  children,
  disabled = false,
  className = '',
}) {
  return (
    <div
      className={`
        flex items-center justify-between gap-4 py-3
        ${disabled ? 'opacity-50 pointer-events-none' : ''}
        ${className}
      `}
    >
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-slate-200">
          {label}
        </div>
        {description && (
          <div className="text-xs text-slate-400 mt-0.5">
            {description}
          </div>
        )}
      </div>
      <div className="flex-shrink-0">
        {children}
      </div>
    </div>
  );
});

SettingItem.propTypes = {
  label: PropTypes.string.isRequired,
  description: PropTypes.string,
  children: PropTypes.node.isRequired,
  disabled: PropTypes.bool,
  className: PropTypes.string,
};

/**
 * SettingsGroup - Group of related settings with optional title
 */
const SettingsGroup = memo(function SettingsGroup({
  title,
  children,
  className = '',
}) {
  return (
    <div className={`space-y-1 ${className}`}>
      {title && (
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
          {title}
        </div>
      )}
      <div className="divide-y divide-slate-700/50">
        {children}
      </div>
    </div>
  );
});

SettingsGroup.propTypes = {
  title: PropTypes.string,
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};

/**
 * SettingsSection - Collapsible settings section with header
 */
export const SettingsSection = memo(function SettingsSection({
  title,
  description,
  icon: Icon,
  children,
  defaultExpanded = true,
  collapsible = true,
  badge,
  badgeColor = 'teal',
  disabled = false,
  className = '',
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const badgeColors = {
    teal: 'bg-teal-500/20 text-teal-400',
    blue: 'bg-blue-500/20 text-blue-400',
    purple: 'bg-purple-500/20 text-purple-400',
    amber: 'bg-amber-500/20 text-amber-400',
    red: 'bg-red-500/20 text-red-400',
    green: 'bg-green-500/20 text-green-400',
  };

  const handleToggle = () => {
    if (collapsible && !disabled) {
      setIsExpanded(!isExpanded);
    }
  };

  const handleKeyDown = (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && collapsible && !disabled) {
      e.preventDefault();
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <div
      className={`
        bg-slate-800/50 rounded-xl border border-slate-700/50
        ${disabled ? 'opacity-50' : ''}
        ${className}
      `}
    >
      {/* Header */}
      <div
        role={collapsible ? 'button' : undefined}
        tabIndex={collapsible && !disabled ? 0 : undefined}
        aria-expanded={collapsible ? isExpanded : undefined}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        className={`
          flex items-center gap-3 p-4
          ${collapsible && !disabled ? 'cursor-pointer hover:bg-slate-700/30' : ''}
          ${collapsible ? 'select-none' : ''}
          rounded-t-xl transition-colors
        `}
      >
        {/* Icon */}
        {Icon && (
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500/20 to-cyan-500/20 flex items-center justify-center">
            <Icon className="w-5 h-5 text-teal-400" />
          </div>
        )}

        {/* Title & Description */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-white">
              {title}
            </h3>
            {badge && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeColors[badgeColor]}`}>
                {badge}
              </span>
            )}
          </div>
          {description && (
            <p className="text-sm text-slate-400 mt-0.5">
              {description}
            </p>
          )}
        </div>

        {/* Expand/Collapse Icon */}
        {collapsible && (
          <div className="flex-shrink-0">
            {isExpanded ? (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronRight className="w-5 h-5 text-slate-400" />
            )}
          </div>
        )}
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-slate-700/50">
          <div className="pt-4">
            {children}
          </div>
        </div>
      )}
    </div>
  );
});

SettingsSection.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string,
  icon: PropTypes.elementType,
  children: PropTypes.node.isRequired,
  defaultExpanded: PropTypes.bool,
  collapsible: PropTypes.bool,
  badge: PropTypes.string,
  badgeColor: PropTypes.oneOf(['teal', 'blue', 'purple', 'amber', 'red', 'green']),
  disabled: PropTypes.bool,
  className: PropTypes.string,
};

/**
 * SettingsCard - Simple non-collapsible settings container
 */
export const SettingsCard = memo(function SettingsCard({
  title,
  description,
  icon: Icon,
  children,
  actions,
  className = '',
}) {
  return (
    <div className={`bg-slate-800/50 rounded-xl border border-slate-700/50 ${className}`}>
      {/* Header */}
      {(title || Icon) && (
        <div className="flex items-center justify-between gap-3 p-4 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500/20 to-cyan-500/20 flex items-center justify-center">
                <Icon className="w-5 h-5 text-teal-400" />
              </div>
            )}
            <div>
              {title && (
                <h3 className="text-base font-semibold text-white">
                  {title}
                </h3>
              )}
              {description && (
                <p className="text-sm text-slate-400 mt-0.5">
                  {description}
                </p>
              )}
            </div>
          </div>
          {actions && (
            <div className="flex items-center gap-2">
              {actions}
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        {children}
      </div>
    </div>
  );
});

SettingsCard.propTypes = {
  title: PropTypes.string,
  description: PropTypes.string,
  icon: PropTypes.elementType,
  children: PropTypes.node.isRequired,
  actions: PropTypes.node,
  className: PropTypes.string,
};

// Export sub-components
SettingsSection.Item = SettingItem;
SettingsSection.Group = SettingsGroup;
