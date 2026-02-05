import React from 'react';
import { Loader2, Clock, CheckCircle2, XCircle, AlertCircle, Zap, Upload, CreditCard, Server, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * STEP LABELS - Mapeamento de etapas para labels amigáveis
 */
export const STEP_LABELS: Record<string, string> = {
  pending: 'Preparando...',
  upload: 'Enviando imagem...',
  insert: 'Criando job...',
  credits: 'Verificando créditos...',
  queue_check: 'Verificando fila...',
  queued: 'Aguardando na fila',
  starting: 'Iniciando processamento...',
  running: 'Processando com IA...',
  webhook_received: 'Finalizando...',
  completed: 'Concluído!',
  failed: 'Erro no processamento',
  cancelled: 'Cancelado',
};

/**
 * STEP ICONS - Ícones para cada etapa
 */
const STEP_ICONS: Record<string, React.ReactNode> = {
  pending: <Timer className="w-4 h-4" />,
  upload: <Upload className="w-4 h-4" />,
  insert: <Server className="w-4 h-4" />,
  credits: <CreditCard className="w-4 h-4" />,
  queue_check: <Server className="w-4 h-4" />,
  queued: <Clock className="w-4 h-4" />,
  starting: <Zap className="w-4 h-4" />,
  running: <Loader2 className="w-4 h-4 animate-spin" />,
  webhook_received: <Server className="w-4 h-4" />,
  completed: <CheckCircle2 className="w-4 h-4" />,
  failed: <XCircle className="w-4 h-4" />,
  cancelled: <AlertCircle className="w-4 h-4" />,
};

/**
 * STEP COLORS - Cores para cada estado
 */
const STEP_COLORS: Record<string, string> = {
  pending: 'text-muted-foreground',
  upload: 'text-blue-400',
  insert: 'text-blue-400',
  credits: 'text-yellow-400',
  queue_check: 'text-blue-400',
  queued: 'text-yellow-400',
  starting: 'text-purple-400',
  running: 'text-purple-400',
  webhook_received: 'text-purple-400',
  completed: 'text-green-400',
  failed: 'text-red-400',
  cancelled: 'text-muted-foreground',
};

interface JobStepIndicatorProps {
  step: string | null | undefined;
  failedAtStep?: string | null;
  errorMessage?: string | null;
  position?: number | null;
  className?: string;
  showIcon?: boolean;
  compact?: boolean;
}

/**
 * JobStepIndicator - Exibe a etapa atual do job de forma amigável
 */
const JobStepIndicator: React.FC<JobStepIndicatorProps> = ({
  step,
  failedAtStep,
  errorMessage,
  position,
  className,
  showIcon = true,
  compact = false,
}) => {
  const currentStep = step || 'pending';
  const label = STEP_LABELS[currentStep] || currentStep;
  const icon = STEP_ICONS[currentStep] || <Loader2 className="w-4 h-4 animate-spin" />;
  const colorClass = STEP_COLORS[currentStep] || 'text-muted-foreground';

  const isProcessing = ['upload', 'insert', 'credits', 'queue_check', 'starting', 'running', 'webhook_received'].includes(currentStep);
  const isFailed = currentStep === 'failed';
  const isQueued = currentStep === 'queued';

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {/* Main step indicator */}
      <div className={cn('flex items-center gap-2', colorClass)}>
        {showIcon && icon}
        <span className={cn('font-medium', compact ? 'text-xs' : 'text-sm')}>
          {label}
        </span>
        {isQueued && position && position > 0 && (
          <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">
            #{position}
          </span>
        )}
      </div>

      {/* Failed at step indicator */}
      {isFailed && failedAtStep && (
        <div className="flex items-center gap-1.5 text-xs text-red-400/80">
          <AlertCircle className="w-3 h-3" />
          <span>Falhou em: {STEP_LABELS[failedAtStep] || failedAtStep}</span>
        </div>
      )}

      {/* Error message */}
      {isFailed && errorMessage && !compact && (
        <p className="text-xs text-red-400/70 mt-1 line-clamp-2">
          {errorMessage}
        </p>
      )}

      {/* Processing indicator */}
      {isProcessing && !compact && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Aguarde...</span>
        </div>
      )}
    </div>
  );
};

export default JobStepIndicator;
