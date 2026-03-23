import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { ResilientImage } from "./ResilientImage";

interface HeroBeforeAfterSliderProps {
  beforeImage: string;
  afterImage: string;
  label?: string;
  locale?: 'pt' | 'es';
}

/**
 * Optimized Hero BeforeAfterSlider for LCP
 * Uses loading="eager", fetchPriority="high", and decoding="sync"
 * for maximum performance on above-the-fold content
 */
export const HeroBeforeAfterSlider = ({ 
  beforeImage, 
  afterImage, 
  label,
  locale = 'pt'
}: HeroBeforeAfterSliderProps) => {
  const { t: tOriginal } = useTranslation();
  const t = (key: string) => tOriginal(key, { lng: locale });
  const [sliderPosition, setSliderPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const touchStartRef = useRef({ x: 0, y: 0 });
  const isHorizontalDrag = useRef(false);

  const handleMove = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  };

  const handleMouseDown = () => {
    isDragging.current = true;
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging.current) {
      handleMove(e.clientX);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    isHorizontalDrag.current = false;
    isDragging.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);
    
    // Se movimento horizontal > vertical, é um arrasto do slider
    if (deltaX > deltaY && deltaX > 10) {
      isHorizontalDrag.current = true;
    }
    
    // Bloqueia scroll vertical se estiver arrastando horizontalmente
    if (isHorizontalDrag.current) {
      e.preventDefault();
    }
    
    handleMove(touch.clientX);
  };

  const handleTouchEnd = () => {
    isDragging.current = false;
    isHorizontalDrag.current = false;
  };

  return (
    <div className="space-y-3">
      <div 
        ref={containerRef}
        className="relative w-full aspect-[3/4] md:aspect-[4/3] rounded-3xl overflow-hidden cursor-ew-resize select-none border-2 border-white/10 shadow-2xl shadow-fuchsia-500/10"
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onMouseMove={handleMouseMove}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* After Image (background) - Using ResilientImage for robust loading */}
        <ResilientImage 
          src={afterImage} 
          alt={locale === 'es' ? "Después" : "Depois"}
          className="absolute inset-0"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center'
          }}
          timeout={10000}
          compressOnFailure={true}
          showDownloadOnFail={false}
          locale={locale}
          loading="eager"
          fetchPriority="high"
        />
        
        {/* Before Image (clipped) - Using ResilientImage */}
        <div 
          className="absolute inset-0 overflow-hidden"
          style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
        >
          <ResilientImage 
            src={beforeImage} 
            alt={locale === 'es' ? "Antes" : "Antes"}
            className="absolute inset-0"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center'
            }}
            timeout={10000}
            compressOnFailure={true}
            showDownloadOnFail={false}
            locale={locale}
            loading="eager"
            fetchPriority="high"
          />
        </div>

        {/* Slider line */}
        <div 
          className="absolute top-0 bottom-0 w-[2px] bg-white/70"
          style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
        >
          <div className="absolute left-1/2 -translate-x-1/2 bottom-6 md:bottom-auto md:top-1/2 md:-translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center">
            <div className="flex gap-[1px]">
              <div className="w-[1px] h-3 bg-gray-400 rounded-full" />
              <div className="w-[1px] h-3 bg-gray-400 rounded-full" />
            </div>
          </div>
        </div>

        {/* Labels */}
        <div className="absolute top-3 left-3 bg-black/60 text-white/80 text-[10px] font-medium px-2.5 py-1 rounded-full">
          {t('tools:upscaler.beforeAfter.before')}
        </div>
        <div className="absolute top-3 right-3 bg-white/15 text-white/80 text-[10px] font-medium px-2.5 py-1 rounded-full">
          {t('tools:upscaler.beforeAfter.after')}
        </div>
      </div>
      {label && <p className="text-center text-white/60 text-sm">{label}</p>}
    </div>
  );
};

export default HeroBeforeAfterSlider;
