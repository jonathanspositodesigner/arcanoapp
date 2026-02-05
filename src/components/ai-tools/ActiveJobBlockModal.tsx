import React, { useState } from 'react';
import { AlertTriangle, Loader2, XCircle, Clock, Zap, AlertCircle } from 'lucide-react';
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
  const [showConfirmation, setShowConfirmation] = useState(false);
  
  // Job já está processando na RunningHub = sem reembolso
  const isAlreadyProcessing = activeStatus === 'running' || activeStatus === 'starting';
  
  const statusLabel = activeStatus === 'running' ? 'Processando' : 
                      activeStatus === 'queued' ? 'Na Fila' : 
                      activeStatus === 'starting' ? 'Iniciando' :
                      'Em andamento';
  
  const statusIcon = activeStatus === 'running' || activeStatus === 'starting' ? (
    <Zap className="w-3 h-3" />
  ) : (
    <Clock className="w-3 h-3" />
  );
  
  const handleCancelClick = () => {
    if (isAlreadyProcessing) {
      // Mostrar confirmação extra se vai perder créditos
      setShowConfirmation(true);
    } else {
      // Cancelar direto se está na fila (tem reembolso)
      handleCancelJob();
    }
  };
  
  const handleCancelJob = async () => {
    if (!onCancelJob || !activeJobId) return;
    
    setIsCancelling(true);
    setShowConfirmation(false);
    
    try {
      const result = await onCancelJob(activeTool, activeJobId);
      
      if (result.success) {
        if (result.refundedAmount > 0) {
          toast.success(
            `✅ ${result.refundedAmount} créditos estornados!`,
            { description: 'Você pode iniciar um novo trabalho agora.' }
          );
        } else {
          toast.warning(
            '⚠️ Trabalho cancelado',
            { description: 'Créditos não foram devolvidos pois o processamento já havia iniciado.' }
          );
        }
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
  
  // Dialog de confirmação quando vai perder créditos
  if (showConfirmation) {
    return (
      <AlertDialog open={true} onOpenChange={() => setShowConfirmation(false)}>
        <AlertDialogContent className="bg-[#1A0A2E] border-red-500/30">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-red-500/20 rounded-full">
                <AlertCircle className="w-6 h-6 text-red-400" />
              </div>
              <AlertDialogTitle className="text-white text-lg">
                ⚠️ Atenção: Você perderá seus créditos!
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-purple-200/70 space-y-4">
              <div className="bg-red-900/30 rounded-lg p-4 border border-red-500/30">
                <p className="text-red-300 font-medium text-center">
                  O processamento já iniciou no servidor.
                </p>
                <p className="text-red-200/80 text-sm text-center mt-2">
                  Ao cancelar agora, <strong className="text-red-300">seus créditos NÃO serão devolvidos</strong> pois já estamos sendo cobrados pelo processamento.
                </p>
              </div>
              
              <p className="text-sm text-center text-purple-200/60">
                Tem certeza que deseja cancelar e perder os créditos?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowConfirmation(false)}
              className="border-purple-500/30 text-purple-200 hover:bg-purple-500/10"
            >
              Não, aguardar conclusão
            </Button>
            
            <Button
              variant="destructive"
              onClick={handleCancelJob}
              disabled={isCancelling}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700"
            >
              {isCancelling ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Cancelando...
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4" />
                  Sim, cancelar e perder créditos
                </>
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }
  
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
                      activeStatus === 'running' || activeStatus === 'starting'
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
                isAlreadyProcessing ? (
                  <span className="block mt-2 text-red-400/90 font-medium">
                    🚨 Ao cancelar, seus créditos NÃO serão devolvidos pois o processamento já iniciou.
                  </span>
                ) : (
                  <span className="block mt-2 text-green-400/80">
                    ✅ Ao cancelar, seus créditos serão devolvidos (ainda na fila).
                  </span>
                )
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
              onClick={handleCancelClick}
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
