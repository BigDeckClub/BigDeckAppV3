/**
 * DropZone - Enhanced drag-and-drop file upload zone
 * @module components/ui/DropZone
 */

import React, { memo, useState, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import { Upload, FileText, X, AlertCircle, CheckCircle2 } from 'lucide-react';

/**
 * File type configurations
 */
const FILE_CONFIGS = {
  csv: {
    extensions: ['.csv'],
    mimeTypes: ['text/csv', 'application/vnd.ms-excel'],
    icon: FileText,
    label: 'CSV',
  },
  txt: {
    extensions: ['.txt'],
    mimeTypes: ['text/plain'],
    icon: FileText,
    label: 'Text',
  },
  image: {
    extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
    mimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    icon: FileText,
    label: 'Image',
  },
};

/**
 * Validate file against accepted types
 */
const validateFile = (file, acceptedTypes) => {
  const extension = '.' + file.name.split('.').pop().toLowerCase();
  const mimeType = file.type;

  for (const type of acceptedTypes) {
    const config = FILE_CONFIGS[type];
    if (!config) continue;

    if (config.extensions.includes(extension) || config.mimeTypes.includes(mimeType)) {
      return { valid: true, type };
    }
  }

  return { valid: false, type: null };
};

/**
 * Format file size for display
 */
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

/**
 * DropZone component
 */
export const DropZone = memo(function DropZone({
  onFileSelect,
  acceptedTypes = ['csv', 'txt'],
  maxSize = 10 * 1024 * 1024, // 10MB default
  multiple = false,
  disabled = false,
  isLoading = false,
  selectedFile = null,
  onClearFile,
  title = 'Drop your file here',
  subtitle = 'or click to browse',
  successMessage,
  errorMessage,
  className = '',
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragError, setDragError] = useState(null);
  const inputRef = useRef(null);

  // Build accept string for input
  const acceptString = acceptedTypes
    .flatMap((type) => FILE_CONFIGS[type]?.extensions || [])
    .join(',');

  // Build format label for display
  const formatLabels = acceptedTypes
    .map((type) => FILE_CONFIGS[type]?.label || type.toUpperCase())
    .join(', ');

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled || isLoading) return;
    setIsDragging(true);
    setDragError(null);
  }, [disabled, isLoading]);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const processFile = useCallback((file) => {
    // Validate file type
    const validation = validateFile(file, acceptedTypes);
    if (!validation.valid) {
      setDragError(`Invalid file type. Please use ${formatLabels} files.`);
      return;
    }

    // Validate file size
    if (file.size > maxSize) {
      setDragError(`File too large. Maximum size is ${formatFileSize(maxSize)}.`);
      return;
    }

    setDragError(null);
    onFileSelect?.(file, validation.type);
  }, [acceptedTypes, formatLabels, maxSize, onFileSelect]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled || isLoading) return;

    const files = Array.from(e.dataTransfer?.files || []);
    if (files.length === 0) return;

    if (multiple) {
      files.forEach(processFile);
    } else {
      processFile(files[0]);
    }
  }, [disabled, isLoading, multiple, processFile]);

  const handleInputChange = useCallback((e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (multiple) {
      files.forEach(processFile);
    } else {
      processFile(files[0]);
    }

    // Reset input
    e.target.value = '';
  }, [multiple, processFile]);

  const handleClick = useCallback(() => {
    if (disabled || isLoading) return;
    inputRef.current?.click();
  }, [disabled, isLoading]);

  const handleClear = useCallback((e) => {
    e.stopPropagation();
    setDragError(null);
    onClearFile?.();
  }, [onClearFile]);

  // Determine current state
  const hasError = dragError || errorMessage;
  const hasSuccess = successMessage && !hasError;
  const hasFile = selectedFile && !hasError;

  return (
    <div
      className={`
        relative rounded-xl border-2 border-dashed transition-all duration-200
        ${isDragging
          ? 'border-accent bg-accent/5 scale-[1.01]'
          : hasError
            ? 'border-red-500/50 bg-red-500/5'
            : hasSuccess
              ? 'border-emerald-500/50 bg-emerald-500/5'
              : hasFile
                ? 'border-teal-500/50 bg-teal-500/5'
                : 'border-slate-600 hover:border-slate-500 hover:bg-slate-800/30'
        }
        ${disabled || isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
      role="button"
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      aria-label="File upload area"
    >
      <input
        ref={inputRef}
        type="file"
        accept={acceptString}
        multiple={multiple}
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled || isLoading}
      />

      <div className="p-8 flex flex-col items-center justify-center text-center">
        {/* Loading state */}
        {isLoading && (
          <>
            <div className="w-12 h-12 rounded-full border-2 border-teal-400 border-t-transparent animate-spin mb-4" />
            <p className="text-slate-300 font-medium">Processing file...</p>
          </>
        )}

        {/* Error state */}
        {!isLoading && hasError && (
          <>
            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6 text-red-400" />
            </div>
            <p className="text-red-300 font-medium mb-1">
              {dragError || errorMessage}
            </p>
            <button
              onClick={handleClear}
              className="text-sm text-slate-400 hover:text-white underline"
            >
              Try again
            </button>
          </>
        )}

        {/* Success state */}
        {!isLoading && !hasError && hasSuccess && (
          <>
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            </div>
            <p className="text-emerald-300 font-medium">{successMessage}</p>
          </>
        )}

        {/* File selected state */}
        {!isLoading && !hasError && !hasSuccess && hasFile && (
          <>
            <div className="w-12 h-12 rounded-full bg-teal-500/20 flex items-center justify-center mb-4">
              <FileText className="w-6 h-6 text-teal-400" />
            </div>
            <p className="text-white font-medium mb-1">{selectedFile.name}</p>
            <p className="text-sm text-slate-400 mb-3">
              {formatFileSize(selectedFile.size)}
            </p>
            {onClearFile && (
              <button
                onClick={handleClear}
                className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-red-400 transition-colors"
              >
                <X className="w-4 h-4" />
                Remove file
              </button>
            )}
          </>
        )}

        {/* Default state */}
        {!isLoading && !hasError && !hasSuccess && !hasFile && (
          <>
            <div className={`
              w-14 h-14 rounded-full flex items-center justify-center mb-4 transition-colors
              ${isDragging
                ? 'bg-accent/20'
                : 'bg-slate-800'
              }
            `}>
              <Upload className={`w-7 h-7 ${isDragging ? 'text-accent' : 'text-slate-400'}`} />
            </div>
            <p className={`font-medium mb-1 ${isDragging ? 'text-accent' : 'text-white'}`}>
              {isDragging ? 'Drop to upload' : title}
            </p>
            <p className="text-sm text-slate-400 mb-3">{subtitle}</p>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Supported: {formatLabels}</span>
              <span>•</span>
              <span>Max {formatFileSize(maxSize)}</span>
            </div>
          </>
        )}
      </div>

      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 rounded-xl bg-accent/10 pointer-events-none" />
      )}
    </div>
  );
});

DropZone.propTypes = {
  /** Callback when file is selected */
  onFileSelect: PropTypes.func,
  /** Accepted file types (keys from FILE_CONFIGS) */
  acceptedTypes: PropTypes.arrayOf(PropTypes.string),
  /** Maximum file size in bytes */
  maxSize: PropTypes.number,
  /** Allow multiple file selection */
  multiple: PropTypes.bool,
  /** Disable the drop zone */
  disabled: PropTypes.bool,
  /** Show loading state */
  isLoading: PropTypes.bool,
  /** Currently selected file */
  selectedFile: PropTypes.object,
  /** Callback to clear selected file */
  onClearFile: PropTypes.func,
  /** Title text */
  title: PropTypes.string,
  /** Subtitle text */
  subtitle: PropTypes.string,
  /** Success message to display */
  successMessage: PropTypes.string,
  /** Error message to display */
  errorMessage: PropTypes.string,
  /** Additional CSS classes */
  className: PropTypes.string,
};

export default DropZone;
