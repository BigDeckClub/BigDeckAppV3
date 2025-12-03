import React from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

/**
 * OfflineBanner - Shows a banner when the user is offline
 */
export function OfflineBanner() {
  const { isOnline, wasOffline } = useOnlineStatus();

  // Don't show anything if always been online
  if (isOnline && !wasOffline) {
    return null;
  }

  // Show reconnected message
  if (isOnline && wasOffline) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[9998] bg-gradient-to-r from-green-600 to-green-700 text-white py-2 px-4 text-center text-sm font-medium shadow-lg animate-fade-in">
        <div className="flex items-center justify-center gap-2">
          <Wifi className="w-4 h-4" />
          <span>Back online! Your connection has been restored.</span>
        </div>
      </div>
    );
  }

  // Show offline message
  return (
    <div className="fixed top-0 left-0 right-0 z-[9998] bg-gradient-to-r from-amber-600 to-amber-700 text-white py-2 px-4 text-center text-sm font-medium shadow-lg">
      <div className="flex items-center justify-center gap-2">
        <WifiOff className="w-4 h-4" />
        <span>You are offline. Some features may be unavailable.</span>
      </div>
    </div>
  );
}

export default OfflineBanner;
