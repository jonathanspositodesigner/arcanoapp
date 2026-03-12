/**
 * Captures _fbp and _fbc cookies from the browser for Meta Conversions API.
 * These cookies are critical for matching server-side events to ad clicks.
 * If _fbc cookie is missing, generates it from fbclid URL parameter.
 * If _fbp cookie is missing, generates a fallback value.
 */
export function getMetaCookies(): { fbp: string | null; fbc: string | null } {
  try {
    const cookies = document.cookie.split(';').reduce((acc, c) => {
      const [key, ...rest] = c.trim().split('=');
      acc[key] = rest.join('=');
      return acc;
    }, {} as Record<string, string>);

    let fbp = cookies['_fbp'] || null;
    let fbc = cookies['_fbc'] || null;

    // If _fbc cookie is missing, try to generate from fbclid in URL
    if (!fbc) {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const fbclid = urlParams.get('fbclid');
        if (fbclid) {
          fbc = `fb.1.${Date.now()}.${fbclid}`;
        }
      } catch {
        // ignore URL parsing errors
      }
    }

    // If _fbp cookie is missing, generate a fallback
    if (!fbp) {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const fbclid = urlParams.get('fbclid');
        if (fbclid) {
          // Generate a pseudo-random fbp when we know user came from Facebook
          fbp = `fb.1.${Date.now()}.${Math.floor(Math.random() * 2147483647)}`;
        }
      } catch {
        // ignore
      }
    }

    return { fbp, fbc };
  } catch {
    return { fbp: null, fbc: null };
  }
}
