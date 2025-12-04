import { useState, useCallback } from 'react';
import { getPreferredMarketplace, setPreferredMarketplace as savePreference } from '../utils/marketplaceUrls';

/**
 * Hook for managing marketplace preferences in localStorage
 * @returns {Object} - { preferredMarketplace, setPreferredMarketplace, rememberPreference, setRememberPreference }
 */
export function useMarketplacePreferences() {
  const [preferredMarketplace, setMarketplace] = useState(() => getPreferredMarketplace());
  // Initialize rememberPreference based on whether a preference exists in localStorage
  const [rememberPreference, setRememberPreference] = useState(() => {
    return localStorage.getItem('preferredMarketplace') !== null;
  });

  const setPreferredMarketplace = useCallback((marketplace) => {
    setMarketplace(marketplace);
    if (rememberPreference) {
      savePreference(marketplace);
    }
  }, [rememberPreference]);

  const handleRememberChange = useCallback((remember) => {
    setRememberPreference(remember);
    if (remember) {
      savePreference(preferredMarketplace);
    } else {
      localStorage.removeItem('preferredMarketplace');
    }
  }, [preferredMarketplace]);

  return {
    preferredMarketplace,
    setPreferredMarketplace,
    rememberPreference,
    setRememberPreference: handleRememberChange,
  };
}

export default useMarketplacePreferences;
