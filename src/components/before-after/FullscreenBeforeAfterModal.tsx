import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';

interface FullscreenBeforeAfterModalProps {
  isOpen: boolean;
  onClose: () => void;
  beforeImage: string;
  afterImage: string;
  beforeAlt?: string;
  afterAlt?: string;
  debug?: boolean;
}

interface ImageMetrics {
  naturalWidth: number;
  naturalHeight: number;
  coverScale: number;
}

const FullscreenBeforeAfterModal: React.FC<FullscreenBeforeAfterModalProps> = ({ 
  isOpen, 
  onClose, 
  beforeImage, 
  afterImage,
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
    if (!container || !isOpen) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setContainerSize({ width, height });
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [isOpen]);

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

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSliderPosition(50);
      setBeforeMetrics(null);
      setAfterMetrics(null);
      setCompensationScale(1);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const showDebug = debug || (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('baDebug'));

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white/70 hover:text-white z-50 p-2"
      >
        <X className="w-8 h-8" />
      </button>
      
      <div 
        ref={containerRef}
        className="relative w-full max-w-4xl aspect-[4/3] rounded-2xl overflow-hidden cursor-ew-resize select-none"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleMouseUp}
      >
        {/* After image (background/base layer) */}
        <img 
          src={afterImage} 
          alt={afterAlt}
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
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center">
            <div className="flex gap-1">
              <div className="w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-r-[8px] border-r-gray-600" />
              <div className="w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-l-[8px] border-l-gray-600" />
            </div>
          </div>
        </div>

        {/* Labels */}
        <div className="absolute bottom-6 left-6 bg-black/70 backdrop-blur-sm text-white text-sm font-bold px-4 py-2 rounded-full z-20 pointer-events-none">
          {beforeAlt.toUpperCase()}
        </div>
        <div className="absolute bottom-6 right-6 bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white text-sm font-bold px-4 py-2 rounded-full z-20 pointer-events-none">
          {afterAlt.toUpperCase()}
        </div>

        {/* Debug overlay */}
        {showDebug && beforeMetrics && afterMetrics && (
          <div className="absolute top-4 left-4 bg-black/90 text-white text-xs font-mono p-3 rounded z-40 pointer-events-none space-y-1">
            <div>Container: {containerSize.width.toFixed(0)}×{containerSize.height.toFixed(0)}</div>
            <div>Before: {beforeMetrics.naturalWidth}×{beforeMetrics.naturalHeight} (scale: {beforeMetrics.coverScale.toFixed(4)})</div>
            <div>After: {afterMetrics.naturalWidth}×{afterMetrics.naturalHeight} (scale: {afterMetrics.coverScale.toFixed(4)})</div>
            <div className="text-yellow-400">Compensation: {compensationScale.toFixed(4)}</div>
          </div>
        )}
      </div>
      
      <p className="absolute bottom-8 text-white/50 text-sm">
        Arrastra para comparar
      </p>
    </div>
  );
};

export default FullscreenBeforeAfterModal;
