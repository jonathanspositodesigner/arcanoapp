import React, { useState, useMemo } from 'react';
import { AlertTriangle, Loader2, Trash2, Clock, Zap, Timer } from 'lucide-react';
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
  activeJobId?: string;
  activeTable?: string;
  activeStartedAt?: string;
  onJobCancelled?: () => void;
}

const ActiveJobBlockModal: React.FC<ActiveJobBlockModalProps> = ({
  isOpen,
  onClose,
  activeTool,
  activeStatus,
  activeJobId,
  activeTable,
  activeStartedAt,
  onJobCancelled,
}) => {
  const [isCancelling, setIsCancelling] = useState(false);
  const { forceCancelJob } = useActiveJobCheck();
  const { user } = usePremiumStatus();
  
  // Calculate how long the job has been running/queued
  const elapsedTime = useMemo(() => {
    if (!activeStartedAt) return null;
    
    const started = new Date(activeStartedAt);
    const now = new Date();
    const diffMs = now.getTime() - started.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffSeconds = Math.floor((diffMs % 60000) / 1000);
    
    if (diffMinutes > 0) {
      return `${diffMinutes}min ${diffSeconds}s`;
    }
    return `${diffSeconds}s`;
  }, [activeStartedAt]);
  
  // Get status display info
  const statusInfo = useMemo(() => {
    switch (activeStatus) {
      case 'running':
        return {
          label: 'Processando',
          icon: <Zap className="w-4 h-4 text-yellow-400 animate-pulse" />,
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-500/10',
          borderColor: 'border-yellow-500/30',
        };
      case 'queued':
        return {
          label: 'Na fila',
          icon: <Timer className="w-4 h-4 text-blue-400" />,
          color: 'text-blue-400',
          bgColor: 'bg-blue-500/10',
          borderColor: 'border-blue-500/30',
        };
      default:
        return {
          label: activeStatus || 'Ativo',
          icon: <Clock className="w-4 h-4 text-purple-400" />,
          color: 'text-purple-400',
          bgColor: 'bg-purple-500/10',
          borderColor: 'border-purple-500/30',
        };
    }
  }, [activeStatus]);
  
  const handleCancelJob = async () => {
    if (!user?.id || !activeJobId || !activeTable) {
      toast.error('Não foi possível identificar o trabalho');
      return;
    }
    
    setIsCancelling(true);
    try {
      const result = await forceCancelJob(activeTable, activeJobId, user.id);
      
      if (result.success) {
        const message = result.wasRunning
          ? `Trabalho cancelado! ${result.refunded || 0} créditos devolvidos.`
          : `Trabalho removido da fila! ${result.refunded || 0} créditos devolvidos.`;
        toast.success(message);
        onJobCancelled?.();
        onClose();
      } else {
        toast.error('Não foi possível cancelar o trabalho. Tente novamente.');
      }
    } catch (error) {
      console.error('Error cancelling job:', error);
      toast.error('Erro ao cancelar trabalho');
    } finally {
      setIsCancelling(false);
    }
  };

  // Can always cancel (both running and queued)
  const canCancel = !!activeJobId && !!activeTable;

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="bg-[#1A0A2E] border-purple-500/30 max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-yellow-500/20 rounded-full">
              <AlertTriangle className="w-6 h-6 text-yellow-400" />
            </div>
            <AlertDialogTitle className="text-white text-lg">
              Trabalho em Andamento
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="text-purple-200/70 space-y-4">
              <p>Você só pode ter um trabalho por vez. Veja os detalhes abaixo:</p>
              
              {/* Job details card */}
              <div className={`rounded-lg p-4 border ${statusInfo.bgColor} ${statusInfo.borderColor}`}>
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">{activeTool}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {statusInfo.icon}
                      <span className={`text-sm ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                    
                    {elapsedTime && activeStatus === 'running' && (
                      <div className="flex items-center gap-2 text-sm text-purple-300/70">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Iniciado há {elapsedTime}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Cancel button inside card */}
                {canCancel && (
                  <div className="mt-4 pt-3 border-t border-purple-500/20">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancelJob}
                      disabled={isCancelling}
                      className="w-full border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                    >
                      {isCancelling ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Cancelando...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4 mr-2" />
                          {activeStatus === 'running' ? 'Cancelar Processamento' : 'Remover da Fila'}
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-purple-300/50 mt-2 text-center">
                      {activeStatus === 'running' 
                        ? 'Seus créditos serão devolvidos'
                        : 'Seus créditos serão devolvidos'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
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
