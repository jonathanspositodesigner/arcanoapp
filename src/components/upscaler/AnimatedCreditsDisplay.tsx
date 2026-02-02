import { Coins, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAnimatedNumber } from "@/hooks/useAnimatedNumber";
import { cn } from "@/lib/utils";

interface AnimatedCreditsDisplayProps {
  credits: number;
  isLoading: boolean;
  size?: 'sm' | 'md' | 'lg';
  showCoin?: boolean;
  variant?: 'badge' | 'text';
  className?: string;
}

export const AnimatedCreditsDisplay = ({
  credits,
  isLoading,
  size = 'md',
  showCoin = true,
  variant = 'badge',
  className
}: AnimatedCreditsDisplayProps) => {
  const { displayValue, isAnimating, direction } = useAnimatedNumber(credits, 500);

  // Size classes
  const sizeClasses = {
    sm: {
      badge: 'text-sm px-2.5 py-0.5',
      text: 'text-sm',
      coin: 'w-3.5 h-3.5'
    },
    md: {
      badge: 'text-base px-3 py-1',
      text: 'text-base',
      coin: 'w-4 h-4'
    },
    lg: {
      badge: 'text-lg px-4 py-1',
      text: 'text-lg',
      coin: 'w-5 h-5'
    }
  };

  // Direction-based color classes
  const getColorClass = () => {
    if (isAnimating || direction) {
      if (direction === 'up') return 'text-green-400';
      if (direction === 'down') return 'text-red-400';
    }
    return '';
  };

  const formattedValue = displayValue.toLocaleString('pt-BR');

  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-1.5", className)}>
        {showCoin && <Coins className={cn(sizeClasses[size].coin, "text-yellow-400")} />}
        <Loader2 className={cn(sizeClasses[size].coin, "animate-spin text-purple-400")} />
      </div>
    );
  }

  if (variant === 'badge') {
    return (
      <Badge 
        className={cn(
          "bg-purple-600 text-white font-medium flex items-center gap-1.5 transition-colors duration-200",
          sizeClasses[size].badge,
          isAnimating && "animate-pulse",
          getColorClass() && `bg-opacity-90`,
          className
        )}
      >
        {showCoin && <Coins className={cn(sizeClasses[size].coin, "text-yellow-400")} />}
        <span className={cn(
          "font-medium transition-colors duration-200",
          getColorClass()
        )}>
          {formattedValue}
        </span>
      </Badge>
    );
  }

  // Text variant
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {showCoin && <Coins className={cn(sizeClasses[size].coin, "text-yellow-400")} />}
      <span className={cn(
        "font-medium transition-colors duration-200",
        sizeClasses[size].text,
        isAnimating && "animate-pulse",
        getColorClass() || "text-white"
      )}>
        {formattedValue}
      </span>
    </div>
  );
};
