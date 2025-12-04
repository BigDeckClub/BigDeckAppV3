import React, { memo, useState, useRef, useEffect } from 'react';
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
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentOption = SORT_OPTIONS.find(opt => opt.value === sortField) || SORT_OPTIONS[0];

  const handleFieldSelect = (field) => {
    onSortChange(field, sortDirection);
    setIsOpen(false);
  };

  const toggleDirection = (e) => {
    e.stopPropagation();
    onSortChange(sortField, sortDirection === 'asc' ? 'desc' : 'asc');
  };

  const DirectionIcon = sortDirection === 'asc' ? ArrowUp : ArrowDown;

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="flex items-center gap-1 bg-slate-800/50 rounded-lg p-1.5 border border-slate-700">
        {/* Sort Field Dropdown Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-300 hover:text-slate-100 hover:bg-slate-700/30 transition-all duration-300"
          title="Select sort field"
        >
          <ArrowUpDown className="w-4 h-4 text-slate-400" />
          <span className="hidden sm:inline">{currentOption.label}</span>
          <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Sort Direction Toggle */}
        <button
          onClick={toggleDirection}
          className={`p-2 rounded-lg transition-all duration-300 ${
            'text-slate-400 hover:text-slate-200 hover:bg-slate-700/30'
          }`}
          title={sortDirection === 'asc' ? 'Ascending (click to reverse)' : 'Descending (click to reverse)'}
        >
          <DirectionIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-44 bg-slate-800 border border-slate-600 rounded-lg shadow-xl shadow-black/30 z-50 overflow-hidden">
          <div className="py-1">
            {SORT_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => handleFieldSelect(option.value)}
                className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                  sortField === option.value
                    ? 'bg-teal-600/30 text-teal-300 font-medium'
                    : 'text-slate-300 hover:bg-slate-700/50 hover:text-slate-100'
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
