/**
 * ImportWizard - Multi-step import wizard with stepper UI
 * @module components/ui/ImportWizard
 */

import React, { memo, useState, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Upload,
  FileText,
  Settings,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Loader2,
  AlertCircle,
  Check,
  X,
  Edit3,
  Trash2,
} from 'lucide-react';
import { DropZone } from './DropZone';

/**
 * Step indicator component
 */
const StepIndicator = memo(function StepIndicator({ steps, currentStep }) {
  return (
    <div className="flex items-center justify-center mb-8">
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;
        const isLast = index === steps.length - 1;

        return (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center">
              {/* Step circle */}
              <div
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center transition-all
                  ${isCompleted
                    ? 'bg-ui-accent text-ui-primary-foreground'
                    : isCurrent
                      ? 'bg-ui-accent text-ui-primary-foreground ring-4 ring-ui-accent/20'
                      : 'bg-ui-surface text-ui-muted border border-ui-border'
                  }
                `}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <step.icon className="w-5 h-5" />
                )}
              </div>
              {/* Step label */}
              <span
                className={`
                  mt-2 text-xs font-medium
                  ${isCurrent ? 'text-ui-primary-foreground' : 'text-ui-muted'}
                `}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {!isLast && (
              <div
                className={`
                  w-16 h-0.5 mx-2 transition-colors
                  ${isCompleted ? 'bg-ui-accent' : 'bg-ui-border'}
                `}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
});

StepIndicator.propTypes = {
  steps: PropTypes.array.isRequired,
  currentStep: PropTypes.number.isRequired,
};

/**
 * Format selector component
 */
const FormatSelector = memo(function FormatSelector({ formats, selectedFormat, onSelect }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {formats.map((format) => (
          <button
          key={format.value}
          onClick={() => onSelect(format.value)}
          className={`
            p-4 rounded-lg border text-left transition-all
            ${selectedFormat === format.value
              ? 'border-ui-accent bg-ui-accent/10 ring-2 ring-ui-accent/30'
              : 'border-ui-border bg-ui-surface/50 hover:border-ui-border hover:bg-ui-surface'
            }
          `}
        >
          <div className="font-medium text-ui-text mb-1">{format.label}</div>
          {format.description && (
            <div className="text-xs text-ui-muted">{format.description}</div>
          )}
        </button>
      ))}
    </div>
  );
});

FormatSelector.propTypes = {
  formats: PropTypes.array.isRequired,
  selectedFormat: PropTypes.string,
  onSelect: PropTypes.func.isRequired,
};

/**
 * Preview table for parsed cards
 */
const PreviewTable = memo(function PreviewTable({
  cards,
  onUpdateCard,
  onRemoveCard,
  editingId,
  setEditingId,
}) {
  const formatPrice = (price) => {
    if (!price) return '—';
    const num = parseFloat(price);
    return isNaN(num) ? '—' : `$${num.toFixed(2)}`;
  };

  return (
    <div className="border border-ui-border rounded-lg overflow-hidden">
      <div className="overflow-x-auto max-h-[400px]">
        <table className="w-full text-sm">
          <thead className="bg-ui-surface/80 sticky top-0">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-ui-muted uppercase">Name</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-ui-muted uppercase">Set</th>
              <th className="px-3 py-2 text-center text-xs font-medium text-ui-muted uppercase">Qty</th>
              <th className="px-3 py-2 text-center text-xs font-medium text-ui-muted uppercase">Foil</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-ui-muted uppercase">Price</th>
              <th className="px-3 py-2 text-center text-xs font-medium text-ui-muted uppercase">Status</th>
              <th className="px-3 py-2 w-20"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ui-border">
            {cards.map((card) => (
              <tr
                key={card.id}
                className={`
                  ${card.status === 'imported' ? 'bg-emerald-900/10' : ''}
                  ${card.status === 'error' ? 'bg-red-900/10' : ''}
                  hover:bg-ui-surface/50
                `}
              >
                {editingId === card.id ? (
                  // Editing mode
                  <>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={card.name}
                        onChange={(e) => onUpdateCard(card.id, { name: e.target.value })}
                        className="w-full bg-ui-card border border-ui-border rounded px-2 py-1 text-ui-text text-sm"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={card.set || ''}
                        onChange={(e) => onUpdateCard(card.id, { set: e.target.value.toUpperCase() })}
                        className="w-20 bg-ui-card border border-ui-border rounded px-2 py-1 text-ui-text text-sm"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min="1"
                        value={card.quantity}
                        onChange={(e) => onUpdateCard(card.id, { quantity: parseInt(e.target.value, 10) || 1 })}
                        className="w-16 bg-ui-card border border-ui-border rounded px-2 py-1 text-ui-text text-sm text-center"
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={card.foil || false}
                        onChange={(e) => onUpdateCard(card.id, { foil: e.target.checked })}
                        className="w-4 h-4 rounded border-ui-border bg-ui-card text-teal-500"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        step="0.01"
                        value={card.price || ''}
                        onChange={(e) => onUpdateCard(card.id, { price: e.target.value })}
                        className="w-20 bg-ui-card border border-ui-border rounded px-2 py-1 text-ui-text text-sm text-right"
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className="text-xs text-ui-muted">Editing</span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-1 text-ui-accent hover:text-ui-accent/80"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </td>
                  </>
                ) : (
                  // Display mode
                  <>
                    <td className="px-3 py-2 text-ui-text font-medium">{card.name}</td>
                    <td className="px-3 py-2 text-ui-muted">{card.set || '—'}</td>
                    <td className="px-3 py-2 text-center text-ui-muted">{card.quantity}</td>
                    <td className="px-3 py-2 text-center">
                      {card.foil ? (
                        <span className="text-amber-400">✦</span>
                      ) : (
                        <span className="text-ui-muted">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right text-ui-muted">{formatPrice(card.price)}</td>
                    <td className="px-3 py-2 text-center">
                      {card.status === 'imported' && (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                          <CheckCircle2 className="w-3 h-3" />
                        </span>
                      )}
                      {card.status === 'error' && (
                        <span className="inline-flex items-center gap-1 text-xs text-red-400" title={card.error}>
                          <AlertCircle className="w-3 h-3" />
                        </span>
                      )}
                      {card.status === 'pending' && (
                        <span className="text-xs text-ui-muted">Pending</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1 justify-center">
                        {card.status !== 'imported' && (
                          <button
                            onClick={() => setEditingId(card.id)}
                            className="p-1 text-ui-muted hover:text-ui-text"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => onRemoveCard(card.id)}
                          className="p-1 text-ui-muted hover:text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});

PreviewTable.propTypes = {
  cards: PropTypes.array.isRequired,
  onUpdateCard: PropTypes.func.isRequired,
  onRemoveCard: PropTypes.func.isRequired,
  editingId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  setEditingId: PropTypes.func.isRequired,
};

/**
 * Import progress display
 */
const ImportProgress = memo(function ImportProgress({ current, total, status }) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-ui-muted">
          {status === 'importing' ? 'Importing cards...' : 'Import complete!'}
        </span>
        <span className="text-sm font-medium text-ui-text">
          {current} / {total}
        </span>
      </div>
      <div className="h-3 bg-ui-surface rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${
            status === 'complete' ? 'bg-emerald-500' : 'bg-ui-accent'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {status === 'importing' && (
        <div className="flex items-center justify-center gap-2 text-ui-accent">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Processing...</span>
        </div>
      )}
    </div>
  );
});

ImportProgress.propTypes = {
  current: PropTypes.number.isRequired,
  total: PropTypes.number.isRequired,
  status: PropTypes.oneOf(['importing', 'complete']).isRequired,
};

/**
 * Wizard step definitions
 */
const WIZARD_STEPS = [
  { id: 'upload', label: 'Upload', icon: Upload },
  { id: 'configure', label: 'Configure', icon: Settings },
  { id: 'preview', label: 'Preview', icon: FileText },
  { id: 'import', label: 'Import', icon: CheckCircle2 },
];

/**
 * Default format options
 */
const DEFAULT_FORMATS = [
  { value: 'auto', label: 'Auto-detect', description: 'Automatically detect file format' },
  { value: 'moxfield', label: 'Moxfield', description: 'Moxfield deck export' },
  { value: 'deckbox', label: 'Deckbox', description: 'Deckbox inventory export' },
  { value: 'tcgplayer', label: 'TCGPlayer', description: 'TCGPlayer collection export' },
  { value: 'archidekt', label: 'Archidekt', description: 'Archidekt deck export' },
  { value: 'simple', label: 'Simple Text', description: 'Plain text card list' },
];

/**
 * ImportWizard component
 */
export const ImportWizard = memo(function ImportWizard({
  formats = DEFAULT_FORMATS,
  folders = [],
  onFileSelect,
  onImport,
  parsedCards = [],
  isLoading = false,
  isImporting = false,
  importProgress = { current: 0, total: 0 },
  detectedFormat = null,
  error = null,
  onUpdateCard,
  onRemoveCard,
  onClearCards,
  className = '',
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedFormat, setSelectedFormat] = useState('auto');
  const [selectedFolder, setSelectedFolder] = useState('Uncategorized');
  const [selectedFile, setSelectedFile] = useState(null);
  const [editingId, setEditingId] = useState(null);

  // Calculate stats
  const stats = useMemo(() => {
    const pending = parsedCards.filter((c) => c.status === 'pending').length;
    const imported = parsedCards.filter((c) => c.status === 'imported').length;
    const errors = parsedCards.filter((c) => c.status === 'error').length;
    return { pending, imported, errors, total: parsedCards.length };
  }, [parsedCards]);

  // Handle file selection
  const handleFileSelect = useCallback((file) => {
    setSelectedFile(file);
    onFileSelect?.(file, selectedFormat);
    // Auto-advance to configure step
    setCurrentStep(1);
  }, [onFileSelect, selectedFormat]);

  // Handle format change
  const handleFormatChange = useCallback((format) => {
    setSelectedFormat(format);
    if (selectedFile) {
      onFileSelect?.(selectedFile, format);
    }
  }, [onFileSelect, selectedFile]);

  // Handle import
  const handleImport = useCallback(() => {
    setCurrentStep(3);
    onImport?.(selectedFolder);
  }, [onImport, selectedFolder]);

  // Navigation
  const canGoNext = useMemo(() => {
    switch (currentStep) {
      case 0: return selectedFile !== null;
      case 1: return true;
      case 2: return stats.pending > 0;
      default: return false;
    }
  }, [currentStep, selectedFile, stats.pending]);

  const handleNext = useCallback(() => {
    if (currentStep === 2) {
      handleImport();
    } else if (canGoNext && currentStep < 3) {
      setCurrentStep((s) => s + 1);
    }
  }, [canGoNext, currentStep, handleImport]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  }, [currentStep]);

  const handleReset = useCallback(() => {
    setCurrentStep(0);
    setSelectedFile(null);
    onClearCards?.();
  }, [onClearCards]);

  // Check if import is complete
  const importComplete = currentStep === 3 && !isImporting && stats.imported > 0;

  return (
    <div className={`bg-ui-surface/50 rounded-xl border border-ui-border p-6 ${className}`}>
      {/* Step indicator */}
      <StepIndicator steps={WIZARD_STEPS} currentStep={currentStep} />

      {/* Step content */}
      <div className="min-h-[300px]">
        {/* Step 1: Upload */}
        {currentStep === 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-ui-heading mb-4">Upload Your File</h3>
            <DropZone
              onFileSelect={handleFileSelect}
              acceptedTypes={['csv', 'txt']}
              selectedFile={selectedFile}
              onClearFile={() => setSelectedFile(null)}
              isLoading={isLoading}
              errorMessage={error}
              title="Drop your card list here"
              subtitle="Supports CSV and TXT files"
            />
          </div>
        )}

        {/* Step 2: Configure */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-ui-heading mb-4">Configure Import</h3>
              {detectedFormat && (
                <p className="text-sm text-ui-muted mb-4">
                  Detected format: <span className="text-ui-accent">{detectedFormat}</span>
                </p>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ui-muted mb-2">
                  File Format
                </label>
                <FormatSelector
                  formats={formats}
                  selectedFormat={selectedFormat}
                  onSelect={handleFormatChange}
                />
              </div>

              {folders.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-ui-muted mb-2">
                    Destination Folder
                  </label>
                  <select
                    value={selectedFolder}
                    onChange={(e) => setSelectedFolder(e.target.value)}
                    className="w-full max-w-xs bg-ui-card border border-ui-border rounded-lg px-4 py-2.5 text-ui-text focus:outline-none focus:ring-2 ring-ui-accent/50"
                  >
                    <option value="Uncategorized">Uncategorized</option>
                    {folders.map((folder) => (
                      <option key={folder} value={folder}>
                        {folder}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Preview */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-ui-heading">
                Preview ({stats.total} cards)
              </h3>
                <div className="flex items-center gap-4 text-sm">
                  {stats.pending > 0 && (
                    <span className="text-ui-muted">{stats.pending} pending</span>
                  )}
                  {stats.imported > 0 && (
                    <span className="text-emerald-400">{stats.imported} imported</span>
                  )}
                  {stats.errors > 0 && (
                    <span className="text-red-400">{stats.errors} errors</span>
                  )}
                </div>
            </div>

            {parsedCards.length > 0 ? (
              <PreviewTable
                cards={parsedCards}
                onUpdateCard={onUpdateCard}
                onRemoveCard={onRemoveCard}
                editingId={editingId}
                setEditingId={setEditingId}
              />
            ) : (
              <div className="text-center py-12 text-ui-muted">
                No cards parsed from file. Please check the format.
              </div>
            )}
          </div>
        )}

        {/* Step 4: Import */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-ui-heading text-center">
              {importComplete ? 'Import Complete!' : 'Importing Cards'}
            </h3>

            <ImportProgress
              current={importProgress.current || stats.imported}
              total={importProgress.total || stats.total}
              status={isImporting ? 'importing' : 'complete'}
            />

            {importComplete && (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                </div>
                <p className="text-ui-muted">
                  Successfully imported {stats.imported} cards
                  {stats.errors > 0 && (
                    <span className="text-red-400"> ({stats.errors} failed)</span>
                  )}
                </p>
                <button
                  onClick={handleReset}
                  className="px-6 py-2 bg-ui-accent hover:bg-ui-accent/90 text-ui-primary-foreground rounded-lg transition-colors"
                >
                  Import More Cards
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation buttons */}
      {currentStep < 3 && (
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-ui-border">
          <button
            onClick={handleBack}
            disabled={currentStep === 0}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg transition-colors
              ${currentStep === 0
                ? 'text-ui-muted cursor-not-allowed'
                : 'text-ui-text hover:text-ui-heading hover:bg-ui-surface'
              }
            `}
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          <button
            onClick={handleNext}
            disabled={!canGoNext || isLoading}
            className={`
              flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors
              ${canGoNext && !isLoading
                ? 'bg-ui-accent hover:bg-ui-accent/90 text-ui-primary-foreground'
                : 'bg-ui-surface text-ui-muted cursor-not-allowed'
              }
            `}
          >
            {currentStep === 2 ? (
              <>
                Import {stats.pending} Cards
                <Upload className="w-4 h-4" />
              </>
            ) : (
              <>
                Next
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
});

ImportWizard.propTypes = {
  /** Available import formats */
  formats: PropTypes.array,
  /** Available destination folders */
  folders: PropTypes.array,
  /** Callback when file is selected */
  onFileSelect: PropTypes.func,
  /** Callback to start import */
  onImport: PropTypes.func,
  /** Parsed cards array */
  parsedCards: PropTypes.array,
  /** Loading state */
  isLoading: PropTypes.bool,
  /** Importing state */
  isImporting: PropTypes.bool,
  /** Import progress */
  importProgress: PropTypes.shape({
    current: PropTypes.number,
    total: PropTypes.number,
  }),
  /** Detected file format */
  detectedFormat: PropTypes.string,
  /** Error message */
  error: PropTypes.string,
  /** Callback to update a card */
  onUpdateCard: PropTypes.func,
  /** Callback to remove a card */
  onRemoveCard: PropTypes.func,
  /** Callback to clear all cards */
  onClearCards: PropTypes.func,
  /** Additional CSS classes */
  className: PropTypes.string,
};

export default ImportWizard;
