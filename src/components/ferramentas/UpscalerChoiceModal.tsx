import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Infinity, Zap, Loader2, Sparkles, Crown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface UpscalerChoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  hasClaimedPromo: boolean;
  isCheckingClaim: boolean;
  onClaimAndAccess: () => Promise<void>;
}

const UpscalerChoiceModal = ({
  isOpen,
  onClose,
  hasClaimedPromo,
  isCheckingClaim,
  onClaimAndAccess,
}: UpscalerChoiceModalProps) => {
  const navigate = useNavigate();
  const [isClaiming, setIsClaiming] = useState(false);

  const handleUnlimitedClick = () => {
    onClose();
    navigate("/ferramenta-ia-artes/upscaller-arcano");
  };

  const handleAppVersionClick = async () => {
    if (hasClaimedPromo) {
      onClose();
      navigate("/upscaler-selection");
    } else {
      setIsClaiming(true);
      try {
        await onClaimAndAccess();
        onClose();
        navigate("/upscaler-selection");
      } catch (error) {
        console.error("Error claiming promo:", error);
      } finally {
        setIsClaiming(false);
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[580px] p-0 bg-gradient-to-b from-[#0D0B1A] to-[#1A0A2E] border border-purple-500/20 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-center text-2xl font-bold text-white flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            Escolha sua versão
            <Sparkles className="w-5 h-5 text-purple-400" />
          </DialogTitle>
          <p className="text-center text-purple-300/70 text-sm mt-1">
            Selecione qual versão do Upscaler deseja utilizar
          </p>
        </DialogHeader>

        {/* Cards Container */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-6 pt-2">
          {/* Card Versão App */}
          <div 
            onClick={handleAppVersionClick}
            className={`group relative bg-gradient-to-br from-[#261433] to-[#3D1B4D] rounded-xl border-2 border-fuchsia-500/30 hover:border-fuchsia-400 transition-all duration-300 overflow-hidden hover:shadow-[0_0_30px_rgba(217,70,239,0.3)] ${isCheckingClaim || isClaiming ? 'cursor-wait' : 'cursor-pointer'}`}
          >
            {/* Badge */}
            <div className="absolute top-3 right-3 flex items-center gap-1 bg-fuchsia-500/20 px-2 py-1 rounded-full">
              <Sparkles className="w-3 h-3 text-fuchsia-300" />
              <span className="text-[10px] text-fuchsia-300 font-medium">FÁCIL</span>
            </div>

            <div className="p-5">
              {/* Icon */}
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-fuchsia-500/30 to-pink-600/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 mx-auto border border-fuchsia-400/30">
                <Zap className="w-7 h-7 text-fuchsia-300" />
              </div>

              {/* Title */}
              <h3 className="text-lg font-bold text-white text-center mb-2">
                Versão App
              </h3>

              {/* Description */}
              <p className="text-fuchsia-200/70 text-sm text-center leading-relaxed mb-5">
                Nova versão <span className="text-fuchsia-300 font-medium">mais fácil de usar</span>. Consome créditos por uso.
              </p>

              {/* Button */}
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAppVersionClick();
                }}
                disabled={isCheckingClaim || isClaiming}
                className="w-full h-11 bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg shadow-fuchsia-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCheckingClaim || isClaiming ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Carregando...
                  </span>
                ) : hasClaimedPromo ? (
                  "Acessar Ferramenta"
                ) : (
                  <span className="flex items-center justify-center gap-1.5">
                    <Sparkles className="w-4 h-4" />
                    Resgatar 1.500 créditos
                  </span>
                )}
              </Button>
            </div>
          </div>

          {/* Card Versão Ilimitada */}
          <div 
            onClick={handleUnlimitedClick}
            className="group relative bg-gradient-to-br from-[#1E1433] to-[#2A1B4D] rounded-xl border-2 border-purple-500/30 hover:border-purple-400 transition-all duration-300 cursor-pointer overflow-hidden hover:shadow-[0_0_30px_rgba(139,92,246,0.3)]"
          >
            {/* Badge */}
            <div className="absolute top-3 right-3 flex items-center gap-1 bg-purple-500/20 px-2 py-1 rounded-full">
              <Crown className="w-3 h-3 text-yellow-400" />
              <span className="text-[10px] text-yellow-400 font-medium">VITALÍCIO</span>
            </div>

            <div className="p-5">
              {/* Icon */}
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500/30 to-purple-600/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 mx-auto border border-purple-400/30">
                <Infinity className="w-7 h-7 text-purple-300" />
              </div>

              {/* Title */}
              <h3 className="text-lg font-bold text-white text-center mb-2">
                Versão Ilimitada
              </h3>

              {/* Description */}
              <p className="text-purple-200/70 text-sm text-center leading-relaxed mb-5">
                Esta é a versão que você adquiriu. <span className="text-purple-300 font-medium">Sem limite de uso</span> e sem consumo de créditos.
              </p>

              {/* Button */}
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  handleUnlimitedClick();
                }}
                className="w-full h-11 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg shadow-purple-500/20"
              >
                Acessar Versão Ilimitada
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UpscalerChoiceModal;
