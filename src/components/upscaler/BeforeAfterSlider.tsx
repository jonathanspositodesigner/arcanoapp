import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { ZoomIn } from "lucide-react";

interface BeforeAfterSliderProps {
  beforeImage: string;
  afterImage: string;
  label?: string;
  size?: "default" | "large";
  onZoomClick?: () => void;
  locale?: 'pt' | 'es';
}

/**
 * Standard BeforeAfterSlider for secondary images
 * Uses loading="lazy" and decoding="async" for non-LCP images
 */
export const BeforeAfterSlider = ({ 
  beforeImage, 
  afterImage, 
  label,
  size = "default",
  onZoomClick,
  locale = 'pt'
}: BeforeAfterSliderProps) => {
  const { t: tOriginal } = useTranslation();
  const t = (key: string) => tOriginal(key, { lng: locale });
  const [sliderPosition, setSliderPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

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

  const handleTouchMove = (e: React.TouchEvent) => {
    handleMove(e.touches[0].clientX);
  };

  return (
    <div className="space-y-3">
      <div 
        ref={containerRef}
        className={`relative w-full ${size === "large" ? "aspect-[4/3]" : "aspect-square"} rounded-3xl overflow-hidden cursor-ew-resize select-none border-2 border-white/10 shadow-2xl shadow-fuchsia-500/10`}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onMouseMove={handleMouseMove}
        onTouchMove={handleTouchMove}
      >
        {/* After Image (background) */}
        <img 
          src={afterImage} 
          alt={locale === 'es' ? "Después" : "Depois"}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover"
        />
        
        {/* Before Image (clipped) */}
        <div 
          className="absolute inset-0 overflow-hidden"
          style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
        >
          <img 
            src={beforeImage} 
            alt={locale === 'es' ? "Antes" : "Antes"}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover"
          />
        </div>

        {/* Slider line */}
        <div 
          className="absolute top-0 bottom-0 w-1 bg-white shadow-lg"
          style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full shadow-xl flex items-center justify-center">
            <div className="flex gap-0.5">
              <div className="w-0.5 h-5 bg-gray-400 rounded-full" />
              <div className="w-0.5 h-5 bg-gray-400 rounded-full" />
            </div>
          </div>
        </div>

        {/* Labels */}
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
            className="absolute bottom-4 right-4 p-3 bg-black/70 hover:bg-black/90 rounded-full transition-all duration-300 hover:scale-110 border border-white/20"
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
