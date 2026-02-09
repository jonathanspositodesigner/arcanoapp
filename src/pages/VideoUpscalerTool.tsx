import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, Download, RotateCcw, Loader2, Video, XCircle, AlertTriangle, Coins, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { useSmartBackNavigation } from '@/hooks/useSmartBackNavigation';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { useUpscalerCredits } from '@/hooks/useUpscalerCredits';
import { useQueueSessionCleanup } from '@/hooks/useQueueSessionCleanup';
import { useProcessingButton } from '@/hooks/useProcessingButton';
import { useAIJob } from '@/contexts/AIJobContext';
import { supabase } from '@/integrations/supabase/client';
import ToolsHeader from '@/components/ToolsHeader';
import VideoUploadCard from '@/components/video-upscaler/VideoUploadCard';
import NoCreditsModal from '@/components/upscaler/NoCreditsModal';
import ActiveJobBlockModal from '@/components/ai-tools/ActiveJobBlockModal';
import { JobDebugPanel, DownloadProgressOverlay, NotificationPromptToast } from '@/components/ai-tools';
import { cancelJob as centralCancelJob, checkActiveJob } from '@/ai/JobManager';
import { useResilientDownload } from '@/hooks/useResilientDownload';
import { useJobStatusSync } from '@/hooks/useJobStatusSync';
import { useNotificationTokenRecovery } from '@/hooks/useNotificationTokenRecovery';
import { useJobPendingWatchdog } from '@/hooks/useJobPendingWatchdog';
import { useAIToolSettings } from '@/hooks/useAIToolSettings';

type ProcessingStatus = 'idle' | 'uploading' | 'processing' | 'waiting' | 'completed' | 'error';

// Queue messages for better UX
const queueMessages = [
  { emoji: '🎬', text: 'Preparando seu vídeo...' },
  { emoji: '✨', text: 'Aprimorando qualidade...' },
  { emoji: '🚀', text: 'Quase lá, continue esperando!' },
  { emoji: '🌟', text: 'Processando upscale incrível...' },
];

interface VideoMetadata {
  width: number;
  height: number;
  duration: number;
}

