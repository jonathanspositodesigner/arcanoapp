import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { ZoomIn } from "lucide-react";
import { ResilientImage } from "./ResilientImage";

interface BeforeAfterSliderProps {
  beforeImage: string;
  afterImage: string;
  label?: string;
  size?: "default" | "large";
  compact?: boolean;
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
  compact = false,
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
        className="relative w-full rounded-3xl overflow-hidden cursor-ew-resize select-none border-2 border-border shadow-2xl shadow-primary/5"
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

        {/* Slider line */}
        <div 
          className={`absolute top-0 bottom-0 bg-white/70 ${compact ? 'w-[1px]' : 'w-[2px]'}`}
          style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
        >
          <div className={`absolute left-1/2 -translate-x-1/2 bg-white rounded-full shadow-md flex items-center justify-center ${
            compact 
              ? 'top-1/3 -translate-y-1/2 w-5 h-5' 
              : 'bottom-6 md:bottom-auto md:top-1/2 md:-translate-y-1/2 w-8 h-8'
          }`}>
            <div className={`flex ${compact ? 'gap-[1px]' : 'gap-[1px]'}`}>
              <div className={`bg-gray-400 rounded-full ${compact ? 'w-[1px] h-2' : 'w-[1px] h-3'}`} />
              <div className={`bg-gray-400 rounded-full ${compact ? 'w-[1px] h-2' : 'w-[1px] h-3'}`} />
            </div>
          </div>
        </div>

        {/* Labels */}
        <div className={`absolute left-3 bg-black/60 text-foreground font-medium rounded-full ${
          compact ? 'top-2 text-[8px] px-1.5 py-0.5' : 'top-3 text-[10px] px-2.5 py-1'
        }`}>
          {t('tools:upscaler.beforeAfter.before')}
        </div>
        <div className={`absolute right-3 bg-white/15 text-foreground font-medium rounded-full ${
          compact ? 'top-2 text-[8px] px-1.5 py-0.5' : 'top-3 text-[10px] px-2.5 py-1'
        }`}>
          {t('tools:upscaler.beforeAfter.after')}
        </div>

        {/* Zoom button */}
        {onZoomClick && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onZoomClick();
            }}
            className="absolute bottom-4 right-4 p-3 bg-black/70 hover:bg-black/90 rounded-full transition-all duration-300 hover:scale-110 border border-border z-10"
          >
            <ZoomIn className="h-5 w-5 text-foreground" />
          </button>
        )}
      </div>
      {label && <p className="text-center text-muted-foreground text-sm">{label}</p>}
    </div>
  );
};

export default BeforeAfterSlider;
