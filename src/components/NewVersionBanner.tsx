import { useState, useEffect } from 'react';
import { RefreshCw, X } from 'lucide-react';

const NewVersionBanner = () => {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    let dismissed = false;

    const checkForWaitingSW = async () => {
      if (dismissed) return;
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg?.waiting) {
          setShowBanner(true);
        }
      } catch {}
    };

    // Listen for new SW installing
    const handleControllerChange = () => {
      // New SW took over — reload
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    // Check on mount
    checkForWaitingSW();

    // Also listen for future updates
    navigator.serviceWorker.getRegistration().then(reg => {
      if (!reg) return;

      // If already waiting
      if (reg.waiting) {
        setShowBanner(true);
        return;
      }

      // Listen for new installing SW
      reg.addEventListener('updatefound', () => {
        const newSW = reg.installing;
        if (!newSW) return;

        newSW.addEventListener('statechange', () => {
          if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
            // New version available (there's a waiting SW and an active one)
            setShowBanner(true);
          }
        });
      });
    });

    // Periodic check every 60s
    const interval = setInterval(checkForWaitingSW, 60_000);

    return () => {
      dismissed = true;
      clearInterval(interval);
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  const handleUpdate = async () => {
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg?.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
      // Clear caches
      if ('caches' in window) {
        const names = await caches.keys();
        await Promise.allSettled(names.map(n => caches.delete(n)));
      }
    } catch {}
    // Force reload regardless
    window.location.replace(`/?v=${Date.now()}`);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-gradient-to-r from-purple-600 to-purple-500 text-white px-4 py-2.5 flex items-center justify-center gap-3 shadow-lg animate-in slide-in-from-top duration-300">
      <RefreshCw className="h-4 w-4 animate-spin-slow" />
      <span className="text-sm font-medium">Nova versão disponível!</span>
      <button
        onClick={handleUpdate}
        className="px-3 py-1 rounded-full bg-white text-purple-700 text-xs font-bold hover:bg-white/90 transition-colors"
      >
        Atualizar agora
      </button>
      <button
        onClick={() => setShowBanner(false)}
        className="ml-1 p-0.5 rounded-full hover:bg-white/20 transition-colors"
        aria-label="Fechar"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

export default NewVersionBanner;