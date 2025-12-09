/**
 * Header - Main application header with logo, navigation, and command palette
 * @module components/ui/Header
 */

import React, { memo, startTransition } from 'react';
import PropTypes from 'prop-types';
import {
  Layers,
  Download,
  BarChart3,
  BookOpen,
  TrendingUp,
  Settings,
  Search,
  Command,
  Menu,
  X,
} from 'lucide-react';
import { UserDropdown } from '../UserDropdown';

/**
 * Navigation items configuration
 */
const NAV_ITEMS = [
  { id: 'inventory', icon: Layers, label: 'Inventory', shortcut: '1' },
  { id: 'imports', icon: Download, label: 'Imports', shortcut: '2' },
  { id: 'analytics', icon: BarChart3, label: 'Analytics', shortcut: '3' },
  { id: 'decks', icon: BookOpen, label: 'Decks', shortcut: '4' },
  { id: 'sales', icon: TrendingUp, label: 'Sales', shortcut: '5' },
];

/**
 * Logo component with BigDeck branding
 */
const Logo = memo(function Logo() {
  return (
    <div className="flex items-center gap-2">
      {/* MTG-inspired card stack icon */}
      <div className="relative w-8 h-8">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-lg transform rotate-6 opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg transform -rotate-3 opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-lg flex items-center justify-center">
          <span className="text-slate-900 font-black text-sm">BD</span>
        </div>
      </div>
      <span className="hidden sm:block text-lg font-bold bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
        BigDeck
      </span>
    </div>
  );
});

/**
 * Command palette trigger button
 */
const CommandPaletteTrigger = memo(function CommandPaletteTrigger({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-400 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 hover:border-slate-600 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent/50"
      aria-label="Open command palette (Cmd+K)"
    >
      <Search className="w-4 h-4" />
      <span className="hidden md:inline text-slate-500">Search...</span>
      <kbd className="hidden md:flex items-center gap-0.5 px-1.5 py-0.5 text-xs font-mono text-slate-500 bg-slate-900/50 border border-slate-700 rounded">
        <Command className="w-3 h-3" />
        <span>K</span>
      </kbd>
    </button>
  );
});

CommandPaletteTrigger.propTypes = {
  onClick: PropTypes.func.isRequired,
};

/**
 * Desktop navigation button
 */
const NavButton = memo(function NavButton({ item, isActive, onClick }) {
  const Icon = item.icon;

  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm transition-all duration-200
        focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50
        ${isActive
          ? 'bg-gradient-to-r from-teal-500/20 to-cyan-500/20 text-teal-400 border border-teal-500/30'
          : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border border-transparent'
        }
      `}
      aria-current={isActive ? 'page' : undefined}
    >
      <Icon className="w-4 h-4" />
      <span className="hidden lg:inline">{item.label}</span>
    </button>
  );
});

NavButton.propTypes = {
  item: PropTypes.shape({
    id: PropTypes.string.isRequired,
    icon: PropTypes.elementType.isRequired,
    label: PropTypes.string.isRequired,
  }).isRequired,
  isActive: PropTypes.bool.isRequired,
  onClick: PropTypes.func.isRequired,
};

/**
 * Mobile navigation button (bottom bar)
 */
const MobileNavButton = memo(function MobileNavButton({ item, isActive, onClick }) {
  const Icon = item.icon;

  return (
    <button
      onClick={onClick}
      className={`
        flex flex-col items-center justify-center py-2 px-3 flex-1 max-w-[70px] rounded-lg transition-all duration-150
        ${isActive
          ? 'text-teal-400 bg-teal-500/10'
          : 'text-slate-500 hover:text-slate-300'
        }
      `}
      aria-current={isActive ? 'page' : undefined}
    >
      <Icon className="w-5 h-5" />
      <span className="text-[10px] mt-1 font-medium">{item.label}</span>
    </button>
  );
});

MobileNavButton.propTypes = {
  item: PropTypes.shape({
    id: PropTypes.string.isRequired,
    icon: PropTypes.elementType.isRequired,
    label: PropTypes.string.isRequired,
  }).isRequired,
  isActive: PropTypes.bool.isRequired,
  onClick: PropTypes.func.isRequired,
};

/**
 * Main Header component
 */
export const Header = memo(function Header({
  activeTab,
  setActiveTab,
  onOpenCommandPalette,
  onShowTutorial,
}) {
  const handleNavClick = (tabId) => {
    startTransition(() => {
      setActiveTab(tabId);
    });
  };

  return (
    <>
      {/* Desktop Header */}
      <header className="hidden md:block sticky top-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Left: Logo */}
            <Logo />

            {/* Center: Navigation */}
            <nav className="flex items-center gap-1" role="navigation" aria-label="Main navigation">
              {NAV_ITEMS.map((item) => (
                <NavButton
                  key={item.id}
                  item={item}
                  isActive={activeTab === item.id}
                  onClick={() => handleNavClick(item.id)}
                />
              ))}
            </nav>

            {/* Right: Command Palette + User */}
            <div className="flex items-center gap-3">
              <CommandPaletteTrigger onClick={onOpenCommandPalette} />
              <button
                onClick={onShowTutorial}
                className="p-2 text-slate-400 hover:text-teal-400 rounded-lg hover:bg-slate-800/50 transition-colors"
                title="Help & Tutorial"
                aria-label="Open help and tutorial"
              >
                <span className="text-lg font-medium">?</span>
              </button>
              <UserDropdown setActiveTab={setActiveTab} activeTab={activeTab} />
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Header (top bar with logo + search) */}
      <header className="md:hidden sticky top-0 z-50 bg-slate-900/95 backdrop-blur-xl border-b border-slate-800 safe-area-top">
        <div className="flex items-center justify-between px-4 h-14">
          <Logo />
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenCommandPalette}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/50"
              aria-label="Open search"
            >
              <Search className="w-5 h-5" />
            </button>
            <UserDropdown setActiveTab={setActiveTab} activeTab={activeTab} />
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800 safe-area-bottom"
        role="navigation"
        aria-label="Mobile navigation"
      >
        <div className="flex items-center justify-around px-2 py-1">
          {NAV_ITEMS.map((item) => (
            <MobileNavButton
              key={item.id}
              item={item}
              isActive={activeTab === item.id}
              onClick={() => handleNavClick(item.id)}
            />
          ))}
          <MobileNavButton
            item={{ id: 'settings', icon: Settings, label: 'Settings' }}
            isActive={activeTab === 'settings'}
            onClick={() => handleNavClick('settings')}
          />
        </div>
      </nav>
    </>
  );
});

Header.propTypes = {
  activeTab: PropTypes.string.isRequired,
  setActiveTab: PropTypes.func.isRequired,
  onOpenCommandPalette: PropTypes.func.isRequired,
  onShowTutorial: PropTypes.func.isRequired,
};

export default Header;
