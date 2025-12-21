import React from 'react';

/**
 * TabLoadingSpinner - Loading fallback for lazy-loaded tab components
 * Provides visual feedback while tab content is being loaded
 */
export const TabLoadingSpinner = () => {
  return (
    <div className="flex items-center justify-center min-h-[400px] w-full">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 animate-spin text-[var(--bda-primary)] border-4 border-[var(--bda-primary)] border-t-transparent rounded-full"></div>
        <p className="text-[var(--text-muted)] text-sm animate-pulse">Loading...</p>
      </div>
    </div>
  );
};

export default TabLoadingSpinner;