const VideoUpscalerTool: React.FC = () => {
  const { goBack } = useSmartBackNavigation({ fallback: '/ferramentas-ia-aplicativo' });
  const { user } = usePremiumStatus();
  const { balance: credits, isLoading: creditsLoading, refetch: refetchCredits } = useUpscalerCredits(user?.id);
  const { getCreditCost } = useAIToolSettings();
  const creditCost = getCreditCost('Video Upscaler', 150);
  
  // Contexto global de jobs - para notificação sonora e trava de navegação
  const { registerJob, updateJobStatus, clearJob: clearGlobalJob } = useAIJob();

  // Video states
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoMetadata, setVideoMetadata] = useState<VideoMetadata | null>(null);
  const [outputVideoUrl, setOutputVideoUrl] = useState<string | null>(null);

  // UI states
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [progress, setProgress] = useState(0);

  // Queue states
  const [jobId, setJobId] = useState<string | null>(null);
  const [queuePosition, setQueuePosition] = useState(0);
  const [queueMessageIndex, setQueueMessageIndex] = useState(0);

  // Debug state for observability
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const [failedAtStep, setFailedAtStep] = useState<string | null>(null);
  const [debugErrorMessage, setDebugErrorMessage] = useState<string | null>(null);
  // Session management
  const sessionIdRef = useRef<string>('');
  
  // CRITICAL: Instant button lock to prevent duplicate clicks
  const { isSubmitting, startSubmit, endSubmit } = useProcessingButton();
  
  // Resilient download hook for cross-device compatibility
  const { isDownloading, progress: downloadProgress, download, cancel: cancelDownload } = useResilientDownload();

  // No credits modal
  const [showNoCreditsModal, setShowNoCreditsModal] = useState(false);
  const [noCreditsReason, setNoCreditsReason] = useState<'not_logged' | 'insufficient'>('insufficient');
 
   // Active job block modal
   const [showActiveJobModal, setShowActiveJobModal] = useState(false);
   const [activeToolName, setActiveToolName] = useState<string>('');
   const [activeJobId, setActiveJobId] = useState<string | undefined>();
   const [activeStatus, setActiveStatus] = useState<string | undefined>();
   // Now using centralized checkActiveJob from JobManager

  const canProcess = videoUrl && videoFile && status === 'idle';
  const isProcessing = status === 'uploading' || status === 'processing' || status === 'waiting';

  // Initialize session ID (fresh each visit - no recovery)
  useEffect(() => {
    sessionIdRef.current = crypto.randomUUID();
  }, []);

  // Cleanup queued jobs when user leaves page
  useQueueSessionCleanup(sessionIdRef.current, status);

  // SISTEMA DE SINCRONIZAÇÃO TRIPLA (Realtime + Polling + Visibility)
  // Garante que o usuário sempre receba o resultado, mesmo com problemas de rede
  // Substitui o antigo sistema Realtime-only + polling manual
  useJobStatusSync({
    jobId,
    toolType: 'video_upscaler',
    enabled: status === 'processing' || status === 'waiting' || status === 'uploading',
    onStatusChange: (update) => {
      console.log('[VideoUpscaler] JobSync update:', update);
      
      // Debug/observability (shown when Debug Mode is enabled)
      setCurrentStep(update.currentStep || update.status);
      if (update.errorMessage) setDebugErrorMessage(update.errorMessage);

      if (update.status === 'completed' && update.outputUrl) {
        setOutputVideoUrl(update.outputUrl);
        setStatus('completed');
        setProgress(100);
        refetchCredits();
        endSubmit();
        toast.success('Vídeo upscalado com sucesso!');
      } else if (update.status === 'failed') {
        setStatus('error');
        endSubmit();
        toast.error(update.errorMessage || 'Erro no processamento');
      } else if (update.status === 'running') {
        setStatus('processing');
        setQueuePosition(0);
      } else if (update.status === 'queued') {
        setStatus('waiting');
        setQueuePosition(update.position || 0);
      }
    },
    onGlobalStatusChange: updateJobStatus,
  });

  // Hook para recuperar job via token de notificação push
  useNotificationTokenRecovery({
    userId: user?.id,
    toolTable: 'video_upscaler_jobs',
    onRecovery: useCallback((result) => {
      if (result.outputUrl) {
        setVideoUrl(result.inputUrl);
        setOutputVideoUrl(result.outputUrl);
        setJobId(result.jobId);
        setStatus('completed');
        setProgress(100);
        toast.success('Resultado carregado!');
      }
    }, []),
  });

  // PENDING WATCHDOG v2 - Detecta jobs travados como 'pending' e marca como failed após 30s
  // CORREÇÃO: Usa 'enabled' ao invés de status da UI (que nunca é 'pending')
  useJobPendingWatchdog({
    jobId,
    toolType: 'video_upscaler',
    enabled: status !== 'idle' && status !== 'completed' && status !== 'error',
    onJobFailed: useCallback((errorMessage) => {
      console.log('[VideoUpscaler] Watchdog triggered - job stuck as pending');
      setStatus('error');
      toast.error(errorMessage);
      endSubmit();
    }, [endSubmit]),
  });

  // Registrar job no contexto global quando jobId muda (para som e trava de navegação)
  useEffect(() => {
    if (jobId) {
      registerJob(jobId, 'Video Upscaler', 'pending');
    }
  }, [jobId, registerJob]);

  // Cleanup on unmount - handled by useJobStatusSync now
  useEffect(() => {
    return () => {
      // Cleanup is handled by useJobStatusSync
    };
  }, []);

  // Rotate queue messages
  useEffect(() => {
    if (!isProcessing) return;
    
    const interval = setInterval(() => {
      setQueueMessageIndex(prev => (prev + 1) % queueMessages.length);
    }, 3000);
    
    return () => clearInterval(interval);
  }, [isProcessing]);

  // Progress simulation for processing state
  useEffect(() => {
    if (status !== 'processing') return;
    
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) return prev;
        return prev + Math.random() * 3;
      });
    }, 1500);
    
    return () => clearInterval(interval);
  }, [status]);

  // Handle video upload
  const handleVideoChange = (url: string | null, file?: File, metadata?: VideoMetadata) => {
    setVideoUrl(url);
    setVideoFile(file || null);
    setVideoMetadata(metadata || null);
  };

  // Upload video to Supabase storage
  const uploadToStorage = async (file: File): Promise<string> => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }
    
    const timestamp = Date.now();
    const extension = file.name.split('.').pop() || 'mp4';
    const fileName = `video-${timestamp}.${extension}`;
    const filePath = `video-upscaler/${user.id}/${fileName}`;

    const { data, error } = await supabase.storage
      .from('artes-cloudinary')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: true,
      });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from('artes-cloudinary')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  };

  const handleProcess = async () => {
    // CRITICAL: Instant lock to prevent duplicate clicks
    if (!startSubmit()) {
      console.log('[VideoUpscaler] Already submitting, ignoring duplicate click');
      return;
    }

    if (!videoUrl || !videoFile) {
      toast.error('Por favor, selecione um vídeo');
      endSubmit();
      return;
    }

    if (!user?.id) {
      setNoCreditsReason('not_logged');
      setShowNoCreditsModal(true);
      endSubmit();
      return;
    }
 
    // Check if user has active job in any tool
    const activeCheck = await checkActiveJob(user.id);
    if (activeCheck.hasActiveJob && activeCheck.activeTool) {
      setActiveToolName(activeCheck.activeTool);
      setActiveJobId(activeCheck.activeJobId);
      setActiveStatus(activeCheck.activeStatus);
      setShowActiveJobModal(true);
      endSubmit();
      return;
    }

    if (credits < creditCost) {
      setNoCreditsReason('insufficient');
      setShowNoCreditsModal(true);
      endSubmit();
      return;
    }

    setStatus('uploading');
    setProgress(0);
    setOutputVideoUrl(null);

    try {
      // Step 1: Upload video FIRST (before creating job to prevent orphans)
      setProgress(10);
      console.log('[VideoUpscaler] Uploading video...');
      const videoStorageUrl = await uploadToStorage(videoFile);
      console.log('[VideoUpscaler] Video uploaded:', videoStorageUrl);
      setProgress(30);

      // Step 2: Create job in database ONLY AFTER successful upload
      // This prevents orphaned jobs if user closes page during upload
      const { data: job, error: jobError } = await supabase
        .from('video_upscaler_jobs')
        .insert({
          session_id: sessionIdRef.current,
          user_id: user.id,
          status: 'pending',
          video_width: videoMetadata?.width,
          video_height: videoMetadata?.height,
          video_duration_seconds: videoMetadata?.duration,
          input_file_name: videoStorageUrl.split('/').pop() || videoFile.name,
        })
        .select()
        .single();

      if (jobError || !job) {
        throw new Error('Failed to create job');
      }

      setJobId(job.id);
      console.log('[VideoUpscaler] Job created with video:', job.id);
      setProgress(40);

      // Step 3: Call edge function
      setProgress(40);
      setStatus('processing');
      
      const { data: runResult, error: runError } = await supabase.functions.invoke(
        'runninghub-video-upscaler/run',
        {
          body: {
            jobId: job.id,
            videoUrl: videoStorageUrl,
            userId: user.id,
            creditCost: creditCost,
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

      console.log('[VideoUpscaler] Run result:', runResult);

      if (runResult.queued) {
        setStatus('waiting');
        setQueuePosition(runResult.position || 1);
      } else if (runResult.success) {
        setStatus('processing');
      } else if (runResult.code === 'INSUFFICIENT_CREDITS') {
        setNoCreditsReason('insufficient');
        setShowNoCreditsModal(true);
        setStatus('idle');
        endSubmit();
        return;
      } else if (runResult.code === 'RATE_LIMIT_EXCEEDED') {
        throw new Error('Muitas requisições. Aguarde 1 minuto e tente novamente.');
      } else {
        throw new Error(runResult.error || 'Erro desconhecido');
      }

      // O useJobStatusSync já cuida da sincronização tripla automaticamente
      refetchCredits();

    } catch (error: any) {
      console.error('[VideoUpscaler] Process error:', error);
      setStatus('error');
      toast.error(error.message || 'Erro ao processar vídeo');
      endSubmit();
    }
  };

  const handleCancelQueue = async () => {
    if (!jobId) return;

    try {
      const result = await centralCancelJob('video_upscaler', jobId);
      
      if (result.success) {
        setStatus('idle');
        setJobId(null);
        setQueuePosition(0);
        endSubmit();
        if (result.refundedAmount > 0) {
          toast.success(`Cancelado! ${result.refundedAmount} créditos devolvidos.`);
        } else {
          toast.info('Processamento cancelado');
        }
        refetchCredits();
      } else {
        toast.error(result.errorMessage || 'Erro ao cancelar');
      }
    } catch (error) {
      console.error('[VideoUpscaler] Cancel error:', error);
      toast.error('Erro ao cancelar processamento');
    }
  };

  const handleReset = () => {
    endSubmit();
    if (videoUrl && videoUrl.startsWith('blob:')) {
      URL.revokeObjectURL(videoUrl);
    }
    setVideoUrl(null);
    setVideoFile(null);
    setVideoMetadata(null);
    setOutputVideoUrl(null);
    setStatus('idle');
    setProgress(0);
    setJobId(null);
    setQueuePosition(0);
    setCurrentStep(null);
    setFailedAtStep(null);
    setDebugErrorMessage(null);
    // Limpar job do contexto global
    clearGlobalJob();
  };

  // Download result with resilient fallbacks
  const handleDownload = useCallback(async () => {
    if (!outputVideoUrl) return;
    
    await download({
      url: outputVideoUrl,
      filename: `video-upscaler-${Date.now()}.mp4`,
      mediaType: 'video',
      timeout: 10000,
      onSuccess: () => toast.success('Download concluído!'),
      locale: 'pt'
    });
  }, [outputVideoUrl, download]);

  const currentQueueMessage = queueMessages[queueMessageIndex];

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-[#0D0221] via-[#1A0A2E] to-[#16082A] flex flex-col">
      <ToolsHeader title="Upscaler Arcano V3 (vídeo)" onBack={goBack} />

      {/* Warning banner during processing */}
      {isProcessing && (
        <div className="bg-amber-500/20 border-b border-amber-500/30 px-4 py-2 flex items-center justify-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <span className="text-xs text-amber-200">
            Não feche esta página durante o processamento
          </span>
        </div>
      )}

      <div className="flex-1 max-w-7xl w-full mx-auto px-4 py-2 overflow-y-auto lg:overflow-hidden">
        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-7 gap-2 lg:gap-3 lg:h-full">
          
          {/* Left Side - Inputs (2/7 on desktop ~28%) */}
          <div className="lg:col-span-2 flex flex-col gap-2 pb-2 lg:pb-0 lg:overflow-y-auto">
            {/* Video Upload */}
            <VideoUploadCard
              title="Vídeo de Entrada"
              videoUrl={videoUrl}
              videoFile={videoFile}
              onVideoChange={handleVideoChange}
              disabled={isProcessing}
            />

            {/* Specifications Info */}
            <Card className="bg-purple-900/20 border-purple-500/30 p-3">
              <h4 className="text-xs font-semibold text-white mb-2">Especificações</h4>
              <ul className="text-[10px] text-purple-300 space-y-1">
                <li>• Resolução máxima: 1280px</li>
                <li>• Duração máxima: 10 segundos</li>
                <li>• Formatos: MP4, WebM, MOV</li>
              </ul>
            </Card>

            {/* Action Button */}
            <Button
              size="sm"
              className="w-full bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-medium py-2 text-xs disabled:opacity-50"
              disabled={!canProcess || isProcessing || isSubmitting}
              onClick={handleProcess}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Iniciando...
                </>
              ) : status === 'uploading' ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Enviando...
                </>
              ) : status === 'waiting' ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Fila #{queuePosition}
                </>
              ) : status === 'processing' ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  {Math.round(progress)}%
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  Upscale
                  <span className="ml-2 flex items-center gap-1 text-xs opacity-90">
                    <Coins className="w-3.5 h-3.5" />
                    {creditCost}
                  </span>
                </>
              )}
            </Button>

            {/* Cancel button when in queue */}
            {status === 'waiting' && (
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs border-red-500/30 text-red-300 hover:bg-red-500/10"
                onClick={handleCancelQueue}
              >
                <XCircle className="w-3.5 h-3.5 mr-1.5" />
                Sair da Fila
              </Button>
            )}

            <JobDebugPanel
              jobId={jobId}
              tableName="video_upscaler_jobs"
              currentStep={currentStep}
              failedAtStep={failedAtStep}
              errorMessage={debugErrorMessage}
              position={queuePosition}
              status={status}
            />
          </div>

          {/* Right Side - Result Viewer (5/7 on desktop ~72%) */}
          <div className="lg:col-span-5 flex flex-col min-h-[280px] lg:min-h-0">
            <Card className="relative overflow-hidden bg-purple-900/20 border-purple-500/30 flex-1 flex flex-col min-h-[250px] lg:min-h-0">
              {/* Header */}
              <div className="px-3 py-2 border-b border-purple-500/20 flex items-center justify-between flex-shrink-0">
                <h3 className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5 text-purple-400" />
                  Resultado
                </h3>
              </div>

              {/* Result Area */}
              <div className="relative flex-1 min-h-0 flex items-center justify-center p-4">
                {outputVideoUrl ? (
                  <video
                    src={outputVideoUrl}
                    className="max-w-full max-h-full object-contain rounded-lg"
                    controls
                    autoPlay
                    muted
                    playsInline
                  />
                ) : isProcessing ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                    <div className="relative">
                      <div className="w-14 h-14 rounded-full border-4 border-purple-500/30 border-t-purple-500 animate-spin" />
                      <Sparkles className="absolute inset-0 m-auto w-6 h-6 text-purple-400" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-white font-medium flex items-center gap-2">
                        <span>{currentQueueMessage.emoji}</span>
                        <span>{currentQueueMessage.text}</span>
                      </p>
                      {status === 'waiting' && queuePosition > 0 && (
                        <p className="text-xs text-purple-300 mt-1">
                          Posição na fila: #{queuePosition}
                        </p>
                      )}
                      {status === 'processing' && (
                        <p className="text-xs text-purple-300 mt-0.5">
                          {Math.round(progress)}% concluído
                        </p>
                      )}
                    </div>
                    {/* Progress bar */}
                    <div className="w-36 h-1.5 bg-purple-900/50 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-500 transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                ) : status === 'error' ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                    <div className="w-16 h-16 rounded-xl bg-red-500/10 border-2 border-dashed border-red-500/30 flex items-center justify-center">
                      <XCircle className="w-8 h-8 text-red-500/60" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-red-300">
                        Erro no processamento
                      </p>
                      <Button
                        variant="link"
                        size="sm"
                        className="text-xs text-purple-400"
                        onClick={handleReset}
                      >
                        Tentar novamente
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                    <div className="w-16 h-16 rounded-xl bg-purple-500/10 border-2 border-dashed border-purple-500/30 flex items-center justify-center">
                      <Video className="w-8 h-8 text-purple-500/40" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-purple-300">
                        O resultado aparecerá aqui
                      </p>
                      <p className="text-xs text-purple-400 mt-0.5">
                        Envie o vídeo e clique em "Upscale"
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              {outputVideoUrl && status === 'completed' && (
                <div className="absolute bottom-3 left-3 right-3 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-8 text-xs bg-purple-500/10 border-purple-500/30 text-purple-200 hover:bg-purple-500/20"
                    onClick={handleReset}
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                    Novo
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 h-8 text-xs bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white"
                    onClick={handleDownload}
                  >
                    <Download className="w-3.5 h-3.5 mr-1.5" />
                    Baixar HD
                  </Button>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* No Credits Modal */}
      <NoCreditsModal
        isOpen={showNoCreditsModal}
        onClose={() => setShowNoCreditsModal(false)}
        reason={noCreditsReason}
      />
       
      {/* Active Job Block Modal */}
      <ActiveJobBlockModal
        isOpen={showActiveJobModal}
        onClose={() => setShowActiveJobModal(false)}
        activeTool={activeToolName}
        activeJobId={activeJobId}
        activeStatus={activeStatus}
        onCancelJob={centralCancelJob}
      />

      {/* Download Progress Overlay */}
      <DownloadProgressOverlay
        isVisible={isDownloading}
        progress={downloadProgress}
        onCancel={cancelDownload}
        mediaType="video"
        locale="pt"
      />

      {/* Notification prompt toast */}
      <NotificationPromptToast toolName="vídeo" />
    </div>
  );
};

export default VideoUpscalerTool;
