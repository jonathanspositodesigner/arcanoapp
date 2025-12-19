import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { X } from "lucide-react";
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
    <div className="fixed top-0 left-0 right-0 z-40 bg-gradient-to-r from-red-700 via-red-600 to-red-700 text-white py-1.5 md:py-2 px-2 sm:px-4 shadow-lg overflow-hidden">
      {/* Shimmer effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[shimmer_3s_infinite]" />
      
      {/* Desktop layout - single line */}
      <div className="relative hidden md:flex items-center justify-center gap-4">
        <span className="font-bold text-sm whitespace-nowrap">
          🎄🔥 Promoção de Fim de Ano: {discountPercent}% OFF em todos os packs! 🔥🎄
        </span>
        
        {/* Countdown */}
        <div className="flex items-center gap-1">
          <span className="text-xs opacity-80">Termina em:</span>
          <div className="flex items-center gap-1">
            {countdown.days > 0 && (
              <div className="bg-white/20 rounded px-2 py-1">
                <span className="font-mono font-bold text-sm">{pad(countdown.days)}</span>
                <span className="text-[10px] ml-0.5 opacity-80">d</span>
              </div>
            )}
            <div className="bg-white/20 rounded px-2 py-1">
              <span className="font-mono font-bold text-sm">{pad(countdown.hours)}</span>
              <span className="text-[10px] ml-0.5 opacity-80">h</span>
            </div>
            <div className="bg-white/20 rounded px-2 py-1">
              <span className="font-mono font-bold text-sm">{pad(countdown.minutes)}</span>
              <span className="text-[10px] ml-0.5 opacity-80">m</span>
            </div>
            <div className="bg-white/20 rounded px-2 py-1">
              <span className="font-mono font-bold text-sm">{pad(countdown.seconds)}</span>
              <span className="text-[10px] ml-0.5 opacity-80">s</span>
            </div>
          </div>
        </div>
        
        {/* Close button */}
        <button 
          onClick={() => setDismissed(true)}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-white/20 rounded-full transition-colors"
          aria-label="Fechar banner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Mobile/Tablet layout - two lines */}
      <div className="relative flex md:hidden flex-col items-center gap-0.5 pr-6">
        <span className="font-bold text-[11px] sm:text-xs text-center leading-tight">
          🎄 Fim de Ano: {discountPercent}% OFF! 🎄
        </span>
        
        {/* Countdown */}
        <div className="flex items-center gap-0.5">
          <span className="text-[9px] opacity-80">Termina em:</span>
          <div className="flex items-center gap-0.5">
            {countdown.days > 0 && (
              <div className="bg-white/20 rounded px-1 py-0.5">
                <span className="font-mono font-bold text-[10px]">{pad(countdown.days)}</span>
                <span className="text-[7px] ml-0.5 opacity-80">d</span>
              </div>
            )}
            <div className="bg-white/20 rounded px-1 py-0.5">
              <span className="font-mono font-bold text-[10px]">{pad(countdown.hours)}</span>
              <span className="text-[7px] ml-0.5 opacity-80">h</span>
            </div>
            <div className="bg-white/20 rounded px-1 py-0.5">
              <span className="font-mono font-bold text-[10px]">{pad(countdown.minutes)}</span>
              <span className="text-[7px] ml-0.5 opacity-80">m</span>
            </div>
            <div className="bg-white/20 rounded px-1 py-0.5">
              <span className="font-mono font-bold text-[10px]">{pad(countdown.seconds)}</span>
              <span className="text-[7px] ml-0.5 opacity-80">s</span>
            </div>
          </div>
        </div>
        
        {/* Close button */}
        <button 
          onClick={() => setDismissed(true)}
          className="absolute right-1 top-1/2 -translate-y-1/2 p-1 hover:bg-white/20 rounded-full transition-colors"
          aria-label="Fechar banner"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
};

export default PromoNatalBanner;