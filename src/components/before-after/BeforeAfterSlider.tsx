import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ZoomIn } from 'lucide-react';

interface BeforeAfterSliderProps {
  beforeImage: string;
  afterImage: string;
  label?: string;
  size?: 'default' | 'large';
  onZoomClick?: () => void;
  beforeAlt?: string;
  afterAlt?: string;
  debug?: boolean;
}

interface ImageMetrics {
  naturalWidth: number;
  naturalHeight: number;
  coverScale: number;
}

const BeforeAfterSlider: React.FC<BeforeAfterSliderProps> = ({ 
  beforeImage, 
  afterImage, 
  label, 
  size = "default", 
  onZoomClick,
  beforeAlt = "Antes",
  afterAlt = "Después",
  debug = false
}) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Image metrics state
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [beforeMetrics, setBeforeMetrics] = useState<ImageMetrics | null>(null);
  const [afterMetrics, setAfterMetrics] = useState<ImageMetrics | null>(null);
  const [compensationScale, setCompensationScale] = useState(1);

  // Calculate cover scale for an image
  const calculateCoverScale = useCallback((imgW: number, imgH: number, contW: number, contH: number): number => {
    if (imgW === 0 || imgH === 0 || contW === 0 || contH === 0) return 1;
    return Math.max(contW / imgW, contH / imgH);
  }, []);

  // Observe container size
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setContainerSize({ width, height });
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Recalculate compensation when metrics change
  useEffect(() => {
    if (!beforeMetrics || !afterMetrics || containerSize.width === 0) return;

    const beforeScale = calculateCoverScale(
      beforeMetrics.naturalWidth, 
      beforeMetrics.naturalHeight, 
      containerSize.width, 
      containerSize.height
    );
    
    const afterScale = calculateCoverScale(
      afterMetrics.naturalWidth, 
      afterMetrics.naturalHeight, 
      containerSize.width, 
      containerSize.height
    );

    // Update metrics with calculated scales
    setBeforeMetrics(prev => prev ? { ...prev, coverScale: beforeScale } : null);
    setAfterMetrics(prev => prev ? { ...prev, coverScale: afterScale } : null);

    // Calculate compensation: scale before to match after's zoom
    const compensation = afterScale / beforeScale;
    setCompensationScale(compensation);
  }, [containerSize, beforeMetrics?.naturalWidth, afterMetrics?.naturalWidth, calculateCoverScale]);

  // Handle image load
  const handleBeforeLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setBeforeMetrics({
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      coverScale: 1
    });
  };

  const handleAfterLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setAfterMetrics({
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      coverScale: 1
    });
  };

  const updateSliderPosition = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    updateSliderPosition(e.clientX);
  }, [updateSliderPosition]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    updateSliderPosition(e.clientX);
  }, [isDragging, updateSliderPosition]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setIsDragging(true);
    updateSliderPosition(e.touches[0].clientX);
  }, [updateSliderPosition]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;
    updateSliderPosition(e.touches[0].clientX);
  }, [isDragging, updateSliderPosition]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const showDebug = debug || (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('baDebug'));

  return (
    <div className="space-y-3">
      <div 
        ref={containerRef}
        className={`relative w-full ${size === "large" ? "aspect-[4/3]" : "aspect-square"} rounded-3xl overflow-hidden cursor-ew-resize select-none border-2 border-white/10 shadow-2xl shadow-fuchsia-500/10`}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleMouseUp}
      >
        {/* After image (background/base layer) */}
        <img 
          src={afterImage} 
          alt={afterAlt}
          loading="lazy"
          decoding="async"
          onLoad={handleAfterLoad}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center'
          }}
        />
        
        {/* Clipped container for before image */}
        <div 
          style={{ 
            position: 'absolute',
            inset: 0,
            clipPath: `inset(0 ${100 - sliderPosition}% 0 0)`,
            overflow: 'hidden'
          }}
        >
          {/* Before image with scale compensation */}
          <img 
            src={beforeImage} 
            alt={beforeAlt}
            loading="lazy"
            decoding="async"
            onLoad={handleBeforeLoad}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center',
              transform: `scale(${compensationScale})`,
              transformOrigin: 'center center'
            }}
          />
        </div>

        {/* Slider line */}
        <div 
          className="absolute top-0 bottom-0 w-1 bg-white shadow-lg z-10 pointer-events-none"
          style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center">
            <div className="flex gap-1">
              <div className="w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-r-[6px] border-r-gray-600" />
              <div className="w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-l-[6px] border-l-gray-600" />
            </div>
          </div>
        </div>

        {/* Labels */}
        <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full z-20 pointer-events-none">
          {beforeAlt.toUpperCase()}
        </div>
        <div className="absolute bottom-4 right-4 bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white text-xs font-bold px-3 py-1.5 rounded-full z-20 pointer-events-none">
          {afterAlt.toUpperCase()}
        </div>

        {/* Zoom button */}
        {onZoomClick && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onZoomClick();
            }}
            className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm text-white p-2 rounded-full hover:bg-black/70 transition-colors z-30"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
        )}

        {/* Debug overlay */}
        {showDebug && beforeMetrics && afterMetrics && (
          <div className="absolute top-4 left-4 bg-black/90 text-white text-[10px] font-mono p-2 rounded z-40 pointer-events-none space-y-1">
            <div>Container: {containerSize.width.toFixed(0)}×{containerSize.height.toFixed(0)}</div>
            <div>Before: {beforeMetrics.naturalWidth}×{beforeMetrics.naturalHeight} (scale: {beforeMetrics.coverScale.toFixed(4)})</div>
            <div>After: {afterMetrics.naturalWidth}×{afterMetrics.naturalHeight} (scale: {afterMetrics.coverScale.toFixed(4)})</div>
            <div className="text-yellow-400">Compensation: {compensationScale.toFixed(4)}</div>
          </div>
        )}
      </div>
      
      {label && (
        <p className="text-center text-white/70 text-sm font-medium">{label}</p>
      )}
    </div>
  );
};

export default BeforeAfterSlider;
