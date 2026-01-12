import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
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

// Current app version - update this when releasing new versions
export const APP_VERSION = '5.0.0';

interface AppVersionSettings {
  min_version: string;
  force_update: boolean;
  message: string;
}

const compareVersions = (v1: string, v2: string): number => {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 < p2) return -1;
    if (p1 > p2) return 1;
  }
  return 0;
};

export const ForceUpdateModal = () => {
  const [showModal, setShowModal] = useState(false);
  const [message, setMessage] = useState('Nova versão disponível! Clique para atualizar.');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const checkVersion = async () => {
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('value')
          .eq('id', 'app_version')
          .single();

        if (error || !data) {
          console.log('[ForceUpdate] No version settings found');
          return;
        }

        const settings = data.value as unknown as AppVersionSettings;
        console.log('[ForceUpdate] Settings:', settings);
        console.log('[ForceUpdate] Current version:', APP_VERSION);

        // Check if update is needed
        const needsUpdate = settings.force_update || 
          compareVersions(APP_VERSION, settings.min_version) < 0;

        if (needsUpdate) {
          console.log('[ForceUpdate] Update required!');
          setMessage(settings.message || 'Nova versão disponível! Clique para atualizar.');
          setShowModal(true);
        }
      } catch (err) {
        console.error('[ForceUpdate] Error checking version:', err);
      }
    };

    checkVersion();
  }, []);

  const handleUpdate = async () => {
    setIsUpdating(true);
    console.log('[ForceUpdate] Starting forced update...');

    try {
      // 1. Clear all caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        console.log('[ForceUpdate] Clearing caches:', cacheNames);
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }

      // 2. Unregister all service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        console.log('[ForceUpdate] Unregistering', registrations.length, 'service workers');
        await Promise.all(registrations.map(reg => reg.unregister()));
      }

      // 3. Clear relevant localStorage
      localStorage.removeItem('sw-last-update-check');
      
      // 4. Mark that we've updated to prevent loop
      sessionStorage.setItem('force-update-completed', 'true');

      console.log('[ForceUpdate] Cleanup complete, reloading...');
      
      // 5. Force reload from server (bypass cache)
      window.location.href = window.location.href.split('?')[0] + '?v=' + Date.now();
    } catch (err) {
      console.error('[ForceUpdate] Error during update:', err);
      // Force reload anyway
      window.location.reload();
    }
  };

  // Don't show if we just completed an update
  if (sessionStorage.getItem('force-update-completed')) {
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
            Atualização Disponível! 🎉
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            {message}
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
