const STORAGE_KEY = 'captured_utms';

/**
 * Appends captured UTM parameters to a URL
 * Also adds Hotmart-specific 'sck' parameter for attribution
 * @param url The checkout URL to append UTMs to
 * @param locale Optional locale to append (e.g., 'es' for Spanish)
 * @returns URL with UTM parameters and sck appended
 */
export const appendUtmToUrl = (url: string, locale?: string): string => {
  try {
    const utmsRaw = sessionStorage.getItem(STORAGE_KEY);
    const urlObj = new URL(url);
    
    // Add stored UTMs
    if (utmsRaw) {
      const utms = JSON.parse(utmsRaw) as Record<string, string>;
      
      // Add all standard UTM parameters
      Object.entries(utms).forEach(([key, value]) => {
        if (key !== 'fbclid') { // fbclid added separately
          urlObj.searchParams.set(key, value);
        }
      });
      
      // Add fbclid for Meta Ads attribution (critical for conversion tracking)
      if (utms.fbclid) {
        urlObj.searchParams.set('fbclid', utms.fbclid);
      }
      
      // Build and add Hotmart sck parameter (format: source|campaign|content)
      // This is how Hotmart attributes sales to ad sources
      // IMPORTANT: Keep 3 parts always to preserve positional structure
      const sckSource = utms.utm_source || 'app';
      const sckCampaign = utms.utm_campaign || '';
      const sckContent = utms.utm_content || '';

      // Always build with 3 parts so Hotmart interprets correctly
      urlObj.searchParams.set('sck', `${sckSource}|${sckCampaign}|${sckContent}`);
    }

    // Add locale automatically if provided
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
