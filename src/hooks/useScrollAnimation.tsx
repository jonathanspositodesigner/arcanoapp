import { useEffect, useRef, useState, ReactNode, useCallback } from 'react';

interface UseScrollAnimationOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}

// Shared observer pattern - single observer instance for all elements
type ObserverCallback = (isIntersecting: boolean) => void;
const observerCallbacks = new Map<Element, { callback: ObserverCallback; triggerOnce: boolean }>();
let sharedObserver: IntersectionObserver | null = null;

const getSharedObserver = (threshold: number = 0.1, rootMargin: string = '0px') => {
  if (!sharedObserver) {
    sharedObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          const config = observerCallbacks.get(entry.target);
          if (config) {
            config.callback(entry.isIntersecting);
            if (entry.isIntersecting && config.triggerOnce) {
              sharedObserver?.unobserve(entry.target);
              observerCallbacks.delete(entry.target);
            }
          }
        });
      },
      { threshold, rootMargin }
    );
  }
  return sharedObserver;
};

export const useScrollAnimation = (options: UseScrollAnimationOptions = {}) => {
  const { threshold = 0.1, rootMargin = '0px', triggerOnce = true } = options;
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  const handleIntersection = useCallback((isIntersecting: boolean) => {
    if (isIntersecting) {
      setIsVisible(true);
    } else if (!triggerOnce) {
      setIsVisible(false);
    }
  }, [triggerOnce]);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = getSharedObserver(threshold, rootMargin);
    observerCallbacks.set(element, { callback: handleIntersection, triggerOnce });
    observer.observe(element);

    return () => {
      observer.unobserve(element);
      observerCallbacks.delete(element);
    };
  }, [threshold, rootMargin, triggerOnce, handleIntersection]);

  return { ref, isVisible };
};

// Animation types
type AnimationType = 'fade-up' | 'fade-down' | 'fade-left' | 'fade-right' | 'scale' | 'fade' | 'blur' | 'rotate' | 'bounce' | 'slide-in';

// Animated Section Component
interface AnimatedSectionProps {
  children: ReactNode;
  className?: string;
  animation?: AnimationType;
  delay?: number;
  duration?: number;
  as?: 'section' | 'div' | 'article' | 'header' | 'footer' | 'main' | 'aside' | 'nav';
}

export const AnimatedSection = ({
  children,
  className = '',
  animation = 'fade-up',
  delay = 0,
  duration = 700,
  as: Component = 'section',
}: AnimatedSectionProps) => {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });

  const baseTransform: Record<AnimationType, string> = {
    'fade-up': 'translate-y-8',
    'fade-down': '-translate-y-8',
    'fade-left': 'translate-x-8',
    'fade-right': '-translate-x-8',
    'scale': 'scale-95',
    'fade': '',
    'blur': 'blur-sm',
    'rotate': 'rotate-3',
    'bounce': 'translate-y-4',
    'slide-in': 'translate-x-full',
  };

  const blurClass = animation === 'blur' ? (isVisible ? 'blur-0' : 'blur-sm') : '';

  return (
    <Component
      ref={ref}
      className={`transition-all ease-out ${className} ${blurClass} ${
        isVisible 
          ? 'opacity-100 translate-y-0 translate-x-0 scale-100 rotate-0' 
          : `opacity-0 ${baseTransform[animation]}`
      }`}
      style={{ 
        transitionDelay: `${delay}ms`,
        transitionDuration: `${duration}ms`
      }}
    >
      {children}
    </Component>
  );
};

// Animated Element for smaller/individual items
interface AnimatedElementProps {
  children: ReactNode;
  className?: string;
  animation?: AnimationType;
  delay?: number;
  duration?: number;
}

export const AnimatedElement = ({
  children,
  className = '',
  animation = 'fade-up',
  delay = 0,
  duration = 500,
}: AnimatedElementProps) => {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.2 });

  const baseTransform: Record<AnimationType, string> = {
    'fade-up': 'translate-y-6',
    'fade-down': '-translate-y-6',
    'fade-left': 'translate-x-6',
    'fade-right': '-translate-x-6',
    'scale': 'scale-90',
    'fade': '',
    'blur': '',
    'rotate': 'rotate-6',
    'bounce': 'translate-y-3',
    'slide-in': 'translate-x-12',
  };

  return (
    <div
      ref={ref}
      className={`transition-all ease-out ${className} ${
        isVisible 
          ? 'opacity-100 translate-y-0 translate-x-0 scale-100 rotate-0' 
          : `opacity-0 ${baseTransform[animation]}`
      }`}
      style={{ 
        transitionDelay: `${delay}ms`,
        transitionDuration: `${duration}ms`
      }}
    >
      {children}
    </div>
  );
};

