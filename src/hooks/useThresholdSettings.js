import { useState, useEffect, useCallback, useRef } from 'react';
import { useApi } from './useApi';
import { DEFAULT_SETTINGS } from '../constants/thresholds';

/**
 * Custom hook for managing threshold settings with auto-save functionality
 * @returns {Object} Threshold settings state and handlers
 */
export function useThresholdSettings() {
  const { post } = useApi();
  const [thresholdSettings, setThresholdSettings] = useState(DEFAULT_SETTINGS);
  
  // Auto-save status indicator
  const [saveStatus, setSaveStatus] = useState(''); // '', 'saving', 'saved'
  const saveTimeoutRef = useRef(null);
  const debounceTimeoutRef = useRef(null);
  
  // Flag to skip auto-save during initial load
  const isInitializedRef = useRef(false);

  // Cleanup timeouts on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    };
  }, []);

  // Auto-save with debounce (500ms)
  const saveSettingsToBackend = useCallback(async (settings) => {
    setSaveStatus('saving');
    try {
      localStorage.setItem('thresholdSettings', JSON.stringify(settings));
      await post('/settings/thresholdSettings', { value: settings });
      setSaveStatus('saved');
      // Clear saved status after 2 seconds
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => setSaveStatus(''), 2000);
    } catch (err) {
      console.error('[Settings] Error saving to backend:', err);
      setSaveStatus('');
    }
  }, [post]);

  // Debounced save effect (500ms) - skips during initial load
  useEffect(() => {
    // Skip auto-save during initial load
    if (!isInitializedRef.current) {
      return;
    }
    
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    debounceTimeoutRef.current = setTimeout(() => {
      saveSettingsToBackend(thresholdSettings);
    }, 500);
    
    return () => {
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    };
  }, [thresholdSettings, saveSettingsToBackend]);

  // Helper function to load settings from localStorage
  const loadFromLocalStorage = useCallback(() => {
    const saved = localStorage.getItem('thresholdSettings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setThresholdSettings(parsed);
        console.log('[Settings] Threshold settings loaded from localStorage:', parsed);
        return true;
      } catch (err) {
        console.error('[Settings] Failed to parse saved threshold settings:', err);
      }
    }
    return false;
  }, []);

  // Load threshold settings from localStorage/backend on mount
  useEffect(() => {
    // Try to load from backend first
    fetch('/api/settings/thresholdSettings')
      .then(res => res.json())
      .then(data => {
        if (data) {
          setThresholdSettings(data);
          console.log('[Settings] Threshold settings loaded from backend:', data);
        } else {
          // Fallback to localStorage if backend has no data
          loadFromLocalStorage();
        }
      })
      .catch(err => {
        console.error('[Settings] Error loading from backend, falling back to localStorage:', err);
        loadFromLocalStorage();
      })
      .finally(() => {
        // Mark as initialized after initial load completes
        isInitializedRef.current = true;
      });
  }, [loadFromLocalStorage]);

  // Handler to update slider values
  const handleSliderChange = useCallback((key, value) => {
    setThresholdSettings(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  // Reset sliders to default values
  const handleResetSliders = useCallback(() => {
    setThresholdSettings(DEFAULT_SETTINGS);
  }, []);

  // Apply quick preset
  const handleApplyQuickPreset = useCallback((preset) => {
    setThresholdSettings({
      baseStock: preset.baseStock,
      landMultiplier: preset.landMultiplier,
      velocityWeeks: preset.velocityWeeks
    });
  }, []);

  return {
    thresholdSettings,
    saveStatus,
    handleSliderChange,
    handleResetSliders,
    handleApplyQuickPreset
  };
}

export default useThresholdSettings;
