import { useEffect } from 'react';

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_id', 'utm_term', 'utm_content', 'fbclid'];
const STORAGE_KEY = 'captured_utms';
const CAPTURED_FLAG = 'utms_captured';

const DEFAULT_UTMS = {
  utm_source: 'aplicativo',
  utm_medium: 'aplicativo',
  utm_campaign: 'aplicativo',
  utm_id: 'aplicativo'
};

/**
 * Hook that captures UTM parameters on app load
 * - If user comes from an ad (has UTMs), saves original UTMs
 * - If user enters directly (no UTMs), sets default app UTMs
 * - UTMs are captured only once per session
 */
export const useUtmTracker = () => {
  useEffect(() => {
    // Check if already captured this session
    if (sessionStorage.getItem(CAPTURED_FLAG)) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const hasAnyUtm = UTM_KEYS.some(key => params.has(key));

    if (hasAnyUtm) {
      // Save original UTMs from ads/external sources
      const utms: Record<string, string> = {};
      UTM_KEYS.forEach(key => {
        const value = params.get(key);
        if (value) {
          utms[key] = value;
        }
      });
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(utms));
      console.log('[UTM] Captured external UTMs:', utms);
    } else {
      // Set default app UTMs for organic/direct access
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_UTMS));
      console.log('[UTM] Set default app UTMs');
    }

    sessionStorage.setItem(CAPTURED_FLAG, 'true');
  }, []);
};

export default useUtmTracker;
