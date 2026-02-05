import React, { useState } from 'react';
import { AlertTriangle, Loader2, Unlock } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useActiveJobCheck } from '@/hooks/useActiveJobCheck';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { toast } from 'sonner';

interface ActiveJobBlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTool: string;
  activeStatus?: string;
  onUnlocked?: () => void;
}

const ActiveJobBlockModal: React.FC<ActiveJobBlockModalProps> = ({
  isOpen,
  onClose,
  activeTool,
  activeStatus,
  onUnlocked,
}) => {
  const [isUnlocking, setIsUnlocking] = useState(false);
  const { cancelUserQueuedJobs } = useActiveJobCheck();
  const { user } = usePremiumStatus();
  
  // Only show unlock button for queued jobs (not running)
  const canUnlock = activeStatus === 'queued';
  
  const handleUnlock = async () => {
    if (!user?.id) {
      toast.error('Usuário não autenticado');
      return;
    }
    
    setIsUnlocking(true);
    try {
      const success = await cancelUserQueuedJobs(user.id);
      if (success) {
        toast.success('Fila liberada! Você pode tentar novamente.');
        onUnlocked?.();
        onClose();
      } else {
        toast.error('Não foi possível liberar a fila. Tente novamente.');
      }
    } catch (error) {
      console.error('Error unlocking queue:', error);
      toast.error('Erro ao liberar fila');
    } finally {
      setIsUnlocking(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="bg-[#1A0A2E] border-purple-500/30">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-yellow-500/20 rounded-full">
              <AlertTriangle className="w-6 h-6 text-yellow-400" />
            </div>
            <AlertDialogTitle className="text-white text-lg">
              Trabalho em Andamento
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-purple-200/70">
            Você já tem um trabalho em processamento no <strong className="text-purple-300">{activeTool}</strong>.
            <br /><br />
            {canUnlock ? (
              <>
                Seu trabalho está <strong className="text-yellow-400">aguardando na fila</strong>. 
                Você pode liberá-lo para tentar novamente, ou aguardar sua vez.
              </>
            ) : (
              'Aguarde a conclusão do trabalho atual antes de iniciar outro.'
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex flex-col sm:flex-row gap-2">
          {canUnlock && (
            <Button
              variant="outline"
              onClick={handleUnlock}
              disabled={isUnlocking}
              className="border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10"
            >
              {isUnlocking ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Liberando...
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4 mr-2" />
                  Liberar Fila
                </>
              )}
            </Button>
          )}
          <AlertDialogAction
            onClick={onClose}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            Entendi
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ActiveJobBlockModal;