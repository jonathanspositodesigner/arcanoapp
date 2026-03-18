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

  const currentIndex = Math.min(Math.floor(scrollProgress), totalItems - 1);
  const sliderPosition = (1 - (scrollProgress - currentIndex)) * 100;
  // When we've scrolled past the last image, clamp slider to 0
  const clampedSlider = scrollProgress >= totalItems ? 0 : Math.max(0, Math.min(100, sliderPosition));

  const currentItem = items[currentIndex] || items[0];

  // Preload all images
  useEffect(() => {
    items.forEach((item) => {
      const img1 = new Image();
      img1.src = item.beforeImage;
      const img2 = new Image();
      img2.src = item.afterImage;
    });
  }, [items]);

  return (
    <div
      ref={containerRef}
      style={{ height: `${totalItems * 100}vh` }}
    >
      <div className="sticky top-0 h-screen flex flex-col items-center justify-center px-4">
        <div className="relative w-full max-w-4xl mx-auto overflow-hidden rounded-3xl border-2 border-white/10 shadow-2xl shadow-fuchsia-500/10" style={{ aspectRatio: "4/3" }}>
          {/* After image (background) */}
          <img
            src={currentItem.afterImage}
            alt="Depois"
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
            style={{ willChange: "auto" }}
            draggable={false}
          />

          {/* Before image (clipped) */}
          <div
            className="absolute inset-0 overflow-hidden"
            style={{
              clipPath: `inset(0 ${100 - clampedSlider}% 0 0)`,
              willChange: "clip-path",
            }}
          >
            <img
              src={currentItem.beforeImage}
              alt="Antes"
              className="absolute inset-0 w-full h-full object-cover"
              draggable={false}
            />
          </div>

          {/* Slider line */}
          <div
            className="absolute top-0 bottom-0 w-[2px] bg-white shadow-lg pointer-events-none"
            style={{ left: `${clampedSlider}%`, transform: "translateX(-50%)" }}
          >
            <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-xl flex items-center justify-center">
              <div className="flex gap-[2px]">
                <div className="w-[2px] h-4 bg-gray-400 rounded-full" />
                <div className="w-[2px] h-4 bg-gray-400 rounded-full" />
              </div>
            </div>
          </div>

          {/* Labels */}
          <div className="absolute top-4 left-4 bg-black/80 text-white font-semibold text-sm px-4 py-2 rounded-full">
            Antes
          </div>
          <div className="absolute top-4 right-4 bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white font-semibold text-sm px-4 py-2 rounded-full">
            Depois
          </div>

          {/* Bottom label */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 border border-white/20 text-white text-sm px-4 py-2 rounded-full backdrop-blur-sm">
            {currentItem.label}
          </div>
        </div>

        {/* Progress dots */}
        <div className="flex items-center gap-2 mt-6">
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

        {/* Scroll hint */}
        <p className="text-white/30 text-xs mt-3 animate-pulse">
          Role para comparar ↕
        </p>
      </div>
    </div>
  );
};

export default ScrollDrivenGallery;
