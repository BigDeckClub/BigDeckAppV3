import React, { memo, useState, useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronDown } from 'lucide-react';

/**
 * Sort field options with display labels
 */
const SORT_OPTIONS = [
  { value: 'name', label: 'Name' },
  { value: 'price', label: 'Price' },
  { value: 'quantity', label: 'Quantity' },
  { value: 'set', label: 'Set' },
  { value: 'dateAdded', label: 'Date Added' },
];

/**
 * SortControls - Dropdown for selecting sort field and direction
 * Provides sorting options for inventory cards
 */
export const SortControls = memo(function SortControls({
  sortField = 'name',
  sortDirection = 'asc',
  onSortChange,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);
  const optionRefs = useRef([]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset focused index when dropdown opens
  useEffect(() => {
    if (isOpen) {
      const currentIndex = SORT_OPTIONS.findIndex(opt => opt.value === sortField);
      setFocusedIndex(currentIndex >= 0 ? currentIndex : 0);
    }
  }, [isOpen, sortField]);

  // Focus the current option when dropdown opens
  useEffect(() => {
    if (isOpen && focusedIndex >= 0 && optionRefs.current[focusedIndex]) {
      optionRefs.current[focusedIndex].focus();
    }
  }, [isOpen, focusedIndex]);

  const currentOption = SORT_OPTIONS.find(opt => opt.value === sortField) || SORT_OPTIONS[0];

  const handleFieldSelect = useCallback((field) => {
    onSortChange(field, sortDirection);
    setIsOpen(false);
    setFocusedIndex(-1);
    buttonRef.current?.focus();
  }, [onSortChange, sortDirection]);

  const toggleDirection = (e) => {
    e.stopPropagation();
    onSortChange(sortField, sortDirection === 'asc' ? 'desc' : 'asc');
  };

  const handleKeyDown = useCallback((e) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => (prev + 1) % SORT_OPTIONS.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => (prev - 1 + SORT_OPTIONS.length) % SORT_OPTIONS.length);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (focusedIndex >= 0) {
          handleFieldSelect(SORT_OPTIONS[focusedIndex].value);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setFocusedIndex(-1);
        buttonRef.current?.focus();
        break;
      case 'Tab':
        setIsOpen(false);
        setFocusedIndex(-1);
        break;
      default:
        break;
    }
  }, [isOpen, focusedIndex, handleFieldSelect]);

  const DirectionIcon = sortDirection === 'asc' ? ArrowUp : ArrowDown;

  return (
    <div className="relative" ref={dropdownRef} onKeyDown={handleKeyDown}>
      <div className="flex items-center gap-1 bg-[var(--surface)] rounded-lg p-1.5 border border-[var(--border)]">
        {/* Sort Field Dropdown Button */}
        <button
          ref={buttonRef}
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-[var(--text-muted)] hover:text-slate-100 hover:bg-[var(--muted-surface)] transition-all duration-300"
          title="Select sort field"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-label={`Sort by ${currentOption.label}`}
        >
          <ArrowUpDown className="w-4 h-4 text-[var(--text-muted)]" />
          <span className="hidden sm:inline">{currentOption.label}</span>
          <ChevronDown className={`w-3 h-3 text-[var(--text-muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Sort Direction Toggle */}
        <button
          onClick={toggleDirection}
          className={`p-2 rounded-lg transition-all duration-300 ${
            'text-[var(--text-muted)] hover:text-slate-200 hover:bg-[var(--muted-surface)]'
          }`}
          title={sortDirection === 'asc' ? 'Ascending (click to reverse)' : 'Descending (click to reverse)'}
          aria-label={sortDirection === 'asc' ? 'Sort ascending, click to sort descending' : 'Sort descending, click to sort ascending'}
        >
          <DirectionIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div 
          className="absolute right-0 mt-2 w-44 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-xl shadow-black/30 z-50 overflow-hidden"
          role="listbox"
          aria-label="Sort field options"
          aria-activedescendant={focusedIndex >= 0 ? `sort-option-${SORT_OPTIONS[focusedIndex].value}` : undefined}
        >
          <div className="py-1">
            {SORT_OPTIONS.map((option, index) => (
              <button
                key={option.value}
                id={`sort-option-${option.value}`}
                ref={el => optionRefs.current[index] = el}
                onClick={() => handleFieldSelect(option.value)}
                role="option"
                aria-selected={sortField === option.value}
                tabIndex={focusedIndex === index ? 0 : -1}
                className={`w-full px-4 py-2 text-left text-sm transition-colors outline-none ${
                  sortField === option.value
                    ? 'bg-teal-600/30 text-teal-300 font-medium'
                    : focusedIndex === index
                    ? 'bg-[var(--muted-surface)] text-slate-100'
                    : 'text-[var(--text-muted)] hover:bg-[var(--muted-surface)] hover:text-slate-100'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

SortControls.propTypes = {
  sortField: PropTypes.oneOf(['name', 'price', 'quantity', 'set', 'dateAdded']),
  sortDirection: PropTypes.oneOf(['asc', 'desc']),
  onSortChange: PropTypes.func.isRequired,
};

export default SortControls;
