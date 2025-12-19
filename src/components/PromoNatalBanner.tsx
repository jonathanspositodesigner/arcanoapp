import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { X, Gift } from "lucide-react";
import { useYearEndPromo } from "@/hooks/useYearEndPromo";

const PromoNatalBanner = () => {
  const location = useLocation();
  const { isActive, discountPercent, endDate, loading } = useYearEndPromo();
  const [dismissed, setDismissed] = useState(false);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  // Countdown timer - uses endDate from settings or defaults to Jan 1st
  useEffect(() => {
    const targetDate = endDate ? new Date(endDate) : new Date(new Date().getFullYear() + 1, 0, 1, 0, 1, 0);

    const updateCountdown = () => {
      const now = new Date().getTime();
      const end = targetDate.getTime();
      const diff = end - now;

      if (diff <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      setCountdown({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000)
      });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [endDate]);

  // Don't show on the promo page itself
  if (location.pathname === '/promos-natal') return null;
  
  // Don't show if loading, not active, or dismissed
  if (loading || !isActive || dismissed) return null;

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] bg-gradient-to-r from-red-700 via-red-600 to-red-700 text-white py-2 px-3 shadow-lg overflow-hidden">
      {/* Shimmer effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[shimmer_3s_infinite]" />
      
      <div className="relative flex items-center justify-center gap-2 md:gap-4">
        {/* Left icons - hidden on very small screens */}
        <div className="hidden sm:flex items-center gap-1">
          <span className="text-base md:text-lg">🎄</span>
          <Gift className="h-4 w-4 animate-pulse" />
        </div>
        
        {/* Main content */}
        <div className="flex items-center gap-2 md:gap-3 flex-wrap justify-center">
          <span className="font-bold text-xs md:text-sm whitespace-nowrap">
            <span className="hidden sm:inline">🎁 </span>
            {discountPercent}% OFF
            <span className="hidden md:inline"> EM TODOS OS PACKS</span>
          </span>
          
          {/* Countdown */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] md:text-xs opacity-80 hidden sm:inline">Termina em:</span>
            <div className="flex items-center gap-0.5 md:gap-1">
              {countdown.days > 0 && (
                <div className="bg-white/20 rounded px-1.5 py-0.5 md:px-2 md:py-1">
                  <span className="font-mono font-bold text-xs md:text-sm">{pad(countdown.days)}</span>
                  <span className="text-[8px] md:text-[10px] ml-0.5 opacity-80">d</span>
                </div>
              )}
              <div className="bg-white/20 rounded px-1.5 py-0.5 md:px-2 md:py-1">
                <span className="font-mono font-bold text-xs md:text-sm">{pad(countdown.hours)}</span>
                <span className="text-[8px] md:text-[10px] ml-0.5 opacity-80">h</span>
              </div>
              <div className="bg-white/20 rounded px-1.5 py-0.5 md:px-2 md:py-1">
                <span className="font-mono font-bold text-xs md:text-sm">{pad(countdown.minutes)}</span>
                <span className="text-[8px] md:text-[10px] ml-0.5 opacity-80">m</span>
              </div>
              <div className="bg-white/20 rounded px-1.5 py-0.5 md:px-2 md:py-1">
                <span className="font-mono font-bold text-xs md:text-sm">{pad(countdown.seconds)}</span>
                <span className="text-[8px] md:text-[10px] ml-0.5 opacity-80">s</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Right icon - hidden on very small screens */}
        <span className="hidden sm:inline text-base md:text-lg">🎁</span>
        
        {/* Close button */}
        <button 
          onClick={() => setDismissed(true)}
          className="absolute right-1 md:right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-white/20 rounded-full transition-colors"
          aria-label="Fechar banner"
        >
          <X className="h-3 w-3 md:h-4 md:w-4" />
        </button>
      </div>
    </div>
  );
};

export default PromoNatalBanner;