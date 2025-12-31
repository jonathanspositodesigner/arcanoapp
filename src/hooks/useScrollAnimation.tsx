import { useEffect, useRef, useState, ReactNode } from 'react';

interface UseScrollAnimationOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}

export const useScrollAnimation = (options: UseScrollAnimationOptions = {}) => {
  const { threshold = 0.1, rootMargin = '0px', triggerOnce = true } = options;
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (triggerOnce) {
            observer.unobserve(element);
          }
        } else if (!triggerOnce) {
          setIsVisible(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [threshold, rootMargin, triggerOnce]);

  return { ref, isVisible };
};

// Animated Section Component
interface AnimatedSectionProps {
  children: ReactNode;
  className?: string;
  animation?: 'fade-up' | 'fade-down' | 'fade-left' | 'fade-right' | 'scale' | 'fade';
  delay?: number;
  as?: 'section' | 'div';
}

export const AnimatedSection = ({
  children,
  className = '',
  animation = 'fade-up',
  delay = 0,
  as: Component = 'section',
}: AnimatedSectionProps) => {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });

  const baseTransform = {
    'fade-up': 'translate-y-8',
    'fade-down': '-translate-y-8',
    'fade-left': 'translate-x-8',
    'fade-right': '-translate-x-8',
    'scale': 'scale-95',
    'fade': '',
  };

  return (
    <Component
      ref={ref}
      className={`transition-all duration-700 ease-out ${className} ${
        isVisible 
          ? 'opacity-100 translate-y-0 translate-x-0 scale-100' 
          : `opacity-0 ${baseTransform[animation]}`
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </Component>
  );
};

// Staggered children animation
interface StaggeredAnimationProps {
  children: ReactNode[];
  className?: string;
  staggerDelay?: number;
  animation?: 'fade-up' | 'fade-down' | 'fade-left' | 'fade-right' | 'scale' | 'fade';
}

export const StaggeredAnimation = ({
  children,
  className = '',
  staggerDelay = 100,
  animation = 'fade-up',
}: StaggeredAnimationProps) => {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });

  const baseTransform = {
    'fade-up': 'translate-y-8',
    'fade-down': '-translate-y-8',
    'fade-left': 'translate-x-8',
    'fade-right': '-translate-x-8',
    'scale': 'scale-95',
    'fade': '',
  };

  return (
    <div ref={ref} className={className}>
      {children.map((child, index) => (
        <div
          key={index}
          className={`transition-all duration-500 ease-out ${
            isVisible 
              ? 'opacity-100 translate-y-0 translate-x-0 scale-100' 
              : `opacity-0 ${baseTransform[animation]}`
          }`}
          style={{ transitionDelay: `${index * staggerDelay}ms` }}
        >
          {child}
        </div>
      ))}
    </div>
  );
};
