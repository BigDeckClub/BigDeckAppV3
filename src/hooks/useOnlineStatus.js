import { useState, useEffect, useRef } from 'react';

/**
 * Hook to track online/offline status
 * @returns {{ isOnline: boolean, wasOffline: boolean }}
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [wasOffline, setWasOffline] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      // Keep wasOffline true for a short period to show reconnection message
      timeoutRef.current = setTimeout(() => setWasOffline(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
      // Clear timeout if going offline while showing reconnection message
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      // Clean up timeout on unmount
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { isOnline, wasOffline };
}

export default useOnlineStatus;
