import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { cleanOldCaches, forceServiceWorkerUpdate } from "./hooks/useServiceWorkerUpdate";

// Force immediate update check by clearing old timestamp
localStorage.removeItem('sw-last-update-check');

// Clean old caches and force SW update on initial load
if ('serviceWorker' in navigator) {
  // Unregister old service workers and register fresh
  const forceNewServiceWorker = async () => {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      console.log('[SW] Found', registrations.length, 'registrations');
      
      // Unregister all old service workers
      for (const registration of registrations) {
        console.log('[SW] Unregistering old SW:', registration.scope);
        await registration.unregister();
      }
      
      // Clean old caches
      await cleanOldCaches();
      
      // Force update check
      await forceServiceWorkerUpdate();
      
      console.log('[SW] Cleanup complete, new SW will be registered by Vite PWA plugin');
    } catch (error) {
      console.error('[SW] Error during cleanup:', error);
    }
  };
  
  forceNewServiceWorker();
  
  // Listen for controller change (new SW activated)
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    console.log('[SW] Controller changed, reloading page...');
    window.location.reload();
  });
  
  // Listen for messages from SW
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'CACHE_UPDATED') {
      console.log('[SW] Cache updated message received, reloading...');
      window.location.reload();
    }
  });
}

// Initialize React app
createRoot(document.getElementById("root")!).render(<App />);
