import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Coins, LogIn } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface NoCreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason: 'not_logged' | 'insufficient';
}

const NoCreditsModal = ({ isOpen, onClose, reason }: NoCreditsModalProps) => {
  const navigate = useNavigate();

  const handleRecharge = () => {
    navigate('/planos-creditos');
    onClose();
  };

  const handleLogin = () => {
    navigate('/login-artes?redirect=' + encodeURIComponent(window.location.pathname));
    onClose();
  };

  const isNotLogged = reason === 'not_logged';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-[#1A0A2E] border-purple-500/30">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-gradient-to-r from-yellow-500/20 to-purple-500/20 flex items-center justify-center">
            <Coins className="w-8 h-8 text-yellow-500" />
          </div>
          <DialogTitle className="text-2xl font-bold text-center text-white">
            {isNotLogged ? 'Faça login para continuar' : 'Ops, você não tem créditos!'}
          </DialogTitle>
          <DialogDescription className="text-center text-gray-300 mt-2">
            {isNotLogged 
              ? 'Você precisa estar logado para usar o Upscaler Arcano. Faça login ou crie sua conta para começar!'
              : 'Você precisa de créditos para usar o Upscaler Arcano. Recarregue agora e continue melhorando suas imagens!'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 mt-4">
          {isNotLogged ? (
            <Button 
              onClick={handleLogin}
              className="w-full bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:opacity-90 text-white font-semibold"
            >
              <LogIn className="h-4 w-4 mr-2" />
              Fazer Login
            </Button>
          ) : (
            <Button 
              onClick={handleRecharge}
              className="w-full bg-gradient-to-r from-yellow-500 to-purple-600 hover:opacity-90 text-white font-semibold"
            >
              <Coins className="h-4 w-4 mr-2" />
              Recarregar Créditos
            </Button>
          )}
          
          {isNotLogged && (
            <Button 
              onClick={handleRecharge}
              variant="outline"
              className="w-full border-purple-500/50 text-purple-300 hover:bg-purple-500/10"
            >
              <Coins className="h-4 w-4 mr-2" />
              Ver Pacotes de Créditos
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NoCreditsModal;
