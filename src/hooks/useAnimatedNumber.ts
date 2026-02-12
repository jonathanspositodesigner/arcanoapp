import { useState, useEffect, useRef, useCallback } from 'react';

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
  const currentValueRef = useRef(targetValue);
  const previousTargetRef = useRef(targetValue);
  const directionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Skip if target hasn't changed
    if (previousTargetRef.current === targetValue) {
      return;
    }

    // Use ref for current value to avoid stale closures
    const startValue = currentValueRef.current;
    const difference = targetValue - startValue;
    
    if (difference === 0) {
      previousTargetRef.current = targetValue;
      return;
    }

    // Set direction for visual feedback
    const newDirection = difference > 0 ? 'up' : 'down';
    setDirection(newDirection);
    setIsAnimating(true);
    
    // Clear any pending direction reset
    if (directionTimeoutRef.current) {
      clearTimeout(directionTimeoutRef.current);
      directionTimeoutRef.current = null;
    }

    // Cancel any existing animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    let startTime: number | null = null;

    const animate = (timestamp: number) => {
      if (!startTime) {
        startTime = timestamp;
      }

      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutCubic(progress);
      
      const currentValue = Math.round(startValue + difference * easedProgress);
      
      currentValueRef.current = currentValue;
      setDisplayValue(currentValue);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        currentValueRef.current = targetValue;
        setDisplayValue(targetValue);
        setIsAnimating(false);
        // Keep direction color visible briefly after animation ends
        directionTimeoutRef.current = setTimeout(() => {
          setDirection(null);
        }, 600);
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
      if (directionTimeoutRef.current) {
        clearTimeout(directionTimeoutRef.current);
      }
    };
  }, []);

  return { displayValue, isAnimating, direction };
};
