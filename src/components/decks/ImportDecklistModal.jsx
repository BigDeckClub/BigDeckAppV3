import React from 'react';
import PropTypes from 'prop-types';

const FORMATS = ['Standard', 'Modern', 'Commander', 'Casual', 'Limited', 'Pioneer'];

/**
 * ImportDecklistModal component - Modal for importing decks from text
 */
export function ImportDecklistModal({
  deckName,
  onDeckNameChange,
  format,
  onFormatChange,
  deckListText,
  onDeckListTextChange,
  onImport,
  onCancel
}) {
  return (
    <div className="bg-slate-800 rounded-lg border border-purple-500/50 p-4 mb-4">
      <h3 className="text-lg font-semibold text-purple-300 mb-4">Import Deck from Text</h3>
      <div className="space-y-3">
        <div>
          <label className="block text-sm text-slate-400 mb-1">Deck Name</label>
          <input
            type="text"
            placeholder="e.g., Mono Red Aggro"
            value={deckName}
            onChange={(e) => onDeckNameChange(e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-slate-500"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1">Format</label>
          <select
            value={format}
            onChange={(e) => onFormatChange(e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
          >
            {FORMATS.map(fmt => (
              <option key={fmt} value={fmt}>{fmt}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1">Deck List</label>
          <textarea
            placeholder={`4 Black Lotus\n4 Ancestral Recall\n4 Time Walk\n\nOne card per line. Format: "4 Card Name" or "4x Card Name (SET)"`}
            value={deckListText}
            onChange={(e) => onDeckListTextChange(e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-slate-500 resize-none font-mono text-sm"
            rows="8"
          />
          <p className="text-xs text-slate-500 mt-1">One card per line. Optional set code in parentheses: "Card Name (MH2)"</p>
        </div>
        <div className="flex gap-2 pt-2">
          <button
            onClick={onImport}
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded font-semibold transition-colors"
          >
            Import
          </button>
          <button
            onClick={onCancel}
            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

ImportDecklistModal.propTypes = {
  deckName: PropTypes.string.isRequired,
  onDeckNameChange: PropTypes.func.isRequired,
  format: PropTypes.string.isRequired,
  onFormatChange: PropTypes.func.isRequired,
  deckListText: PropTypes.string.isRequired,
  onDeckListTextChange: PropTypes.func.isRequired,
  onImport: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired
};

export default ImportDecklistModal;
