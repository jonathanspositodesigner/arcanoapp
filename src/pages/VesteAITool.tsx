import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, Download, RotateCcw, Loader2, ZoomIn, ZoomOut, ImageIcon, XCircle, AlertTriangle, Coins, Shirt } from 'lucide-react';
import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';
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
import ImageUploadCard from '@/components/pose-changer/ImageUploadCard';
import ClothingLibraryModal from '@/components/veste-ai/ClothingLibraryModal';
import NoCreditsModal from '@/components/upscaler/NoCreditsModal';
import ActiveJobBlockModal from '@/components/ai-tools/ActiveJobBlockModal';
import { JobDebugPanel, DownloadProgressOverlay, NotificationPromptToast } from '@/components/ai-tools';
import { optimizeForAI } from '@/hooks/useImageOptimizer';
import { cancelJob as centralCancelJob, checkActiveJob } from '@/ai/JobManager';
import { useResilientDownload } from '@/hooks/useResilientDownload';
import { useJobStatusSync } from '@/hooks/useJobStatusSync';
import { useNotificationTokenRecovery } from '@/hooks/useNotificationTokenRecovery';

type ProcessingStatus = 'idle' | 'uploading' | 'processing' | 'waiting' | 'completed' | 'error';

const CREDIT_COST = 60;

// Queue messages for better UX
const queueMessages = [
  { emoji: '👕', text: 'Preparando sua transformação...' },
  { emoji: '✨', text: 'Vestindo nova roupa...' },
  { emoji: '🚀', text: 'Quase lá, continue esperando!' },
  { emoji: '🌟', text: 'Processando seu look incrível...' },
];

