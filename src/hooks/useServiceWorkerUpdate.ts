import { useEffect } from 'react';
import { toast } from 'sonner';

const CHECK_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const LAST_CHECK_KEY = 'sw-last-update-check';

export const useServiceWorkerUpdate = () => {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const checkForUpdates = async () => {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          await registration.update();
          
          if (registration.waiting) {
            // New service worker is waiting
            toast.info('Nova versão disponível!', {
              description: 'O app será atualizado em 5 segundos...',
              duration: 5000,
            });
            
            // Tell the waiting service worker to take over
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            
            // Reload after 5 seconds
            setTimeout(() => {
              window.location.reload();
            }, 5000);
          }
        }
      } catch (error) {
        console.error('Error checking for SW updates:', error);
      }
    };

    const shouldCheck = () => {
      const lastCheck = localStorage.getItem(LAST_CHECK_KEY);
      if (!lastCheck) return true;
      
      const lastCheckTime = parseInt(lastCheck, 10);
      return Date.now() - lastCheckTime >= CHECK_INTERVAL;
    };

    const performCheck = () => {
      if (shouldCheck()) {
        localStorage.setItem(LAST_CHECK_KEY, Date.now().toString());
        checkForUpdates();
      }
    };

    // Check on mount
    performCheck();

    // Listen for controller change (new SW activated)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });

    // Set up interval for periodic checks
    const intervalId = setInterval(performCheck, CHECK_INTERVAL);

    return () => clearInterval(intervalId);
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
