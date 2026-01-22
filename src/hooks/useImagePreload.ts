import { useEffect, useState } from 'react';

/**
 * Hook for conditionally preloading images on specific pages
 * This prevents loading heavy images globally across the entire app
 * 
 * IMPORTANT: Uses a small delay to ensure `enabled` is stable
 * (prevents race condition with useIsMobile on first render)
 */
export const useImagePreload = (imageSrc: string, enabled = true) => {
  const [shouldLoad, setShouldLoad] = useState(false);

  // Wait for enabled state to stabilize (50ms delay)
  useEffect(() => {
    if (!enabled) {
      setShouldLoad(false);
      return;
    }
    const timer = setTimeout(() => setShouldLoad(true), 50);
    return () => clearTimeout(timer);
  }, [enabled]);

  useEffect(() => {
    if (!shouldLoad || !imageSrc) return;

    // Check if already preloaded
    const existing = document.querySelector(`link[rel="preload"][href="${imageSrc}"]`);
    if (existing) return;

    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = imageSrc;
    link.fetchPriority = 'high';
    document.head.appendChild(link);

    return () => {
      // Don't remove on cleanup - images stay cached
    };
  }, [imageSrc, shouldLoad]);
};

/**
 * Preload multiple images at once
 */
export const useImagesPreload = (images: string[], enabled = true) => {
  const [shouldLoad, setShouldLoad] = useState(false);

  // Wait for enabled state to stabilize (50ms delay)
  useEffect(() => {
    if (!enabled) {
      setShouldLoad(false);
      return;
    }
    const timer = setTimeout(() => setShouldLoad(true), 50);
    return () => clearTimeout(timer);
  }, [enabled]);

  useEffect(() => {
    if (!shouldLoad || images.length === 0) return;

    const links: HTMLLinkElement[] = [];

    images.forEach((src) => {
      const existing = document.querySelector(`link[rel="preload"][href="${src}"]`);
      if (existing) return;

      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = src;
      link.fetchPriority = 'high';
      document.head.appendChild(link);
      links.push(link);
    });

    return () => {
      // Don't remove on cleanup - images stay cached
    };
  }, [images.join(','), shouldLoad]);
};
