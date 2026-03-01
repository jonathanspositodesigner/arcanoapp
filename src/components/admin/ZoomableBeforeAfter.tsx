import { useState, useRef, useCallback } from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { ResilientImage } from "@/components/upscaler/ResilientImage";

interface ZoomableBeforeAfterProps {
  beforeImage: string;
  afterImage: string;
  onFullscreenClick?: () => void;
}

export const ZoomableBeforeAfter = ({ beforeImage, afterImage, onFullscreenClick }: ZoomableBeforeAfterProps) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingSlider = useRef(false);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  }, []);

  const handleSliderMouseDown = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 100;
    if (Math.abs(clickX - sliderPosition) < 8) {
      e.stopPropagation();
      e.preventDefault();
      isDraggingSlider.current = true;
    }
  }, [sliderPosition]);

  const handleMouseUp = useCallback(() => {
    isDraggingSlider.current = false;
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDraggingSlider.current) {
      e.stopPropagation();
      handleMove(e.clientX);
    }
  }, [handleMove]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!containerRef.current) return;
    const touch = e.touches[0];
    const rect = containerRef.current.getBoundingClientRect();
    const touchX = ((touch.clientX - rect.left) / rect.width) * 100;
    if (Math.abs(touchX - sliderPosition) < 12) {
      isDraggingSlider.current = true;
    }
  }, [sliderPosition]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (isDraggingSlider.current) {
      handleMove(e.touches[0].clientX);
    }
  }, [handleMove]);

  const handleTouchEnd = useCallback(() => {
    isDraggingSlider.current = false;
  }, []);

  return (
    <div className="relative rounded-xl overflow-hidden border border-border">
      <TransformWrapper
        initialScale={1}
        minScale={0.5}
        maxScale={8}
        centerOnInit
        wheel={{ step: 0.3 }}
        panning={{ disabled: false }}
        doubleClick={{ mode: "toggle", step: 3 }}
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            {/* Zoom controls */}
            <div className="absolute top-3 right-3 z-20 flex gap-1.5">
              <button onClick={() => zoomIn()} className="p-2 bg-black/70 hover:bg-black/90 rounded-lg text-white transition-colors">
                <ZoomIn className="h-4 w-4" />
              </button>
              <button onClick={() => zoomOut()} className="p-2 bg-black/70 hover:bg-black/90 rounded-lg text-white transition-colors">
                <ZoomOut className="h-4 w-4" />
              </button>
              <button onClick={() => resetTransform()} className="p-2 bg-black/70 hover:bg-black/90 rounded-lg text-white transition-colors text-xs font-bold">
                1:1
              </button>
              {onFullscreenClick && (
                <button onClick={onFullscreenClick} className="p-2 bg-black/70 hover:bg-black/90 rounded-lg text-white transition-colors">
                  <Maximize2 className="h-4 w-4" />
                </button>
              )}
            </div>

            <TransformComponent wrapperClass="!w-full" contentClass="!w-full">
              <div
                ref={containerRef}
                className="relative w-full cursor-grab active:cursor-grabbing select-none bg-black"
                style={{ height: '60vh', maxHeight: '600px' }}
                onMouseDown={handleSliderMouseDown}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onMouseMove={handleMouseMove}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                {/* After image (background) */}
                <ResilientImage
                  src={afterImage}
                  alt="Depois"
                  className="absolute inset-0 pointer-events-none"
                  style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center' }}
                  timeout={10000}
                  compressOnFailure={true}
                  showDownloadOnFail={false}
                  locale="pt"
                />

                {/* Before image (clipped) */}
                <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}>
                  <ResilientImage
                    src={beforeImage}
                    alt="Antes"
                    className="absolute inset-0 pointer-events-none"
                    style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center' }}
                    timeout={10000}
                    compressOnFailure={true}
                    showDownloadOnFail={false}
                    locale="pt"
                  />
                </div>

                {/* Slider line */}
                <div className="absolute top-0 bottom-0 w-1 bg-white shadow-lg" style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}>
                  <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-xl flex items-center justify-center">
                    <div className="flex gap-0.5">
                      <div className="w-0.5 h-4 bg-gray-400 rounded-full" />
                      <div className="w-0.5 h-4 bg-gray-400 rounded-full" />
                    </div>
                  </div>
                </div>

                {/* Labels */}
                <div className="absolute top-3 left-3 bg-black/80 text-white text-xs font-semibold px-3 py-1.5 rounded-full">Antes</div>
                <div className="absolute bottom-3 right-3 bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full">Depois</div>
              </div>
            </TransformComponent>
          </>
        )}
      </TransformWrapper>
    </div>
  );
};
