import { useState, useEffect, useRef } from "react";

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

  if (totalItems === 0) return null;

  const currentIndex = Math.min(Math.floor(scrollProgress), totalItems - 1);
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
                style={{ willChange: "opacity" }}
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
                    willChange: "clip-path",
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
