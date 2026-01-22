import { useState, useRef, useEffect, Suspense, lazy } from "react";
import { SectionSkeleton } from "./SectionSkeleton";

const SocialProofSectionPT = lazy(() => import("./sections/SocialProofSectionPT"));
const SocialProofSectionES = lazy(() => import("./sections/SocialProofSectionES"));

interface LazySocialProofWrapperProps {
  locale: 'pt' | 'es';
  onZoomClick: (before: string, after: string) => void;
}

/**
 * Wrapper that lazy loads Social Proof section only when user scrolls near it.
 * Uses Intersection Observer with 500px rootMargin to start loading before visible.
 */
export const LazySocialProofWrapper = ({ locale, onZoomClick }: LazySocialProofWrapperProps) => {
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
            <SocialProofSectionES onZoomClick={onZoomClick} />
          ) : (
            <SocialProofSectionPT onZoomClick={onZoomClick} />
          )}
        </Suspense>
      ) : (
        <SectionSkeleton />
      )}
    </div>
  );
};

export default LazySocialProofWrapper;
