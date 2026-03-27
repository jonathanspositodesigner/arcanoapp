import { Coins, Loader2, Infinity } from "lucide-react";
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
  isUnlimited?: boolean;
}

export const AnimatedCreditsDisplay = ({
  credits,
  isLoading,
  size = 'md',
  showCoin = true,
  variant = 'badge',
  className,
  isUnlimited = false
}: AnimatedCreditsDisplayProps) => {
  const { displayValue, isAnimating, direction } = useAnimatedNumber(credits, 500);

  const sizeClasses = {
    sm: { badge: 'text-sm px-2.5 py-0.5', text: 'text-sm', coin: 'w-3.5 h-3.5', infinity: 'w-4 h-4' },
    md: { badge: 'text-base px-3 py-1', text: 'text-base', coin: 'w-4 h-4', infinity: 'w-5 h-5' },
    lg: { badge: 'text-lg px-4 py-1', text: 'text-lg', coin: 'w-5 h-5', infinity: 'w-6 h-6' }
  };

  const getColorClass = () => {
    if (isUnlimited) return 'text-emerald-400';
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

  const renderValue = () => {
    if (isUnlimited) {
      return <Infinity className={cn(sizeClasses[size].infinity, "text-emerald-400")} />;
    }
    return (
      <span className={cn(
        "font-medium transition-colors duration-200",
        getColorClass()
      )}>
        {formattedValue}
      </span>
    );
  };

  if (variant === 'badge') {
    return (
      <Badge 
        className={cn(
          "font-medium flex items-center gap-1.5 transition-colors duration-200",
          isUnlimited 
            ? "bg-emerald-600/80 text-white border border-emerald-400/30" 
            : "bg-purple-600 text-white",
          sizeClasses[size].badge,
          !isUnlimited && isAnimating && "animate-pulse",
          !isUnlimited && getColorClass() && `bg-opacity-90`,
          className
        )}
      >
        {showCoin && <Coins className={cn(sizeClasses[size].coin, isUnlimited ? "text-emerald-200" : "text-yellow-400")} />}
        {renderValue()}
      </Badge>
    );
  }

  // Text variant
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {showCoin && <Coins className={cn(sizeClasses[size].coin, isUnlimited ? "text-emerald-300" : "text-yellow-400")} />}
      {isUnlimited ? (
        <Infinity className={cn(sizeClasses[size].infinity, "text-emerald-400")} />
      ) : (
        <span className={cn(
          "font-medium transition-colors duration-200",
          sizeClasses[size].text,
          isAnimating && "animate-pulse",
          getColorClass() || "text-white"
        )}>
          {formattedValue}
        </span>
      )}
    </div>
  );
};
