import React from 'react';
import PropTypes from 'prop-types';
import { Plus, Check, X, Copy, AlertTriangle, Clock } from 'lucide-react';
import { QUALITY_OPTIONS } from '../../hooks/useRapidEntry';

/**
 * RapidEntryRow - Individual row component for rapid card entry
 */
export function RapidEntryRow({
  row,
  rowIndex,
  activeRowIndex,
  setActiveRowIndex,
  shakeRowIndex,
  inputRefs,
  dropdownRef,
  showDropdown,
  setShowDropdown,
  searchResults,
  searchIsLoading,
  highlightedResult,
  lotModeEnabled,
  rows,
  duplicateWarning,
  allFolders,
  handleCardNameChange,
  handleSelectCard,
  handleSetChange,
  handleAddCardToInventory,
  handleClearRow,
  handleDuplicatePrevious,
  handleKeyDown,
  updateRowField,
}) {
  return (
    <div
      tabIndex={0}
      onKeyDown={(e) => handleKeyDown(e, rowIndex, 'row')}
      className={`
        relative rounded-lg border transition-all duration-200 focus:ring-2 focus:ring-teal-400/50
        ${row.status === 'added' ? 'bg-emerald-900/20 border-emerald-500/50' : ''}
        ${row.status === 'pending' ? 'bg-amber-900/20 border-amber-500/50' : ''}
        ${row.status === 'valid' ? 'bg-slate-800/50 border-teal-500/50' : ''}
        ${row.status === 'editing' ? 'bg-slate-800/30 border-slate-600' : ''}
        ${row.status === 'error' ? 'bg-red-900/20 border-red-500/50' : ''}
        ${activeRowIndex === rowIndex ? 'ring-1 ring-teal-400/30' : ''}
        ${shakeRowIndex === rowIndex ? 'animate-shake' : ''}
      `}
    >
      <div className="grid grid-cols-1 md:grid-cols-12 gap-2 p-3">
        {/* Card Name with Autocomplete */}
        <div className="md:col-span-3 relative" ref={activeRowIndex === rowIndex ? dropdownRef : null}>
          <label className="md:hidden text-xs text-slate-400 mb-1 block">Card Name</label>
          <div className="flex gap-2">
            {row.imageUrl && row.status !== 'editing' && (
              <img 
                src={row.imageUrl} 
                alt="" 
                className="w-8 h-11 rounded object-cover flex-shrink-0"
              />
            )}
            <input
              ref={el => inputRefs.current[`name-${rowIndex}`] = el}
              type="text"
              placeholder="Search card..."
              value={row.searchQuery}
              onChange={(e) => handleCardNameChange(rowIndex, e.target.value)}
              onFocus={() => {
                setActiveRowIndex(rowIndex);
                if (row.searchQuery.length >= 2) {
                  setShowDropdown(true);
                }
              }}
              onKeyDown={(e) => handleKeyDown(e, rowIndex, 'name')}
              disabled={row.status === 'added'}
              className={`
                flex-1 bg-slate-900/50 border rounded px-3 py-2 text-sm text-white 
                placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-teal-400
                ${row.status === 'valid' ? 'border-teal-500' : 'border-slate-600'}
                ${row.status === 'added' ? 'opacity-60' : ''}
              `}
            />
          </div>
          
          {/* Search Dropdown */}
          {showDropdown && activeRowIndex === rowIndex && searchResults.length > 0 && row.status !== 'added' && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-slate-900 border border-slate-600 rounded-lg shadow-xl max-h-60 overflow-y-auto z-30">
              {searchIsLoading && (
                <div className="px-4 py-3 text-sm text-slate-400">Searching...</div>
              )}
              {(() => {
                const seen = new Set();
                return searchResults
                  .filter(card => {
                    if (seen.has(card.name)) return false;
                    seen.add(card.name);
                    return true;
                  })
                  .slice(0, 10)
                  .map((card, idx) => (
                    <div
                      key={`${card.name}-${idx}`}
                      onClick={() => handleSelectCard(rowIndex, card)}
                      className={`
                        px-4 py-2 cursor-pointer border-b border-slate-700 last:border-b-0
                        flex items-center gap-3
                        ${idx === highlightedResult ? 'bg-teal-600/30' : 'hover:bg-teal-600/20'}
                      `}
                    >
                      {card.imageUrl && (
                        <img src={card.imageUrl} alt="" className="w-6 h-8 rounded object-cover" />
                      )}
                      <span className="text-sm font-medium">{card.name}</span>
                    </div>
                  ));
              })()}
            </div>
          )}
        </div>

        {/* Set Dropdown */}
        <div className="md:col-span-2">
          <label className="md:hidden text-xs text-slate-400 mb-1 block">Set</label>
          <select
            value={row.set}
            onChange={(e) => handleSetChange(rowIndex, e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, rowIndex, 'set')}
            disabled={!row.selectedCard || row.status === 'added'}
            className="w-full bg-slate-900/50 border border-slate-600 rounded px-2 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-teal-400 disabled:opacity-50"
          >
            {row.availableSets.length > 0 ? (
              row.availableSets.map(s => (
                <option key={s.set} value={s.set}>{s.set} - {s.setName}</option>
              ))
            ) : (
              <option value="">Select set</option>
            )}
          </select>
        </div>

        {/* Quantity */}
        <div className="md:col-span-1">
          <label className="md:hidden text-xs text-slate-400 mb-1 block">Qty</label>
          <input
            ref={el => inputRefs.current[`qty-${rowIndex}`] = el}
            type="number"
            min="1"
            value={row.quantity}
            onChange={(e) => {
              const qty = parseInt(e.target.value, 10) || 1;
              updateRowField(rowIndex, 'quantity', qty);
            }}
            onKeyDown={(e) => handleKeyDown(e, rowIndex, 'qty')}
            disabled={row.status === 'added'}
            className="w-full bg-[var(--muted-surface)] border border-[var(--border)] rounded px-2 py-2 text-sm text-[var(--text-primary)] text-center focus:outline-none focus:ring-2 focus:ring-[var(--accent-600)] disabled:opacity-50"
          />
        </div>

        {/* Price */}
        <div className="md:col-span-1">
          <label className="md:hidden text-xs text-slate-400 mb-1 block">Price</label>
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder={lotModeEnabled ? "Auto" : "0.00"}
              value={lotModeEnabled ? '' : row.price}
              onChange={(e) => updateRowField(rowIndex, 'price', e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, rowIndex, 'price')}
              disabled={row.status === 'added' || lotModeEnabled}
              className={`w-full bg-[var(--muted-surface)] border border-[var(--border)] rounded pl-5 pr-2 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-600)] disabled:opacity-50 ${lotModeEnabled ? 'cursor-not-allowed' : ''}`}
              title={lotModeEnabled ? 'Price is calculated from lot total' : ''}
            />
          </div>
        </div>

        {/* Foil Checkbox */}
        <div className="md:col-span-1 flex items-center">
          <label className="md:hidden text-xs text-slate-400 mr-2">Foil</label>
          <label className="flex items-center justify-center cursor-pointer w-full">
            <input
              type="checkbox"
              checked={row.foil}
              onChange={(e) => updateRowField(rowIndex, 'foil', e.target.checked)}
              onKeyDown={(e) => handleKeyDown(e, rowIndex, 'foil')}
              disabled={row.status === 'added'}
              className="w-5 h-5 rounded border-slate-600 bg-slate-900/50 text-teal-500 focus:ring-teal-400 focus:ring-offset-0 disabled:opacity-50"
            />
          </label>
        </div>

        {/* Quality Dropdown */}
        <div className="md:col-span-1">
          <label className="md:hidden text-xs text-slate-400 mb-1 block">Quality</label>
          <select
            value={row.quality}
            onChange={(e) => updateRowField(rowIndex, 'quality', e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, rowIndex, 'quality')}
            disabled={row.status === 'added'}
            className="w-full bg-slate-900/50 border border-slate-600 rounded px-2 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-teal-400 disabled:opacity-50"
          >
            {QUALITY_OPTIONS.map(q => (
              <option key={q} value={q}>{q}</option>
            ))}
          </select>
        </div>

        {/* Folder Dropdown */}
        <div className="md:col-span-2">
          <label className="md:hidden text-xs text-slate-400 mb-1 block">Folder</label>
          <select
            value={row.folder}
            onChange={(e) => updateRowField(rowIndex, 'folder', e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, rowIndex, 'folder')}
            disabled={row.status === 'added'}
            className="w-full bg-slate-900/50 border border-slate-600 rounded px-2 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-teal-400 disabled:opacity-50"
          >
            {allFolders.map(f => (
              <option key={f} value={f}>{f === 'Uncategorized' ? 'Unsorted' : f}</option>
            ))}
          </select>
        </div>

        {/* Status / Actions */}
        <div className="md:col-span-1 flex items-center justify-end gap-1">
          {row.status === 'added' && (
            <span className={lotModeEnabled ? 'text-amber-400' : 'text-emerald-400'}>
              <Check className="w-5 h-5" />
            </span>
          )}
          {row.status === 'pending' && (
            <span className="text-amber-400" title="Pending - press Ctrl+Shift+Enter to submit all">
              <Clock className="w-5 h-5" />
            </span>
          )}
          {row.status === 'valid' && (
            <button
              onClick={() => handleAddCardToInventory(rowIndex)}
              className={`p-1.5 rounded text-white transition-colors ${
                lotModeEnabled 
                  ? 'bg-[var(--warning)] hover:bg-[var(--warning)]/90' 
                  : 'bg-[var(--accent-600)] hover:bg-[var(--accent)]'
              }`}
              title={lotModeEnabled ? "Add to lot (Shift+Enter)" : "Add to inventory (Shift+Enter)"}
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
          {row.status !== 'added' && row.status !== 'pending' && (
            <>
              {rowIndex > 0 && rows[rowIndex - 1].selectedCard && (
                <button
                  onClick={() => handleDuplicatePrevious(rowIndex)}
                  className="p-1.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
                  title="Duplicate previous row (Ctrl+D)"
                >
                  <Copy className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => handleClearRow(rowIndex)}
                className="p-1.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
                title="Clear row (Escape)"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Duplicate Warning */}
      {duplicateWarning?.rowIndex === rowIndex && (
        <div className="px-3 pb-2">
          <div className="flex items-center gap-2 text-xs text-yellow-400 bg-yellow-900/20 rounded px-2 py-1">
            <AlertTriangle className="w-3 h-3" />
            <span>"{duplicateWarning.cardName}" was already added in this session</span>
          </div>
        </div>
      )}
    </div>
  );
}

RapidEntryRow.propTypes = {
  row: PropTypes.object.isRequired,
  rowIndex: PropTypes.number.isRequired,
  activeRowIndex: PropTypes.number.isRequired,
  setActiveRowIndex: PropTypes.func.isRequired,
  shakeRowIndex: PropTypes.number,
  inputRefs: PropTypes.object.isRequired,
  dropdownRef: PropTypes.object.isRequired,
  showDropdown: PropTypes.bool.isRequired,
  setShowDropdown: PropTypes.func.isRequired,
  searchResults: PropTypes.array.isRequired,
  searchIsLoading: PropTypes.bool,
  highlightedResult: PropTypes.number.isRequired,
  lotModeEnabled: PropTypes.bool.isRequired,
  rows: PropTypes.array.isRequired,
  duplicateWarning: PropTypes.object,
  allFolders: PropTypes.array.isRequired,
  handleCardNameChange: PropTypes.func.isRequired,
  handleSelectCard: PropTypes.func.isRequired,
  handleSetChange: PropTypes.func.isRequired,
  handleAddCardToInventory: PropTypes.func.isRequired,
  handleClearRow: PropTypes.func.isRequired,
  handleDuplicatePrevious: PropTypes.func.isRequired,
  handleKeyDown: PropTypes.func.isRequired,
  updateRowField: PropTypes.func.isRequired,
};

export default RapidEntryRow;
