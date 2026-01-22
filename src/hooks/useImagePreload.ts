import { useEffect } from 'react';

/**
 * Hook for conditionally preloading images on specific pages
 * This prevents loading heavy images globally across the entire app
 */
export const useImagePreload = (imageSrc: string, enabled = true) => {
  useEffect(() => {
    if (!enabled || !imageSrc) return;

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
  }, [imageSrc, enabled]);
};

/**
 * Preload multiple images at once
 */
export const useImagesPreload = (images: string[], enabled = true) => {
  useEffect(() => {
    if (!enabled || images.length === 0) return;

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
  }, [images.join(','), enabled]);
};
