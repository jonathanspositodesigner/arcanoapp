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

  const getSignedUrl = useCallback(async (
    originalUrl: string,
    isPremium: boolean = false
  ): Promise<string> => {
    // Parse the URL to get bucket and file path
    const parsed = parseStorageUrl(originalUrl);
    
    if (!parsed) {
      // If URL doesn't match storage pattern, return original
      console.log('URL does not match storage pattern, using original:', originalUrl);
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
      // Get auth session for premium content
      const { data: { session } } = await supabase.auth.getSession();
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await supabase.functions.invoke('get-signed-url', {
        body: {
          filePath: parsed.filePath,
          bucket: parsed.bucket,
          isPremium
        }
      });

      if (response.error) {
        console.error('Error getting signed URL:', response.error);
        // Fall back to original URL if there's an error
        return originalUrl;
      }

      const signedUrl = response.data.signedUrl;
      
      // Cache the URL with 55 minute expiration (URL expires in 60 min)
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

  // Batch get signed URLs for multiple files
  const getSignedUrls = useCallback(async (
    urls: { originalUrl: string; isPremium: boolean }[]
  ): Promise<Map<string, string>> => {
    const results = new Map<string, string>();
    
    // Process in parallel
    await Promise.all(
      urls.map(async ({ originalUrl, isPremium }) => {
        const signedUrl = await getSignedUrl(originalUrl, isPremium);
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

// Helper function to get signed URL without hook (for use outside components)
export const getSignedMediaUrl = async (
  originalUrl: string,
  isPremium: boolean = false
): Promise<string> => {
  const parsed = parseStorageUrl(originalUrl);
  
  if (!parsed) {
    return originalUrl;
  }

  const cacheKey = `${parsed.bucket}/${parsed.filePath}`;
  
  // Check cache first
  const cached = urlCache[cacheKey];
  if (cached && cached.expiresAt > Date.now() + 5 * 60 * 1000) {
    return cached.url;
  }

  const attemptFetch = async (retryCount = 0): Promise<string> => {
    try {
      // Get user session for premium content authentication
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('get-signed-url', {
        body: {
          filePath: parsed.filePath,
          bucket: parsed.bucket,
          isPremium
        },
        headers: session?.access_token ? {
          Authorization: `Bearer ${session.access_token}`
        } : undefined
      });

      if (response.error || !response.data?.signedUrl) {
        console.error('Error getting signed URL:', response.error);
        if (retryCount < 2) {
          await new Promise(resolve => setTimeout(resolve, 500 * (retryCount + 1)));
          return attemptFetch(retryCount + 1);
        }
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
      if (retryCount < 2) {
        await new Promise(resolve => setTimeout(resolve, 500 * (retryCount + 1)));
        return attemptFetch(retryCount + 1);
      }
      return originalUrl;
    }
  };

  return attemptFetch();
};