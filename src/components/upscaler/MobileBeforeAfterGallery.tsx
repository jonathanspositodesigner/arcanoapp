import { useState, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface GalleryItem {
  beforeImage: string;
  afterImage: string;
  label: string;
}

interface MobileBeforeAfterGalleryProps {
  items: GalleryItem[];
}

export const MobileBeforeAfterGallery = ({ items }: MobileBeforeAfterGalleryProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sliderPosition, setSliderPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const totalItems = items.length;

  const goNext = useCallback(() => {
    setCurrentIndex((prev) => Math.min(prev + 1, totalItems - 1));
    setSliderPosition(50);
  }, [totalItems]);

  const goPrev = useCallback(() => {
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
    setSliderPosition(50);
  }, []);

  const getPositionFromEvent = useCallback((clientX: number) => {
    const container = containerRef.current;
    if (!container) return 50;
    const rect = container.getBoundingClientRect();
    const x = clientX - rect.left;
    return Math.max(0, Math.min(100, (x / rect.width) * 100));
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Only start dragging if touch is near the slider line (within 40px)
    const touch = e.touches[0];
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const touchX = touch.clientX - rect.left;
    const sliderX = (sliderPosition / 100) * rect.width;
    if (Math.abs(touchX - sliderX) < 40) {
      isDragging.current = true;
      e.preventDefault();
    }
  }, [sliderPosition]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current) return;
    e.preventDefault();
    const touch = e.touches[0];
    setSliderPosition(getPositionFromEvent(touch.clientX));
  }, [getPositionFromEvent]);

  const handleTouchEnd = useCallback(() => {
    isDragging.current = false;
  }, []);

  const handleClick = useCallback((e: React.MouseEvent) => {
    setSliderPosition(getPositionFromEvent(e.clientX));
  }, [getPositionFromEvent]);

  if (totalItems === 0) return null;

  const currentItem = items[currentIndex];

  return (
    <div className="relative w-full" style={{ height: "70vh" }}>
      {/* Before/After container */}
      <div
        ref={containerRef}
        className="relative h-full w-full overflow-hidden touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleClick}
      >
        {/* After image (full) */}
        <img
          src={currentItem.afterImage}
          alt="Depois"
          className="absolute inset-0 h-full w-full object-cover"
          draggable={false}
          loading="eager"
        />

        {/* Before image (clipped) */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
        >
          <img
            src={currentItem.beforeImage}
            alt="Antes"
            className="absolute inset-0 h-full w-full object-cover"
            draggable={false}
            loading="eager"
          />
        </div>

        {/* Slider line + handle */}
        <div
          className="absolute top-0 bottom-0 w-[2px] bg-white/80 pointer-events-none z-10"
          style={{ left: `${sliderPosition}%`, transform: "translateX(-50%)" }}
        >
          <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-xl flex items-center justify-center">
            <div className="flex gap-[2px]">
              <div className="w-[2px] h-4 bg-gray-400 rounded-full" />
              <div className="w-[2px] h-4 bg-gray-400 rounded-full" />
            </div>
          </div>
        </div>

        {/* Labels */}
        <div className="absolute top-4 left-4 bg-black/60 text-white text-xs px-3 py-1 rounded-full z-10">
          Antes
        </div>
        <div className="absolute top-4 right-4 bg-black/60 text-white text-xs px-3 py-1 rounded-full z-10">
          Depois
        </div>
      </div>

      {/* Navigation arrows */}
      {currentIndex > 0 && (
        <button
          onClick={goPrev}
          className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white border border-white/20 active:scale-95 transition-transform"
          aria-label="Anterior"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}
      {currentIndex < totalItems - 1 && (
        <button
          onClick={goNext}
          className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white border border-white/20 active:scale-95 transition-transform"
          aria-label="Próximo"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}

      {/* Progress dots */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20">
        {items.map((_, i) => (
          <button
            key={i}
            onClick={() => { setCurrentIndex(i); setSliderPosition(50); }}
            className={`rounded-full transition-all duration-300 ${
              i === currentIndex
                ? "w-8 h-2 bg-fuchsia-500"
                : "w-2 h-2 bg-white/30"
            }`}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default MobileBeforeAfterGallery;
