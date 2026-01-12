import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { cleanOldCaches, forceServiceWorkerUpdate } from "./hooks/useServiceWorkerUpdate";

// Clean old caches and force SW update on initial load
if ('serviceWorker' in navigator) {
  // Clean old caches
  cleanOldCaches();
  
  // Force update check on page load
  forceServiceWorkerUpdate();
  
  // Listen for messages from SW
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'CACHE_UPDATED') {
      console.log('Cache updated, reloading...');
      window.location.reload();
    }
  });
}

// Initialize React app
createRoot(document.getElementById("root")!).render(<App />);
