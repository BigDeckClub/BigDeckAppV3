/**
 * CommandPalette - Global command palette (Cmd+K) for quick actions and navigation
 * @module components/ui/CommandPalette
 */

import React, { memo, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Search,
  Layers,
  Download,
  BarChart3,
  BookOpen,
  TrendingUp,
  Settings,
  Plus,
  FileText,
  CreditCard,
  HelpCircle,
  ArrowRight,
  Command,
  Hash,
} from 'lucide-react';

/**
 * Command categories and items
 */
const COMMAND_CATEGORIES = {
  navigation: {
    label: 'Navigation',
    items: [
      { id: 'nav-inventory', label: 'Go to Inventory', icon: Layers, action: 'navigate', target: 'inventory', keywords: ['cards', 'collection'] },
      { id: 'nav-imports', label: 'Go to Add Cards', icon: Download, action: 'navigate', target: 'imports', keywords: ['add', 'upload'] },
      { id: 'nav-analytics', label: 'Go to Analytics', icon: BarChart3, action: 'navigate', target: 'analytics', keywords: ['stats', 'charts'] },
      { id: 'nav-decks', label: 'Go to Decks', icon: BookOpen, action: 'navigate', target: 'decks', keywords: ['build', 'commander'] },
      { id: 'nav-sales', label: 'Go to Sales', icon: TrendingUp, action: 'navigate', target: 'sales', keywords: ['sold', 'history'] },
      { id: 'nav-settings', label: 'Go to Settings', icon: Settings, action: 'navigate', target: 'settings', keywords: ['preferences', 'config'] },
    ],
  },
  actions: {
    label: 'Quick Actions',
    items: [
      { id: 'action-add-cards', label: 'Add Cards (Rapid Entry)', icon: Plus, action: 'navigate', target: 'imports', keywords: ['new', 'quick'] },
      { id: 'action-import-deck', label: 'Import Decklist', icon: FileText, action: 'navigate', target: 'imports', keywords: ['paste', 'upload'] },
      { id: 'action-buy-missing', label: 'Buy Missing Cards', icon: CreditCard, action: 'custom', handler: 'openBuyMissing', keywords: ['purchase', 'shop'] },
    ],
  },
  help: {
    label: 'Help',
    items: [
      { id: 'help-tutorial', label: 'View Tutorial', icon: HelpCircle, action: 'custom', handler: 'showTutorial', keywords: ['guide', 'how'] },
      { id: 'help-shortcuts', label: 'Keyboard Shortcuts', icon: Command, action: 'custom', handler: 'showShortcuts', keywords: ['keys', 'hotkeys'] },
    ],
  },
};

/**
 * Flatten all commands for searching
 */
const ALL_COMMANDS = Object.values(COMMAND_CATEGORIES).flatMap(cat => cat.items);

/**
 * Command item component
 */
const CommandItem = memo(function CommandItem({ command, isSelected, onClick, onMouseEnter }) {
  const Icon = command.icon;

  return (
    <button
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={`
        w-full flex items-center gap-3 px-4 py-3 text-left transition-colors duration-100
        ${isSelected
          ? 'bg-[var(--bda-primary)]/10 text-[var(--bda-primary)]'
          : 'text-[var(--text-muted)] hover:bg-[var(--surface)]'
        }
      `}
      role="option"
      aria-selected={isSelected}
    >
      <Icon className={`w-5 h-5 ${isSelected ? 'text-[var(--bda-primary)]' : 'text-[var(--text-muted)]'}`} />
      <span className="flex-1 font-medium">{command.label}</span>
      {isSelected && (
        <ArrowRight className="w-4 h-4 text-[var(--bda-primary)]" />
      )}
    </button>
  );
});

CommandItem.propTypes = {
  command: PropTypes.shape({
    id: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    icon: PropTypes.elementType.isRequired,
  }).isRequired,
  isSelected: PropTypes.bool.isRequired,
  onClick: PropTypes.func.isRequired,
  onMouseEnter: PropTypes.func.isRequired,
};

/**
 * Main CommandPalette component
 */
