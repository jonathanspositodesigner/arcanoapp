import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { RefreshCw, Sparkles } from 'lucide-react';

// Chave versionada - mudar quando quiser forçar novo modal para todos
const MODAL_VERSION = 'v5.1.0';
const STORAGE_KEY = `arcano-update-modal-${MODAL_VERSION}`;

export const OneTimeUpdateModal = () => {
  const [showModal] = useState(() => {
    // Só mostra se NUNCA viu este modal específico
    return localStorage.getItem(STORAGE_KEY) !== 'seen';
  });
  
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdate = async () => {
    setIsUpdating(true);
    
    try {
      // 1. Marcar como visto ANTES de limpar (para não aparecer no reload)
      localStorage.setItem(STORAGE_KEY, 'seen');
      
      // 2. Limpar todos os caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      
      // 3. Desregistrar service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(reg => reg.unregister()));
      }
      
      // 4. Limpar storage relacionado a cache
      localStorage.removeItem('sw-last-update-check');
      
      // 5. Reload forçado com cache bust
      window.location.href = window.location.href.split('?')[0] + '?v=' + Date.now();
    } catch (err) {
      console.error('[OneTimeUpdateModal] Error during update:', err);
      // Force reload anyway
      localStorage.setItem(STORAGE_KEY, 'seen');
      window.location.reload();
    }
  };

  if (!showModal) {
    return null;
  }

  return (
    <AlertDialog open={showModal}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
          </div>
          <AlertDialogTitle className="text-center text-xl">
            Nova Versão Disponível! 🎉
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            Atualizamos o app com melhorias importantes. Clique para atualizar e ter a melhor experiência!
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-center">
          <AlertDialogAction
            onClick={handleUpdate}
            disabled={isUpdating}
            className="w-full sm:w-auto min-w-[200px]"
          >
            {isUpdating ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Atualizando...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Atualizar Agora
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
