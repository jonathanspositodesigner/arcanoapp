const STORAGE_KEY = 'captured_utms';

/**
 * Appends captured UTM parameters to a URL
 * @param url The checkout URL to append UTMs to
 * @returns URL with UTM parameters appended
 */
export const appendUtmToUrl = (url: string): string => {
  try {
    const utmsRaw = sessionStorage.getItem(STORAGE_KEY);
    if (!utmsRaw) return url;

    const utms = JSON.parse(utmsRaw) as Record<string, string>;
    if (Object.keys(utms).length === 0) return url;

    const urlObj = new URL(url);
    Object.entries(utms).forEach(([key, value]) => {
      urlObj.searchParams.set(key, value);
    });

    return urlObj.toString();
  } catch (error) {
    console.error('[UTM] Error appending UTMs to URL:', error);
    return url;
  }
};
