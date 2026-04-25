import { useState, useEffect } from 'react';
import { RefreshCw, X } from 'lucide-react';

const NewVersionBanner = () => {
  const [showBanner, setShowBanner] = useState(false);

  const openForceUpdatePage = (source: string) => {
    const nextUrl = new URL('/force-update', window.location.origin);
    nextUrl.searchParams.set('from', source);
    nextUrl.searchParams.set('returnTo', `${window.location.pathname}${window.location.search}`);
    window.location.assign(nextUrl.toString());
  };

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

    // Nunca recarregar automaticamente durante o uso do app.
    // Se uma nova versão assumir o controle, apenas exibir o banner
    // para o usuário decidir quando atualizar manualmente.
    const handleControllerChange = () => {
      setShowBanner(true);
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

  const handleUpdate = () => {
    setShowBanner(false);
    openForceUpdatePage('new-version-banner');
  };

  if (!showBanner) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-primary text-primary-foreground px-4 py-2.5 flex items-center justify-center gap-3 shadow-lg animate-in slide-in-from-top duration-300">
      <RefreshCw className="h-4 w-4 animate-spin-slow" />
      <span className="text-sm font-medium">Nova versão disponível!</span>
      <button
        onClick={handleUpdate}
        className="px-3 py-1 rounded-full bg-background text-foreground text-xs font-bold hover:bg-background/90 transition-colors"
      >
        Atualizar agora
      </button>
      <button
        onClick={() => setShowBanner(false)}
        className="ml-1 p-0.5 rounded-full hover:bg-primary-foreground/20 transition-colors"
        aria-label="Fechar"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

export default NewVersionBanner;