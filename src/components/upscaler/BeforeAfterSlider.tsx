import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { ZoomIn } from "lucide-react";
import { ResilientImage } from "./ResilientImage";

interface BeforeAfterSliderProps {
  beforeImage: string;
  afterImage: string;
  label?: string;
  size?: "default" | "large";
  onZoomClick?: () => void;
  locale?: 'pt' | 'es';
  aspectRatio?: string;
  onDownloadClick?: () => void;
  downloadFileName?: string;
}

export const BeforeAfterSlider = ({ 
  beforeImage, 
  afterImage, 
  label,
  size = "default",
  onZoomClick,
  locale = 'pt',
  aspectRatio,
  onDownloadClick,
  downloadFileName
}: BeforeAfterSliderProps) => {
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

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    handleMove(e.clientX);
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
    
    if (deltaX > deltaY && deltaX > 10) {
      isHorizontalDrag.current = true;
    }
    
    if (isHorizontalDrag.current) {
      e.preventDefault();
    }
    
    handleMove(touch.clientX);
  };

  const handleTouchEnd = () => {
    isDragging.current = false;
    isHorizontalDrag.current = false;
  };

  const getAspectRatio = () => {
    if (aspectRatio) return aspectRatio;
    return size === "large" ? "4/3" : "1/1";
  };

  return (
    <div className="space-y-3">
      <div 
        ref={containerRef}
        className="relative w-full rounded-3xl overflow-hidden cursor-ew-resize select-none border-2 border-white/10 shadow-2xl shadow-fuchsia-500/10"
        onDragStart={(e) => e.preventDefault()}
        style={{ aspectRatio: getAspectRatio() }}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onMouseMove={handleMouseMove}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* After Image (background) */}
        <ResilientImage 
          src={afterImage} 
          alt={locale === 'es' ? "Después" : "Depois"}
          className="absolute inset-0 pointer-events-none"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center'
          }}
          timeout={10000}
          compressOnFailure={true}
          showDownloadOnFail={!!onDownloadClick}
          onDownloadClick={onDownloadClick}
          downloadFileName={downloadFileName}
          locale={locale}
        />
        
        {/* Before Image (clipped) */}
        <div 
          className="absolute inset-0 overflow-hidden"
          style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
        >
          <ResilientImage 
            src={beforeImage} 
            alt={locale === 'es' ? "Antes" : "Antes"}
            className="absolute inset-0 pointer-events-none"
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
          />
        </div>

        {/* Slider line - identical to Hero */}
        <div 
          className="absolute top-0 bottom-0 w-1 bg-white shadow-lg"
          style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
        >
          <div className="absolute left-1/2 -translate-x-1/2 bottom-6 md:bottom-auto md:top-1/2 md:-translate-y-1/2 w-12 h-12 bg-white rounded-full shadow-xl flex items-center justify-center">
            <div className="flex gap-0.5">
              <div className="w-0.5 h-5 bg-gray-400 rounded-full" />
              <div className="w-0.5 h-5 bg-gray-400 rounded-full" />
            </div>
          </div>
        </div>

        {/* Labels - identical to Hero */}
        <div className="absolute top-4 left-4 bg-black/80 text-white text-sm font-semibold px-4 py-2 rounded-full">
          {t('tools:upscaler.beforeAfter.before')}
        </div>
        <div className="absolute top-4 right-4 bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white text-sm font-semibold px-4 py-2 rounded-full">
          {t('tools:upscaler.beforeAfter.after')}
        </div>

        {/* Zoom button */}
        {onZoomClick && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onZoomClick();
            }}
            className="absolute bottom-4 right-4 p-3 bg-black/70 hover:bg-black/90 rounded-full transition-all duration-300 hover:scale-110 border border-white/20 z-10"
          >
            <ZoomIn className="h-5 w-5 text-white" />
          </button>
        )}
      </div>
      {label && <p className="text-center text-white/60 text-sm">{label}</p>}
    </div>
  );
};

export default BeforeAfterSlider;
