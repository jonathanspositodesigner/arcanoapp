import { useState, useEffect, useRef, useMemo } from "react";

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

  const totalItems = items.length;
  const imageSources = useMemo(
    () => items.flatMap((item) => [item.beforeImage, item.afterImage]),
    [items]
  );

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

  useEffect(() => {
    imageSources.forEach((src) => {
      const img = new Image();
      img.src = src;
      img.decoding = "async";
      void img.decode?.().catch(() => undefined);
    });
  }, [imageSources]);

  if (totalItems === 0) return null;

  const currentIndex = Math.min(Math.floor(scrollProgress), totalItems - 1);
  const sliderPosition = (1 - (scrollProgress - currentIndex)) * 100;
  const clampedSlider = scrollProgress >= totalItems ? 0 : Math.max(0, Math.min(100, sliderPosition));

  return (
    <div ref={containerRef} style={{ height: `${totalItems * 100}vh` }}>
      {/* Hidden preload in DOM for instant transition between images */}
      <div className="pointer-events-none absolute opacity-0 w-0 h-0 overflow-hidden" aria-hidden="true">
        {imageSources.map((src, i) => (
          <img key={`${src}-${i}`} src={src} alt="" loading="eager" decoding="async" />
        ))}
      </div>

      <div className="sticky top-0 h-screen flex items-center justify-center bg-black/30 px-2 md:px-4">
        <div className="relative h-[94vh] aspect-[4/5] w-auto overflow-hidden">
          {items.map((item, i) => {
            const isActive = i === currentIndex;
            const reveal = isActive ? clampedSlider : i < currentIndex ? 0 : 100;

            return (
              <div
                key={i}
                className={`absolute inset-0 transition-opacity duration-150 ${
                  isActive ? "opacity-100 z-20" : "opacity-0 z-10 pointer-events-none"
                }`}
              >
                <img
                  src={item.afterImage}
                  alt="Depois"
                  className="absolute inset-0 w-full h-full object-cover"
                  loading="eager"
                  decoding="async"
                  draggable={false}
                />

                <div
                  className="absolute inset-0 overflow-hidden"
                  style={{
                    clipPath: `inset(0 ${100 - reveal}% 0 0)`,
                    willChange: isActive ? "clip-path" : "auto",
                  }}
                >
                  <img
                    src={item.beforeImage}
                    alt="Antes"
                    className="absolute inset-0 w-full h-full object-cover"
                    loading="eager"
                    decoding="async"
                    draggable={false}
                  />
                </div>
              </div>
            );
          })}

          <div
            className="absolute top-0 bottom-0 w-[2px] bg-white/80 pointer-events-none z-30"
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
                    ? "w-8 h-2 bg-fuchsia-500"
                    : i < currentIndex
                    ? "w-2 h-2 bg-fuchsia-500/50"
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
