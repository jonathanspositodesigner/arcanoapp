import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, Download, RotateCcw, Loader2, ZoomIn, ZoomOut, ImageIcon, XCircle, AlertTriangle, Coins, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { useSmartBackNavigation } from '@/hooks/useSmartBackNavigation';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { useCredits } from '@/contexts/CreditsContext';
import { useQueueSessionCleanup } from '@/hooks/useQueueSessionCleanup';
import { useProcessingButton } from '@/hooks/useProcessingButton';
import { useAIJob } from '@/contexts/AIJobContext';
import { supabase } from '@/integrations/supabase/client';
import AppLayout from '@/components/layout/AppLayout';
import PersonInputSwitch from '@/components/ai-tools/PersonInputSwitch';
import ReferenceImageCard from '@/components/arcano-cloner/ReferenceImageCard';
import PhotoLibraryModal from '@/components/arcano-cloner/PhotoLibraryModal';
import NoCreditsModal from '@/components/upscaler/NoCreditsModal';
import ActiveJobBlockModal from '@/components/ai-tools/ActiveJobBlockModal';
import { JobDebugPanel, DownloadProgressOverlay, NotificationPromptToast } from '@/components/ai-tools';
import { optimizeForAI } from '@/hooks/useImageOptimizer';
import { cancelJob as centralCancelJob, checkActiveJob } from '@/ai/JobManager';
import { useResilientDownload } from '@/hooks/useResilientDownload';
import { ResilientImage } from '@/components/upscaler/ResilientImage';
import { useJobStatusSync } from '@/hooks/useJobStatusSync';
import { useNotificationTokenRecovery } from '@/hooks/useNotificationTokenRecovery';
import { useJobPendingWatchdog } from '@/hooks/useJobPendingWatchdog';
import { getAIErrorMessage } from '@/utils/errorMessages';
import { useAIToolSettings } from '@/hooks/useAIToolSettings';

type ProcessingStatus = 'idle' | 'uploading' | 'processing' | 'waiting' | 'completed' | 'error';

// Queue messages for better UX
const queueMessages = [
  { emoji: '🎨', text: 'Preparando sua transformação...' },
  { emoji: '✨', text: 'Aguardando mágica IA...' },
  { emoji: '🚀', text: 'Quase lá, continue esperando!' },
  { emoji: '🌟', text: 'Processando sua pose incrível...' },
];

