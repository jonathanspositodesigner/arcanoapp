import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Current app version - increment this when deploying updates
export const APP_VERSION = '5.2.0';

interface AppVersionSettings {
  force_update: boolean;
  min_version: string;
  message?: string;
}

// Compare two version strings (returns -1, 0, or 1)
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
  const hasUpdatedRef = useRef(false);

  useEffect(() => {
    // Prevent multiple updates
    if (hasUpdatedRef.current) return;
    if (sessionStorage.getItem('force-update-completed') === 'true') return;

    const checkVersion = async () => {
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('value')
          .eq('id', 'app_version')
          .single();

        if (error || !data) return;

        const settings = data.value as unknown as AppVersionSettings;
        
        const needsUpdate = settings.force_update || 
          compareVersions(APP_VERSION, settings.min_version) < 0;

        if (needsUpdate) {
          hasUpdatedRef.current = true;
          await performSilentUpdate();
        }
      } catch (err) {
        console.error('[ForceUpdate] Error:', err);
      }
    };

    checkVersion();
  }, []);

  const performSilentUpdate = async () => {
    console.log('[ForceUpdate] Performing silent update...');
    
    try {
      // Clear all caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        console.log('[ForceUpdate] Caches cleared');
      }

      // Unregister all service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(reg => reg.unregister()));
        console.log('[ForceUpdate] Service workers unregistered');
      }

      // Clear localStorage update keys
      localStorage.removeItem('sw-last-update-check');
      localStorage.removeItem('sw-last-check-at');
      
      // Mark as updated to prevent loop
      sessionStorage.setItem('force-update-completed', 'true');
      
      // FIXED: Preserve all existing URL parameters and add cache bust
      const url = new URL(window.location.href);
      url.searchParams.set('v', Date.now().toString());
      window.location.href = url.toString();
    } catch (err) {
      console.error('[ForceUpdate] Update failed:', err);
    }
  };

  // Silent update - no UI rendered
  return null;
};

export default ForceUpdateModal;
