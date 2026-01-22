import { useState, useRef, useEffect } from "react";
import { BeforeAfterSlider } from "./BeforeAfterSlider";
import { ZoomIn } from "lucide-react";

interface LazyBeforeAfterSliderProps {
  beforeImage: string;
  afterImage: string;
  label?: string;
  badge?: string;
  badgeColor?: string;
  locale?: 'pt' | 'es';
  onZoomClick?: () => void;
  aspectRatio?: string;
}

/**
 * Lazy-loading wrapper for BeforeAfterSlider
 * Shows placeholder until component is in viewport, then loads images
 */
export const LazyBeforeAfterSlider = ({
  beforeImage,
  afterImage,
  label,
  badge,
  badgeColor = "from-fuchsia-500 to-pink-500",
  locale = 'pt',
  onZoomClick,
  aspectRatio
}: LazyBeforeAfterSliderProps) => {
  const [isInView, setIsInView] = useState(false);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { 
        rootMargin: '300px', // Start loading 300px before visible
        threshold: 0 
      }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  // Preload images when in view
  useEffect(() => {
    if (!isInView) return;

    let loadedCount = 0;
    const checkLoaded = () => {
      loadedCount++;
      if (loadedCount >= 2) {
        setImagesLoaded(true);
      }
    };

    const img1 = new Image();
    const img2 = new Image();
    
    img1.onload = checkLoaded;
    img1.onerror = checkLoaded;
    img2.onload = checkLoaded;
    img2.onerror = checkLoaded;

    img1.src = beforeImage;
    img2.src = afterImage;
  }, [isInView, beforeImage, afterImage]);

  return (
    <div ref={containerRef} className="relative group">
      {/* Glow effect on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-fuchsia-500/20 to-purple-500/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="relative bg-white/5 border border-white/10 rounded-3xl p-4 hover:border-fuchsia-500/30 transition-all duration-300 hover:transform hover:scale-[1.02]">
        {/* Badge */}
        {badge && (
          <div className={`absolute -top-3 left-1/2 -translate-x-1/2 z-10 bg-gradient-to-r ${badgeColor} text-white border-0 rounded-full px-4 py-1 font-semibold shadow-lg text-xs`}>
            {badge}
          </div>
        )}
        
        <div className="pt-2">
          {/* Placeholder skeleton - shown while not in view or images loading */}
          {(!isInView || !imagesLoaded) && (
            <div 
              className="rounded-xl overflow-hidden bg-white/5 relative"
              style={{ aspectRatio: aspectRatio || '4/3' }}
            >
              {/* Skeleton animation */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse" />
              
              {/* Placeholder content */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-2">
                    <ZoomIn className="w-6 h-6 text-white/30" />
                  </div>
                  <div className="h-3 w-24 bg-white/10 rounded mx-auto" />
                </div>
              </div>

              {/* Slider line placeholder */}
              <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white/20" />
            </div>
          )}

          {/* Actual slider - rendered when in view, hidden until images loaded */}
          {isInView && (
            <div className={imagesLoaded ? 'block' : 'hidden'}>
              <BeforeAfterSlider
                beforeImage={beforeImage}
                afterImage={afterImage}
                label={label}
                locale={locale}
                onZoomClick={onZoomClick}
                aspectRatio={aspectRatio}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LazyBeforeAfterSlider;
