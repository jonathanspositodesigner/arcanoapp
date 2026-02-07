import { useEffect, useState } from 'react';
import { RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';

const ForceUpdate = () => {
  const [status, setStatus] = useState<'cleaning' | 'done' | 'error'>('cleaning');
  const [step, setStep] = useState<string>('Iniciando...');

  useEffect(() => {
    const forceCleanAndReload = async () => {
      try {
        console.log('[ForceUpdate] Starting aggressive force update process...');
        
        // Step 1: Clear ALL storage types
        setStep('Limpando armazenamento local...');
        console.log('[ForceUpdate] Step 1: Clearing storage...');
        try {
          localStorage.clear();
          sessionStorage.clear();
          console.log('[ForceUpdate] Storage cleared');
        } catch (e) {
          console.warn('[ForceUpdate] Storage clear warning:', e);
        }

        // Step 2: Delete ALL caches
        setStep('Deletando caches...');
        console.log('[ForceUpdate] Step 2: Deleting caches...');
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          console.log('[ForceUpdate] Found caches:', cacheNames);
          await Promise.all(cacheNames.map(async (name) => {
            const deleted = await caches.delete(name);
            console.log(`[ForceUpdate] Cache "${name}" deleted:`, deleted);
          }));
          console.log('[ForceUpdate] All caches deleted');
        }

        // Step 3: Force skipWaiting on any waiting SW, then unregister ALL
        setStep('Removendo Service Workers...');
        console.log('[ForceUpdate] Step 3: Handling Service Workers...');
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          console.log('[ForceUpdate] Found SW registrations:', registrations.length);
          
          for (const registration of registrations) {
            // If there's a waiting SW, tell it to skip waiting
            if (registration.waiting) {
              console.log('[ForceUpdate] Sending SKIP_WAITING to waiting SW');
              registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
            
            // Also try the active SW
            if (registration.active) {
              console.log('[ForceUpdate] Sending SKIP_WAITING to active SW');
              registration.active.postMessage({ type: 'SKIP_WAITING' });
            }
            
            // Unregister
            const unregistered = await registration.unregister();
            console.log('[ForceUpdate] Unregistered SW:', registration.scope, unregistered);
          }
        }

        // Step 4: Wait for cleanup to propagate
        setStep('Aguardando limpeza...');
        console.log('[ForceUpdate] Step 4: Waiting for cleanup...');
        await new Promise(r => setTimeout(r, 800));

        // Step 5: Pre-fetch the new version with no-cache headers
        setStep('Baixando versão nova...');
        console.log('[ForceUpdate] Step 5: Fetching fresh version...');
        try {
          await fetch('/', { 
            cache: 'no-store',
            headers: { 
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0'
            }
          });
          console.log('[ForceUpdate] Fresh fetch completed');
        } catch (e) {
          console.warn('[ForceUpdate] Fresh fetch warning:', e);
        }

        // Step 6: Mark as done
        setStatus('done');
        setStep('Redirecionando...');
        console.log('[ForceUpdate] Step 6: Redirecting...');

        // Step 7: Redirect with extreme cache busting
        await new Promise(r => setTimeout(r, 500));
        
        // Use location.replace to prevent back button issues
        // Add multiple cache-busting params
        const bustParams = `?_force=${Date.now()}&_nocache=1&_v=${Math.random().toString(36).substring(7)}`;
        console.log('[ForceUpdate] Redirecting to:', '/' + bustParams);
        
        window.location.replace('/' + bustParams);

      } catch (error) {
        console.error('[ForceUpdate] Error during force update:', error);
        setStatus('error');
        setStep('Erro ao atualizar');
        
        // Even on error, try to redirect after a delay
        setTimeout(() => {
          window.location.href = '/?_error_recovery=' + Date.now();
        }, 2000);
      }
    };

    forceCleanAndReload();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0a15] via-[#1a0f25] to-[#0a0510] flex flex-col items-center justify-center text-white p-4">
      {status === 'cleaning' && (
        <>
          <RefreshCw className="w-16 h-16 text-fuchsia-500 animate-spin mb-4" />
          <h1 className="text-2xl font-bold mb-2">Atualizando...</h1>
          <p className="text-gray-400 text-center mb-2">{step}</p>
          <p className="text-xs text-gray-500 text-center">
            Limpando cache e baixando versão mais recente
          </p>
        </>
      )}
      
      {status === 'done' && (
        <>
          <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
          <h1 className="text-2xl font-bold mb-2">Atualizado!</h1>
          <p className="text-gray-400 text-center">{step}</p>
        </>
      )}
      
      {status === 'error' && (
        <>
          <AlertTriangle className="w-16 h-16 text-yellow-500 mb-4" />
          <h1 className="text-2xl font-bold mb-2">Ops!</h1>
          <p className="text-gray-400 text-center mb-2">{step}</p>
          <p className="text-xs text-gray-500 text-center">
            Tentando recuperar automaticamente...
          </p>
        </>
      )}
    </div>
  );
};

export default ForceUpdate;
