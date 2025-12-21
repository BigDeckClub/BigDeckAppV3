/**
 * Navigation component for desktop and mobile views
 * @module components/Navigation
 */

import React, { startTransition } from 'react';
import PropTypes from 'prop-types';
import {
  Layers,
  Download,
  LayoutDashboard,
  BookOpen,
  Settings,
  FileText,
  ShoppingCart,
} from 'lucide-react';
import { UserDropdown } from './UserDropdown';

/**
 * Navigation items configuration
 */
const NAV_ITEMS = [
  { id: 'inventory', icon: Layers, label: 'Inventory' },
  { id: 'imports', icon: Download, label: 'Imports' },
  { id: 'autobuy', icon: ShoppingCart, label: 'Autobuy' },
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'decks', icon: BookOpen, label: 'Decks' },
  { id: 'templates', icon: FileText, label: 'Templates' },
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
  return (
    <button
      onClick={() => startTransition(() => setActiveTab(item.id))}
      className={`px-4 py-2 nav-tab inactive ${activeTab === item.id ? 'btn-primary' : 'hover:shadow-lg'}`}
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
  return (
    <button
      onClick={() => startTransition(() => setActiveTab(item.id))}
      className={`mobile-nav-item ${activeTab === item.id ? 'active' : 'inactive'}`}
    >
      <Icon className="w-5 h-5 mobile-nav-icon" />
      <span className="mobile-nav-label">{item.label}</span>
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
  return (
    <>
      {/* Desktop Navigation */}
      <nav className="bg-[var(--bda-surface)] border-b border-[var(--bda-border)] sticky top-0 z-50 shadow-xl shadow-black/20">
        <div className="max-w-7xl mx-auto px-4 py-4 app-header flex items-center justify-between">
          <div className="desktop-nav flex gap-2 items-center">
            <button
              onClick={onShowTutorial}
              className="px-3 py-2 text-[var(--bda-muted)] hover:text-[var(--bda-primary)] text-sm font-medium transition"
              title="View tutorial"
            >
              ?
            </button>
          </div>
          <div className="desktop-nav flex gap-2 items-center">
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
      <nav className="mobile-nav">
        <div className="mobile-nav-inner">
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

Navigation.propTypes = {
  activeTab: PropTypes.string.isRequired,
  setActiveTab: PropTypes.func.isRequired,
  onShowTutorial: PropTypes.func.isRequired,
};

export default Navigation;
