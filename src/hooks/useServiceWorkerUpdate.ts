import { useEffect, useRef } from 'react';

const LAST_CHECK_KEY = 'sw-last-check-at';
const CHECK_INTERVAL_MS = 30 * 1000; // 30 seconds minimum between checks

export const useServiceWorkerUpdate = () => {
  const isCheckingRef = useRef(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const shouldCheck = () => {
      const lastCheck = localStorage.getItem(LAST_CHECK_KEY);
      if (!lastCheck) return true;
      
      const elapsed = Date.now() - parseInt(lastCheck, 10);
      return elapsed >= CHECK_INTERVAL_MS;
    };

    const checkForUpdates = async () => {
      // Prevent concurrent checks
      if (isCheckingRef.current) return;
      if (!shouldCheck()) return;
      
      isCheckingRef.current = true;
      
      try {
        // Update timestamp before checking
        localStorage.setItem(LAST_CHECK_KEY, Date.now().toString());
        
        // First, clean old caches silently
        await cleanOldCaches();
        
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          await registration.update();
          
          if (registration.waiting) {
            // Tell the waiting service worker to take over immediately
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
        }
        
        console.log('[SW] Update check completed');
      } catch (error) {
        console.error('[SW] Error checking for updates:', error);
      } finally {
        isCheckingRef.current = false;
      }
    };

    // Check on mount
    checkForUpdates();

    // Check when app becomes visible (user returns from background)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkForUpdates();
      }
    };

    // Check when window gains focus
    const handleFocus = () => {
      checkForUpdates();
    };

    // Check on pageshow (back/forward cache)
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        checkForUpdates();
      }
    };

    // Listen for controller change (new SW activated) - reload immediately
    const handleControllerChange = () => {
      window.location.reload();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('pageshow', handlePageShow);
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('pageshow', handlePageShow);
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);
};

// Function to clean old caches
export const cleanOldCaches = async () => {
  if (!('caches' in window)) return;
  
  try {
    const cacheNames = await caches.keys();
    const currentCacheId = 'arcanoapp-v5.2.0';
    
    console.log('[SW] Found caches:', cacheNames);
    
    await Promise.all(
      cacheNames.map(async (cacheName) => {
        // Delete ALL caches that don't match current version (including old arcanoapp versions)
        if (!cacheName.includes(currentCacheId)) {
          console.log('[SW] Deleting old cache:', cacheName);
          await caches.delete(cacheName);
        }
      })
    );
    
    console.log('[SW] Cache cleanup complete');
  } catch (error) {
    console.error('[SW] Error cleaning old caches:', error);
  }
};

// Function to force SW update
export const forceServiceWorkerUpdate = async () => {
  if (!('serviceWorker' in navigator)) return;
  
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      await registration.update();
      
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    }
  } catch (error) {
    console.error('Error forcing SW update:', error);
  }
};
