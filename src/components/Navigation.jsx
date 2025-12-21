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
  Menu,
} from 'lucide-react';
import { UserDropdown } from './UserDropdown';

/**
 * Navigation items configuration
 */
const NAV_ITEMS = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'inventory', icon: Layers, label: 'Inventory' },
  { id: 'decks', icon: BookOpen, label: 'Decks' },
  { id: 'autobuy', icon: ShoppingCart, label: 'Autobuy' },
  { id: 'marketplace', icon: FileText, label: 'Marketplace' },
  { id: 'imports', icon: Download, label: 'Imports' },
  { id: 'settings', icon: Settings, label: 'Settings' },
];

/**
 * Sidebar navigation link component
 */
function SidebarLink({ item, activeTab, setActiveTab }) {
  const Icon = item.icon;
  const isActive = activeTab === item.id;

  return (
    <button
      onClick={() => startTransition(() => setActiveTab(item.id))}
      className={`sidebar-link ${isActive ? 'active' : ''} w-full`}
    >
      <Icon className={`w-5 h-5 ${isActive ? 'text-[var(--primary)]' : ''}`} />
      <span className="font-medium">{item.label}</span>
    </button>
  );
}

SidebarLink.propTypes = {
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
      onClick={() => startTransition(() => setActiveTab(item.id))}
      className={`mobile-nav-item ${isActive ? 'active' : ''}`}
    >
      <Icon className="w-6 h-6 mobile-nav-icon" />
      <span className="mobile-nav-label">{item.label}</span>
      {/* Active state indicator is handled by CSS ::after pseudo-element */}
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
 * Main Navigation component with Sidebar (Desktop) and Bottom Bar (Mobile)
 */
export function Navigation({ activeTab, setActiveTab }) {
  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 fixed left-0 top-0 bottom-0 glass-panel border-r border-[var(--glass-border)] z-50">
        <div className="p-6 flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--primary)] to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <span className="text-white font-bold text-lg">B</span>
          </div>
          <h1 className="text-xl font-heading font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
            BigDeck
          </h1>
        </div>

        <div className="flex-1 px-3 space-y-1 overflow-y-auto custom-scrollbar">
          <div className="px-3 py-2 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">
            Menu
          </div>
          {NAV_ITEMS.map((item) => (
            <SidebarLink
              key={item.id}
              item={item}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
            />
          ))}
        </div>

        <div className="p-4 border-t border-[var(--glass-border)] bg-black/20">
          <UserDropdown setActiveTab={setActiveTab} activeTab={activeTab} />
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-nav md:hidden">
        <div className="mobile-nav-inner">
          {NAV_ITEMS.slice(0, 5).map((item) => (
            <MobileNavButton
              key={item.id}
              item={item}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
            />
          ))}
          <button
            onClick={() => setActiveTab('settings')}
            className={`mobile-nav-item ${activeTab === 'settings' ? 'active' : ''}`}
          >
            <Menu className="w-6 h-6 mobile-nav-icon" />
            <span className="mobile-nav-label">More</span>
          </button>
        </div>
      </nav>
    </>
  );
}

Navigation.propTypes = {
  activeTab: PropTypes.string.isRequired,
  setActiveTab: PropTypes.func.isRequired,
};

export default Navigation;
