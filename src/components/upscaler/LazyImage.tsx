import { useState, useRef, useEffect } from "react";

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  placeholderColor?: string;
  onLoad?: () => void;
}

/**
 * LazyImage component using IntersectionObserver
 * Only loads image when it enters the viewport
 */
export const LazyImage = ({ 
  src, 
  alt, 
  className = "",
  style,
  placeholderColor = "rgba(139, 92, 246, 0.1)",
  onLoad
}: LazyImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = imgRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.unobserve(element);
        }
      },
      { 
        rootMargin: '200px', // Start loading 200px before visible
        threshold: 0 
      }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  return (
    <div 
      ref={imgRef} 
      className={`relative overflow-hidden ${className}`}
      style={style}
    >
      {/* Placeholder skeleton */}
      <div 
        className={`absolute inset-0 transition-opacity duration-300 ${isLoaded ? 'opacity-0' : 'opacity-100'}`}
        style={{ backgroundColor: placeholderColor }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse" />
      </div>

      {/* Actual image - only rendered when in view */}
      {isInView && (
        <img 
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={handleLoad}
          className={`w-full h-full object-cover transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
          style={style}
        />
      )}
    </div>
  );
};

export default LazyImage;
