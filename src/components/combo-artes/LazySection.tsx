import { useEffect, useRef, useState, ReactNode } from "react";

interface LazySectionProps {
  children: ReactNode;
  fallback?: ReactNode;
  rootMargin?: string;
}

/**
 * Wrapper que só renderiza o conteúdo quando está próximo de ser visível
 * Usa IntersectionObserver com margem configurável para pré-carregar
 */
export const LazySection = ({ 
  children, 
  fallback = <div className="min-h-[400px] bg-black" />,
  rootMargin = "500px"
}: LazySectionProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [rootMargin]);

  return (
    <div ref={ref}>
      {isVisible ? children : fallback}
    </div>
  );
};
