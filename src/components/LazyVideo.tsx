import { memo, useState, useRef, useEffect } from 'react';
import { SecureVideo } from '@/components/SecureMedia';
import { Video } from 'lucide-react';

interface LazyVideoProps {
  src: string;
  className?: string;
  onClick?: () => void;
}

/**
 * LazyVideo - Only loads video when visible in viewport
 * Uses Intersection Observer for performance optimization
 */
export const LazyVideo = memo(({ src, className = '', onClick }: LazyVideoProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            // Once visible, we keep it loaded (don't unload on scroll away)
            setHasLoaded(true);
            observer.unobserve(element);
          }
        });
      },
      {
        rootMargin: '100px', // Start loading 100px before entering viewport
        threshold: 0.1
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={containerRef} className={`${className} relative`} onClick={onClick}>
      {(isVisible || hasLoaded) ? (
        <SecureVideo 
          src={src}
          isPremium={false}
          className="w-full h-full object-cover cursor-pointer"
          autoPlay={true}
          muted={true}
          loop={true}
          playsInline={true}
          controls={false}
          preload="metadata"
        />
      ) : (
        // Placeholder while not visible
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-secondary/20 to-primary/10 flex items-center justify-center">
          <Video className="h-10 w-10 text-primary/30" />
        </div>
      )}
    </div>
  );
});

LazyVideo.displayName = 'LazyVideo';

export default LazyVideo;
