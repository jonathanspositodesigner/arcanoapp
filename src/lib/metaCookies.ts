/**
 * Captures _fbp and _fbc cookies from the browser for Meta Conversions API.
 * These cookies are critical for matching server-side events to ad clicks.
 */
export function getMetaCookies(): { fbp: string | null; fbc: string | null } {
  try {
    const cookies = document.cookie.split(';').reduce((acc, c) => {
      const [key, ...rest] = c.trim().split('=');
      acc[key] = rest.join('=');
      return acc;
    }, {} as Record<string, string>);

    return {
      fbp: cookies['_fbp'] || null,
      fbc: cookies['_fbc'] || null,
    };
  } catch {
    return { fbp: null, fbc: null };
  }
}
