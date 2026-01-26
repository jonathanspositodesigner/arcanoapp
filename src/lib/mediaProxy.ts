const SUPABASE_URL = "https://jooojbaljrshgpaxdlou.supabase.co";

/**
 * Converts a voxvisual.com.br URL to go through our media proxy
 * to bypass hotlink protection
 */
export function proxiedMediaUrl(url: string): string {
  if (!url) return url;
  
  // Only proxy voxvisual URLs
  if (url.includes("voxvisual.com.br/wp-content/uploads/")) {
    return `${SUPABASE_URL}/functions/v1/media-proxy?url=${encodeURIComponent(url)}`;
  }
  
  return url;
}

/**
 * Get proxied URL for image with referrer policy fallback
 */
export function getProxiedImageProps(url: string): {
  src: string;
  referrerPolicy: "no-referrer";
} {
  return {
    src: proxiedMediaUrl(url),
    referrerPolicy: "no-referrer",
  };
}
