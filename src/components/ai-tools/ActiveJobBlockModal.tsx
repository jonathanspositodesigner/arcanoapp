import React, { useState } from 'react';
import { AlertTriangle, Loader2, XCircle, Clock, Zap } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface ActiveJobBlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTool: string;
  activeJobId?: string;
  activeStatus?: string;
  onCancelJob?: (toolName: string, jobId: string) => Promise<{
    success: boolean;
    refundedAmount: number;
    errorMessage?: string;
  }>;
}

const ActiveJobBlockModal: React.FC<ActiveJobBlockModalProps> = ({
  isOpen,
  onClose,
  activeTool,
  activeJobId,
  activeStatus,
  onCancelJob,
}) => {
  const [isCancelling, setIsCancelling] = useState(false);
  
  const statusLabel = activeStatus === 'running' ? 'Processando' : 
                      activeStatus === 'queued' ? 'Na Fila' : 
                      'Em andamento';
  
  const statusIcon = activeStatus === 'running' ? (
    <Zap className="w-3 h-3" />
  ) : (
    <Clock className="w-3 h-3" />
  );
  
  const handleCancelJob = async () => {
    if (!onCancelJob || !activeJobId) return;
    
    setIsCancelling(true);
    
    try {
      const result = await onCancelJob(activeTool, activeJobId);
      
      if (result.success) {
        toast.success(
          `✅ ${result.refundedAmount} créditos estornados!`,
          { description: 'Você pode iniciar um novo trabalho agora.' }
        );
        onClose();
      } else {
        toast.error(result.errorMessage || 'Erro ao cancelar trabalho');
      }
    } catch (error) {
      console.error('[ActiveJobBlockModal] Cancel error:', error);
      toast.error('Erro ao cancelar trabalho');
    } finally {
      setIsCancelling(false);
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
          <AlertDialogDescription className="text-purple-200/70 space-y-4">
            <p>
              Você já tem um trabalho em processamento no{' '}
              <strong className="text-purple-300">{activeTool}</strong>.
            </p>
            
            {/* Job details */}
            {activeStatus && (
              <div className="bg-purple-900/30 rounded-lg p-4 border border-purple-500/20">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-purple-200/60">Status atual:</span>
                  <Badge 
                    variant="outline" 
                    className={`flex items-center gap-1.5 ${
                      activeStatus === 'running' 
                        ? 'border-green-500/50 text-green-400 bg-green-500/10' 
                        : 'border-yellow-500/50 text-yellow-400 bg-yellow-500/10'
                    }`}
                  >
                    {statusIcon}
                    {statusLabel}
                  </Badge>
                </div>
              </div>
            )}
            
            <p className="text-sm">
              Aguarde a conclusão ou cancele para iniciar outro trabalho.
              {onCancelJob && activeJobId && (
                <span className="block mt-1 text-yellow-400/80">
                  ⚠️ Ao cancelar, seus créditos serão devolvidos.
                </span>
              )}
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogAction
            onClick={onClose}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            Entendi
          </AlertDialogAction>
          
          {onCancelJob && activeJobId && (
            <Button
              variant="destructive"
              onClick={handleCancelJob}
              disabled={isCancelling}
              className="flex items-center gap-2"
            >
              {isCancelling ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Cancelando...
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4" />
                  Cancelar Trabalho
                </>
              )}
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ActiveJobBlockModal;
