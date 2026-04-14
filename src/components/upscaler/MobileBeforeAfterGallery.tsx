import { useState, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ResilientImage } from "./ResilientImage";

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
  const touchStartRef = useRef({ x: 0, y: 0 });
  const isHorizontalDrag = useRef(false);

  const totalItems = items.length;

  const goNext = useCallback(() => {
    setCurrentIndex((prev) => Math.min(prev + 1, totalItems - 1));
    setSliderPosition(50);
  }, [totalItems]);

  const goPrev = useCallback(() => {
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
    setSliderPosition(50);
  }, []);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    setSliderPosition(Math.max(0, Math.min(100, (x / rect.width) * 100)));
  }, []);

  // Same touch logic as HeroBeforeAfterSlider
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    isHorizontalDrag.current = false;
    isDragging.current = true;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);

    if (deltaX > deltaY && deltaX > 10) {
      isHorizontalDrag.current = true;
    }

    if (isHorizontalDrag.current) {
      e.preventDefault();
    }

    handleMove(touch.clientX);
  }, [handleMove]);

  const handleTouchEnd = useCallback(() => {
    isDragging.current = false;
    isHorizontalDrag.current = false;
  }, []);

  const handleMouseDown = useCallback(() => {
    isDragging.current = true;
  }, []);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging.current) {
      handleMove(e.clientX);
    }
  }, [handleMove]);

  if (totalItems === 0) return null;

  const currentItem = items[currentIndex];

  return (
    <div className="relative w-full" style={{ height: "70vh" }}>
      <div
        ref={containerRef}
        className="relative h-full w-full overflow-hidden cursor-ew-resize select-none"
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onMouseMove={handleMouseMove}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* After image (full) */}
        <ResilientImage
          src={currentItem.afterImage}
          alt="Depois"
          className="absolute inset-0"
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
          timeout={10000}
          compressOnFailure={true}
          showDownloadOnFail={false}
        />

        {/* Before image (clipped) */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
        >
          <ResilientImage
            src={currentItem.beforeImage}
            alt="Antes"
            className="absolute inset-0"
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
            timeout={10000}
            compressOnFailure={true}
            showDownloadOnFail={false}
          />
        </div>

        {/* Slider line + handle */}
        <div
          className="absolute top-0 bottom-0 w-[2px] bg-white/70 pointer-events-none z-10"
          style={{ left: `${sliderPosition}%`, transform: "translateX(-50%)" }}
        >
          <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center">
            <div className="flex gap-[1px]">
              <div className="w-[1px] h-3 bg-gray-400 rounded-full" />
              <div className="w-[1px] h-3 bg-gray-400 rounded-full" />
            </div>
          </div>
        </div>

        {/* Labels */}
        <div className="absolute top-3 left-3 bg-black/60 text-white/80 text-[10px] font-medium px-2.5 py-1 rounded-full z-10">
          Antes
        </div>
        <div className="absolute top-3 right-3 bg-white/15 text-white/80 text-[10px] font-medium px-2.5 py-1 rounded-full z-10">
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
                ? "w-8 h-2 bg-white/50"
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
