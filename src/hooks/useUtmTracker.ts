import { useEffect } from 'react';

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_id', 'utm_term', 'utm_content', 'fbclid', 'xcod'];
const STORAGE_KEY = 'captured_utms';
const CAPTURED_FLAG = 'utms_captured';

const DEFAULT_UTMS = {
  utm_source: 'aplicativo',
  utm_medium: 'aplicativo',
  utm_campaign: 'aplicativo',
  utm_id: 'aplicativo',
  utm_content: 'aplicativo',
  utm_term: 'aplicativo',
  xcod: 'aplicativo'
};

/**
 * Hook that captures UTM parameters on app load
 * - If user comes from an ad (has UTMs), saves original UTMs
 * - If user enters directly (no UTMs), sets default app UTMs
 * - UTMs are captured only once per session
 */
export const useUtmTracker = () => {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hasAnyUtm = UTM_KEYS.some(key => params.has(key));

    // Se a URL atual tem UTMs, SEMPRE recapturar (anúncio tem prioridade)
    if (hasAnyUtm) {
      const utms: Record<string, string> = {};
      UTM_KEYS.forEach(key => {
        const value = params.get(key);
        if (value) {
          utms[key] = value;
        }
      });
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(utms));
      sessionStorage.setItem(CAPTURED_FLAG, 'true');
      console.log('[UTM] Captured/Updated UTMs from URL:', utms);
      return;
    }

    // Se não tem UTM na URL E ainda não capturou, usar defaults
    if (!sessionStorage.getItem(CAPTURED_FLAG)) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_UTMS));
      sessionStorage.setItem(CAPTURED_FLAG, 'true');
      console.log('[UTM] Set default app UTMs');
    }
  }, []);
};

export default useUtmTracker;
