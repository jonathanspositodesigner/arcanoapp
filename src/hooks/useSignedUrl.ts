import { useState, useCallback } from 'react';

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
  const [loading] = useState(false);

  // SIMPLIFIED: All URLs are now public - just return the original URL directly
  // NO EDGE FUNCTION CALLS = NO COSTS
  const getSignedUrl = useCallback(async (originalUrl: string): Promise<string> => {
    return originalUrl;
  }, []);

  const getSignedUrls = useCallback(async (
    urls: { originalUrl: string }[]
  ): Promise<Map<string, string>> => {
    const results = new Map<string, string>();
    urls.forEach(({ originalUrl }) => {
      results.set(originalUrl, originalUrl);
    });
    return results;
  }, []);

  return {
    getSignedUrl,
    getSignedUrls,
    loading
  };
};

// SIMPLIFIED: All URLs are now public - just return the original URL directly
// NO EDGE FUNCTION CALLS = NO COSTS
export const getSignedMediaUrl = async (originalUrl: string): Promise<string> => {
  return originalUrl;
};
