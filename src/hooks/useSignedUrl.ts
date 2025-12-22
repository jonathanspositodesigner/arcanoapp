import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SignedUrlCache {
  [key: string]: {
    url: string;
    expiresAt: number;
  };
}

const PERSIST_KEY = 'signedUrlCache:v1';
const MAX_PERSIST_ENTRIES = 500;

const canUseLocalStorage = (): boolean => {
  try {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  } catch {
    return false;
  }
};

const sanitizeCache = (cache: SignedUrlCache): SignedUrlCache => {
  const now = Date.now();
  const entries = Object.entries(cache)
    .filter(([, v]) => !!v && typeof v.url === 'string' && typeof v.expiresAt === 'number' && v.expiresAt > now)
    .sort((a, b) => b[1].expiresAt - a[1].expiresAt)
    .slice(0, MAX_PERSIST_ENTRIES);

  return Object.fromEntries(entries);
};

// In-memory cache for signed URLs (bootstrapped from localStorage to avoid re-signing on refresh)
const urlCache: SignedUrlCache = (() => {
  const initial: SignedUrlCache = {};
  if (!canUseLocalStorage()) return initial;

  try {
    const raw = window.localStorage.getItem(PERSIST_KEY);
    if (!raw) return initial;
    const parsed = JSON.parse(raw) as SignedUrlCache;
    return sanitizeCache(parsed);
  } catch {
    return initial;
  }
})();

let persistTimer: number | undefined;
let signedUrlInvokeCount = 0;

const schedulePersist = () => {
  if (!canUseLocalStorage()) return;

  if (persistTimer) window.clearTimeout(persistTimer);
  persistTimer = window.setTimeout(() => {
    try {
      window.localStorage.setItem(PERSIST_KEY, JSON.stringify(sanitizeCache(urlCache)));
    } catch {
      // ignore
    }
  }, 250);
};

// ALL BUCKETS THAT ARE PUBLIC - no need to generate signed URLs
// CRITICAL: Adding buckets here STOPS edge function calls = STOPS spending money
// If a bucket is public in Supabase, add it here to avoid costs!
const PUBLIC_BUCKETS = new Set<string>([
  'prompts-cloudinary',
  'artes-cloudinary', 
  'pack-covers',
  'email-assets',
  // These buckets are private but we add them IF they become public
  // 'admin-prompts',
  // 'admin-artes',
  // 'partner-prompts',
  // 'partner-artes',
  // 'community-prompts',
  // 'community-artes'
]);

// Extract bucket and file path from Supabase storage URL
export const parseStorageUrl = (url: string): { bucket: string; filePath: string } | null => {
  // Match pattern: .../storage/v1/object/public/bucket-name/path/to/file
  const match = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)/);
  if (match) {
    return {
      bucket: match[1],
      filePath: match[2]
    };
  }
  return null;
};

export const useSignedUrl = () => {
  const [loading, setLoading] = useState(false);

  const getSignedUrl = useCallback(async (originalUrl: string): Promise<string> => {
    const parsed = parseStorageUrl(originalUrl);

    if (!parsed) {
      return originalUrl;
    }

    // If the bucket is public, just use the public URL (avoids unnecessary backend calls)
    if (PUBLIC_BUCKETS.has(parsed.bucket)) {
      return originalUrl;
    }

    const cacheKey = `${parsed.bucket}/${parsed.filePath}`;
    
    // Check cache first (with 5 minute buffer before expiration)
    const cached = urlCache[cacheKey];
    if (cached && cached.expiresAt > Date.now() + 5 * 60 * 1000) {
      return cached.url;
    }
    if (cached) {
      delete urlCache[cacheKey];
      schedulePersist();
    }

    setLoading(true);

    try {
      signedUrlInvokeCount += 1;
      if (import.meta.env.DEV) {
        console.debug(`[get-signed-url] invoke #${signedUrlInvokeCount}`, {
          bucket: parsed.bucket,
          filePath: parsed.filePath,
        });
      }

      const response = await supabase.functions.invoke('get-signed-url', {
        body: {
          filePath: parsed.filePath,
          bucket: parsed.bucket
        }
      });

      if (response.error || !response.data?.signedUrl) {
        console.error('Error getting signed URL:', response.error);
        return originalUrl;
      }

      const signedUrl = response.data.signedUrl;
      
      // Cache the URL with 55 minute expiration
      urlCache[cacheKey] = {
        url: signedUrl,
        expiresAt: Date.now() + 55 * 60 * 1000
      };
      schedulePersist();

      return signedUrl;
    } catch (error) {
      console.error('Failed to get signed URL:', error);
      return originalUrl;
    } finally {
      setLoading(false);
    }
  }, []);

  const getSignedUrls = useCallback(async (
    urls: { originalUrl: string }[]
  ): Promise<Map<string, string>> => {
    const results = new Map<string, string>();
    
    await Promise.all(
      urls.map(async ({ originalUrl }) => {
        const signedUrl = await getSignedUrl(originalUrl);
        results.set(originalUrl, signedUrl);
      })
    );

    return results;
  }, [getSignedUrl]);

  return {
    getSignedUrl,
    getSignedUrls,
    loading
  };
};

// Helper function to get signed URL without hook
export const getSignedMediaUrl = async (originalUrl: string): Promise<string> => {
  const parsed = parseStorageUrl(originalUrl);

  if (!parsed) {
    return originalUrl;
  }

  // If the bucket is public, just use the public URL (avoids unnecessary backend calls)
  if (PUBLIC_BUCKETS.has(parsed.bucket)) {
    return originalUrl;
  }

  const cacheKey = `${parsed.bucket}/${parsed.filePath}`;
  
  // Check cache first
  const cached = urlCache[cacheKey];
  if (cached && cached.expiresAt > Date.now() + 5 * 60 * 1000) {
    return cached.url;
  }
  if (cached) {
    delete urlCache[cacheKey];
    schedulePersist();
  }

  try {
    signedUrlInvokeCount += 1;
    if (import.meta.env.DEV) {
      console.debug(`[get-signed-url] invoke #${signedUrlInvokeCount}`, {
        bucket: parsed.bucket,
        filePath: parsed.filePath,
      });
    }

    const response = await supabase.functions.invoke('get-signed-url', {
      body: {
        filePath: parsed.filePath,
        bucket: parsed.bucket
      }
    });

    if (response.error || !response.data?.signedUrl) {
      console.error('Error getting signed URL:', response.error);
      return originalUrl;
    }

    const signedUrl = response.data.signedUrl;
    
    // Cache the URL
    urlCache[cacheKey] = {
      url: signedUrl,
      expiresAt: Date.now() + 55 * 60 * 1000
    };
    schedulePersist();

    return signedUrl;
  } catch (error) {
    console.error('Failed to get signed URL:', error);
    return originalUrl;
  }
};
