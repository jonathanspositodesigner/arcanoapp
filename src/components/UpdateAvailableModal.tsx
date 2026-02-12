import { useState } from 'react';
import { RefreshCw } from 'lucide-react';

const LAST_FORCE_UPDATE_KEY = 'last_force_update';

interface UpdateAvailableModalProps {
  forceUpdateAt: string;
}

const UpdateAvailableModal = ({ forceUpdateAt }: UpdateAvailableModalProps) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const performUpdate = async () => {
    setIsUpdating(true);

    try {
      // Save timestamp BEFORE clearing storage so the modal won't loop
      // We need to set it in a way that survives the reload
      const ackValue = forceUpdateAt;

      // Clear storage except our acknowledgment key
      try {
        const keysToKeep = [LAST_FORCE_UPDATE_KEY];
        const savedValues: Record<string, string> = {};
        keysToKeep.forEach(key => {
          const val = localStorage.getItem(key);
          if (val) savedValues[key] = val;
        });

        localStorage.clear();
        sessionStorage.clear();

        // Restore our key + set the new acknowledgment
        localStorage.setItem(LAST_FORCE_UPDATE_KEY, ackValue);
        Object.entries(savedValues).forEach(([k, v]) => {
          if (k !== LAST_FORCE_UPDATE_KEY) localStorage.setItem(k, v);
        });
      } catch (e) {
        console.warn('[Update] Storage clear warning:', e);
        // Even if clear fails, try to set our key
        try { localStorage.setItem(LAST_FORCE_UPDATE_KEY, ackValue); } catch (_) {}
      }

      // Delete all caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }

      // Unregister all Service Workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          if (registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
          await registration.unregister();
        }
      }

      await new Promise(r => setTimeout(r, 500));

      const bustParams = `?_force=${Date.now()}&_v=${Math.random().toString(36).substring(7)}`;
      window.location.replace('/' + bustParams);
    } catch (error) {
      console.error('[Update] Error:', error);
      try { localStorage.setItem(LAST_FORCE_UPDATE_KEY, forceUpdateAt); } catch (_) {}
      window.location.href = '/?_recovery=' + Date.now();
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#1a1025] border border-purple-500/30 rounded-2xl p-6 max-w-sm w-full shadow-2xl shadow-purple-500/20">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="p-3 bg-gradient-to-br from-purple-500 to-fuchsia-500 rounded-full">
            <RefreshCw className={`h-8 w-8 text-white ${isUpdating ? 'animate-spin' : ''}`} />
          </div>

          <div>
            <h2 className="text-xl font-bold text-white mb-1">
              Nova versão disponível!
            </h2>
            <p className="text-sm text-gray-400">
              Uma atualização está disponível. Atualize para ter acesso às últimas melhorias.
            </p>
          </div>

          <button
            onClick={performUpdate}
            disabled={isUpdating}
            className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-50"
          >
            {isUpdating ? 'Atualizando...' : 'Atualizar Agora'}
          </button>

          <button
            onClick={() => setDismissed(true)}
            disabled={isUpdating}
            className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
          >
            Depois
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpdateAvailableModal;