export const CommandPalette = memo(function CommandPalette({
  isOpen,
  onClose,
  onNavigate,
  onShowTutorial,
  onShowShortcuts,
}) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Filter commands based on query
  const filteredCommands = useMemo(() => {
    if (!query.trim()) {
      return ALL_COMMANDS;
    }

    const lowerQuery = query.toLowerCase();
    return ALL_COMMANDS.filter(cmd => {
      const labelMatch = cmd.label.toLowerCase().includes(lowerQuery);
      const keywordMatch = cmd.keywords?.some(kw => kw.toLowerCase().includes(lowerQuery));
      return labelMatch || keywordMatch;
    });
  }, [query]);

  // Group filtered commands by category
  const groupedCommands = useMemo(() => {
    const groups = [];

    for (const [key, category] of Object.entries(COMMAND_CATEGORIES)) {
      const items = category.items.filter(item =>
        filteredCommands.some(fc => fc.id === item.id)
      );
      if (items.length > 0) {
        groups.push({ key, label: category.label, items });
      }
    }

    return groups;
  }, [filteredCommands]);

  // Execute command
  const executeCommand = useCallback((command) => {
    if (command.action === 'navigate') {
      onNavigate(command.target);
    } else if (command.action === 'custom') {
      switch (command.handler) {
        case 'showTutorial':
          onShowTutorial?.();
          break;
        case 'showShortcuts':
          onShowShortcuts?.();
          break;
        case 'openBuyMissing':
          // Navigate to decks where buy missing is available
          onNavigate('decks');
          break;
        default:
          break;
      }
    }
    onClose();
  }, [onNavigate, onShowTutorial, onShowShortcuts, onClose]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < filteredCommands.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev > 0 ? prev - 1 : filteredCommands.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          executeCommand(filteredCommands[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
      default:
        break;
    }
  }, [filteredCommands, selectedIndex, executeCommand, onClose]);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      // Focus input after a brief delay to ensure modal is mounted
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Keep selected item in view
  useEffect(() => {
    if (listRef.current) {
      const selectedElement = listRef.current.querySelector('[aria-selected="true"]');
      selectedElement?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  // Global keyboard shortcut to open
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        }
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  let flatIndex = 0;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />

      {/* Palette */}
      <div
        className="relative w-full max-w-xl bg-[var(--bg-page)] rounded-xl border border-[var(--border)] shadow-2xl shadow-slate-950/50 overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-[var(--bda-border)]">
          <Search className="w-5 h-5 text-[var(--text-muted)]" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search commands..."
            className="flex-1 bg-transparent text-white text-lg placeholder-slate-500 outline-none"
            aria-label="Search commands"
            aria-controls="command-list"
            aria-activedescendant={filteredCommands[selectedIndex]?.id}
          />
          <kbd className="hidden sm:flex items-center gap-0.5 px-2 py-1 text-xs font-mono text-[var(--text-muted)] bg-[var(--surface)] border border-[var(--border)] rounded">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div
          ref={listRef}
          id="command-list"
          className="max-h-[400px] overflow-y-auto"
          role="listbox"
        >
          {filteredCommands.length === 0 ? (
            <div className="px-4 py-8 text-center text-[var(--text-muted)]">
              No commands found for "{query}"
            </div>
          ) : (
            groupedCommands.map((group) => (
              <div key={group.key}>
                <div className="px-4 py-2 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider bg-[var(--surface)]">
                  {group.label}
                </div>
                {group.items.map((command) => {
                  const currentIndex = flatIndex++;
                  return (
                    <CommandItem
                      key={command.id}
                      command={command}
                      isSelected={currentIndex === selectedIndex}
                      onClick={() => executeCommand(command)}
                      onMouseEnter={() => setSelectedIndex(currentIndex)}
                    />
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--bda-border)] bg-[var(--surface)] text-xs text-[var(--text-muted)]">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-[var(--muted-surface)] rounded text-[var(--text-muted)]">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-[var(--muted-surface)] rounded text-[var(--text-muted)]">↓</kbd>
              <span className="ml-1">navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-[var(--muted-surface)] rounded text-[var(--text-muted)]">↵</kbd>
              <span className="ml-1">select</span>
            </span>
          </div>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-[var(--muted-surface)] rounded text-[var(--text-muted)]">esc</kbd>
            <span className="ml-1">close</span>
          </span>
        </div>
      </div>
    </div>
  );
});

CommandPalette.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onNavigate: PropTypes.func.isRequired,
  onShowTutorial: PropTypes.func,
  onShowShortcuts: PropTypes.func,
};

export default CommandPalette;
