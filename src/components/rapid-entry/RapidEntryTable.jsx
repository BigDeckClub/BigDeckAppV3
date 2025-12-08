import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { Send, Loader2 } from 'lucide-react';
import { useRapidEntry } from '../../hooks/useRapidEntry';
import { LotModeSection } from './LotModeSection';
import { RapidEntryRow } from './RapidEntryRow';

/**
 * RapidEntryTable - Main orchestrating component for rapid card entry
 * Slimmed down version that delegates to sub-components and uses useRapidEntry hook
 */
export function RapidEntryTable({
  onAddCard,
  allSets = [],
  createdFolders = [],
  handleSearch,
  searchResults = [],
  showDropdown = false,
  setShowDropdown,
  searchIsLoading = false,
}) {
  const rapidEntry = useRapidEntry({
    onAddCard,
    handleSearch,
    searchResults,
    setShowDropdown,
  });

  const {
    rows,
    activeRowIndex,
    setActiveRowIndex,
    duplicateWarning,
    highlightedResult,
    setHighlightedResult,
    shakeRowIndex,
    setShakeRowIndex,
    lotModeEnabled,
    setLotModeEnabled,
    lotName,
    setLotName,
    lotTotalCost,
    setLotTotalCost,
    lotCards,
    lotSubmitting,
    lotError,
    setLotError,
    lotTotalCards,
    lotPerCardCost,
    runningTotal,
    inputRefs,
    dropdownRef,
    handleCardNameChange,
    handleSelectCard,
    handleSetChange,
    handleSubmitLot,
    handleRemoveCardFromLot,
    handleAddCardToInventory,
    handleAddNewRow,
    handleSubmitAll,
    handleClearRow,
    handleDuplicatePrevious,
    updateRowField,
    pendingCount,
    isSubmitting,
    submitError,
    setSubmitError,
  } = rapidEntry;

  // All available folders (ensure Uncategorized default is first, shown as "Unsorted" in UI)
  const allFolders = ['Uncategorized', ...createdFolders];

  // Keyboard navigation handler
  const handleKeyDown = useCallback((e, rowIndex, fieldType) => {
    const row = rows[rowIndex];
    
    // Arrow keys for dropdown navigation
    if (showDropdown && fieldType === 'name' && searchResults.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        setHighlightedResult(prev => Math.min(prev + 1, searchResults.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        setHighlightedResult(prev => Math.max(prev - 1, 0));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        // Get unique cards
        const uniqueCards = [];
        const seen = new Set();
        for (const card of searchResults) {
          if (!seen.has(card.name)) {
            seen.add(card.name);
            uniqueCards.push(card);
          }
        }
        if (uniqueCards[highlightedResult]) {
          handleSelectCard(rowIndex, uniqueCards[highlightedResult]);
        }
        return;
      }
    }
    
    // Escape to clear row
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      handleClearRow(rowIndex);
      return;
    }
    
    // Ctrl+Shift+Enter to submit all pending cards
    if (e.key === 'Enter' && e.shiftKey && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      e.stopPropagation();
      handleSubmitAll();
      return;
    }
    
    // Shift+Enter to add new row (queue card for batch submit)
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      if (row.status === 'valid' || row.selectedCard) {
        handleAddNewRow(rowIndex);
      } else {
        // Visual feedback when Shift+Enter fails (card not selected)
        setShakeRowIndex(rowIndex);
        setTimeout(() => setShakeRowIndex(null), 500);
      }
      return;
    }
    
    // Ctrl+D or Ctrl+Shift+D to duplicate previous row
    if ((e.key === 'd' || e.key === 'D') && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      e.stopPropagation();
      handleDuplicatePrevious(rowIndex);
      return;
    }
  }, [rows, showDropdown, searchResults, highlightedResult, setHighlightedResult, handleSelectCard, handleClearRow, handleAddNewRow, handleSubmitAll, setShakeRowIndex, handleDuplicatePrevious]);

  return (
    <div className="space-y-4">
      {/* Lot Mode Toggle Section */}
      <LotModeSection
        lotModeEnabled={lotModeEnabled}
        setLotModeEnabled={setLotModeEnabled}
        lotName={lotName}
        setLotName={setLotName}
        lotTotalCost={lotTotalCost}
        setLotTotalCost={setLotTotalCost}
        lotCards={lotCards}
        lotSubmitting={lotSubmitting}
        lotError={lotError}
        setLotError={setLotError}
        lotTotalCards={lotTotalCards}
        lotPerCardCost={lotPerCardCost}
        handleSubmitLot={handleSubmitLot}
        handleRemoveCardFromLot={handleRemoveCardFromLot}
      />

      {/* Table Header */}
      <div className="hidden md:grid md:grid-cols-12 gap-2 px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wide border-b border-slate-700">
        <div className="col-span-3">Card Name</div>
        <div className="col-span-2">Set</div>
        <div className="col-span-1">Qty</div>
        <div className={`col-span-1 ${lotModeEnabled ? 'opacity-50' : ''}`}>Price</div>
        <div className="col-span-1">Foil</div>
        <div className="col-span-1">Quality</div>
        <div className="col-span-2">Folder</div>
        <div className="col-span-1">Status</div>
      </div>

      {/* Entry Rows */}
      <div className="space-y-2">
        {rows.map((row, rowIndex) => (
          <RapidEntryRow
            key={row.id}
            row={row}
            rowIndex={rowIndex}
            activeRowIndex={activeRowIndex}
            setActiveRowIndex={setActiveRowIndex}
            shakeRowIndex={shakeRowIndex}
            inputRefs={inputRefs}
            dropdownRef={dropdownRef}
            showDropdown={showDropdown}
            setShowDropdown={setShowDropdown}
            searchResults={searchResults}
            searchIsLoading={searchIsLoading}
            highlightedResult={highlightedResult}
            lotModeEnabled={lotModeEnabled}
            rows={rows}
            duplicateWarning={duplicateWarning}
            allFolders={allFolders}
            handleCardNameChange={handleCardNameChange}
            handleSelectCard={handleSelectCard}
            handleSetChange={handleSetChange}
            handleAddCardToInventory={handleAddCardToInventory}
            handleClearRow={handleClearRow}
            handleDuplicatePrevious={handleDuplicatePrevious}
            handleKeyDown={handleKeyDown}
            updateRowField={updateRowField}
          />
        ))}
      </div>

      {/* Running Totals and Submit All */}
      <div className="flex flex-wrap justify-between items-center gap-4 px-3 py-3 bg-slate-800/30 rounded-lg border border-slate-700">
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          <div className="text-sm text-slate-400">
            Running total: <span className="font-semibold text-white">{runningTotal.count} cards</span>
          </div>
          <div className="text-sm text-slate-400">
            Total: <span className="font-semibold text-teal-400">${runningTotal.price.toFixed(2)}</span>
          </div>
          {pendingCount > 0 && (
            <div className="text-sm text-amber-400">
              <span className="font-semibold">{pendingCount}</span> card{pendingCount !== 1 ? 's' : ''} ready to submit
            </div>
          )}
        </div>
        
        {/* Submit All Button */}
        {!lotModeEnabled && (
          <button
            onClick={handleSubmitAll}
            disabled={pendingCount === 0 || isSubmitting}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all
              ${pendingCount > 0 && !isSubmitting
                ? 'bg-teal-600 hover:bg-teal-500 text-white shadow-lg shadow-teal-600/20'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              }
            `}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Submit All ({pendingCount})
              </>
            )}
          </button>
        )}
      </div>
      
      {/* Submit Error */}
      {submitError && (
        <div className="px-3 py-2 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm flex items-center justify-between">
          <span>{submitError}</span>
          <button
            onClick={() => setSubmitError(null)}
            className="text-red-400 hover:text-red-300 ml-2"
          >
            ×
          </button>
        </div>
      )}

      {/* Keyboard Shortcuts Help */}
      <div className="text-xs text-slate-500 flex flex-wrap gap-x-4 gap-y-1">
        <span><kbd className="px-1.5 py-0.5 bg-slate-700 rounded">Enter</kbd> Select card</span>
        <span><kbd className="px-1.5 py-0.5 bg-slate-700 rounded">Shift+Enter</kbd> Submit card & new row</span>
        <span><kbd className="px-1.5 py-0.5 bg-slate-700 rounded">Ctrl+Shift+Enter</kbd> Submit all</span>
        <span><kbd className="px-1.5 py-0.5 bg-slate-700 rounded">Tab</kbd> Next field</span>
        <span><kbd className="px-1.5 py-0.5 bg-slate-700 rounded">Esc</kbd> Clear row</span>
        <span><kbd className="px-1.5 py-0.5 bg-slate-700 rounded">Ctrl+D</kbd> Duplicate previous</span>
      </div>
    </div>
  );
}

RapidEntryTable.propTypes = {
  onAddCard: PropTypes.func.isRequired,
  allSets: PropTypes.array,
  createdFolders: PropTypes.array,
  handleSearch: PropTypes.func.isRequired,
  searchResults: PropTypes.array,
  showDropdown: PropTypes.bool,
  setShowDropdown: PropTypes.func.isRequired,
  searchIsLoading: PropTypes.bool,
};

export default RapidEntryTable;
