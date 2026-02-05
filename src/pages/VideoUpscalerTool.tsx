import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, Download, RotateCcw, Loader2, Video, XCircle, AlertTriangle, Coins, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { useSmartBackNavigation } from '@/hooks/useSmartBackNavigation';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { useUpscalerCredits } from '@/hooks/useUpscalerCredits';
import { useQueueSessionCleanup } from '@/hooks/useQueueSessionCleanup';
 import { useActiveJobCheck } from '@/hooks/useActiveJobCheck';
import { supabase } from '@/integrations/supabase/client';
import ToolsHeader from '@/components/ToolsHeader';
import VideoUploadCard from '@/components/video-upscaler/VideoUploadCard';
import NoCreditsModal from '@/components/upscaler/NoCreditsModal';
 import ActiveJobBlockModal from '@/components/ai-tools/ActiveJobBlockModal';

type ProcessingStatus = 'idle' | 'uploading' | 'processing' | 'waiting' | 'completed' | 'error';

const CREDIT_COST = 150;

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

  // Session management
  const sessionIdRef = useRef<string>('');
  const realtimeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  
  // CRITICAL: Synchronous flag to prevent duplicate API calls
  const processingRef = useRef(false);

  // No credits modal
  const [showNoCreditsModal, setShowNoCreditsModal] = useState(false);
  const [noCreditsReason, setNoCreditsReason] = useState<'not_logged' | 'insufficient'>('insufficient');
 
   // Active job block modal
   const [showActiveJobModal, setShowActiveJobModal] = useState(false);
   const [activeToolName, setActiveToolName] = useState<string>('');
   const [activeJobId, setActiveJobId] = useState<string | undefined>();
   const [activeStatus, setActiveStatus] = useState<string | undefined>();
   const { checkActiveJob, cancelActiveJob } = useActiveJobCheck();

  const canProcess = videoUrl && videoFile && status === 'idle';
  const isProcessing = status === 'uploading' || status === 'processing' || status === 'waiting';

  // Initialize session ID (fresh each visit - no recovery)
  useEffect(() => {
    sessionIdRef.current = crypto.randomUUID();
  }, []);

  // Cleanup queued jobs when user leaves page
  useQueueSessionCleanup(sessionIdRef.current, status);

  // Subscribe to realtime updates for a job
  const subscribeToJobUpdates = useCallback((jId: string) => {
    // Cleanup previous subscription
    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current);
    }

    const channel = supabase
      .channel(`video-upscaler-job-${jId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'video_upscaler_jobs',
          filter: `id=eq.${jId}`
        },
        (payload) => {
          const newData = payload.new as any;
          console.log('[VideoUpscaler] Job update:', newData);

          if (newData.status === 'completed' && newData.output_url) {
            setOutputVideoUrl(newData.output_url);
            setStatus('completed');
            setProgress(100);
            refetchCredits();
            processingRef.current = false;
            toast.success('Vídeo upscalado com sucesso!');
          } else if (newData.status === 'failed') {
            setStatus('error');
            processingRef.current = false;
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
  }, [refetchCredits]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
      }
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

  // Polling fallback de ÚLTIMO RECURSO - só ativa após 3 minutos sem resposta
  // Roda no máximo 3 vezes para não gastar Cloud desnecessariamente
  const pollAttemptsRef = useRef(0);
  const pollStartTimeRef = useRef<number | null>(null);
  
  useEffect(() => {
    if (!jobId || status === 'completed' || status === 'error' || status === 'idle') {
      pollAttemptsRef.current = 0;
      pollStartTimeRef.current = null;
      return;
    }

    // Marca quando o job começou a processar
    if (!pollStartTimeRef.current) {
      pollStartTimeRef.current = Date.now();
    }

    // Só começa o polling após 3 minutos (180000ms) E no máximo 3 tentativas
    const DELAY_BEFORE_POLLING = 180000; // 3 minutos
    const MAX_POLL_ATTEMPTS = 3;
    const POLL_INTERVAL = 20000; // 20s entre tentativas

    const checkTimeout = setTimeout(async () => {
      const elapsed = Date.now() - (pollStartTimeRef.current || Date.now());
      
      // Só faz polling se passaram 3+ minutos e ainda não esgotou tentativas
      if (elapsed >= DELAY_BEFORE_POLLING && pollAttemptsRef.current < MAX_POLL_ATTEMPTS) {
        pollAttemptsRef.current += 1;
        console.log(`[VideoUpscaler] Polling fallback #${pollAttemptsRef.current}/${MAX_POLL_ATTEMPTS} (após ${Math.round(elapsed/1000)}s)`);
        
        try {
          const { data: job } = await supabase
            .from('video_upscaler_jobs')
            .select('status, output_url, error_message')
            .eq('id', jobId)
            .maybeSingle();

          if (!job) return;

          if (job.status === 'completed' && job.output_url) {
            setOutputVideoUrl(job.output_url);
            setStatus('completed');
            setProgress(100);
            refetchCredits();
            processingRef.current = false;
            toast.success('Vídeo upscalado com sucesso!');
          } else if (job.status === 'failed') {
            setStatus('error');
            processingRef.current = false;
            toast.error(job.error_message || 'Erro no processamento');
          }
        } catch (e) {
          console.error('[VideoUpscaler] Polling error:', e);
        }
      }
    }, pollStartTimeRef.current ? Math.max(0, DELAY_BEFORE_POLLING - (Date.now() - pollStartTimeRef.current) + (pollAttemptsRef.current * POLL_INTERVAL)) : DELAY_BEFORE_POLLING);

    return () => clearTimeout(checkTimeout);
  }, [jobId, status, refetchCredits]);

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
    // CRITICAL: Prevent duplicate calls with synchronous check
    if (processingRef.current) {
      console.log('[VideoUpscaler] Already processing, ignoring duplicate call');
      return;
    }
    processingRef.current = true;

    if (!videoUrl || !videoFile) {
      toast.error('Por favor, selecione um vídeo');
      processingRef.current = false;
      return;
    }

    if (!user?.id) {
      setNoCreditsReason('not_logged');
      setShowNoCreditsModal(true);
      processingRef.current = false;
      return;
    }
 
    // Check if user has active job in any tool
    const activeCheck = await checkActiveJob(user.id);
    if (activeCheck.hasActiveJob && activeCheck.activeTool) {
      setActiveToolName(activeCheck.activeTool);
      setActiveJobId(activeCheck.activeJobId);
      setActiveStatus(activeCheck.activeStatus);
      setShowActiveJobModal(true);
      processingRef.current = false;
      return;
    }

    if (credits < CREDIT_COST) {
      setNoCreditsReason('insufficient');
      setShowNoCreditsModal(true);
      processingRef.current = false;
      return;
    }

    setStatus('uploading');
    setProgress(0);
    setOutputVideoUrl(null);

    try {
      // Step 1: Create job in database
      const { data: job, error: jobError } = await supabase
        .from('video_upscaler_jobs')
        .insert({
          session_id: sessionIdRef.current,
          user_id: user.id,
          status: 'queued',
          video_width: videoMetadata?.width,
          video_height: videoMetadata?.height,
          video_duration_seconds: videoMetadata?.duration,
          input_file_name: videoFile.name,
        })
        .select()
        .single();

      if (jobError || !job) {
        throw new Error('Failed to create job');
      }

      setJobId(job.id);
      console.log('[VideoUpscaler] Job created:', job.id);

      // Step 2: Upload video to storage
      setProgress(20);
      const videoStorageUrl = await uploadToStorage(videoFile);
      console.log('[VideoUpscaler] Video uploaded:', videoStorageUrl);

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
            creditCost: CREDIT_COST,
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
        processingRef.current = false;
        return;
      } else if (runResult.code === 'RATE_LIMIT_EXCEEDED') {
        throw new Error('Muitas requisições. Aguarde 1 minuto e tente novamente.');
      } else {
        throw new Error(runResult.error || 'Erro desconhecido');
      }

      // Subscribe to job updates
      subscribeToJobUpdates(job.id);
      refetchCredits();

    } catch (error: any) {
      console.error('[VideoUpscaler] Process error:', error);
      setStatus('error');
      toast.error(error.message || 'Erro ao processar vídeo');
      processingRef.current = false;
    }
  };

  const handleCancelQueue = async () => {
    if (!jobId) return;

    try {
      await supabase
        .from('video_upscaler_jobs')
        .update({ status: 'cancelled' })
        .eq('id', jobId);

      setStatus('idle');
      setJobId(null);
      setQueuePosition(0);
      processingRef.current = false;
      toast.info('Processamento cancelado');
    } catch (error) {
      console.error('[VideoUpscaler] Cancel error:', error);
    }
  };

  const handleReset = () => {
    processingRef.current = false;
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
  };

  const handleDownload = () => {
    if (!outputVideoUrl) return;
    
    const link = document.createElement('a');
    link.href = outputVideoUrl;
    link.download = `video-upscaler-${Date.now()}.mp4`;
    link.target = '_blank';
    link.click();
    toast.success('Download iniciado!');
  };

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
              disabled={!canProcess || isProcessing}
              onClick={handleProcess}
            >
              {status === 'uploading' ? (
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
                    {CREDIT_COST}
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
        onCancelJob={cancelActiveJob}
      />
    </div>
  );
};

export default VideoUpscalerTool;
