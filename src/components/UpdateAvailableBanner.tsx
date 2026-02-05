 import { useState, useEffect } from 'react';
 import { RefreshCw, X } from 'lucide-react';
 
 export const UpdateAvailableBanner = () => {
   const [showBanner, setShowBanner] = useState(false);
   const [isUpdating, setIsUpdating] = useState(false);
   const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
 
   useEffect(() => {
     if (!('serviceWorker' in navigator)) return;
 
     const checkForWaitingWorker = async () => {
       try {
         const registration = await navigator.serviceWorker.getRegistration();
         if (registration?.waiting) {
           setShowBanner(true);
         }
       } catch (error) {
         console.error('[UpdateBanner] Error checking for waiting worker:', error);
       }
     };
 
     // Check immediately
     checkForWaitingWorker();
 
     // Listen for new service workers becoming available
     const handleControllerChange = () => {
       console.log('[UpdateBanner] Controller changed, reloading...');
       window.location.reload();
     };
 
     navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
 
     // Check when updatefound fires
     navigator.serviceWorker.ready.then((registration) => {
       registration.addEventListener('updatefound', () => {
         const newWorker = registration.installing;
         if (newWorker) {
           newWorker.addEventListener('statechange', () => {
             if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
               // New version available
               console.log('[UpdateBanner] New version detected!');
               setShowBanner(true);
             }
           });
         }
       });
     });
 
     return () => {
       navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
     };
   }, []);
 
   const handleUpdate = async () => {
     setIsUpdating(true);
     
     try {
       // 1. Clean ALL caches
       if ('caches' in window) {
         const cacheNames = await caches.keys();
         console.log('[UpdateBanner] Deleting caches:', cacheNames);
         await Promise.all(cacheNames.map(name => caches.delete(name)));
         console.log('[UpdateBanner] All caches cleared');
       }
 
       // 2. Tell waiting SW to skip waiting
       const registration = await navigator.serviceWorker.getRegistration();
       if (registration?.waiting) {
         registration.waiting.postMessage({ type: 'SKIP_WAITING' });
       }
 
       // 3. Unregister SW
       if (registration) {
         await registration.unregister();
         console.log('[UpdateBanner] SW unregistered');
       }
 
       // 4. Force reload without cache - use cache-busting query param for iOS
       const url = new URL(window.location.href);
       url.searchParams.set('_v', Date.now().toString());
       window.location.href = url.toString();
       
     } catch (error) {
       console.error('[UpdateBanner] Error:', error);
       // Fallback: hard reload
       window.location.reload();
     }
   };
 
   if (!showBanner) return null;
 
   return (
     <div className="fixed top-0 left-0 right-0 z-[9999] bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white px-4 py-3 shadow-lg">
       <div className="flex items-center justify-between max-w-screen-xl mx-auto">
         <div className="flex-1">
           <div className="flex items-center gap-2">
             <RefreshCw className={`w-5 h-5 flex-shrink-0 ${isUpdating ? 'animate-spin' : ''}`} />
             <span className="text-sm font-medium">
               {isUpdating ? 'Atualizando...' : 'Nova versão disponível!'}
             </span>
           </div>
           {isIOS && !isUpdating && (
             <p className="text-xs text-white/70 mt-1 ml-7">
               Se não funcionar, feche o app e abra novamente
             </p>
           )}
         </div>
         <div className="flex items-center gap-2 flex-shrink-0">
           <button
             onClick={handleUpdate}
             disabled={isUpdating}
             className="bg-white text-fuchsia-600 px-4 py-1.5 rounded-full text-sm font-semibold hover:bg-fuchsia-100 transition-colors disabled:opacity-50"
           >
             Atualizar
           </button>
           <button
             onClick={() => setShowBanner(false)}
             className="text-white/80 hover:text-white p-1"
             aria-label="Fechar"
           >
             <X className="w-5 h-5" />
           </button>
         </div>
       </div>
     </div>
   );
 };
 
 export default UpdateAvailableBanner;