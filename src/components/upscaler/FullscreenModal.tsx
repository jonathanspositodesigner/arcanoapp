import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { X, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

interface FullscreenModalProps {
  isOpen: boolean;
  onClose: () => void;
  beforeImage: string;
  afterImage: string;
  locale?: 'pt' | 'es';
}

/**
 * Fullscreen modal for zoomed before/after comparison
 * Supports: scroll wheel zoom, pinch zoom, double-click zoom, pan (drag), slider
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
  const isDraggingSlider = useRef(false);

  const handleMove = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  };

  const handleSliderMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 100;
    if (Math.abs(clickX - sliderPosition) < 8) {
      e.stopPropagation();
      e.preventDefault();
      isDraggingSlider.current = true;
    }
  };

  const handleMouseUp = () => {
    isDraggingSlider.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDraggingSlider.current) {
      e.stopPropagation();
      handleMove(e.clientX);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    // Only start slider drag if touching near the slider line
    if (!containerRef.current) return;
    const touch = e.touches[0];
    const rect = containerRef.current.getBoundingClientRect();
    const touchX = ((touch.clientX - rect.left) / rect.width) * 100;
    if (Math.abs(touchX - sliderPosition) < 8) {
      isDraggingSlider.current = true;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDraggingSlider.current) {
      e.stopPropagation();
      handleMove(e.touches[0].clientX);
    }
  };

  const handleTouchEnd = () => {
    isDraggingSlider.current = false;
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
        className="relative w-full max-w-5xl"
        onClick={(e) => e.stopPropagation()}
      >
        <TransformWrapper
          initialScale={1}
          minScale={1}
          maxScale={8}
          centerOnInit
          wheel={{ step: 0.3 }}
          panning={{ disabled: false }}
          doubleClick={{ mode: "toggle", step: 3 }}
        >
          {({ zoomIn, zoomOut, resetTransform }) => (
            <>
              {/* Zoom controls */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 bg-black/70 backdrop-blur-sm rounded-full px-3 py-1.5 border border-white/10">
                <button onClick={() => zoomOut()} className="p-1.5 text-white/70 hover:text-white transition-colors">
                  <ZoomOut className="w-5 h-5" />
                </button>
                <button onClick={() => zoomIn()} className="p-1.5 text-white/70 hover:text-white transition-colors">
                  <ZoomIn className="w-5 h-5" />
                </button>
                <div className="w-px h-5 bg-white/20 mx-1" />
                <button onClick={() => resetTransform()} className="p-1.5 text-white/70 hover:text-white transition-colors">
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>

              <TransformComponent wrapperClass="!w-full" contentClass="!w-full">
                <div 
                  ref={containerRef}
                  className="relative w-full rounded-xl overflow-hidden cursor-ew-resize select-none"
                  style={{ aspectRatio: '4/3' }}
                  onMouseDown={handleSliderMouseDown}
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
                    className="absolute top-0 bottom-0 w-[2px] bg-white/70"
                    style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
                  >
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-6 md:bottom-auto md:top-1/2 md:-translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center">
                      <div className="flex gap-[1px]">
                        <div className="w-[1px] h-4 bg-gray-400 rounded-full" />
                        <div className="w-[1px] h-4 bg-gray-400 rounded-full" />
                      </div>
                    </div>
                  </div>

                  {/* Labels */}
                  <div className="absolute top-3 left-3 bg-black/60 text-white/80 text-xs font-medium px-3 py-1.5 rounded-full">
                    {t('tools:upscaler.beforeAfter.before')}
                  </div>
                  <div className="absolute top-3 right-3 bg-white/15 text-white/80 text-xs font-medium px-3 py-1.5 rounded-full">
                    {t('tools:upscaler.beforeAfter.after')}
                  </div>
                </div>
              </TransformComponent>
            </>
          )}
        </TransformWrapper>
      </div>
    </div>
  );
};

export default FullscreenModal;
