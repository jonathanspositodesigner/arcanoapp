import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tag, X } from "lucide-react";

interface PromoToolsBannerProps {
  onClose?: () => void;
}

const PromoToolsBanner = ({ onClose }: PromoToolsBannerProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const navigate = useNavigate();

  if (!isVisible) return null;

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsVisible(false);
    onClose?.();
  };

  const handleClick = () => {
    navigate("/planos-creditos");
  };

  return (
    <div 
      className="relative overflow-hidden bg-gradient-to-r from-pink-600 via-pink-500 to-pink-600 cursor-pointer hover:brightness-110 transition-all"
      onClick={handleClick}
    >
      {/* Shimmer effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_3s_ease-in-out_infinite] -translate-x-full" />

      <div className="container mx-auto px-4 py-3 sm:py-2">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-4 relative pr-8 sm:pr-0">
          {/* Badge */}
          <div className="flex items-center gap-1.5 bg-black/30 backdrop-blur-sm px-2.5 py-1 rounded-full border border-white/20 shrink-0">
            <Tag className="w-3.5 h-3.5 text-white" />
            <span className="text-xs font-bold text-white uppercase tracking-wide">
              Oferta Limitada
            </span>
          </div>
          
          {/* Promo text */}
          <p className="text-white text-[11px] sm:text-sm font-medium text-center leading-tight">
            comece agora mesmo a usar nossas ferramentas de IA com{" "}
            <span className="font-bold text-yellow-200">30% de desconto</span>
          </p>
        </div>
        
        {/* Close button - fixed position */}
        <button
          onClick={handleClose}
          className="absolute top-1/2 right-2 -translate-y-1/2 p-1 hover:bg-white/20 rounded-full transition-colors"
          aria-label="Fechar banner"
        >
          <X className="w-4 h-4 text-white" />
        </button>
      </div>
    </div>
  );
};

export default PromoToolsBanner;
