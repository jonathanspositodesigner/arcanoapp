import { useEffect } from 'react';

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_id', 'utm_term', 'utm_content', 'fbclid', 'xcod'];
const STORAGE_KEY = 'captured_utms';
const CAPTURED_FLAG = 'utms_captured';

/**
 * Hook that captures UTM parameters on app load
 * - Only captures when real UTMs exist in the URL
 * - Never sets default/placeholder values
 * - Cleans legacy "aplicativo" data from previous sessions
 */
export const useUtmTracker = () => {
  useEffect(() => {
    // Clean legacy "aplicativo" contamination from storage
    try {
      const existing = sessionStorage.getItem(STORAGE_KEY);
      if (existing) {
        const parsed = JSON.parse(existing);
        const allAplicativo = Object.values(parsed).every(v => v === 'aplicativo');
        if (allAplicativo) {
          sessionStorage.removeItem(STORAGE_KEY);
          sessionStorage.removeItem(CAPTURED_FLAG);
          console.log('[UTM] Cleaned legacy "aplicativo" UTMs from storage');
        }
      }
    } catch { /* ignore */ }

    const params = new URLSearchParams(window.location.search);
    const hasAnyUtm = UTM_KEYS.some(key => params.has(key));

    // Only capture when real UTMs exist in the URL
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
      console.log('[UTM] Captured UTMs from URL:', utms);
    }
    // If no UTMs in URL, do nothing — no defaults, no placeholders
  }, []);
};

export default useUtmTracker;