const PoseChangerTool: React.FC = () => {
  const { goBack } = useSmartBackNavigation({ fallback: '/ferramentas-ia-aplicativo' });
  const { user, isPremium } = usePremiumStatus();
  const { balance: credits, isLoading: creditsLoading, refetch: refetchCredits, checkBalance } = useCredits();
  
  const { getCreditCost } = useAIToolSettings();
  const creditCost = getCreditCost('Pose Changer', 60);
  const isMobile = useIsMobile();
  const [showMobileConfig, setShowMobileConfig] = useState(false);
  
  // Contexto global de jobs - para notificação sonora e trava de navegação
  const { registerJob, updateJobStatus, clearJob: clearGlobalJob, playNotificationSound } = useAIJob();

  // Image states
  const [personImage, setPersonImage] = useState<string | null>(null);
  const [personFile, setPersonFile] = useState<File | null>(null);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [referencePromptId, setReferencePromptId] = useState<string | null>(null);
  const [outputImage, setOutputImage] = useState<string | null>(null);
  const [thumbnailImage, setThumbnailImage] = useState<string | null>(null);

  // UI states
  const [showPhotoLibrary, setShowPhotoLibrary] = useState(false);
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

  const canProcess = personImage && referenceImage && status === 'idle';
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
    toolType: 'pose_changer',
    enabled: status === 'processing' || status === 'waiting' || status === 'uploading',
    onStatusChange: (update) => {
      console.log('[PoseChanger] JobSync update:', update);
      
      // Debug/observability (shown when Debug Mode is enabled)
      setCurrentStep(update.currentStep || update.status);
      if (update.errorMessage) setDebugErrorMessage(update.errorMessage);

      if (update.status === 'completed' && update.outputUrl) {
        setOutputImage(update.outputUrl);
        if (update.thumbnailUrl) setThumbnailImage(update.thumbnailUrl);
        setStatus('completed');
        setProgress(100);
        refetchCredits();
        endSubmit();
        toast.success('Pose alterada com sucesso!');
      } else if (update.status === 'failed') {
        setStatus('error');
        const friendlyError = getAIErrorMessage(update.errorMessage);
        setDebugErrorMessage(update.errorMessage);
        endSubmit();
        toast.error(friendlyError.message);
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
    toolTable: 'pose_changer_jobs',
    onRecovery: useCallback(async (result) => {
      if (result.outputUrl) {
        setPersonImage(result.personImageUrl || null);
        setReferenceImage(result.referenceImageUrl || null);
        setOutputImage(result.outputUrl);
        setJobId(result.jobId);
        const { data } = await supabase.from('pose_changer_jobs').select('thumbnail_url').eq('id', result.jobId).single();
        if (data?.thumbnail_url) setThumbnailImage(data.thumbnail_url);
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
    toolType: 'pose_changer',
    enabled: !!jobId && status !== 'idle' && status !== 'completed',
    onJobFailed: useCallback((errorMessage) => {
      console.log('[PoseChanger] Watchdog triggered - job stuck as pending');
      setStatus('error');
      toast.error(errorMessage);
      endSubmit();
    }, [endSubmit]),
  });

  // Registrar job no contexto global quando jobId muda (para som e trava de navegação)
  useEffect(() => {
    if (jobId) {
      registerJob(jobId, 'Pose Changer', 'pending');
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

  // Handle reference image selection (from library or upload)
  const handleReferenceImageChange = async (imageUrl: string | null, file?: File) => {
    setReferenceImage(imageUrl);
    
    if (imageUrl && !file) {
      // Image from library - fetch as blob
      try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const fetchedFile = new File([blob], 'reference.png', { type: blob.type });
        setReferenceFile(fetchedFile);
      } catch (error) {
        console.error('[PoseChanger] Error fetching reference image:', error);
      }
    } else {
      setReferenceFile(file || null);
    }
  };

  // Seleção da biblioteca de fotos (recebe URL)
  const handleSelectFromLibrary = (_imageUrl: string) => {
    // legacy callback — kept for compatibility
  };

  const handleSelectFromLibraryWithMeta = (imageUrl: string, meta: { promptId: string; promptType: 'admin' | 'partner' } | null) => {
    handleReferenceImageChange(imageUrl);
    setReferencePromptId(meta?.promptType === 'partner' ? meta.promptId : null);
  };

  // Upload pelo modal (recebe dataUrl + file)
  const handleUploadFromModal = (dataUrl: string, file: File) => {
    setReferenceImage(dataUrl);
    setReferenceFile(file);
    setReferencePromptId(null);
  };

  // Limpar referência
  const handleClearReference = () => {
    setReferencePromptId(null);
    setReferenceImage(null);
    setReferenceFile(null);
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
    const fileName = `${prefix}-${timestamp}.jpg`;
    const filePath = `pose-changer/${user.id}/${fileName}`;

    const { data, error } = await supabase.storage
      .from('artes-cloudinary')
      .upload(filePath, file, {
        contentType: 'image/jpeg',
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
      console.log('[PoseChanger] Already submitting, ignoring duplicate click');
      return;
    }

    if (!personImage || !referenceImage || !personFile) {
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

    const freshCredits = await checkBalance();
    if (freshCredits < creditCost) {
      setNoCreditsReason('insufficient');
      setShowNoCreditsModal(true);
      endSubmit();
      return;
    }

    setStatus('uploading');
    setProgress(0);
    setOutputImage(null);
    setThumbnailImage(null);

    try {
      // Step 1: Compress and upload person image FIRST (before creating job)
      setProgress(10);
      console.log('[PoseChanger] Compressing person image...');
      const compressedPerson = await compressImage(personFile);
      const personUrl = await uploadToStorage(compressedPerson, 'person');
      console.log('[PoseChanger] Person image uploaded:', personUrl);

      // Step 2: Compress and upload reference image
      setProgress(30);
      let referenceUrl: string;
      
      if (referenceFile) {
        console.log('[PoseChanger] Compressing reference image...');
        const compressedRef = await compressImage(referenceFile);
        referenceUrl = await uploadToStorage(compressedRef, 'reference');
      } else {
        // Already a URL from library
        referenceUrl = referenceImage;
      }
      console.log('[PoseChanger] Reference image uploaded:', referenceUrl);

      // Step 3: Create job in database ONLY AFTER images are uploaded
      console.log(`[PoseChanger] 🔍 AUDIT reference_prompt_id BEFORE insert: "${referencePromptId}" (type: ${typeof referencePromptId})`);
      // This prevents orphaned jobs if user closes page during upload
      setProgress(40);
      const { data: job, error: jobError } = await supabase
        .from('pose_changer_jobs')
        .insert({
          session_id: sessionIdRef.current,
          user_id: user.id,
          status: 'pending',
          person_file_name: personUrl.split('/').pop() || 'person.webp',
          reference_file_name: referenceUrl.split('/').pop() || 'reference.webp',
          person_image_url: personUrl,
          reference_image_url: referenceUrl,
          reference_prompt_id: referencePromptId,
        })
        .select()
        .single();

      if (jobError || !job) {
        throw new Error('Failed to create job');
      }

      setJobId(job.id);
      console.log(`[PoseChanger] ✅ Job created: ${job.id} | reference_prompt_id persisted: "${job.reference_prompt_id}"`);

      // Step 4: Call edge function
      setProgress(50);
      setStatus('processing');
      
      const { data: runResult, error: runError } = await supabase.functions.invoke(
        'runninghub-pose-changer/run',
        {
          body: {
            jobId: job.id,
            personImageUrl: personUrl,
            referenceImageUrl: referenceUrl,
            userId: user.id,
            creditCost: creditCost,
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

      console.log('[PoseChanger] Run result:', runResult);

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
      console.error('[PoseChanger] Process error:', error);
      if (jobId) {
        const { markJobAsFailedInDb } = await import('@/utils/markJobAsFailedInDb');
        await markJobAsFailedInDb(jobId, 'pose_changer', error.message || 'Erro desconhecido');
      }
      setStatus('error');
      toast.error(error.message || 'Erro ao processar imagem');
      endSubmit();
    }
  };

  const handleCancelQueue = async () => {
    if (!jobId) return;

    try {
      const result = await centralCancelJob('pose_changer', jobId);
      
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
      console.error('[PoseChanger] Cancel error:', error);
      toast.error('Erro ao cancelar processamento');
    }
  };

  const handleReset = () => {
    endSubmit();
    setPersonImage(null);
    setPersonFile(null);
    setReferenceImage(null);
    setReferenceFile(null);
    setOutputImage(null);
    setThumbnailImage(null);
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
      filename: `pose-changer-${Date.now()}.png`,
      mediaType: 'image',
      timeout: 10000,
      onSuccess: () => toast.success('Download concluído!'),
      locale: 'pt'
    });
  }, [outputImage, download]);

  const currentQueueMessage = queueMessages[queueMessageIndex];

  return (
    <AppLayout fullScreen>
      <div className={`flex-1 max-w-7xl w-full mx-auto px-4 py-4 flex flex-col h-full ${isMobile ? 'overflow-y-auto pb-40' : 'overflow-hidden'}`}>
        <div className={`grid grid-cols-1 lg:grid-cols-7 gap-4 lg:gap-5 ${isMobile ? 'content-start' : 'flex-1 min-h-0'}`}>
          
          {/* Left Side - Controls Panel */}
          <div className={`lg:col-span-2 ${isMobile ? 'overflow-visible' : 'min-h-0 overflow-hidden'}`}>
            <div className={`bg-card border border-border rounded-2xl p-5 flex flex-col gap-5 ${isMobile ? '' : 'overflow-y-auto h-full max-h-full'}`}
              style={!isMobile ? { scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.15) transparent' } : undefined}
            >
              {/* Title */}
              <div>
                <h1 className="text-xl font-bold text-foreground">Pose Changer</h1>
                <p className="text-xs text-muted-foreground mt-1">Mude a pose da sua foto usando qualquer imagem como referência. A IA replica a posição do corpo mantendo seu rosto.</p>
              </div>

              {/* Person Image */}
              <PersonInputSwitch
                image={personImage}
                onImageChange={handlePersonImageChange}
                userId={user?.id}
                disabled={isProcessing}
              />

              {/* Reference Image */}
              <ReferenceImageCard
                image={referenceImage}
                onClearImage={handleClearReference}
                onOpenLibrary={() => setShowPhotoLibrary(true)}
                disabled={isProcessing}
              />

              {/* DESKTOP ONLY: Action Buttons */}
              {!isMobile && (
                <>
                  {/* Generate Button - DESKTOP */}
                  {!isProcessing && status !== 'completed' && (
                    <Button
                      className="w-full py-4 text-sm font-semibold bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white rounded-xl shadow-lg disabled:opacity-50"
                      disabled={!canProcess || isSubmitting}
                      onClick={handleProcess}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Iniciando...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Gerar Pose
                          <span className="ml-2 flex items-center gap-1 text-xs opacity-90">
                            <Coins className="w-3.5 h-3.5" />
                            {creditCost}
                          </span>
                        </>
                      )}
                    </Button>
                  )}

                  {/* Cancel button - DESKTOP */}
                  {status === 'waiting' && (
                    <Button
                      variant="outline"
                      className="w-full py-3 text-sm border-border text-muted-foreground hover:bg-accent rounded-xl"
                      onClick={handleCancelQueue}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Sair da Fila
                    </Button>
                  )}

                  {/* Completed Actions - DESKTOP */}
                  {status === 'completed' && outputImage && (
                    <div className="space-y-2">
                      <Button
                        className="w-full py-4 text-sm font-semibold bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-xl"
                        onClick={handleDownload}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Baixar HD
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full py-3 text-sm border-border text-muted-foreground hover:bg-accent rounded-xl"
                        onClick={handleReset}
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Nova Pose
                      </Button>
                    </div>
                  )}

                  {/* Error State - DESKTOP */}
                  {status === 'error' && (
                    <div className="bg-red-950/30 border border-red-500/30 rounded-xl p-3">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-red-300">Erro no processamento</p>
                      </div>
                      <Button
                        variant="outline"
                        className="w-full mt-2 py-2 text-xs border-border text-muted-foreground hover:bg-accent rounded-lg"
                        onClick={handleReset}
                      >
                        <RotateCcw className="w-3.5 h-3.5 mr-1" />
                        Tentar Novamente
                      </Button>
                    </div>
                  )}
                </>
              )}

              {/* Debug Panel */}
              <JobDebugPanel
                jobId={jobId}
                tableName="pose_changer_jobs"
                currentStep={currentStep}
                failedAtStep={failedAtStep}
                errorMessage={debugErrorMessage}
                position={queuePosition}
                status={status}
              />
            </div>
          </div>

          {/* Right Side - Result Viewer */}
          <div className="lg:col-span-5 min-h-0 overflow-hidden">
            <div className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col min-h-[400px] h-full">
              {/* Warning Banner */}
              {isProcessing && (
                <div className="bg-amber-500/20 border-b border-amber-500/50 px-3 py-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                  <p className="text-xs text-amber-700 dark:text-amber-200">Não feche esta página durante o processamento</p>
                </div>
              )}

              {/* Content Area */}
              <div className="flex-1 flex items-center justify-center p-4 min-h-0">
                {outputImage ? (
                  <TransformWrapper
                    ref={transformRef}
                    key={outputImage}
                    initialScale={1}
                    minScale={0.5}
                    maxScale={4}
                    wheel={{ step: 0.4 }}
                    onTransformed={(_, state) => setZoomLevel(state.scale)}
                  >
                    {({ zoomIn, zoomOut }) => (
                      <div className="relative w-full h-full">
                        <div className="hidden sm:flex absolute top-4 left-1/2 -translate-x-1/2 z-30 items-center gap-1 bg-black/80 rounded-full px-2 py-1">
                          <button onClick={() => zoomOut(0.5)} className="p-1.5 hover:bg-white/20 rounded-full transition-colors">
                            <ZoomOut className="w-4 h-4 text-foreground" />
                          </button>
                          <span className="text-xs font-mono min-w-[3rem] text-center text-foreground">{Math.round(zoomLevel * 100)}%</span>
                          <button onClick={() => zoomIn(0.5)} className="p-1.5 hover:bg-white/20 rounded-full transition-colors">
                            <ZoomIn className="w-4 h-4 text-foreground" />
                          </button>
                        </div>
                        <TransformComponent
                          wrapperStyle={{ width: '100%', height: '100%' }}
                          contentStyle={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <ResilientImage
                            src={outputImage}
                            originalSrc={thumbnailImage || undefined}
                            alt="Resultado"
                            className="w-full h-full object-contain"
                            maxRetries={4}
                            compressOnFailure={true}
                            locale="pt"
                            objectFit="contain"
                          />
                        </TransformComponent>
                      </div>
                    )}
                  </TransformWrapper>
                ) : isProcessing ? (
                  <div className="flex flex-col items-center justify-center gap-4">
                    <Loader2 className="w-12 h-12 text-muted-foreground animate-spin" />
                    <div className="text-center">
                      <p className="text-lg font-medium text-foreground">
                        {currentQueueMessage.emoji} {currentQueueMessage.text}
                      </p>
                      {status === 'waiting' && queuePosition > 0 && (
                        <p className="text-sm text-muted-foreground mt-1">Posição na fila: #{queuePosition}</p>
                      )}
                      {status === 'processing' && (
                        <p className="text-sm text-muted-foreground mt-1">{Math.round(progress)}% concluído</p>
                      )}
                    </div>
                    <div className="w-48 h-2 bg-accent rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                ) : status === 'error' ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-xl bg-red-500/10 border-2 border-dashed border-red-500/30 flex items-center justify-center">
                      <XCircle className="w-8 h-8 text-red-500/60" />
                    </div>
                    <p className="text-sm text-red-300">Erro no processamento</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4 text-center">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-400/20 border border-border/20 flex items-center justify-center">
                      <ImageIcon className="w-10 h-10 text-muted-foreground" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-foreground">Pose Changer</h2>
                      <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                        Envie as imagens e clique em "Gerar Pose"
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE FIXED BOTTOM BAR */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border safe-area-pb">
          <div className="px-4 py-3 space-y-2.5">
            {/* Idle state */}
            {!isProcessing && status !== 'completed' && status !== 'error' && (
              <Button
                className="w-full py-4 text-sm font-semibold bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white rounded-xl shadow-lg disabled:opacity-50"
                disabled={!canProcess || isSubmitting}
                onClick={handleProcess}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Iniciando...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Gerar Pose
                    <span className="ml-2 flex items-center gap-1 text-xs opacity-90">
                      <Coins className="w-3.5 h-3.5" />
                      {creditCost}
                    </span>
                  </>
                )}
              </Button>
            )}

            {/* Processing state */}
            {isProcessing && (
              <div className="flex gap-2">
                <div className="flex-1 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-muted-foreground animate-spin flex-shrink-0" />
                  <p className="text-xs text-foreground truncate">
                    {status === 'waiting' ? `Fila #${queuePosition}` : `${Math.round(progress)}%`}
                  </p>
                </div>
                {status === 'waiting' && (
                  <Button
                    variant="outline"
                    className="py-3 px-4 text-xs border-border text-muted-foreground hover:bg-accent rounded-lg flex-shrink-0"
                    onClick={handleCancelQueue}
                  >
                    Sair
                  </Button>
                )}
              </div>
            )}

            {/* Completed state */}
            {status === 'completed' && outputImage && (
              <div className="flex gap-2">
                <Button
                  className="flex-1 py-4 text-sm font-semibold bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-xl"
                  onClick={handleDownload}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Baixar HD
                </Button>
                <Button
                  variant="outline"
                  className="py-4 px-4 text-sm border-border text-muted-foreground hover:bg-accent rounded-xl"
                  onClick={handleReset}
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </div>
            )}

            {/* Error state */}
            {status === 'error' && (
              <div className="flex gap-2 items-center">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-red-300 truncate">Erro no processamento</p>
                </div>
                <Button
                  variant="outline"
                  className="py-3 px-4 text-xs border-border text-muted-foreground hover:bg-accent rounded-lg flex-shrink-0"
                  onClick={handleReset}
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1" />
                  Tentar
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Photo Library Modal (unified) */}
      <PhotoLibraryModal
        isOpen={showPhotoLibrary}
        onClose={() => setShowPhotoLibrary(false)}
        onSelectPhoto={handleSelectFromLibrary}
        onSelectPhotoWithMeta={handleSelectFromLibraryWithMeta}
        onUploadPhoto={handleUploadFromModal}
        
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
      <NotificationPromptToast toolName="pose" />
    </AppLayout>
  );
};

export default PoseChangerTool;