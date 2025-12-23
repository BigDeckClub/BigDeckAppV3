import React, { startTransition, useState } from 'react';
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
  X,
  Store,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { UserDropdown } from './UserDropdown';

/**
 * Navigation items configuration
 */
const NAV_ITEMS = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'imports', icon: Download, label: 'Add Cards' },
  { id: 'inventory', icon: Layers, label: 'Inventory' },
  { id: 'decks', icon: BookOpen, label: 'Decks' },
  { id: 'ai', icon: Sparkles, label: 'Orb' },
  { id: 'autobuy', icon: ShoppingCart, label: 'Autobuy' },
  { id: 'marketplace', icon: Store, label: 'Marketplace' },
];

/**
 * Sidebar navigation link component
 */
function SidebarLink({ item, activeTab, setActiveTab, isCollapsed }) {
  const Icon = item.icon;
  const isActive = activeTab === item.id;

  return (
    <button
      onClick={() => startTransition(() => setActiveTab(item.id))}
      className={`
        sidebar-link group relative w-full transition-all duration-300 overflow-hidden
        ${isCollapsed ? 'justify-center px-2' : 'px-4'} 
        ${isActive
          ? 'bg-gradient-to-br from-[var(--primary)] to-purple-600 text-white shadow-lg shadow-indigo-500/25 scale-[1.02] font-semibold'
          : 'text-[var(--text-muted)] hover:text-white hover:bg-white/5'
        }
      `}
      title={isCollapsed ? item.label : ''}
    >
      <Icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'} ${isActive ? 'text-white' : ''}`} />
      {!isCollapsed && (
        <span className={`transition-opacity whitespace-nowrap overflow-hidden ${isActive ? 'opacity-100' : 'opacity-80 group-hover:opacity-100'}`}>
          {item.label}
        </span>
      )}

      {/* Shine effect on active */}
      {isActive && (
        <div className="absolute inset-0 -translate-x-full group-hover:animate-shine bg-gradient-to-r from-transparent via-white/10 to-transparent z-10" />
      )}

      {/* Tooltip for collapsed state */}
      {isCollapsed && (
        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2 py-1 bg-black/90 backdrop-blur-sm border border-white/10 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap shadow-xl">
          {item.label}
        </div>
      )}
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
  isCollapsed: PropTypes.bool,
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
export function Navigation({ activeTab, setActiveTab, isCollapsed, onToggleCollapse }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`
          hidden md:flex flex-col fixed left-0 top-0 bottom-0 
          bg-black/20 backdrop-blur-xl border-r border-white/5 z-50
          transition-all duration-300 ease-in-out
          ${isCollapsed ? 'w-20' : 'w-64'}
        `}
      >
        <div className={`p-6 flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} mb-2 relative`}>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--primary)] to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 flex-shrink-0">
            <span className="text-white font-bold text-lg">B</span>
          </div>
          {!isCollapsed && (
            <h1 className="text-xl font-heading font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 animate-fade-in whitespace-nowrap overflow-hidden">
              BigDeck
            </h1>
          )}
        </div>

        {/* Toggle Button */}
        <button
          onClick={onToggleCollapse}
          className="absolute -right-3 top-8 w-6 h-6 bg-[var(--surface)] border border-[var(--border)] rounded-full flex items-center justify-center text-[var(--text-muted)] hover:text-white hover:border-[var(--primary)] transition-all z-50 shadow-md"
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <div className="flex-1 px-3 space-y-1 overflow-y-auto custom-scrollbar overflow-x-hidden mt-4">
          <div className={`px-3 py-2 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1 ${isCollapsed ? 'text-center' : ''}`}>
            {isCollapsed ? '---' : 'Menu'}
          </div>
          {NAV_ITEMS.map((item) => (
            <SidebarLink
              key={item.id}
              item={item}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              isCollapsed={isCollapsed}
            />
          ))}
        </div>

        <div className="p-4 border-t border-[var(--glass-border)] bg-black/20">
          <UserDropdown
            setActiveTab={setActiveTab}
            activeTab={activeTab}
            direction="up"
            isCollapsed={isCollapsed}
          />
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-nav md:hidden">
        <div className="mobile-nav-inner">
          {/* First 4 items */}
          {NAV_ITEMS.slice(0, 4).map((item) => (
            <MobileNavButton
              key={item.id}
              item={item}
              activeTab={activeTab}
              setActiveTab={(id) => {
                setActiveTab(id);
                setIsMobileMenuOpen(false);
              }}
            />
          ))}

          {/* More Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`mobile-nav-item ${isMobileMenuOpen || (!NAV_ITEMS.slice(0, 4).find(i => i.id === activeTab)) ? 'active' : ''}`}
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6 mobile-nav-icon" />
            ) : (
              <Menu className="w-6 h-6 mobile-nav-icon" />
            )}
            <span className="mobile-nav-label">{isMobileMenuOpen ? 'Close' : 'More'}</span>
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setIsMobileMenuOpen(false)}>
          <div
            className="absolute bottom-[calc(env(safe-area-inset-bottom)+70px)] right-4 p-4 min-w-[200px] glass-panel rounded-xl flex flex-col gap-2 shadow-2xl animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {NAV_ITEMS.slice(4).map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    startTransition(() => setActiveTab(item.id));
                    setIsMobileMenuOpen(false);
                  }}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${activeTab === item.id
                    ? 'bg-[var(--primary)]/20 text-[var(--primary)]'
                    : 'hover:bg-white/5 text-[var(--text-main)]'
                    }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

Navigation.propTypes = {
  activeTab: PropTypes.string.isRequired,
  setActiveTab: PropTypes.func.isRequired,
};

export default Navigation;
