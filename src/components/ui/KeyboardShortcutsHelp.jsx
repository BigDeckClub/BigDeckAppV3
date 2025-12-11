/**
 * KeyboardShortcutsHelp - Modal displaying available keyboard shortcuts
 * @module components/ui/KeyboardShortcutsHelp
 */

import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { Keyboard } from 'lucide-react';
import { Modal } from './Modal';
import { formatShortcut } from '../../hooks/useKeyboardShortcuts';

/**
 * Keyboard shortcut badge component
 */
const ShortcutKey = memo(function ShortcutKey({ children }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 bg-[var(--muted-surface)] border border-[var(--border)] rounded-md text-sm font-mono text-slate-200 shadow-sm">
      {children}
    </kbd>
  );
});

ShortcutKey.propTypes = {
  children: PropTypes.node.isRequired,
};

/**
 * Single shortcut row component
 */
const ShortcutRow = memo(function ShortcutRow({ shortcut, description }) {
  const formatted = typeof shortcut === 'string' 
    ? shortcut 
    : formatShortcut(shortcut);
  
  // Split by '+' - formatShortcut now always uses '+' separator
  const parts = formatted.split('+');
  
  return (
    <div className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-b-0">
      <span className="text-[var(--text-muted)]">{description}</span>
      <div className="flex items-center gap-1">
        {parts.map((key, index) => (
          <React.Fragment key={`${key}-${index}`}>
            {index > 0 && <span className="text-[var(--text-muted)] mx-0.5">+</span>}
            <ShortcutKey>{key}</ShortcutKey>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
});

ShortcutRow.propTypes = {
  shortcut: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      ctrlKey: PropTypes.bool,
      shiftKey: PropTypes.bool,
      altKey: PropTypes.bool,
      metaKey: PropTypes.bool,
    }),
  ]).isRequired,
  description: PropTypes.string.isRequired,
};

/**
 * Shortcut category section component
 */
const ShortcutSection = memo(function ShortcutSection({ title, shortcuts }) {
  return (
    <div className="mb-6 last:mb-0">
      <h3 className="text-sm font-semibold text-teal-400 uppercase tracking-wider mb-3">
        {title}
      </h3>
      <div className="bg-[var(--surface)] rounded-lg p-3">
        {shortcuts.map(({ shortcut, description }, index) => (
          <ShortcutRow key={index} shortcut={shortcut} description={description} />
        ))}
      </div>
    </div>
  );
});

ShortcutSection.propTypes = {
  title: PropTypes.string.isRequired,
  shortcuts: PropTypes.arrayOf(
    PropTypes.shape({
      shortcut: PropTypes.oneOfType([PropTypes.string, PropTypes.object]).isRequired,
      description: PropTypes.string.isRequired,
    })
  ).isRequired,
};

/**
 * Available keyboard shortcuts organized by category
 */
const KEYBOARD_SHORTCUTS = [
  {
    title: 'Navigation',
    shortcuts: [
      { shortcut: '/', description: 'Focus search input' },
      { shortcut: { key: 'k', ctrlKey: true }, description: 'Focus search input' },
      { shortcut: 'Esc', description: 'Close modal / Clear search' },
    ],
  },
  {
    title: 'Help',
    shortcuts: [
      { shortcut: '?', description: 'Show keyboard shortcuts' },
    ],
  },
];

/**
 * KeyboardShortcutsHelp - Modal component displaying all available keyboard shortcuts
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onClose - Callback to close the modal
 * 
 * @example
 * <KeyboardShortcutsHelp 
 *   isOpen={showShortcutsHelp} 
 *   onClose={() => setShowShortcutsHelp(false)} 
 * />
 */
export const KeyboardShortcutsHelp = memo(function KeyboardShortcutsHelp({
  isOpen,
  onClose,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Keyboard className="w-5 h-5 text-teal-400" />
          <span>Keyboard Shortcuts</span>
        </div>
      }
      size="md"
    >
      <div className="space-y-4">
        <p className="text-[var(--text-muted)] text-sm mb-4">
          Use these keyboard shortcuts to navigate faster and boost your productivity.
        </p>
        
        {KEYBOARD_SHORTCUTS.map((section, index) => (
          <ShortcutSection
            key={index}
            title={section.title}
            shortcuts={section.shortcuts}
          />
        ))}
        
        <div className="mt-6 pt-4 border-t border-[var(--border)]">
          <p className="text-xs text-[var(--text-muted)] text-center">
            Press <ShortcutKey>Esc</ShortcutKey> to close this dialog
          </p>
        </div>
      </div>
    </Modal>
  );
});

KeyboardShortcutsHelp.propTypes = {
  /** Whether the modal is open */
  isOpen: PropTypes.bool.isRequired,
  /** Callback to close the modal */
  onClose: PropTypes.func.isRequired,
};

export default KeyboardShortcutsHelp;
