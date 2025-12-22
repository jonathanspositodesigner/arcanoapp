import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SignedUrlCache {
  [key: string]: {
    url: string;
    expiresAt: number;
  };
}

// In-memory cache for signed URLs
const urlCache: SignedUrlCache = {};

// Buckets that are already public (no need to generate signed URLs)
const PUBLIC_BUCKETS = new Set<string>(['prompts-cloudinary', 'artes-cloudinary']);

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

    setLoading(true);

    try {
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

  try {
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

    return signedUrl;
  } catch (error) {
    console.error('Failed to get signed URL:', error);
    return originalUrl;
  }
};