const VesteAITool: React.FC = () => {
  const { goBack } = useSmartBackNavigation({ fallback: '/ferramentas-ia-aplicativo' });
  const { user } = usePremiumStatus();
  const { balance: credits, isLoading: creditsLoading, refetch: refetchCredits } = useUpscalerCredits(user?.id);
  
  // Contexto global de jobs - para notificação sonora e trava de navegação
  const { registerJob, updateJobStatus, clearJob: clearGlobalJob } = useAIJob();

  // Image states
  const [personImage, setPersonImage] = useState<string | null>(null);
  const [personFile, setPersonFile] = useState<File | null>(null);
  const [clothingImage, setClothingImage] = useState<string | null>(null);
  const [clothingFile, setClothingFile] = useState<File | null>(null);
  const [outputImage, setOutputImage] = useState<string | null>(null);

  // UI states
  const [showClothingLibrary, setShowClothingLibrary] = useState(false);
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);

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
  
  // Ref for zoom/pan control
  const transformRef = useRef<ReactZoomPanPinchRef>(null);

  // No credits modal
  const [showNoCreditsModal, setShowNoCreditsModal] = useState(false);
  const [noCreditsReason, setNoCreditsReason] = useState<'not_logged' | 'insufficient'>('insufficient');
 
   // Active job block modal
   const [showActiveJobModal, setShowActiveJobModal] = useState(false);
   const [activeToolName, setActiveToolName] = useState<string>('');
   const [activeJobId, setActiveJobId] = useState<string | undefined>();
   const [activeStatus, setActiveStatus] = useState<string | undefined>();
   // Now using centralized checkActiveJob from JobManager

  const canProcess = personImage && clothingImage && status === 'idle';
  const isProcessing = status === 'uploading' || status === 'processing' || status === 'waiting';

  // Initialize session ID (fresh each visit - no recovery)
  useEffect(() => {
    sessionIdRef.current = crypto.randomUUID();
  }, []);

  // Cleanup queued jobs when user leaves page
  useQueueSessionCleanup(sessionIdRef.current, status);

  // SISTEMA DE SINCRONIZAÇÃO TRIPLA (Realtime + Polling + Visibility)
  // Garante que o usuário sempre receba o resultado, mesmo com problemas de rede
  useJobStatusSync({
    jobId,
    toolType: 'veste_ai',
    enabled: status === 'processing' || status === 'waiting' || status === 'uploading',
    onStatusChange: (update) => {
      console.log('[VesteAI] JobSync update:', update);
      
      // Debug/observability (shown when Debug Mode is enabled)
      setCurrentStep(update.currentStep || update.status);
      if (update.errorMessage) setDebugErrorMessage(update.errorMessage);

      if (update.status === 'completed' && update.outputUrl) {
        setOutputImage(update.outputUrl);
        setStatus('completed');
        setProgress(100);
        refetchCredits();
        endSubmit();
        toast.success('Look aplicado com sucesso!');
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
    toolTable: 'veste_ai_jobs',
    onRecovery: useCallback((result) => {
      if (result.outputUrl) {
        setPersonImage(result.personImageUrl || null);
        setClothingImage(result.clothingImageUrl || null);
        setOutputImage(result.outputUrl);
        setJobId(result.jobId);
        setStatus('completed');
        setProgress(100);
        toast.success('Resultado carregado!');
      }
    }, []),
  });

  // Registrar job no contexto global quando jobId muda (para som e trava de navegação)
  useEffect(() => {
    if (jobId) {
      registerJob(jobId, 'Veste AI', 'pending');
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
        return prev + Math.random() * 5;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [status]);


  // Handle person image upload
  const handlePersonImageChange = (dataUrl: string | null, file?: File) => {
    setPersonImage(dataUrl);
    setPersonFile(file || null);
  };

  // Handle clothing image selection (from library or upload)
  const handleClothingImageChange = async (imageUrl: string | null, file?: File) => {
    setClothingImage(imageUrl);
    
    if (imageUrl && !file) {
      // Image from library - fetch as blob
      try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const fetchedFile = new File([blob], 'clothing.png', { type: blob.type });
        setClothingFile(fetchedFile);
      } catch (error) {
        console.error('[VesteAI] Error fetching clothing image:', error);
      }
    } else {
      setClothingFile(file || null);
    }
  };

  // Compress image before upload using centralized AI optimizer (1536px limit)
  const compressImage = async (file: File): Promise<Blob> => {
    const result = await optimizeForAI(file);
    return result.file;
  };

  // Upload image to Supabase storage
  const uploadToStorage = async (file: File | Blob, prefix: string): Promise<string> => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }
    
    const timestamp = Date.now();
    const fileName = `${prefix}-${timestamp}.webp`;
    const filePath = `veste-ai/${user.id}/${fileName}`;

    const { data, error } = await supabase.storage
      .from('artes-cloudinary')
      .upload(filePath, file, {
        contentType: 'image/webp',
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
      console.log('[VesteAI] Already submitting, ignoring duplicate click');
      return;
    }

    if (!personImage || !clothingImage || !personFile) {
      toast.error('Por favor, selecione ambas as imagens');
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

    if (credits < CREDIT_COST) {
      setNoCreditsReason('insufficient');
      setShowNoCreditsModal(true);
      endSubmit();
      return;
    }

    setStatus('uploading');
    setProgress(0);
    setOutputImage(null);

    try {
      // Step 1: Compress and upload person image FIRST (before creating job)
      setProgress(10);
      console.log('[VesteAI] Compressing person image...');
      const compressedPerson = await compressImage(personFile);
      const personUrl = await uploadToStorage(compressedPerson, 'person');
      console.log('[VesteAI] Person image uploaded:', personUrl);

      // Step 2: Compress and upload clothing image
      setProgress(30);
      let clothingUrl: string;
      
      if (clothingFile) {
        console.log('[VesteAI] Compressing clothing image...');
        const compressedClothing = await compressImage(clothingFile);
        clothingUrl = await uploadToStorage(compressedClothing, 'clothing');
      } else {
        // Already a URL from library
        clothingUrl = clothingImage;
      }
      console.log('[VesteAI] Clothing image uploaded:', clothingUrl);

      // Step 3: Create job in database ONLY AFTER images are uploaded
      // This prevents orphaned jobs if user closes page during upload
      setProgress(40);
      const { data: job, error: jobError } = await supabase
        .from('veste_ai_jobs')
        .insert({
          session_id: sessionIdRef.current,
          user_id: user.id,
          status: 'pending',
          person_file_name: personUrl.split('/').pop() || 'person.webp',
          clothing_file_name: clothingUrl.split('/').pop() || 'clothing.webp',
        })
        .select()
        .single();

      if (jobError || !job) {
        throw new Error('Failed to create job');
      }

      setJobId(job.id);
      console.log('[VesteAI] Job created with images:', job.id);

      // Step 4: Call edge function
      setProgress(50);
      setStatus('processing');
      
      const { data: runResult, error: runError } = await supabase.functions.invoke(
        'runninghub-veste-ai/run',
        {
          body: {
            jobId: job.id,
            personImageUrl: personUrl,
            clothingImageUrl: clothingUrl,
            userId: user.id,
            creditCost: CREDIT_COST,
          },
        }
      );

      if (runError) {
        // Try to extract detailed error from the response
        let errorMessage = runError.message || 'Erro desconhecido';
        if (errorMessage.includes('non-2xx')) {
          errorMessage = 'Falha na comunicação com o servidor. Tente novamente.';
        }
        throw new Error(errorMessage);
      }

      console.log('[VesteAI] Run result:', runResult);

      if (runResult.queued) {
        setStatus('waiting');
        setQueuePosition(runResult.position || 1);
      } else if (runResult.success) {
        setStatus('processing');
      } else if (runResult.code === 'INSUFFICIENT_CREDITS') {
        setNoCreditsReason('insufficient');
        setShowNoCreditsModal(true);
        setStatus('idle');
        return;
      } else if (runResult.code === 'IMAGE_TRANSFER_ERROR') {
        // Specific error for RunningHub communication issues
        const detail = runResult.error || 'Falha ao enviar imagens';
        throw new Error(`Erro no provedor: ${detail.slice(0, 100)}`);
      } else if (runResult.code === 'RATE_LIMIT_EXCEEDED') {
        throw new Error('Muitas requisições. Aguarde 1 minuto e tente novamente.');
      } else {
        throw new Error(runResult.error || 'Erro desconhecido');
      }

      // O useJobStatusSync já cuida da sincronização tripla automaticamente
      refetchCredits();

    } catch (error: any) {
      console.error('[VesteAI] Process error:', error);
      setStatus('error');
      toast.error(error.message || 'Erro ao processar imagem');
      endSubmit();
    }
  };

  const handleCancelQueue = async () => {
    if (!jobId) return;

    try {
      const result = await centralCancelJob('veste_ai', jobId);
      
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
      console.error('[VesteAI] Cancel error:', error);
      toast.error('Erro ao cancelar processamento');
    }
  };

  const handleReset = () => {
    endSubmit();
    setPersonImage(null);
    setPersonFile(null);
    setClothingImage(null);
    setClothingFile(null);
    setOutputImage(null);
    setStatus('idle');
    setProgress(0);
    setZoomLevel(1);
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
    if (!outputImage) return;
    
    await download({
      url: outputImage,
      filename: `veste-ai-${Date.now()}.png`,
      mediaType: 'image',
      timeout: 10000,
      onSuccess: () => toast.success('Download concluído!'),
      locale: 'pt'
    });
  }, [outputImage, download]);

  const currentQueueMessage = queueMessages[queueMessageIndex];

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-[#0D0221] via-[#1A0A2E] to-[#16082A] flex flex-col">
      <ToolsHeader title="Veste AI" onBack={goBack} />

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
            {/* Person Image Upload */}
            <ImageUploadCard
              title="Sua Foto"
              image={personImage}
              onImageChange={handlePersonImageChange}
              disabled={isProcessing}
            />

            {/* Clothing Image Upload */}
            <ImageUploadCard
              title="Roupa de Referência"
              image={clothingImage}
              onImageChange={handleClothingImageChange}
              showLibraryButton
              libraryButtonLabel="Biblioteca de Roupas"
              onOpenLibrary={() => setShowClothingLibrary(true)}
              disabled={isProcessing}
            />

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
                  Processando...
                </>
              ) : (
                <>
                  <Shirt className="w-3.5 h-3.5 mr-1.5" />
                  Vestir ({CREDIT_COST} <Coins className="w-3 h-3 inline ml-0.5" />)
                </>
              )}
            </Button>

            {/* Cancel button when in queue */}
            {status === 'waiting' && (
              <Button
                size="sm"
                variant="outline"
                className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs"
                onClick={handleCancelQueue}
              >
                <XCircle className="w-3.5 h-3.5 mr-1.5" />
                Cancelar
              </Button>
            )}

            <JobDebugPanel
              jobId={jobId}
              tableName="veste_ai_jobs"
              currentStep={currentStep}
              failedAtStep={failedAtStep}
              errorMessage={debugErrorMessage}
              position={queuePosition}
              status={status}
            />

          </div>

          {/* Right Side - Result Viewer (5/7 on desktop ~72%) */}
          <div className="lg:col-span-5 flex flex-col gap-2 min-h-[300px] lg:min-h-0 lg:h-full">
            <Card className="flex-1 relative bg-[#1A0A2E]/50 border-purple-500/20 overflow-hidden flex items-center justify-center">
              {/* Processing overlay */}
              {isProcessing && (
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-10 backdrop-blur-sm">
                  <div className="w-16 h-16 rounded-full border-4 border-purple-500/30 border-t-purple-500 animate-spin mb-4" />
                  <p className="text-white text-lg font-medium mb-2">
                    {currentQueueMessage.emoji} {currentQueueMessage.text}
                  </p>
                  {status === 'waiting' && queuePosition > 0 && (
                    <p className="text-purple-300 text-sm">
                      Posição na fila: #{queuePosition}
                    </p>
                  )}
                  {status === 'processing' && (
                    <div className="w-48 h-2 bg-purple-500/20 rounded-full overflow-hidden mt-2">
                      <div 
                        className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-500 transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Result Image */}
              {outputImage ? (
                <TransformWrapper
                  ref={transformRef}
                  initialScale={1}
                  minScale={0.5}
                  maxScale={4}
                  centerOnInit
                  onTransformed={(_, state) => setZoomLevel(state.scale)}
                >
                  <TransformComponent
                    wrapperClass="!w-full !h-full"
                    contentClass="!w-full !h-full flex items-center justify-center"
                  >
                    <img
                      src={outputImage}
                      alt="Resultado"
                      className="max-w-full max-h-full object-contain"
                    />
                  </TransformComponent>
                </TransformWrapper>
              ) : (
                <div className="flex flex-col items-center justify-center text-purple-400/50 p-8">
                  <Shirt className="w-16 h-16 mb-4" />
                  <p className="text-center text-sm">
                    O resultado aparecerá aqui
                  </p>
                </div>
              )}

              {/* Zoom controls */}
              {outputImage && !isProcessing && (
                <div className="absolute bottom-3 right-3 flex gap-2">
                  <Button
                    size="icon"
                    variant="outline"
                    className="w-8 h-8 bg-black/50 border-purple-500/30 text-white hover:bg-purple-500/20"
                    onClick={() => transformRef.current?.zoomOut()}
                  >
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    className="w-8 h-8 bg-black/50 border-purple-500/30 text-white hover:bg-purple-500/20"
                    onClick={() => transformRef.current?.zoomIn()}
                  >
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </Card>

            {/* Action buttons when completed */}
            {status === 'completed' && outputImage && (
              <div className="flex gap-2">
                <Button
                  className="flex-1 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white"
                  onClick={handleReset}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Novo Look
                </Button>
                <Button
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white"
                  onClick={handleDownload}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Baixar HD
                </Button>
              </div>
            )}

            {/* Error state */}
            {status === 'error' && (
              <div className="flex gap-2">
                <Button
                  className="flex-1 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white"
                  onClick={handleReset}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Tentar Novamente
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Clothing Library Modal */}
      <ClothingLibraryModal
        isOpen={showClothingLibrary}
        onClose={() => setShowClothingLibrary(false)}
        onSelectClothing={handleClothingImageChange}
      />

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
        mediaType="image"
        locale="pt"
      />

      {/* Notification prompt toast */}
      <NotificationPromptToast toolName="look" />
    </div>
  );
};

export default VesteAITool;
