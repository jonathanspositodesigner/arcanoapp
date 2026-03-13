const STORAGE_KEY = 'captured_utms';

const INVALID_VALUES = ['aplicativo', '', 'app'];

/**
 * Checks if a UTM value is valid (not a placeholder or empty)
 */
const isValidUtmValue = (value: unknown): boolean => {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (INVALID_VALUES.includes(trimmed.toLowerCase())) return false;
  if (trimmed.startsWith('{{') && trimmed.endsWith('}}')) return false;
  return trimmed.length > 0;
};

/**
 * Reads captured UTMs from sessionStorage, strips invalid values.
 * Returns null if no valid UTMs remain.
 */
export const getSanitizedUtms = (): Record<string, string> | null => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, string>;
    const filtered: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (isValidUtmValue(value)) {
        filtered[key] = value;
      }
    }
    return Object.keys(filtered).length > 0 ? filtered : null;
  } catch {
    return null;
  }
};

/**
 * Server-side UTM sanitization for edge functions.
 * Strips "aplicativo" and placeholder values from utm_data payload.
 */
export const sanitizeUtmData = (utmData: Record<string, any> | null | undefined): Record<string, any> | null => {
  if (!utmData || typeof utmData !== 'object') return null;
  const filtered: Record<string, any> = {};
  for (const [key, value] of Object.entries(utmData)) {
    if (isValidUtmValue(value)) {
      filtered[key] = value;
    }
  }
  return Object.keys(filtered).length > 0 ? filtered : null;
};

/**
 * Appends captured UTM parameters to a URL
 * Also adds Hotmart-specific 'sck' parameter for attribution
 * Never appends placeholder values like "aplicativo"
 */
export const appendUtmToUrl = (url: string, locale?: string): string => {
  try {
    const urlObj = new URL(url);
    const utms = getSanitizedUtms();

    if (utms) {
      // Add all standard UTM parameters (skip fbclid, added separately)
      Object.entries(utms).forEach(([key, value]) => {
        if (key !== 'fbclid') {
          urlObj.searchParams.set(key, value);
        }
      });

      // Add fbclid for Meta Ads attribution
      if (utms.fbclid) {
        urlObj.searchParams.set('fbclid', utms.fbclid);
      }

      // Build sck only if we have valid source data
      const sckSource = utms.utm_source;
      if (sckSource) {
        const sckCampaign = utms.utm_campaign || '';
        const sckContent = utms.utm_content || '';
        urlObj.searchParams.set('sck', `${sckSource}|${sckCampaign}|${sckContent}`);
      }
    }

    if (locale) {
      urlObj.searchParams.set('utm_locale', locale);
    }

    console.log('[UTM] Final checkout URL:', urlObj.toString());
    return urlObj.toString();
  } catch (error) {
    console.error('[UTM] Error appending UTMs to URL:', error);
    return url;
  }
};
