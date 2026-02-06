/**
 * Modal de confirmação quando usuário tenta sair com job ativo
 * 
 * Exibe aviso de que os créditos serão perdidos e oferece opções:
 * - Continuar esperando (cancelar navegação)
 * - Sair mesmo assim (aceitar perda)
 */

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle } from "lucide-react";

interface NavigationBlockerModalProps {
  open: boolean;
  onConfirmLeave: () => void;
  onCancelLeave: () => void;
  toolName?: string | null;
}

const NavigationBlockerModal = ({
  open,
  onConfirmLeave,
  onCancelLeave,
  toolName,
}: NavigationBlockerModalProps) => {
  const toolDisplay = toolName || 'IA';
  
  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && onCancelLeave()}>
      <AlertDialogContent className="bg-[#1A0A2E] border-purple-500/30 text-white max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-amber-400" />
            </div>
            <AlertDialogTitle className="text-xl text-white">
              Processamento em Andamento
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-purple-200 text-base leading-relaxed">
            Você tem um processamento de <span className="text-white font-medium">{toolDisplay}</span> em andamento.
            <br /><br />
            <span className="text-amber-400 font-medium">
              Se você sair agora, perderá o resultado e os créditos serão cobrados do mesmo jeito.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2 mt-4">
          <AlertDialogCancel 
            onClick={onCancelLeave}
            className="bg-purple-600 hover:bg-purple-700 text-white border-0 w-full sm:w-auto"
          >
            Continuar Esperando
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirmLeave}
            className="bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-500/30 w-full sm:w-auto"
          >
            Sair e Perder Créditos
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default NavigationBlockerModal;
