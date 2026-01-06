import { useEffect, useRef, useCallback } from 'react';

// Global preload cache - shares with SecureMedia
export const preloadCache = new Map<string, string>();

// Track which URLs are currently being preloaded
const preloadingUrls = new Set<string>();

// Preload a single image URL - SIMPLIFIED: All URLs are public now
export const preloadImage = async (src: string): Promise<void> => {
  // Skip if already cached or currently preloading
  if (preloadCache.has(src) || preloadingUrls.has(src)) {
    return;
  }

  preloadingUrls.add(src);

  try {
    // All URLs are public - use directly, NO edge function call = NO COST!
    preloadCache.set(src, src);
    const img = new Image();
    img.src = src;
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

// Get cached URL if available (always returns the original URL now)
export const getCachedSignedUrl = (src: string): string | null => {
  return preloadCache.get(src) || src;
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