// Staggered children animation
interface StaggeredAnimationProps {
  children: ReactNode[];
  className?: string;
  itemClassName?: string;
  staggerDelay?: number;
  animation?: AnimationType;
  duration?: number;
}

export const StaggeredAnimation = ({
  children,
  className = '',
  itemClassName = '',
  staggerDelay = 100,
  animation = 'fade-up',
  duration = 500,
}: StaggeredAnimationProps) => {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });

  const baseTransform: Record<AnimationType, string> = {
    'fade-up': 'translate-y-8',
    'fade-down': '-translate-y-8',
    'fade-left': 'translate-x-8',
    'fade-right': '-translate-x-8',
    'scale': 'scale-95',
    'fade': '',
    'blur': '',
    'rotate': 'rotate-3',
    'bounce': 'translate-y-4',
    'slide-in': 'translate-x-full',
  };

  return (
    <div ref={ref} className={className}>
      {children.map((child, index) => (
        <div
          key={index}
          className={`transition-all ease-out h-full ${itemClassName} ${
            isVisible 
              ? 'opacity-100 translate-y-0 translate-x-0 scale-100' 
              : `opacity-0 ${baseTransform[animation]}`
          }`}
          style={{ 
            transitionDelay: `${index * staggerDelay}ms`,
            transitionDuration: `${duration}ms`
          }}
        >
          {child}
        </div>
      ))}
    </div>
  );
};

// Optimized Grid Animation for cards
interface AnimatedGridProps {
  children: ReactNode[];
  className?: string;
  itemClassName?: string;
  staggerDelay?: number;
  animation?: AnimationType;
  duration?: number;
  columns?: number;
}

export const AnimatedGrid = ({
  children,
  className = '',
  itemClassName = '',
  staggerDelay = 75,
  animation = 'fade-up',
  duration = 400,
}: AnimatedGridProps) => {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.05 });

  const baseTransform: Record<AnimationType, string> = {
    'fade-up': 'translate-y-6',
    'fade-down': '-translate-y-6',
    'fade-left': 'translate-x-6',
    'fade-right': '-translate-x-6',
    'scale': 'scale-95',
    'fade': '',
    'blur': '',
    'rotate': 'rotate-2',
    'bounce': 'translate-y-3',
    'slide-in': 'translate-x-8',
  };

  return (
    <div ref={ref} className={className}>
      {children.map((child, index) => (
        <div
          key={index}
          className={`transition-all ease-out ${itemClassName} ${
            isVisible 
              ? 'opacity-100 translate-y-0 translate-x-0 scale-100' 
              : `opacity-0 ${baseTransform[animation]}`
          }`}
          style={{ 
            transitionDelay: `${Math.min(index * staggerDelay, 600)}ms`,
            transitionDuration: `${duration}ms`
          }}
        >
          {child}
        </div>
      ))}
    </div>
  );
};

// Scroll Indicator Component
interface ScrollIndicatorProps {
  className?: string;
  text?: string;
}

export const ScrollIndicator = ({ className = '', text = 'Role para ver mais' }: ScrollIndicatorProps) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 100) {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!isVisible) return null;

  return (
    <div className={`flex flex-col items-center gap-2 transition-opacity duration-500 ${className}`}>
      <span className="text-sm text-white/50">{text}</span>
      <div className="w-6 h-10 rounded-full border-2 border-white/30 flex justify-center pt-2">
        <div className="w-1.5 h-3 bg-white/50 rounded-full animate-scrollDown" />
      </div>
    </div>
  );
};

// Fade In on Mount (no scroll required)
interface FadeInProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
}

export const FadeIn = ({ children, className = '', delay = 0, duration = 500 }: FadeInProps) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={`transition-all ease-out ${className} ${
        mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
      style={{
        transitionDelay: `${delay}ms`,
        transitionDuration: `${duration}ms`
      }}
    >
      {children}
    </div>
  );
};
