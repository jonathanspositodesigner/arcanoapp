import { useState, useEffect, useRef, useCallback } from "react";

interface GalleryItem {
  beforeImage: string;
  afterImage: string;
  label: string;
}

interface ScrollDrivenGalleryProps {
  items: GalleryItem[];
}

export const ScrollDrivenGallery = ({ items }: ScrollDrivenGalleryProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const rafRef = useRef<number>(0);
  const preloadedRef = useRef<Set<string>>(new Set());
  const [readySlides, setReadySlides] = useState<Set<number>>(new Set());

  const totalItems = items.length;

  // Stable URL signature to prevent re-running preload on parent re-renders
  const urlSignature = items.map(i => `${i.beforeImage}|${i.afterImage}`).join(",");

  useEffect(() => {
    const handleScroll = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const container = containerRef.current;
        if (!container) return;

        const rect = container.getBoundingClientRect();
        const scrollableHeight = container.offsetHeight - window.innerHeight;
        if (scrollableHeight <= 0) return;

        const rawProgress = -rect.top / scrollableHeight;
        const clamped = Math.max(0, Math.min(1, rawProgress));
        setScrollProgress(clamped * totalItems);
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [totalItems]);

  // One-shot preload: only runs when URL signature changes, tracks per-URL
  useEffect(() => {
    items.forEach((item, index) => {
      const urls = [item.beforeImage, item.afterImage];
      const pending: Promise<void>[] = [];

      urls.forEach((src) => {
        if (!src || preloadedRef.current.has(src)) return;
        preloadedRef.current.add(src);

        const img = new Image();
        img.loading = "eager";
        img.decoding = "async";
        img.fetchPriority = index < 2 ? "high" : "auto";
        img.src = src;

        pending.push(
          (img.decode?.() ?? Promise.resolve()).catch(() => undefined)
        );
      });

      // Mark slide as ready when both images are decoded
      if (pending.length > 0) {
        Promise.all(pending).then(() => {
          setReadySlides((prev) => {
            const next = new Set(prev);
            next.add(index);
            return next;
          });
        });
      } else {
        // Already preloaded
        setReadySlides((prev) => {
          if (prev.has(index)) return prev;
          const next = new Set(prev);
          next.add(index);
          return next;
        });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlSignature]);

  if (totalItems === 0) return null;

  const rawIndex = Math.min(Math.floor(scrollProgress), totalItems - 1);
  // Use readiness: if target slide isn't ready, show last ready slide
  const currentIndex = readySlides.has(rawIndex)
    ? rawIndex
    : Array.from(readySlides)
        .filter((i) => i <= rawIndex)
        .sort((a, b) => b - a)[0] ?? 0;

  const sliderPosition = (1 - (scrollProgress - currentIndex)) * 100;
  const clampedSlider = scrollProgress >= totalItems ? 0 : Math.max(0, Math.min(100, sliderPosition));

  return (
    <div ref={containerRef} style={{ height: `${totalItems * 100}vh` }}>
      <div className="sticky top-0 h-screen w-screen overflow-hidden">
        <div className="relative h-full w-full">
          {items.map((item, i) => {
            const isActive = i === currentIndex;
            const beforeVisibility = i < currentIndex ? 0 : i > currentIndex ? 100 : clampedSlider;

            return (
              <div
                key={`${item.beforeImage}-${item.afterImage}-${i}`}
                className={`absolute inset-0 ${isActive ? "opacity-100" : "opacity-0"}`}
                style={{ willChange: isActive ? "opacity" : undefined }}
                aria-hidden={!isActive}
              >
                <img
                  src={item.afterImage}
                  alt="Depois"
                  className="absolute inset-0 h-full w-full object-cover"
                  draggable={false}
                  loading="eager"
                  decoding="async"
                  fetchPriority={i < 2 ? "high" : "auto"}
                />

                <div
                  className="absolute inset-0 overflow-hidden"
                  style={{
                    clipPath: `inset(0 ${100 - beforeVisibility}% 0 0)`,
                    willChange: isActive ? "clip-path" : undefined,
                  }}
                >
                  <img
                    src={item.beforeImage}
                    alt="Antes"
                    className="absolute inset-0 h-full w-full object-cover"
                    draggable={false}
                    loading="eager"
                    decoding="async"
                    fetchPriority={i < 2 ? "high" : "auto"}
                  />
                </div>
              </div>
            );
          })}

          <div
            className="absolute top-0 bottom-0 w-[2px] bg-white/80 pointer-events-none"
            style={{ left: `${clampedSlider}%`, transform: "translateX(-50%)" }}
          >
            <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-xl flex items-center justify-center">
              <div className="flex gap-[2px]">
                <div className="w-[2px] h-4 bg-gray-400 rounded-full" />
                <div className="w-[2px] h-4 bg-gray-400 rounded-full" />
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3">
          <div className="flex items-center gap-2">
            {items.map((_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all duration-300 ${
                  i === currentIndex
                    ? "w-8 h-2 bg-white/50"
                    : i < currentIndex
                      ? "w-2 h-2 bg-white/50/50"
                      : "w-2 h-2 bg-white/20"
                }`}
              />
            ))}
          </div>
          <p className="text-white/30 text-xs animate-pulse">Role para comparar ↕</p>
        </div>
      </div>
    </div>
  );
};

export default ScrollDrivenGallery;
