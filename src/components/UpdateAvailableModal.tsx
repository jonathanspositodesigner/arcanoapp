import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { forcePwaUpdate, UpdateStatus } from '@/utils/forcePwaUpdate';

const PWA_VERSION_KEY = 'pwa_version';

interface UpdateAvailableModalProps {
  serverVersion: string;
}

const UpdateAvailableModal = ({ serverVersion }: UpdateAvailableModalProps) => {
  const [status, setStatus] = useState<UpdateStatus | 'idle'>('idle');
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const isUpdating = status !== 'idle';

  const performUpdate = async () => {
    // Save version to localStorage so the modal won't show again
    try {
      localStorage.setItem(PWA_VERSION_KEY, serverVersion);
    } catch (_) {}

    await forcePwaUpdate({
      onStatus: (s) => setStatus(s),
    });
  };

  const statusText = () => {
    switch (status) {
      case 'checking': return 'Verificando...';
      case 'updating': return 'Atualizando...';
      case 'reloading': return 'Recarregando...';
      default: return 'Atualizar Agora';
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
            {statusText()}
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
