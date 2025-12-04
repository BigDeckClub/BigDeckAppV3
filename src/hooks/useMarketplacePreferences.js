import { useState, useCallback } from 'react';
import { getPreferredMarketplace, setPreferredMarketplace as savePreference } from '../utils/marketplaceUrls';

/**
 * Hook for managing marketplace preferences in localStorage
 * @returns {Object} - { preferredMarketplace, setPreferredMarketplace, rememberPreference, setRememberPreference }
 */
export function useMarketplacePreferences() {
  const [preferredMarketplace, setMarketplace] = useState(() => getPreferredMarketplace());
  const [rememberPreference, setRememberPreference] = useState(false);

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
