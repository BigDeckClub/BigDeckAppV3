/**
 * Navigation component for desktop and mobile views
 * @module components/Navigation
 */

import React from 'react';
import PropTypes from 'prop-types';
import {
  Layers,
  Download,
  BarChart3,
  BookOpen,
  TrendingUp,
  Settings,
  Moon,
  Sun,
} from 'lucide-react';
import { UserDropdown } from './UserDropdown';
import { useTheme } from '../context/ThemeContext';

/**
 * Navigation items configuration
 */
const NAV_ITEMS = [
  { id: 'inventory', icon: Layers, label: 'Inventory' },
  { id: 'imports', icon: Download, label: 'Imports' },
  { id: 'analytics', icon: BarChart3, label: 'Analytics' },
  { id: 'decks', icon: BookOpen, label: 'Decks' },
  { id: 'sales', icon: TrendingUp, label: 'Sales' },
  { id: 'settings', icon: Settings, label: 'Settings' },
];

/**
 * Desktop navigation items (excludes settings as it's in UserDropdown)
 */
const DESKTOP_NAV_ITEMS = NAV_ITEMS.filter(item => item.id !== 'settings');

/**
 * Desktop navigation button component
 */
function DesktopNavButton({ item, activeTab, setActiveTab }) {
  const Icon = item.icon;
  const isActive = activeTab === item.id;
  return (
    <button
      onClick={() => setActiveTab(item.id)}
      className={`px-4 py-2 rounded-lg transition-all duration-300 font-medium text-sm cursor-pointer border border-transparent
        ${isActive
          ? 'bg-ui-primary text-ui-primary-foreground shadow-lg'
          : 'text-ui-text hover:bg-ui-card hover:shadow-lg'
        }`
      }
    >
      <Icon className="w-5 h-5 inline mr-2" />
      {item.label}
    </button>
  );
}

DesktopNavButton.propTypes = {
  item: PropTypes.shape({
    id: PropTypes.string.isRequired,
    icon: PropTypes.elementType.isRequired,
    label: PropTypes.string.isRequired,
  }).isRequired,
  activeTab: PropTypes.string.isRequired,
  setActiveTab: PropTypes.func.isRequired,
};

/**
 * Mobile navigation button component
 */
function MobileNavButton({ item, activeTab, setActiveTab }) {
  const Icon = item.icon;
  const isActive = activeTab === item.id;
  return (
    <button
      onClick={() => setActiveTab(item.id)}
      className={`flex flex-col items-center justify-center transition-all duration-150 ease-in-out p-2 rounded-lg min-w-[50px] flex-1 max-w-[65px]
        ${isActive
          ? 'text-ui-primary'
          : 'text-ui-muted'
        }`
      }
    >
      <Icon className="w-5 h-5" />
      <span className="text-xs mt-1 font-medium">{item.label}</span>
    </button>
  );
}

MobileNavButton.propTypes = {
  item: PropTypes.shape({
    id: PropTypes.string.isRequired,
    icon: PropTypes.elementType.isRequired,
    label: PropTypes.string.isRequired,
  }).isRequired,
  activeTab: PropTypes.string.isRequired,
  setActiveTab: PropTypes.func.isRequired,
};

/**
 * Main Navigation component with desktop and mobile views
 * 
 * @param {Object} props - Component props
 * @param {string} props.activeTab - Currently active tab ID
 * @param {function} props.setActiveTab - Function to set active tab
 * @param {function} props.onShowTutorial - Function to show tutorial modal
 */
export function Navigation({ activeTab, setActiveTab, onShowTutorial }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="bg-ui-surface border-b border-ui-border sticky top-0 z-[99999] pointer-events-auto shadow-lg isolate hidden md:block">
        <div className="max-w-7xl mx-auto px-4 py-4 app-header flex items-center justify-between">
          <div className="flex gap-2 items-center">
            <button
              onClick={onShowTutorial}
              className="px-3 py-2 text-ui-muted hover:text-ui-primary text-sm font-medium transition"
              title="View tutorial"
            >
              ?
            </button>
            <button
              onClick={toggleTheme}
              className="px-3 py-2 text-ui-muted hover:text-ui-primary text-sm font-medium transition"
              title="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
          <div className="flex gap-2 items-center">
            {DESKTOP_NAV_ITEMS.map((item) => (
              <DesktopNavButton
                key={item.id}
                item={item}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
              />
            ))}
          </div>
          <UserDropdown setActiveTab={setActiveTab} activeTab={activeTab} />
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-ui-surface border-t border-ui-border p-2 md:hidden">
        <div className="flex items-center justify-around w-full">
          {NAV_ITEMS.map((item) => (
            <MobileNavButton
              key={item.id}
              item={item}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
            />
          ))}
        </div>
      </nav>
    </>
  );
}
