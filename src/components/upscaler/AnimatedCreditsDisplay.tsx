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

  const getBalanceColorClass = () => {
    if (direction === 'up') return 'text-green-400';
    if (direction === 'down') return 'text-red-400';
    return isUnlimited ? 'text-foreground' : '';
  };

  const formattedValue = displayValue.toLocaleString('pt-BR');

  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-1.5", className)}>
        {showCoin && <Coins className={cn(sizeClasses[size].coin, "text-yellow-400")} />}
        <Loader2 className={cn(sizeClasses[size].coin, "animate-spin text-muted-foreground")} />
      </div>
    );
  }

  const renderBalance = () => {
    return (
      <span className={cn(
        "font-medium transition-colors duration-200",
        sizeClasses[size].text,
        isAnimating && direction && "animate-pulse",
        getBalanceColorClass() || "text-foreground"
      )}>
        {formattedValue}
      </span>
    );
  };

  const renderUnlimitedValue = () => (
    <>
      <Infinity className={cn(sizeClasses[size].infinity, "text-emerald-400")} />
      <span className="text-muted-foreground font-semibold">+</span>
      {showCoin && <Coins className={cn(sizeClasses[size].coin, "text-yellow-400")} />}
      {renderBalance()}
    </>
  );

  const renderStandardValue = () => (
    <>
      {showCoin && <Coins className={cn(sizeClasses[size].coin, "text-yellow-400")} />}
      {renderBalance()}
    </>
  );

  if (variant === 'badge') {
    return (
      <Badge 
        className={cn(
          "font-medium flex items-center gap-1.5 transition-colors duration-200",
          isUnlimited 
            ? "bg-emerald-600/80 text-foreground border border-emerald-400/30" 
            : "bg-secondary text-foreground",
          sizeClasses[size].badge,
          direction && "bg-opacity-90",
          className
        )}
      >
        {isUnlimited ? renderUnlimitedValue() : renderStandardValue()}
      </Badge>
    );
  }

  // Text variant
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {isUnlimited ? renderUnlimitedValue() : renderStandardValue()}
    </div>
  );
};
