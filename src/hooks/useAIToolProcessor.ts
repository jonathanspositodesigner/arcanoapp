import { useState, useRef, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { useUpscalerCredits } from '@/hooks/useUpscalerCredits';
import { useQueueSessionCleanup } from '@/hooks/useQueueSessionCleanup';
import { useActiveJobCheck } from '@/hooks/useActiveJobCheck';
import { useJobReconciliation } from '@/hooks/useJobReconciliation';
import {
  ProcessingStatus,
  ErrorDetails,
  QueueMessage,
  AIToolConfig,
  StartJobOptions,
  UseAIToolProcessorReturn,
  DEFAULT_QUEUE_MESSAGES,
} from '@/types/ai-tools';

/**
 * Unified hook for AI tool processing
 * Handles: session management, queue, realtime updates, timeout, credits, duplicates prevention
 */
export function useAIToolProcessor(config: AIToolConfig): UseAIToolProcessorReturn {
  const {
    toolName,
    tableName,
    edgeFunctionPath,
    creditCost,
    storagePath,
    successMessage = 'Processamento concluído!',
    queueMessages = DEFAULT_QUEUE_MESSAGES,
    pollingInterval = 15000,
    timeoutMinutes = 10,
  } = config;

  const { user } = usePremiumStatus();
  const { balance: credits, refetch: refetchCredits } = useUpscalerCredits(user?.id);
  const { checkActiveJob } = useActiveJobCheck();

  // Core state
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [jobId, setJobId] = useState<string | null>(null);
  const [queuePosition, setQueuePosition] = useState(0);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [error, setError] = useState<ErrorDetails | null>(null);
  const [queueMessageIndex, setQueueMessageIndex] = useState(0);

  // Modal states
  const [showNoCreditsModal, setShowNoCreditsModal] = useState(false);
  const [noCreditsReason, setNoCreditsReason] = useState<'not_logged' | 'insufficient'>('insufficient');
  const [showActiveJobModal, setShowActiveJobModal] = useState(false);
  const [activeToolName, setActiveToolName] = useState('');
  const [activeJobStatus, setActiveJobStatus] = useState('');
  const [activeJobId, setActiveJobId] = useState('');
  const [activeTable, setActiveTable] = useState('');
  const [activeStartedAt, setActiveStartedAt] = useState<string | undefined>();

  // Refs
  const processingRef = useRef(false);
  const sessionIdRef = useRef<string>('');
  const realtimeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const isProcessing = status === 'uploading' || status === 'processing' || status === 'waiting';

  // Initialize session ID
  useEffect(() => {
    sessionIdRef.current = crypto.randomUUID();
  }, []);

  // Cleanup queued jobs when user leaves page
  useQueueSessionCleanup(sessionIdRef.current, status);

  // Silent reconciliation polling
  useJobReconciliation({
    table: tableName,
    jobId,
    status,
    pollingInterval,
    enabled: status === 'processing',
  });

  // 10-minute timeout fallback
  useEffect(() => {
    if (status === 'processing') {
      timeoutRef.current = window.setTimeout(() => {
        setStatus('error');
        processingRef.current = false;
        setError({
          message: 'Tempo limite excedido',
          code: 'TIMEOUT',
          solution: `A operação demorou mais de ${timeoutMinutes} minutos. Tente novamente.`,
        });
        toast.error(`Tempo limite excedido (${timeoutMinutes} min). Tente novamente.`);
      }, timeoutMinutes * 60 * 1000);
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [status, timeoutMinutes]);

  // Rotate queue messages
  useEffect(() => {
    if (!isProcessing) return;

    const interval = setInterval(() => {
      setQueueMessageIndex((prev) => (prev + 1) % queueMessages.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [isProcessing, queueMessages.length]);

  // Progress simulation
  useEffect(() => {
    if (status !== 'processing') return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return prev;
        return prev + Math.random() * 5;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [status]);

  // Subscribe to realtime updates
  const subscribeToJobUpdates = useCallback(
    (jId: string) => {
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
      }

      const channel = supabase
        .channel(`${toolName}-job-${jId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: tableName,
            filter: `id=eq.${jId}`,
          },
          (payload) => {
            const newData = payload.new as any;
            console.log(`[${toolName}] Job update:`, newData);

            if (newData.status === 'completed' && newData.output_url) {
              setOutputUrl(newData.output_url);
              setStatus('completed');
              setProgress(100);
              refetchCredits();
              processingRef.current = false;
              toast.success(successMessage);
            } else if (newData.status === 'failed') {
              setStatus('error');
              processingRef.current = false;
              setError({
                message: newData.error_message || 'Erro no processamento',
                code: 'TASK_FAILED',
              });
              toast.error(newData.error_message || 'Erro no processamento');
            } else if (newData.status === 'running') {
              setStatus('processing');
              setQueuePosition(0);
            } else if (newData.status === 'queued') {
              setStatus('waiting');
              setQueuePosition(newData.position || 0);
            }
          }
        )
        .subscribe();

      realtimeChannelRef.current = channel;
    },
    [toolName, tableName, successMessage, refetchCredits]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
      }
    };
  }, []);

  // Upload to storage helper
  const uploadToStorage = useCallback(
    async (file: File | Blob, prefix: string): Promise<string> => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const timestamp = Date.now();
      const extension = file instanceof File ? file.name.split('.').pop() || 'webp' : 'webp';
      const fileName = `${prefix}-${timestamp}.${extension}`;
      const filePath = `${storagePath}/${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('artes-cloudinary')
        .upload(filePath, file, {
          contentType: file.type || 'image/webp',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('artes-cloudinary')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    },
    [user?.id, storagePath]
  );

  // Start job
  const startJob = useCallback(
    async (options: StartJobOptions): Promise<boolean> => {
      const { edgeFunctionPayload, jobInsertData, onBeforeEdgeCall } = options;

      // Prevent duplicate calls
      if (processingRef.current) {
        console.log(`[${toolName}] Already processing, ignoring duplicate call`);
        return false;
      }
      processingRef.current = true;

      // Check user authentication
      if (!user?.id) {
        setNoCreditsReason('not_logged');
        setShowNoCreditsModal(true);
        processingRef.current = false;
        return false;
      }

      // Check for active job
      const activeJobResult = await checkActiveJob(user.id);
      if (activeJobResult.hasActiveJob && activeJobResult.activeTool) {
        setActiveToolName(activeJobResult.activeTool);
        setActiveJobStatus(activeJobResult.activeStatus || '');
        setActiveJobId(activeJobResult.activeJobId || '');
        setActiveTable(activeJobResult.activeTable || '');
        setActiveStartedAt(activeJobResult.startedAt);
        setShowActiveJobModal(true);
        processingRef.current = false;
        return false;
      }

      // Check credits
      if (credits < creditCost) {
        setNoCreditsReason('insufficient');
        setShowNoCreditsModal(true);
        processingRef.current = false;
        return false;
      }

      setStatus('uploading');
      setProgress(0);
      setOutputUrl(null);
      setError(null);

      try {
        // Create job in database
        setProgress(40);
        const { data: job, error: jobError } = await supabase
          .from(tableName)
          .insert({
            session_id: sessionIdRef.current,
            user_id: user.id,
            status: 'queued',
            ...jobInsertData,
          })
          .select()
          .single();

        if (jobError || !job) {
          throw new Error('Failed to create job');
        }

        setJobId(job.id);
        console.log(`[${toolName}] Job created:`, job.id);

        // Call onBeforeEdgeCall if provided
        onBeforeEdgeCall?.();

        // Call edge function
        setProgress(50);
        setStatus('processing');

        const { data: runResult, error: runError } = await supabase.functions.invoke(
          edgeFunctionPath,
          {
            body: {
              jobId: job.id,
              userId: user.id,
              creditCost,
              ...edgeFunctionPayload,
            },
          }
        );

        if (runError) {
          let errorMessage = runError.message || 'Erro desconhecido';
          if (errorMessage.includes('non-2xx')) {
            errorMessage = 'Falha na comunicação com o servidor. Tente novamente.';
          }
          throw new Error(errorMessage);
        }

        console.log(`[${toolName}] Run result:`, runResult);

        if (runResult.queued) {
          setStatus('waiting');
          setQueuePosition(runResult.position || 1);
        } else if (runResult.success) {
          setStatus('processing');
        } else if (runResult.code === 'INSUFFICIENT_CREDITS') {
          setNoCreditsReason('insufficient');
          setShowNoCreditsModal(true);
          setStatus('idle');
          processingRef.current = false;
          return false;
        } else if (runResult.code === 'IMAGE_TRANSFER_ERROR') {
          throw new Error(`Erro no provedor: ${(runResult.error || 'Falha ao enviar').slice(0, 100)}`);
        } else if (runResult.code === 'RATE_LIMIT_EXCEEDED') {
          throw new Error('Muitas requisições. Aguarde 1 minuto e tente novamente.');
        } else if (runResult.error) {
          throw new Error(runResult.error);
        }

        // Subscribe to job updates
        subscribeToJobUpdates(job.id);
        refetchCredits();

        return true;
      } catch (err: any) {
        console.error(`[${toolName}] Process error:`, err);
        setStatus('error');
        setError({
          message: err.message || 'Erro ao processar',
          code: 'PROCESS_ERROR',
        });
        toast.error(err.message || 'Erro ao processar');
        processingRef.current = false;
        return false;
      }
    },
    [
      toolName,
      tableName,
      edgeFunctionPath,
      creditCost,
      user?.id,
      credits,
      checkActiveJob,
      subscribeToJobUpdates,
      refetchCredits,
    ]
  );

  // Cancel job
  const cancelJob = useCallback(async () => {
    if (!jobId) return;

    try {
      await supabase.from(tableName).update({ status: 'cancelled' }).eq('id', jobId);

      setStatus('idle');
      setJobId(null);
      setQueuePosition(0);
      processingRef.current = false;
      toast.info('Processamento cancelado');
    } catch (err) {
      console.error(`[${toolName}] Cancel error:`, err);
    }
  }, [jobId, tableName, toolName]);

  // Reset state
  const reset = useCallback(() => {
    processingRef.current = false;
    setStatus('idle');
    setProgress(0);
    setJobId(null);
    setQueuePosition(0);
    setOutputUrl(null);
    setError(null);
    setQueueMessageIndex(0);
  }, []);

  return {
    // State
    status,
    progress,
    jobId,
    queuePosition,
    outputUrl,
    error,
    queueMessageIndex,
    isProcessing,
    currentQueueMessage: queueMessages[queueMessageIndex],

    // Modal states
    showNoCreditsModal,
    setShowNoCreditsModal,
    noCreditsReason,
    showActiveJobModal,
    setShowActiveJobModal,
    activeToolName,
    activeJobStatus,
    activeJobId,
    activeTable,
    activeStartedAt,

    // Actions
    startJob,
    cancelJob,
    reset,
    uploadToStorage,
    setProgress,
    setStatus,
  };
}
