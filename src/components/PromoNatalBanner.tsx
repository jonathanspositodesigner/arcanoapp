import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { X, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useYearEndPromo } from "@/hooks/useYearEndPromo";

const PromoNatalBanner = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isActive, discountPercent, loading } = useYearEndPromo();
  const [dismissed, setDismissed] = useState(false);

  // Don't show on the promo page itself
  if (location.pathname === '/promos-natal') return null;
  
  // Don't show if loading, not active, or dismissed
  if (loading || !isActive || dismissed) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] bg-gradient-to-r from-red-700 via-red-600 to-red-700 text-white py-2.5 px-4 shadow-lg overflow-hidden">
      {/* Shimmer effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[shimmer_3s_infinite]" />
      
      <div className="relative flex items-center justify-center gap-2 sm:gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-lg sm:text-xl">🎄</span>
          <Gift className="h-4 w-4 sm:h-5 sm:w-5 animate-pulse" />
        </div>
        
        <span className="font-bold text-xs sm:text-sm md:text-base text-center">
          PROMOÇÃO DE FIM DE ANO! Todos os packs com {discountPercent}% OFF até 01/01!
        </span>
        
        <div className="flex items-center gap-2">
          <span className="text-lg sm:text-xl">🎁</span>
        </div>
        
        <Button 
          size="sm" 
          variant="secondary"
          onClick={() => navigate('/promos-natal')}
          className="bg-white text-red-600 hover:bg-white/90 font-bold text-xs sm:text-sm h-7 sm:h-8"
        >
          Ver Promoção
        </Button>
        
        <button 
          onClick={() => setDismissed(true)}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-white/20 rounded-full transition-colors"
          aria-label="Fechar banner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default PromoNatalBanner;
