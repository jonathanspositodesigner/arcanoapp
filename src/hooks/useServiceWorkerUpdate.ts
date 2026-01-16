import { useEffect } from 'react';

const SESSION_CHECK_KEY = 'sw-checked-this-session';

export const useServiceWorkerUpdate = () => {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const shouldCheck = () => {
      // Use sessionStorage - resets when app is closed
      if (sessionStorage.getItem(SESSION_CHECK_KEY)) {
        return false;
      }
      sessionStorage.setItem(SESSION_CHECK_KEY, 'true');
      return true;
    };

    const checkForUpdates = async () => {
      try {
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
      }
    };

    // Check on mount (once per session)
    if (shouldCheck()) {
      checkForUpdates();
    }

    // Listen for controller change (new SW activated) - reload immediately
    const handleControllerChange = () => {
      window.location.reload();
    };
    
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);
};

// Function to clean old caches
export const cleanOldCaches = async () => {
  if (!('caches' in window)) return;
  
  try {
    const cacheNames = await caches.keys();
    const currentCacheId = 'arcanoapp-v5.0.0';
    
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
