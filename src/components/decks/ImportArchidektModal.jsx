import React from 'react';
import PropTypes from 'prop-types';

/**
 * ImportArchidektModal component - Modal for importing decks from Archidekt
 */
export function ImportArchidektModal({
  archidektUrl,
  onUrlChange,
  isImporting,
  onImport,
  onCancel
}) {
  return (
    <div className="bg-[var(--surface)] rounded-lg border border-blue-500/50 p-4 mb-4">
      <h3 className="text-lg font-semibold text-blue-300 mb-4">Import Deck from Archidekt</h3>
      <div className="space-y-3">
        <div>
          <label className="block text-sm text-[var(--text-muted)] mb-1">Archidekt Deck URL</label>
          <input
            type="text"
            placeholder="e.g., https://archidekt.com/decks/1234567"
            value={archidektUrl}
            onChange={(e) => onUrlChange(e.target.value)}
            className="w-full bg-[var(--muted-surface)] border border-[var(--border)] rounded px-3 py-2 text-white placeholder-slate-500"
            onKeyDown={(e) => e.key === 'Enter' && onImport()}
            autoFocus
            disabled={isImporting}
          />
          <p className="text-xs text-[var(--text-muted)] mt-1">Paste the full URL of any public Archidekt deck</p>
        </div>
        <div className="flex gap-2 pt-2">
          <button
            onClick={onImport}
            disabled={isImporting}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white px-3 py-2 rounded font-semibold transition-colors"
          >
            {isImporting ? 'Importing...' : 'Import'}
          </button>
          <button
            onClick={onCancel}
            disabled={isImporting}
            className="flex-1 bg-[var(--muted-surface)] hover:bg-slate-600 disabled:bg-slate-600 text-white px-3 py-2 rounded transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

ImportArchidektModal.propTypes = {
  archidektUrl: PropTypes.string.isRequired,
  onUrlChange: PropTypes.func.isRequired,
  isImporting: PropTypes.bool.isRequired,
  onImport: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired
};

export default ImportArchidektModal;
