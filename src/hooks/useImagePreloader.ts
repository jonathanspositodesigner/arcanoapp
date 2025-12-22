import { useEffect, useRef, useCallback } from 'react';
import { getSignedMediaUrl, parseStorageUrl } from './useSignedUrl';

// Global preload cache - shares with SecureMedia
export const preloadCache = new Map<string, string>();

// Track which URLs are currently being preloaded
const preloadingUrls = new Set<string>();

// PUBLIC BUCKETS - must match useSignedUrl.ts!
const PUBLIC_BUCKETS = new Set<string>([
  'prompts-cloudinary',
  'artes-cloudinary',
  'pack-covers',
  'email-assets'
]);

// Check if URL is from Cloudinary
const isCloudinaryUrl = (url: string): boolean => {
  return url.includes('cloudinary.com') || url.includes('res.cloudinary.com');
};

// Preload a single image URL
export const preloadImage = async (src: string): Promise<void> => {
  // Skip if already cached or currently preloading
  if (preloadCache.has(src) || preloadingUrls.has(src)) {
    return;
  }

  // Cloudinary URLs - use directly, no signed URL needed
  if (isCloudinaryUrl(src)) {
    preloadCache.set(src, src);
    const img = new Image();
    img.src = src;
    return;
  }

  const parsed = parseStorageUrl(src);
  
  // Not a storage URL - use directly
  if (!parsed) {
    preloadCache.set(src, src);
    const img = new Image();
    img.src = src;
    return;
  }

  // PUBLIC BUCKET - use directly, NO edge function call = NO COST!
  if (PUBLIC_BUCKETS.has(parsed.bucket)) {
    preloadCache.set(src, src);
    const img = new Image();
    img.src = src;
    return;
  }

  // Private bucket - need signed URL
  preloadingUrls.add(src);

  try {
    const signedUrl = await getSignedMediaUrl(src);
    preloadCache.set(src, signedUrl);
    
    // Actually preload the image into browser cache
    const img = new Image();
    img.src = signedUrl;
  } catch (error) {
    console.warn('Failed to preload:', src);
  } finally {
    preloadingUrls.delete(src);
  }
};

// Batch preload multiple images
export const preloadImages = async (urls: string[], concurrency = 4): Promise<void> => {
  const urlsToPreload = urls.filter(url => !preloadCache.has(url) && !preloadingUrls.has(url));
  
  // Process in batches to avoid overwhelming the network
  for (let i = 0; i < urlsToPreload.length; i += concurrency) {
    const batch = urlsToPreload.slice(i, i + concurrency);
    await Promise.all(batch.map(url => preloadImage(url)));
  }
};

// Get cached signed URL if available
export const getCachedSignedUrl = (src: string): string | null => {
  return preloadCache.get(src) || null;
};

// Hook for preloading next items in a grid
export const useImagePreloader = (
  items: { imageUrl: string }[],
  currentPage: number,
  itemsPerPage: number,
  preloadAhead = 2 // Number of pages to preload ahead
) => {
  const preloadedPages = useRef(new Set<number>());

  const preloadPage = useCallback(async (pageNum: number) => {
    if (preloadedPages.current.has(pageNum)) return;
    
    const startIdx = (pageNum - 1) * itemsPerPage;
    const endIdx = startIdx + itemsPerPage;
    const pageItems = items.slice(startIdx, endIdx);
    
    if (pageItems.length === 0) return;

    preloadedPages.current.add(pageNum);
    
    const urls = pageItems.map(item => item.imageUrl);
    await preloadImages(urls, 4);
  }, [items, itemsPerPage]);

  useEffect(() => {
    // Preload current page and next pages
    const pagesToPreload: number[] = [];
    for (let i = 0; i <= preloadAhead; i++) {
      pagesToPreload.push(currentPage + i);
    }

    // Execute preloading
    pagesToPreload.forEach(page => {
      preloadPage(page);
    });
  }, [currentPage, preloadPage, preloadAhead]);

  // Reset preloaded pages when items change significantly
  useEffect(() => {
    preloadedPages.current.clear();
  }, [items.length]);

  return {
    preloadPage,
    getCachedSignedUrl
  };
};
