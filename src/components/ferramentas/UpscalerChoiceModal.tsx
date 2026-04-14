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
  hasLifetimePack?: boolean;
}

const UpscalerChoiceModal = ({
  isOpen,
  onClose,
  hasClaimedPromo,
  isCheckingClaim,
  onClaimAndAccess,
  hasLifetimePack = false,
}: UpscalerChoiceModalProps) => {
  const navigate = useNavigate();
  const [isClaiming, setIsClaiming] = useState(false);

  const handleUnlimitedClick = () => {
    onClose();
    // Go to version select page (V2 versions + V3 card)
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
      <DialogContent className={`${hasLifetimePack ? 'sm:max-w-[420px]' : 'sm:max-w-[580px]'} w-[calc(100%-32px)] sm:w-full p-0 bg-gradient-to-b from-[#0D0B1A] to-[#1A0A2E] border border-slate-500/40 overflow-hidden rounded-xl`}>
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-center text-2xl font-bold text-white flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5 text-gray-400" />
            Escolha sua versão
            <Sparkles className="w-5 h-5 text-gray-400" />
          </DialogTitle>
          <p className="text-center text-gray-400 text-sm mt-1">
            Selecione qual versão do Upscaler deseja utilizar
          </p>
        </DialogHeader>

        {/* Content */}
        <div className="p-6 pt-2">
          {hasLifetimePack ? (
            <>
              {/* Card Versão Ilimitada - Destaque Grande */}
              <div 
                onClick={handleUnlimitedClick}
                className="group relative bg-gradient-to-br from-[#1E1433] to-[#2A1B4D] rounded-xl border-2 border-white/15 transition-all duration-300 cursor-pointer overflow-hidden shadow-[0_0_30px_rgba(139,92,246,0.25)] hover:shadow-[0_0_40px_rgba(139,92,246,0.4)]"
              >
                {/* Badge */}
                <div className="absolute top-3 right-3 flex items-center gap-1 bg-yellow-500/20 px-3 py-1 rounded-full border border-yellow-400/30">
                  <Crown className="w-3.5 h-3.5 text-yellow-400" />
                  <span className="text-[11px] text-yellow-400 font-semibold">VITALÍCIO</span>
                </div>

                <div className="p-6">
                  {/* Icon */}
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-slate-500/30 to-slate-500/20 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300 mx-auto border border-white/10">
                    <Infinity className="w-8 h-8 text-gray-300" />
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-bold text-white text-center mb-3">
                    Versão Ilimitada
                  </h3>

                  {/* Description */}
                  <p className="text-gray-300/70 text-sm text-center leading-relaxed mb-6">
                    Esta é a versão que você adquiriu. <span className="text-gray-300 font-medium">Sem limite de uso</span> e sem consumo de créditos.
                  </p>

                  {/* Button */}
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUnlimitedClick();
                    }}
                    className="w-full h-12 bg-slate-600 hover:bg-slate-500 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg shadow-white/5 text-base"
                  >
                    Acessar Versão Ilimitada
                  </Button>
                </div>
              </div>

              {/* Link pequeno para versão app */}
              <button
                onClick={handleAppVersionClick}
                disabled={isCheckingClaim || isClaiming}
                className="w-full mt-4 text-center text-gray-400/70 hover:text-gray-300 text-xs transition-colors duration-200 disabled:opacity-50"
              >
                {isCheckingClaim || isClaiming ? (
                  <span className="flex items-center justify-center gap-1.5">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Carregando...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-1">
                    <Zap className="w-3 h-3" />
                    Versão Aplicativo (usa créditos)
                  </span>
                )}
              </button>
            </>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Card Versão App */}
              <div 
                onClick={handleAppVersionClick}
                className={`group relative bg-gradient-to-br from-[#261433] to-[#3D1B4D] rounded-xl border-2 border-white/10 hover:border-white-400 transition-all duration-300 overflow-hidden hover:shadow-[0_0_30px_rgba(217,70,239,0.3)] ${isCheckingClaim || isClaiming ? 'cursor-wait' : 'cursor-pointer'}`}
              >
                {/* Badge */}
                <div className="absolute top-3 right-3 flex items-center gap-1 bg-white/10 px-2 py-1 rounded-full">
                  <Sparkles className="w-3 h-3 text-gray-300" />
                  <span className="text-[10px] text-gray-300 font-medium">FÁCIL</span>
                </div>

                <div className="p-5">
                  {/* Icon */}
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-slate-500/30 to-pink-600/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 mx-auto border border-white/10">
                    <Zap className="w-7 h-7 text-gray-300" />
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-bold text-white text-center mb-2">
                    Versão App
                  </h3>

                  {/* Description */}
                  <p className="text-fuchsia-200/70 text-sm text-center leading-relaxed mb-5">
                    Nova versão <span className="text-gray-300 font-medium">mais fácil de usar</span>. Consome créditos por uso.
                  </p>

                  {/* Button */}
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAppVersionClick();
                    }}
                    disabled={isCheckingClaim || isClaiming}
                    className="w-full h-11 bg-gradient-to-r from-slate-600 to-pink-600 hover:from-slate-500 hover:to-pink-500 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg shadow-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
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
                className="group relative bg-gradient-to-br from-[#1E1433] to-[#2A1B4D] rounded-xl border-2 border-white/10 hover:border-white/15 transition-all duration-300 cursor-pointer overflow-hidden hover:shadow-[0_0_30px_rgba(139,92,246,0.3)]"
              >
                {/* Badge */}
                <div className="absolute top-3 right-3 flex items-center gap-1 bg-slate-500/20 px-2 py-1 rounded-full">
                  <Crown className="w-3 h-3 text-yellow-400" />
                  <span className="text-[10px] text-yellow-400 font-medium">VITALÍCIO</span>
                </div>

                <div className="p-5">
                  {/* Icon */}
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-slate-500/30 to-slate-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 mx-auto border border-white/10">
                    <Infinity className="w-7 h-7 text-gray-300" />
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-bold text-white text-center mb-2">
                    Versão Ilimitada
                  </h3>

                  {/* Description */}
                  <p className="text-gray-300/70 text-sm text-center leading-relaxed mb-5">
                    Esta é a versão que você adquiriu. <span className="text-gray-300 font-medium">Sem limite de uso</span> e sem consumo de créditos.
                  </p>

                  {/* Button */}
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUnlimitedClick();
                    }}
                    className="w-full h-11 bg-slate-600 hover:bg-slate-500 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg shadow-white/5"
                  >
                    Acessar Versão Ilimitada
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UpscalerChoiceModal;
