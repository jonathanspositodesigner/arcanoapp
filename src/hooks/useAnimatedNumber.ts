import { useState, useEffect, useRef } from 'react';

interface AnimatedNumberResult {
  displayValue: number;
  isAnimating: boolean;
  direction: 'up' | 'down' | null;
}

// Ease-out cubic function for smooth deceleration
const easeOutCubic = (t: number): number => {
  return 1 - Math.pow(1 - t, 3);
};

export const useAnimatedNumber = (
  targetValue: number,
  duration: number = 500
): AnimatedNumberResult => {
  const [displayValue, setDisplayValue] = useState(targetValue);
  const [isAnimating, setIsAnimating] = useState(false);
  const [direction, setDirection] = useState<'up' | 'down' | null>(null);
  
  const animationRef = useRef<number | null>(null);
  const startValueRef = useRef(targetValue);
  const startTimeRef = useRef<number | null>(null);
  const previousTargetRef = useRef(targetValue);

  useEffect(() => {
    // Skip animation on initial mount
    if (previousTargetRef.current === targetValue) {
      return;
    }

    const startValue = displayValue;
    const difference = targetValue - startValue;
    
    if (difference === 0) {
      return;
    }

    // Set direction for visual feedback
    setDirection(difference > 0 ? 'up' : 'down');
    setIsAnimating(true);
    
    startValueRef.current = startValue;
    startTimeRef.current = null;

    // Cancel any existing animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutCubic(progress);
      
      const currentValue = Math.round(
        startValueRef.current + difference * easedProgress
      );
      
      setDisplayValue(currentValue);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(targetValue);
        setIsAnimating(false);
        // Keep direction visible briefly after animation ends
        setTimeout(() => {
          setDirection(null);
        }, 300);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
    previousTargetRef.current = targetValue;

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [targetValue, duration]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return { displayValue, isAnimating, direction };
};

