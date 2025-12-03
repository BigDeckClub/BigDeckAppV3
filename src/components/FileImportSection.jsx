import React, { useState, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Upload, FileText, Download, X, Check, AlertTriangle, Loader2, Trash2, Edit3 } from 'lucide-react';
import { useFileImport } from '../hooks/useFileImport';
import { downloadTemplate, SUPPORTED_FORMATS } from '../utils/csvTemplates';
import { useToast, TOAST_TYPES } from '../context/ToastContext';
import { getSetDisplayName, getSetCode } from '../utils/cardHelpers';

// Quality options for editing
const QUALITY_OPTIONS = ['NM', 'LP', 'MP', 'HP', 'DMG'];

/**
 * Helper to map string type to TOAST_TYPES enum safely
 * @param {string} type - Toast type string
 * @returns {string} TOAST_TYPES enum value
 */
const mapToastType = (type) => {
  if (typeof type !== 'string') return TOAST_TYPES.INFO;
  const normalized = type.trim().toUpperCase();
  return TOAST_TYPES[normalized] || TOAST_TYPES.INFO;
};

export const FileImportSection = ({
  addInventoryItem,
  createdFolders = [],
}) => {
  const { showToast } = useToast();
  const fileInputRef = useRef(null);
  
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState('auto');
  const [selectedFolder, setSelectedFolder] = useState('Unsorted');
  const [editingId, setEditingId] = useState(null);
  
  const {
    parsedCards,
    detectedFormat,
    isLoading,
    isImporting,
    importProgress,
    error,
    parseFile,
    updateCard,
    removeCard,
    importCards,
    clearCards,
  } = useFileImport({ 
    addInventoryItem,
    showToast: (message, type) => showToast(message, mapToastType(type)),
  });

  // All available folders
  const allFolders = ['Unsorted', ...createdFolders];

  // Helper to format price safely
  const formatPrice = (price) => {
    if (!price) return '-';
    const parsed = parseFloat(price);
    return isNaN(parsed) ? '-' : `$${parsed.toFixed(2)}`;
  };

  // Handle file selection
  const handleFileSelect = useCallback((file) => {
    if (!file) return;
    
    const extension = file.name.split('.').pop().toLowerCase();
    if (!['csv', 'txt'].includes(extension)) {
      showToast('Please select a CSV or TXT file', TOAST_TYPES.WARNING);
      return;
    }
    
    parseFile(file, selectedFormat);
  }, [parseFile, selectedFormat, showToast]);

  // Drag and drop handlers
  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  // Handle file input change
  const handleInputChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  }, [handleFileSelect]);

  // Open file picker
  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Handle import button
  const handleImport = useCallback(() => {
    importCards(selectedFolder);
  }, [importCards, selectedFolder]);

  // Get status badge
  const getStatusBadge = (status) => {
    switch (status) {
      case 'imported':
        return (
          <span className="flex items-center gap-1 text-xs text-emerald-400">
            <Check className="w-3 h-3" />
            Imported
          </span>
        );
      case 'error':
        return (
          <span className="flex items-center gap-1 text-xs text-red-400">
            <AlertTriangle className="w-3 h-3" />
            Error
          </span>
        );
      default:
        return (
          <span className="text-xs text-slate-400">Pending</span>
        );
    }
  };

  // Count cards by status
  const pendingCount = parsedCards.filter(c => c.status === 'pending').length;
  const importedCount = parsedCards.filter(c => c.status === 'imported').length;
  const errorCount = parsedCards.filter(c => c.status === 'error').length;

  return (
    <div className="space-y-4">
      {/* Controls Row */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Format Selector */}
        <div className="flex-1 min-w-[200px]">
          <label htmlFor="format-select" className="block text-xs text-slate-400 mb-1">
            Import Format
          </label>
          <select
            id="format-select"
            value={selectedFormat}
            onChange={(e) => setSelectedFormat(e.target.value)}
            className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-teal-400"
          >
            {SUPPORTED_FORMATS.map(format => (
              <option key={format.value} value={format.value}>
                {format.label}
              </option>
            ))}
          </select>
        </div>

        {/* Folder Selector */}
        <div className="flex-1 min-w-[200px]">
          <label htmlFor="folder-select" className="block text-xs text-slate-400 mb-1">
            Destination Folder
          </label>
          <select
            id="folder-select"
            value={selectedFolder}
            onChange={(e) => setSelectedFolder(e.target.value)}
            className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-teal-400"
          >
            {allFolders.map(folder => (
              <option key={folder} value={folder}>
                {folder}
              </option>
            ))}
          </select>
        </div>

        {/* Download Template Dropdown */}
        <div className="flex-1 min-w-[200px]">
          <label htmlFor="template-select" className="block text-xs text-slate-400 mb-1">
            Download Template
          </label>
          <div className="flex gap-2">
            <select
              id="template-select"
              className="flex-1 bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-teal-400"
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) {
                  downloadTemplate(e.target.value);
                  e.target.value = '';
                }
              }}
            >
              <option value="" disabled>Select format...</option>
              <option value="moxfield">Moxfield</option>
              <option value="deckbox">Deckbox</option>
              <option value="tcgplayer">TCGPlayer</option>
              <option value="archidekt">Archidekt</option>
              <option value="simple">Simple Text</option>
            </select>
            <button
              onClick={() => downloadTemplate(selectedFormat)}
              className={`px-3 py-2 rounded-lg transition-colors ${
                selectedFormat === 'auto' 
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                  : 'bg-slate-700 hover:bg-slate-600'
              }`}
              title={selectedFormat === 'auto' ? 'Select a format to download its template' : 'Download selected template'}
              type="button"
              disabled={selectedFormat === 'auto'}
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Drag and Drop Zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={openFilePicker}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all
          ${isDragging 
            ? 'border-teal-400 bg-teal-400/10' 
            : 'border-slate-600 hover:border-slate-500 hover:bg-slate-800/30'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.txt"
          onChange={handleInputChange}
          className="hidden"
        />
        
        {isLoading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-10 h-10 text-teal-400 animate-spin" />
            <p className="text-slate-300">Parsing file...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Upload className={`w-10 h-10 ${isDragging ? 'text-teal-400' : 'text-slate-500'}`} />
            <div>
              <p className="text-slate-300">
                {isDragging ? 'Drop file here' : 'Drag & drop a CSV or TXT file'}
              </p>
              <p className="text-sm text-slate-500 mt-1">
                or click to browse
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-900/20 border border-red-500/50 rounded-lg text-red-300">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
          <button
            onClick={clearCards}
            className="ml-auto p-1 hover:bg-red-500/20 rounded"
            type="button"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Parsed Cards Preview */}
      {parsedCards.length > 0 && (
        <div className="space-y-3">
          {/* Summary Header */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-cyan-400" />
              <span className="font-medium">
                {parsedCards.length} cards parsed
                {detectedFormat && (
                  <span className="text-slate-400 text-sm ml-2">
                    (Format: {detectedFormat})
                  </span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm">
              {pendingCount > 0 && (
                <span className="text-slate-400">{pendingCount} pending</span>
              )}
              {importedCount > 0 && (
                <span className="text-emerald-400">{importedCount} imported</span>
              )}
              {errorCount > 0 && (
                <span className="text-red-400">{errorCount} errors</span>
              )}
            </div>
          </div>

          {/* Progress Bar during import */}
          {isImporting && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Importing cards...</span>
                <span className="text-teal-400">
                  {importProgress.current} / {importProgress.total}
                </span>
              </div>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-teal-500 transition-all duration-300"
                  style={{ 
                    width: `${importProgress.total > 0 
                      ? (importProgress.current / importProgress.total) * 100 
                      : 0}%` 
                  }}
                />
              </div>
            </div>
          )}

          {/* Preview Table */}
          <div className="border border-slate-700 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-800/50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-400 uppercase">Card Name</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-400 uppercase">Set</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-slate-400 uppercase">Qty</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-slate-400 uppercase">Condition</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-slate-400 uppercase">Foil</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-400 uppercase">Price</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-slate-400 uppercase">Status</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-slate-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {parsedCards.map((card) => (
                    <tr 
                      key={card.id} 
                      className={`
                        ${card.status === 'imported' ? 'bg-emerald-900/10' : ''}
                        ${card.status === 'error' ? 'bg-red-900/10' : ''}
                        hover:bg-slate-800/30
                      `}
                    >
                      {editingId === card.id ? (
                        // Editing mode
                        <>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={card.name}
                              onChange={(e) => updateCard(card.id, { name: e.target.value })}
                              className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:ring-1 focus:ring-teal-400"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={getSetCode(card.set)}
                              onChange={(e) => updateCard(card.id, { set: e.target.value.toUpperCase() })}
                              className="w-20 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:ring-1 focus:ring-teal-400"
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <input
                              type="number"
                              min="1"
                              value={card.quantity}
                              onChange={(e) => updateCard(card.id, { quantity: parseInt(e.target.value, 10) || 1 })}
                              className="w-16 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-sm text-center focus:outline-none focus:ring-1 focus:ring-teal-400"
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <select
                              value={card.condition}
                              onChange={(e) => updateCard(card.id, { condition: e.target.value })}
                              className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:ring-1 focus:ring-teal-400"
                            >
                              {QUALITY_OPTIONS.map(q => (
                                <option key={q} value={q}>{q}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={card.foil}
                              onChange={(e) => updateCard(card.id, { foil: e.target.checked })}
                              className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-teal-500 focus:ring-teal-400"
                            />
                          </td>
                          <td className="px-3 py-2 text-right">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={card.price}
                              onChange={(e) => updateCard(card.id, { price: e.target.value })}
                              className="w-20 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-sm text-right focus:outline-none focus:ring-1 focus:ring-teal-400"
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            {getStatusBadge(card.status)}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-1 text-teal-400 hover:text-teal-300"
                              title="Done editing"
                              type="button"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          </td>
                        </>
                      ) : (
                        // Display mode
                        <>
                          <td className="px-3 py-2 text-white font-medium">{card.name}</td>
                          <td className="px-3 py-2 text-slate-400">{getSetDisplayName(card.set, true) || '-'}</td>
                          <td className="px-3 py-2 text-center text-slate-300">{card.quantity}</td>
                          <td className="px-3 py-2 text-center text-slate-300">{card.condition}</td>
                          <td className="px-3 py-2 text-center">
                            {card.foil ? (
                              <span className="text-amber-400">✦</span>
                            ) : (
                              <span className="text-slate-600">-</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right text-slate-300">
                            {formatPrice(card.price)}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {getStatusBadge(card.status)}
                            {card.error && (
                              <span className="block text-xs text-red-400 mt-1">{card.error}</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {card.status !== 'imported' && (
                                <button
                                  onClick={() => setEditingId(card.id)}
                                  className="p-1 text-slate-400 hover:text-slate-300"
                                  title="Edit"
                                  type="button"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => removeCard(card.id)}
                                className="p-1 text-slate-400 hover:text-red-400"
                                title="Remove"
                                type="button"
                              >
                                <Trash2 className="w-4 h-4" />
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

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <button
              onClick={clearCards}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors text-sm"
              type="button"
            >
              Clear All
            </button>
            
            <button
              onClick={handleImport}
              disabled={isImporting || pendingCount === 0}
              className={`
                flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all text-sm
                ${pendingCount > 0 && !isImporting
                  ? 'bg-teal-600 hover:bg-teal-500 text-white'
                  : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                }
              `}
              type="button"
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Import {pendingCount} Cards
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

FileImportSection.propTypes = {
  addInventoryItem: PropTypes.func.isRequired,
  createdFolders: PropTypes.array,
};

export default FileImportSection;
