const STORAGE_KEY = 'captured_utms';

/**
 * Appends captured UTM parameters to a URL
 * @param url The checkout URL to append UTMs to
 * @param locale Optional locale to append (e.g., 'es' for Spanish)
 * @returns URL with UTM parameters appended
 */
export const appendUtmToUrl = (url: string, locale?: string): string => {
  try {
    const utmsRaw = sessionStorage.getItem(STORAGE_KEY);
    const urlObj = new URL(url);
    
    // Add stored UTMs
    if (utmsRaw) {
      const utms = JSON.parse(utmsRaw) as Record<string, string>;
      Object.entries(utms).forEach(([key, value]) => {
        urlObj.searchParams.set(key, value);
      });
    }

    // Add locale automatically if provided
    if (locale) {
      urlObj.searchParams.set('utm_locale', locale);
    }

    return urlObj.toString();
  } catch (error) {
    console.error('[UTM] Error appending UTMs to URL:', error);
    return url;
  }
};
