 import { useEffect, useState } from 'react';
 import { RefreshCw, CheckCircle } from 'lucide-react';
 
 const ForceUpdate = () => {
   const [status, setStatus] = useState<'cleaning' | 'done'>('cleaning');
 
   useEffect(() => {
     const forceCleanAndReload = async () => {
       try {
         console.log('[ForceUpdate] Starting force update process...');
         
         // 1. Delete ALL caches
         if ('caches' in window) {
           const cacheNames = await caches.keys();
           console.log('[ForceUpdate] Deleting caches:', cacheNames);
           await Promise.all(cacheNames.map(name => caches.delete(name)));
           console.log('[ForceUpdate] All caches deleted');
         }
 
         // 2. Unregister ALL service workers
         if ('serviceWorker' in navigator) {
           const registrations = await navigator.serviceWorker.getRegistrations();
           for (const registration of registrations) {
             await registration.unregister();
             console.log('[ForceUpdate] Unregistered SW:', registration.scope);
           }
         }
 
         // 3. Clear localStorage timestamp to force fresh check
         localStorage.removeItem('sw-last-check-at');
 
         setStatus('done');
 
         // 4. Redirect to home after 1 second with cache-busting param
         setTimeout(() => {
           window.location.href = '/?_v=' + Date.now();
         }, 1000);
 
       } catch (error) {
         console.error('[ForceUpdate] Error:', error);
         window.location.href = '/';
       }
     };
 
     forceCleanAndReload();
   }, []);
 
   return (
     <div className="min-h-screen bg-gradient-to-br from-[#0f0a15] via-[#1a0f25] to-[#0a0510] flex flex-col items-center justify-center text-white p-4">
       {status === 'cleaning' ? (
         <>
           <RefreshCw className="w-16 h-16 text-fuchsia-500 animate-spin mb-4" />
           <h1 className="text-2xl font-bold mb-2">Atualizando...</h1>
           <p className="text-gray-400 text-center">Limpando cache e baixando nova versão</p>
         </>
       ) : (
         <>
           <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
           <h1 className="text-2xl font-bold mb-2">Atualizado!</h1>
           <p className="text-gray-400 text-center">Redirecionando...</p>
         </>
       )}
     </div>
   );
 };
 
 export default ForceUpdate;