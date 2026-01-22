import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";

interface FullscreenModalProps {
  isOpen: boolean;
  onClose: () => void;
  beforeImage: string;
  afterImage: string;
  locale?: 'pt' | 'es';
}

/**
 * Fullscreen modal for zoomed before/after comparison
 */
export const FullscreenModal = ({ 
  isOpen, 
  onClose, 
  beforeImage, 
  afterImage,
  locale = 'pt'
}: FullscreenModalProps) => {
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

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
      >
        <X className="h-6 w-6 text-white" />
      </button>
      
      <div 
        ref={containerRef}
        className="relative w-full max-w-4xl aspect-square md:aspect-[4/3] rounded-2xl overflow-hidden cursor-ew-resize select-none"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onMouseMove={handleMouseMove}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* After Image (background) */}
        <img 
          src={afterImage} 
          alt={locale === 'es' ? "Después" : "Depois"}
          className="absolute inset-0 w-full h-full object-contain bg-black"
        />
        
        {/* Before Image (clipped) */}
        <div 
          className="absolute inset-0 overflow-hidden"
          style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
        >
          <img 
            src={beforeImage} 
            alt={locale === 'es' ? "Antes" : "Antes"}
            className="absolute inset-0 w-full h-full object-contain bg-black"
          />
        </div>

        {/* Slider line */}
        <div 
          className="absolute top-0 bottom-0 w-1 bg-white shadow-lg"
          style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
        >
          <div className="absolute left-1/2 -translate-x-1/2 bottom-6 md:bottom-auto md:top-1/2 md:-translate-y-1/2 w-14 h-14 bg-white rounded-full shadow-xl flex items-center justify-center">
            <div className="flex gap-0.5">
              <div className="w-0.5 h-6 bg-gray-400 rounded-full" />
              <div className="w-0.5 h-6 bg-gray-400 rounded-full" />
            </div>
          </div>
        </div>

        {/* Labels */}
        <div className="absolute top-4 left-4 bg-black/80 text-white text-base font-semibold px-5 py-2.5 rounded-full">
          {t('tools:upscaler.beforeAfter.before')}
        </div>
        <div className="absolute top-4 right-4 bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white text-base font-semibold px-5 py-2.5 rounded-full">
          {t('tools:upscaler.beforeAfter.after')}
        </div>
      </div>
    </div>
  );
};

export default FullscreenModal;
