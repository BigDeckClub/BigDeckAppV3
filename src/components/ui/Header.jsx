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
import ThemeToggle from './ThemeToggle';

/**
 * Navigation items configuration
 */
const NAV_ITEMS = [
  { id: 'inventory', icon: Layers, label: 'Inventory', shortcut: '1' },
  { id: 'imports', icon: Download, label: 'Add Cards', shortcut: '2' },
  { id: 'analytics', icon: BarChart3, label: 'Analytics', shortcut: '3' },
  { id: 'decks', icon: BookOpen, label: 'Decks', shortcut: '4' },
  { id: 'sales', icon: TrendingUp, label: 'Sales', shortcut: '5' },
];

/**
 * Logo component with BigDeck branding
 */
const Logo = memo(function Logo() {
  return (
    <div className="flex items-center gap-3 select-none group">
      {/* MTG-inspired card stack icon */}
      <div className="relative w-8 h-8 transition-transform duration-500 ease-out group-hover:rotate-12 group-hover:scale-110">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-lg transform rotate-6 opacity-60 transition-transform duration-300 group-hover:rotate-12" />
        <div className="absolute inset-0 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg transform -rotate-3 opacity-80 transition-transform duration-300 group-hover:-rotate-6" />
        <div className="absolute inset-0 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-lg flex items-center justify-center shadow-lg shadow-teal-500/20">
          <span className="text-slate-900 font-extrabold text-xs tracking-tighter">BD</span>
        </div>
      </div>
      <span className="hidden sm:block text-xl font-heading font-bold text-gradient tracking-tight">
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
      className="flex items-center gap-2 px-3 py-1.5 text-sm text-ui-muted bg-ui-card hover:bg-ui-surface border border-ui-border hover:border-ui-primary rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ui-primary"
      aria-label="Open command palette (Cmd+K)"
    >
      <Search className="w-4 h-4" />
      <span className="hidden md:inline text-[var(--text-muted)]">Search...</span>
      <kbd className="hidden md:flex items-center gap-0.5 px-1.5 py-0.5 text-xs font-mono text-ui-muted bg-ui-surface border border-ui-border rounded">
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
        relative flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm transition-all duration-300 ease-out
        focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bda-primary)]
        ${isActive
          ? 'text-[var(--bda-primary)] bg-[var(--bda-primary)]/10 shadow-[0_0_15px_-5px_var(--bda-primary)]'
          : 'text-[var(--text-muted)] hover:text-[var(--bda-text)] hover:bg-white/5'
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
          ? 'text-ui-primary bg-ui-primary/10'
          : 'text-ui-muted hover:text-ui-heading'
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
      <header className="hidden md:block sticky top-0 z-50 glass-panel border-b border-[var(--glass-border)] transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-20">
            {/* Left: Logo */}
            <Logo />

            {/* Center: Navigation - Floating Pill */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <nav className="flex items-center gap-1 p-1 rounded-2xl bg-[var(--surface)]/50 backdrop-blur-md border border-[var(--border)] shadow-lg shadow-black/5" role="navigation">
                {NAV_ITEMS.map((item) => (
                  <NavButton
                    key={item.id}
                    item={item}
                    isActive={activeTab === item.id}
                    onClick={() => handleNavClick(item.id)}
                  />
                ))}
              </nav>
            </div>

            {/* Right: Command Palette + User */}
            <div className="flex items-center gap-4">
              <CommandPaletteTrigger onClick={onOpenCommandPalette} />
              <ThemeToggle />
              <div className="pl-2 border-l border-[var(--border)]">
                <UserDropdown setActiveTab={setActiveTab} activeTab={activeTab} />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Header (top bar with logo + search) */}
      <header className="md:hidden sticky top-0 z-50 bg-ui-surface backdrop-blur-xl border-b border-ui-border safe-area-top">
        <div className="flex items-center justify-between px-4 h-14">
          <Logo />
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenCommandPalette}
              className="p-2 text-[var(--text-muted)] hover:text-white rounded-lg hover:bg-[var(--surface)]"
              aria-label="Open search"
            >
              <Search className="w-5 h-5" />
            </button>
            <ThemeToggle />
            <UserDropdown setActiveTab={setActiveTab} activeTab={activeTab} />
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-ui-surface backdrop-blur-xl border-t border-ui-border safe-area-bottom"
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
