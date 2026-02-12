import { useState } from 'react';
import { RefreshCw, X } from 'lucide-react';

interface UpdateAvailableModalProps {
  latestVersion: string;
}

const UpdateAvailableModal = ({ latestVersion }: UpdateAvailableModalProps) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const performUpdate = async () => {
    setIsUpdating(true);

    try {
      // Clear all storage
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (e) {
        console.warn('[Update] Storage clear warning:', e);
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

      // Wait briefly for cleanup
      await new Promise(r => setTimeout(r, 500));

      // Hard reload with cache-busting
      const bustParams = `?_force=${Date.now()}&_v=${Math.random().toString(36).substring(7)}`;
      window.location.replace('/' + bustParams);
    } catch (error) {
      console.error('[Update] Error:', error);
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
              Versão {latestVersion} está disponível. Atualize para ter acesso às últimas melhorias.
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
