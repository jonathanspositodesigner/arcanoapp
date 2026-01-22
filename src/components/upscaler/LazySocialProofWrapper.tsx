import { useState, useRef, useEffect, Suspense, lazy } from "react";
import { SectionSkeleton } from "./SectionSkeleton";

const SocialProofSectionPT = lazy(() => import("./sections/SocialProofSectionPT"));
const SocialProofSectionES = lazy(() => import("./sections/SocialProofSectionES"));

interface LazySocialProofWrapperProps {
  locale: 'pt' | 'es';
  onZoomClick: (before: string, after: string) => void;
  isMobile?: boolean;
}

/**
 * Wrapper that lazy loads Social Proof section only when user scrolls near it.
 * Uses Intersection Observer with 500px rootMargin to start loading before visible.
 * Passes isMobile to child components for conditional image loading.
 */
export const LazySocialProofWrapper = ({ locale, onZoomClick, isMobile = false }: LazySocialProofWrapperProps) => {
  const [shouldLoad, setShouldLoad] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: '500px', threshold: 0 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef}>
      {shouldLoad ? (
        <Suspense fallback={<SectionSkeleton />}>
          {locale === 'es' ? (
            <SocialProofSectionES onZoomClick={onZoomClick} isMobile={isMobile} />
          ) : (
            <SocialProofSectionPT onZoomClick={onZoomClick} isMobile={isMobile} />
          )}
        </Suspense>
      ) : (
        <SectionSkeleton />
      )}
    </div>
  );
};

export default LazySocialProofWrapper;
