import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Download, RotateCcw, Loader2, Video, XCircle, AlertTriangle, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { useSmartBackNavigation } from '@/hooks/useSmartBackNavigation';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { useAIToolProcessor } from '@/hooks/useAIToolProcessor';
import { supabase } from '@/integrations/supabase/client';
import ToolsHeader from '@/components/ToolsHeader';
import VideoUploadCard from '@/components/video-upscaler/VideoUploadCard';
import NoCreditsModal from '@/components/upscaler/NoCreditsModal';
import ActiveJobBlockModal from '@/components/ai-tools/ActiveJobBlockModal';

const CREDIT_COST = 150;

const QUEUE_MESSAGES = [
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

  // Use unified processor hook
  const {
    status,
    progress,
    queuePosition,
    outputUrl,
    jobId,
    isProcessing,
    currentQueueMessage,
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
    startJob,
    cancelJob,
    reset,
    setProgress,
    setStatus,
  } = useAIToolProcessor({
    toolName: 'video-upscaler',
    tableName: 'video_upscaler_jobs',
    edgeFunctionPath: 'runninghub-video-upscaler/run',
    creditCost: CREDIT_COST,
    storagePath: 'video-upscaler',
    successMessage: 'Vídeo upscalado com sucesso!',
    queueMessages: QUEUE_MESSAGES,
    pollingInterval: 20000, // 20s for video (takes longer)
  });

  // UI-specific states
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoMetadata, setVideoMetadata] = useState<VideoMetadata | null>(null);

  // Extra polling for video (starts after 3 min, max 3 attempts)
  const pollAttemptsRef = useRef(0);
  const pollStartTimeRef = useRef<number | null>(null);

  const canProcess = videoUrl && videoFile && status === 'idle';

  // Polling fallback de ÚLTIMO RECURSO
  useEffect(() => {
    if (!jobId || status === 'completed' || status === 'error' || status === 'idle') {
      pollAttemptsRef.current = 0;
      pollStartTimeRef.current = null;
      return;
    }

    if (!pollStartTimeRef.current) {
      pollStartTimeRef.current = Date.now();
    }

    const DELAY_BEFORE_POLLING = 180000; // 3 minutos
    const MAX_POLL_ATTEMPTS = 3;
    const POLL_INTERVAL = 20000;

    const checkTimeout = setTimeout(async () => {
      const elapsed = Date.now() - (pollStartTimeRef.current || Date.now());

      if (elapsed >= DELAY_BEFORE_POLLING && pollAttemptsRef.current < MAX_POLL_ATTEMPTS) {
        pollAttemptsRef.current += 1;
        console.log(`[VideoUpscaler] Polling fallback #${pollAttemptsRef.current}/${MAX_POLL_ATTEMPTS}`);

        try {
          const { data: job } = await supabase
            .from('video_upscaler_jobs')
            .select('status, output_url, error_message')
            .eq('id', jobId)
            .maybeSingle();

          if (job?.status === 'completed' && job.output_url) {
            // The realtime should handle this, but as fallback we trigger reload
            window.location.reload();
          }
        } catch (e) {
          console.error('[VideoUpscaler] Polling error:', e);
        }
      }
    }, pollStartTimeRef.current ? Math.max(0, DELAY_BEFORE_POLLING - (Date.now() - pollStartTimeRef.current) + (pollAttemptsRef.current * POLL_INTERVAL)) : DELAY_BEFORE_POLLING);

    return () => clearTimeout(checkTimeout);
  }, [jobId, status]);

  const handleVideoChange = (url: string | null, file?: File, metadata?: VideoMetadata) => {
    setVideoUrl(url);
    setVideoFile(file || null);
    setVideoMetadata(metadata || null);
  };

  const uploadToStorage = async (file: File): Promise<string> => {
    if (!user?.id) throw new Error('User not authenticated');

    const timestamp = Date.now();
    const extension = file.name.split('.').pop() || 'mp4';
    const fileName = `video-${timestamp}.${extension}`;
    const filePath = `video-upscaler/${user.id}/${fileName}`;

    const { error } = await supabase.storage.from('artes-cloudinary').upload(filePath, file, {
      contentType: file.type,
      upsert: true,
    });

    if (error) throw error;

    const { data: urlData } = supabase.storage.from('artes-cloudinary').getPublicUrl(filePath);
    return urlData.publicUrl;
  };

  const handleProcess = async () => {
    if (!videoUrl || !videoFile) {
      toast.error('Por favor, selecione um vídeo');
      return;
    }

    try {
      setProgress(10);
      const videoStorageUrl = await uploadToStorage(videoFile);
      setProgress(30);

      await startJob({
        edgeFunctionPayload: {
          videoUrl: videoStorageUrl,
        },
        jobInsertData: {
          video_width: videoMetadata?.width,
          video_height: videoMetadata?.height,
          video_duration_seconds: videoMetadata?.duration,
          input_file_name: videoStorageUrl,
        },
      });
    } catch (error: any) {
      console.error('[VideoUpscaler] Process error:', error);
      toast.error(error.message || 'Erro ao processar vídeo');
    }
  };

  const handleReset = () => {
    reset();
    if (videoUrl && videoUrl.startsWith('blob:')) {
      URL.revokeObjectURL(videoUrl);
    }
    setVideoUrl(null);
    setVideoFile(null);
    setVideoMetadata(null);
  };

  const handleDownload = () => {
    if (!outputUrl) return;
    const link = document.createElement('a');
    link.href = outputUrl;
    link.download = `video-upscaler-${Date.now()}.mp4`;
    link.target = '_blank';
    link.click();
    toast.success('Download iniciado!');
  };

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-[#0D0221] via-[#1A0A2E] to-[#16082A] flex flex-col">
      <ToolsHeader title="Upscaler Arcano V3 (vídeo)" onBack={goBack} />

      {isProcessing && (
        <div className="bg-amber-500/20 border-b border-amber-500/30 px-4 py-2 flex items-center justify-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <span className="text-xs text-amber-200">Não feche esta página durante o processamento</span>
        </div>
      )}

      <div className="flex-1 max-w-7xl w-full mx-auto px-4 py-2 overflow-y-auto lg:overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-7 gap-2 lg:gap-3 lg:h-full">
          {/* Left Side - Inputs */}
          <div className="lg:col-span-2 flex flex-col gap-2 pb-2 lg:pb-0 lg:overflow-y-auto">
            <VideoUploadCard
              title="Vídeo de Entrada"
              videoUrl={videoUrl}
              videoFile={videoFile}
              onVideoChange={handleVideoChange}
              disabled={isProcessing}
            />

            <Card className="bg-purple-900/20 border-purple-500/30 p-3">
              <h4 className="text-xs font-semibold text-white mb-2">Especificações</h4>
              <ul className="text-[10px] text-purple-300 space-y-1">
                <li>• Resolução máxima: 1280px</li>
                <li>• Duração máxima: 10 segundos</li>
                <li>• Formatos: MP4, WebM, MOV</li>
              </ul>
            </Card>

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

            {status === 'waiting' && (
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs border-red-500/30 text-red-300 hover:bg-red-500/10"
                onClick={cancelJob}
              >
                <XCircle className="w-3.5 h-3.5 mr-1.5" />
                Sair da Fila
              </Button>
            )}
          </div>

          {/* Right Side - Result Viewer */}
          <div className="lg:col-span-5 flex flex-col min-h-[280px] lg:min-h-0">
            <Card className="relative overflow-hidden bg-purple-900/20 border-purple-500/30 flex-1 flex flex-col min-h-[250px] lg:min-h-0">
              <div className="px-3 py-2 border-b border-purple-500/20 flex items-center justify-between flex-shrink-0">
                <h3 className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5 text-purple-400" />
                  Resultado
                </h3>
              </div>

              <div className="relative flex-1 min-h-0 flex items-center justify-center p-4">
                {outputUrl ? (
                  <video
                    src={outputUrl}
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
                        <p className="text-xs text-purple-300 mt-1">Posição na fila: #{queuePosition}</p>
                      )}
                      {status === 'processing' && (
                        <p className="text-xs text-purple-300 mt-0.5">{Math.round(progress)}% concluído</p>
                      )}
                    </div>
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
                      <p className="text-sm text-red-300">Erro no processamento</p>
                      <Button variant="link" size="sm" className="text-xs text-purple-400" onClick={handleReset}>
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
                      <p className="text-sm text-purple-300">O resultado aparecerá aqui</p>
                      <p className="text-xs text-purple-400 mt-0.5">Envie o vídeo e clique em "Upscale"</p>
                    </div>
                  </div>
                )}
              </div>

              {outputUrl && status === 'completed' && (
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

      <NoCreditsModal isOpen={showNoCreditsModal} onClose={() => setShowNoCreditsModal(false)} reason={noCreditsReason} />

      <ActiveJobBlockModal
        isOpen={showActiveJobModal}
        onClose={() => setShowActiveJobModal(false)}
        activeTool={activeToolName}
        activeStatus={activeJobStatus}
        activeJobId={activeJobId}
        activeTable={activeTable}
        activeStartedAt={activeStartedAt}
      />
    </div>
  );
};

export default VideoUpscalerTool;
