import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Infinity, Zap, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
      <DialogContent className="sm:max-w-[600px] bg-[#1A0A2E] border-purple-500/30">
        <DialogHeader>
          <DialogTitle className="text-center text-xl text-white">
            Escolha sua versão
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          {/* Card Versão Ilimitada */}
          <Card className="bg-gradient-to-br from-purple-900/50 to-fuchsia-900/30 border-purple-500/30 hover:border-purple-400/50 transition-all cursor-pointer group">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <Infinity className="w-6 h-6 text-purple-300" />
              </div>
              <CardTitle className="text-lg text-white">Versão Ilimitada e Vitalícia</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <CardDescription className="text-purple-200/80 text-sm mb-4">
                Esta é a versão que você adquiriu. Sem limite de uso e sem consumo de créditos.
              </CardDescription>
              <Button
                onClick={handleUnlimitedClick}
                className="w-full bg-purple-600 hover:bg-purple-500 text-white"
              >
                Acessar Versão Ilimitada
              </Button>
            </CardContent>
          </Card>

          {/* Card Versão App */}
          <Card className="bg-gradient-to-br from-fuchsia-900/50 to-pink-900/30 border-fuchsia-500/30 hover:border-fuchsia-400/50 transition-all cursor-pointer group">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-12 h-12 rounded-full bg-fuchsia-500/20 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <Zap className="w-6 h-6 text-fuchsia-300" />
              </div>
              <CardTitle className="text-lg text-white">Versão App</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <CardDescription className="text-fuchsia-200/80 text-sm mb-4">
                Nova versão mais rápida e fácil de usar. Consome créditos por uso.
              </CardDescription>
              <Button
                onClick={handleAppVersionClick}
                disabled={isCheckingClaim || isClaiming}
                className="w-full bg-gradient-to-r from-fuchsia-500 to-pink-500 hover:opacity-90 text-white"
              >
                {isCheckingClaim || isClaiming ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Carregando...
                  </>
                ) : hasClaimedPromo ? (
                  "Acessar Ferramenta"
                ) : (
                  "Resgatar 1.500 créditos e testar"
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UpscalerChoiceModal;
