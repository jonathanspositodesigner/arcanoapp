import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Sparkles, Download, RotateCcw, Loader2, ZoomIn, ZoomOut, ImageIcon, XCircle, AlertTriangle, Coins, RefreshCw } from 'lucide-react';
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
import AppLayout from '@/components/layout/AppLayout';
import PersonInputSwitch from '@/components/ai-tools/PersonInputSwitch';
import ReferenceImageCard from '@/components/arcano-cloner/ReferenceImageCard';
import PhotoLibraryModal from '@/components/arcano-cloner/PhotoLibraryModal';
import AspectRatioSelector, { AspectRatio } from '@/components/arcano-cloner/AspectRatioSelector';
import CreativitySlider from '@/components/arcano-cloner/CreativitySlider';
import CustomPromptToggle from '@/components/arcano-cloner/CustomPromptToggle';
import NoCreditsModal from '@/components/upscaler/NoCreditsModal';
import ActiveJobBlockModal from '@/components/ai-tools/ActiveJobBlockModal';
import AIToolsAuthModal from '@/components/ai-tools/AIToolsAuthModal';
import { useAIToolsAuthModal } from '@/hooks/useAIToolsAuthModal';
import { JobDebugPanel, DownloadProgressOverlay, NotificationPromptToast } from '@/components/ai-tools';
import { optimizeForAI } from '@/hooks/useImageOptimizer';
import { cancelJob as centralCancelJob, checkActiveJob } from '@/ai/JobManager';
import { useResilientDownload } from '@/hooks/useResilientDownload';
import { useJobStatusSync } from '@/hooks/useJobStatusSync';
import { useNotificationTokenRecovery } from '@/hooks/useNotificationTokenRecovery';
import { useJobPendingWatchdog } from '@/hooks/useJobPendingWatchdog';
import { getAIErrorMessage } from '@/utils/errorMessages';
import { useAIToolSettings } from '@/hooks/useAIToolSettings';

type ProcessingStatus = 'idle' | 'uploading' | 'processing' | 'waiting' | 'completed' | 'error';

// Queue messages for better UX
const queueMessages = [
  { emoji: '🎨', text: 'Preparando sua transformação...' },
  { emoji: '✨', text: 'Clonando sua imagem...' },
  { emoji: '🚀', text: 'Quase lá, continue esperando!' },
  { emoji: '🌟', text: 'Processando seu clone perfeito...' },
];

const ArcanoClonerTool: React.FC = () => {
  const location = useLocation();
  const { goBack } = useSmartBackNavigation({ fallback: '/ferramentas-ia-aplicativo' });
  const { user } = usePremiumStatus();
  const { balance: credits, isLoading: creditsLoading, refetch: refetchCredits, checkBalance } = useUpscalerCredits(user?.id);
  const { getCreditCost } = useAIToolSettings();
  const creditCost = getCreditCost('Arcano Cloner', 80);
  
  // Contexto global de jobs
  const { registerJob, updateJobStatus, clearJob: clearGlobalJob, playNotificationSound } = useAIJob();

  // Image states
  const [userImage, setUserImage] = useState<string | null>(null);
  const [userFile, setUserFile] = useState<File | null>(null);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [outputImage, setOutputImage] = useState<string | null>(null);

  // Aspect ratio state
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');

  // Creativity & custom prompt states
  const [creativity, setCreativity] = useState(4);
  const [customPromptEnabled, setCustomPromptEnabled] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');

  // UI states
  const [showPhotoLibrary, setShowPhotoLibrary] = useState(false);
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Queue states
  const [jobId, setJobId] = useState<string | null>(null);
  const [queuePosition, setQueuePosition] = useState(0);
  const [queueMessageIndex, setQueueMessageIndex] = useState(0);

  // Debug state
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const [failedAtStep, setFailedAtStep] = useState<string | null>(null);
  const [debugErrorMessage, setDebugErrorMessage] = useState<string | null>(null);
  
  // Session management
  const sessionIdRef = useRef<string>('');
  
  // Button lock
  const { isSubmitting, startSubmit, endSubmit } = useProcessingButton();
  
  // Resilient download
  const { isDownloading, progress: downloadProgress, download, cancel: cancelDownload } = useResilientDownload();
  
  // Ref for zoom/pan control
  const transformRef = useRef<ReactZoomPanPinchRef>(null);

  // Reconcile state
  const [isReconciling, setIsReconciling] = useState(false);
  const [processingStartTime, setProcessingStartTime] = useState<number | null>(null);
  const [showReconcileButton, setShowReconcileButton] = useState(false);

  // Modals
  const [showNoCreditsModal, setShowNoCreditsModal] = useState(false);
  const [noCreditsReason, setNoCreditsReason] = useState<'not_logged' | 'insufficient'>('insufficient');
  const [showActiveJobModal, setShowActiveJobModal] = useState(false);
  const [activeToolName, setActiveToolName] = useState<string>('');
  const [activeJobId, setActiveJobId] = useState<string | undefined>();
  const { showAuthModal, setShowAuthModal, handleAuthSuccess: hookAuthSuccess } = useAIToolsAuthModal({ user, refetchCredits });
  const [activeStatus, setActiveStatus] = useState<string | undefined>();

  const canProcess = userImage && referenceImage && status === 'idle';
  const isProcessing = status === 'uploading' || status === 'processing' || status === 'waiting';

  // Initialize session ID
  useEffect(() => {
    sessionIdRef.current = crypto.randomUUID();
  }, []);

  // Pre-fill reference image from navigation state (e.g. from Biblioteca de Prompts)
  useEffect(() => {
    const refUrl = (location.state as any)?.referenceImageUrl;
    if (refUrl && !referenceImage) {
      handleReferenceImageChange(refUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  // Handle auth success from modal - claim free trial
  const handleAuthSuccess = hookAuthSuccess;

  // Cleanup queued jobs when user leaves
  useQueueSessionCleanup(sessionIdRef.current, status);

  // Triple sync: Realtime + Polling + Visibility recovery
  useJobStatusSync({
    jobId,
    toolType: 'arcano_cloner',
    enabled: status === 'processing' || status === 'waiting' || status === 'uploading',
    onStatusChange: useCallback((update) => {
      console.log('[ArcanoCloner] Job status update:', update);
      
      if (update.status === 'completed' && update.outputUrl) {
        setOutputImage(update.outputUrl);
        setStatus('completed');
        setProgress(100);
        endSubmit();
        playNotificationSound();
        refetchCredits();
        toast.success('Imagem gerada com sucesso!');
      } else if (update.status === 'failed' || update.status === 'cancelled') {
        setStatus('error');
        const friendlyError = getAIErrorMessage(update.errorMessage);
        setDebugErrorMessage(update.errorMessage);
        endSubmit();
        refetchCredits();
        toast.error(friendlyError.message);
      } else if (update.status === 'queued') {
        setStatus('waiting');
        setQueuePosition(update.position || 0);
      } else if (update.status === 'running' || update.status === 'starting') {
        setStatus('processing');
        setQueuePosition(0);
      }
    }, [endSubmit, playNotificationSound, refetchCredits]),
    onGlobalStatusChange: updateJobStatus,
  });

  // Notification token recovery (when user clicks push notification)
  useNotificationTokenRecovery({
    userId: user?.id,
    toolTable: 'arcano_cloner_jobs',
    onRecovery: useCallback((result) => {
      console.log('[ArcanoCloner] Recovered job from notification:', result);
      if (result.outputUrl) {
        setOutputImage(result.outputUrl);
        setStatus('completed');
        setProgress(100);
        toast.success('Resultado recuperado!');
      }
    }, []),
  });

  // Watchdog for orphan pending jobs (30s timeout)
  useJobPendingWatchdog({
    jobId,
    toolType: 'arcano_cloner',
    enabled: status !== 'idle' && status !== 'completed' && status !== 'error',
    onJobFailed: useCallback((errorMessage) => {
      console.warn('[ArcanoCloner] Job failed via watchdog:', errorMessage);
      setStatus('error');
      setDebugErrorMessage(errorMessage);
      endSubmit();
      toast.error(errorMessage);
    }, [endSubmit]),
  });

  // Register job in global context
  useEffect(() => {
    if (jobId) {
      registerJob(jobId, 'Arcano Cloner', 'pending');
    }
  }, [jobId, registerJob]);

  // Track processing start time & show reconcile button after 60s
  useEffect(() => {
    if (isProcessing && !processingStartTime) {
      setProcessingStartTime(Date.now());
      setShowReconcileButton(false);
    } else if (!isProcessing) {
      setProcessingStartTime(null);
      setShowReconcileButton(false);
    }
  }, [isProcessing, processingStartTime]);

  useEffect(() => {
    if (!isProcessing || !processingStartTime) return;
    const timer = setTimeout(() => setShowReconcileButton(true), 60000);
    return () => clearTimeout(timer);
  }, [isProcessing, processingStartTime]);

  // Rotate queue messages
  useEffect(() => {
    if (!isProcessing) return;
    
    const interval = setInterval(() => {
      setQueueMessageIndex(prev => (prev + 1) % queueMessages.length);
    }, 3000);
    
    return () => clearInterval(interval);
  }, [isProcessing]);

  // Progress simulation
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

  // Handle user image upload
  const handleUserImageChange = (dataUrl: string | null, file?: File) => {
    setUserImage(dataUrl);
    setUserFile(file || null);
  };

  // Handle reference image selection (from library URL or upload file)
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
        console.error('[ArcanoCloner] Error fetching reference image:', error);
      }
    } else {
      setReferenceFile(file || null);
    }
  };

  // Handle reference from library (just URL)
  const handleSelectFromLibrary = (imageUrl: string) => {
    handleReferenceImageChange(imageUrl);
  };

  // Handle upload from modal
  const handleUploadFromModal = (dataUrl: string, file: File) => {
    setReferenceImage(dataUrl);
    setReferenceFile(file);
  };

  // Clear reference image
  const handleClearReference = () => {
    setReferenceImage(null);
    setReferenceFile(null);
  };

  // Compress image before upload
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
    const filePath = `arcano-cloner/${user.id}/${fileName}`;

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
    // Instant lock to prevent duplicate clicks
    if (!startSubmit()) {
      console.log('[ArcanoCloner] Already submitting, ignoring duplicate click');
      return;
    }

    if (!userImage || !referenceImage || !userFile) {
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
    setDebugErrorMessage(null);
    setCurrentStep(null);
    setFailedAtStep(null);

    try {
      // Step 1: Compress and upload user image
      setProgress(10);
      setCurrentStep('compressing_user_image');
      console.log('[ArcanoCloner] Compressing user image...');
      const compressedUser = await compressImage(userFile);
      const userUrl = await uploadToStorage(compressedUser, 'user');
      console.log('[ArcanoCloner] User image uploaded:', userUrl);

      // Step 2: Compress and upload reference image
      setProgress(30);
      setCurrentStep('compressing_reference_image');
      let referenceUrl: string;
      
      if (referenceFile) {
        console.log('[ArcanoCloner] Compressing reference image...');
        const compressedRef = await compressImage(referenceFile);
        referenceUrl = await uploadToStorage(compressedRef, 'reference');
      } else {
        referenceUrl = referenceImage;
      }
      console.log('[ArcanoCloner] Reference image uploaded:', referenceUrl);

      // Step 3: Create job in database
      setProgress(50);
      setCurrentStep('creating_job');
      
      const { data: job, error: jobError } = await supabase
        .from('arcano_cloner_jobs')
        .insert({
          session_id: sessionIdRef.current,
          user_id: user.id,
          status: 'pending',
          user_image_url: userUrl,
          reference_image_url: referenceUrl,
          aspect_ratio: aspectRatio,
          creativity: creativity,
          custom_prompt: customPromptEnabled ? customPrompt : null,
        } as any)
        .select()
        .single();

      if (jobError || !job) {
        throw new Error(jobError?.message || 'Falha ao criar job');
      }

      setJobId(job.id);
      registerJob(job.id, 'Arcano Cloner', 'pending');
      console.log('[ArcanoCloner] Job created:', job.id);

      // Step 4: Call edge function to start processing
      setProgress(60);
      setCurrentStep('starting_processing');
      setStatus('processing');

      const { data: runResult, error: runError } = await supabase.functions.invoke(
        'runninghub-arcano-cloner/run',
        {
          body: {
            jobId: job.id,
            userImageUrl: userUrl,
            referenceImageUrl: referenceUrl,
            aspectRatio: aspectRatio,
            userId: user.id,
            creditCost: creditCost,
            creativity: creativity,
            customPrompt: customPromptEnabled ? customPrompt : '',
          },
        }
      );

      if (runError) {
        console.error('[ArcanoCloner] Edge function error:', runError);
        throw new Error(runError.message || 'Erro ao iniciar processamento');
      }

      console.log('[ArcanoCloner] Edge function response:', runResult);

      // Check for known error codes
      if (runResult.code === 'INSUFFICIENT_CREDITS') {
        setStatus('idle');
        setNoCreditsReason('insufficient');
        setShowNoCreditsModal(true);
        endSubmit();
        return;
      }

      if (runResult.code === 'RATE_LIMIT_EXCEEDED') {
        toast.error('Muitas requisições. Aguarde 1 minuto.');
        setStatus('error');
        endSubmit();
        return;
      }

      if (runResult.error && !runResult.success && !runResult.queued) {
        throw new Error(runResult.error);
      }

      // Check if queued
      if (runResult.queued) {
        setStatus('waiting');
        setQueuePosition(runResult.position || 1);
        toast.info(`Você está na fila (posição ${runResult.position})`);
      } else {
        setStatus('processing');
        setProgress(70);
      }

      // Now wait for Realtime updates via useJobStatusSync

    } catch (error: any) {
      console.error('[ArcanoCloner] Process error:', error);
      setStatus('error');
      setDebugErrorMessage(error.message || 'Erro ao processar imagem');
      toast.error(error.message || 'Erro ao processar imagem');
      endSubmit();
    }
  };

  const handleCancelQueue = async () => {
    if (!jobId) return;

    try {
      const result = await centralCancelJob('arcano_cloner', jobId);
      
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
      console.error('[ArcanoCloner] Cancel error:', error);
      toast.error('Erro ao cancelar processamento');
    }
  };

  const handleReset = () => {
    endSubmit();
    setUserImage(null);
    setUserFile(null);
    setReferenceImage(null);
    setReferenceFile(null);
    setOutputImage(null);
    setStatus('idle');
    setProgress(0);
    setZoomLevel(1);
    setJobId(null);
    setQueuePosition(0);
    setCurrentStep(null);
    setFailedAtStep(null);
    setDebugErrorMessage(null);
    setAspectRatio('1:1');
    clearGlobalJob();
  };

  const handleNewImage = () => {
    endSubmit();
    setOutputImage(null);
    setStatus('idle');
    setProgress(0);
    setZoomLevel(1);
    setJobId(null);
    setQueuePosition(0);
    setCurrentStep(null);
    setFailedAtStep(null);
    setDebugErrorMessage(null);
    clearGlobalJob();
  };

  // Download result
  const handleDownload = useCallback(async () => {
    if (!outputImage) return;
    
    await download({
      url: outputImage,
      filename: `arcano-cloner-${Date.now()}.png`,
      mediaType: 'image',
      timeout: 10000,
      onSuccess: () => toast.success('Download concluído!'),
      locale: 'pt'
    });
  }, [outputImage, download]);

  const currentQueueMessage = queueMessages[queueMessageIndex];

  return (
    <AppLayout fullScreen>
      <div className="h-full overflow-hidden bg-gradient-to-br from-[#0D0221] via-[#1A0A2E] to-[#16082A] flex flex-col">

      {/* Warning banner during processing */}
      {isProcessing && (
        <div className="bg-amber-500/20 border-b border-amber-500/30 px-4 py-2 flex items-center justify-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <span className="text-xs text-amber-200">
            Não feche esta página durante o processamento
          </span>
        </div>
      )}

      <div className="flex-1 max-w-7xl w-full mx-auto px-4 py-2 overflow-y-auto lg:overflow-hidden flex flex-col">
        {/* Tool intro - full width centered */}
        <div className="text-center py-3">
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Arcano Cloner</h1>
          <p className="text-sm text-purple-300 mt-1 max-w-lg mx-auto">Transforme sua foto usando qualquer imagem como referência. A IA clona o estilo, pose e cenário na sua pessoa.</p>
        </div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-7 gap-2 lg:gap-3 flex-1 lg:min-h-0">
          
          {/* Left Side - Inputs (2/7 on desktop) */}
          <div className="lg:col-span-2 flex flex-col gap-2 pb-2 lg:pb-0 lg:overflow-y-auto">

            {/* User Image - Character/Photo Switch */}
            <PersonInputSwitch
              image={userImage}
              onImageChange={handleUserImageChange}
              userId={user?.id}
              disabled={isProcessing}
            />

            {/* Reference Image - New Component */}
            <ReferenceImageCard
              image={referenceImage}
              onClearImage={handleClearReference}
              onOpenLibrary={() => setShowPhotoLibrary(true)}
              disabled={isProcessing}
            />

            {/* Aspect Ratio Selector */}
            <AspectRatioSelector
              value={aspectRatio}
              onChange={setAspectRatio}
              disabled={isProcessing}
            />

            {/* Creativity Slider */}
            <CreativitySlider
              value={creativity}
              onChange={setCreativity}
              disabled={isProcessing}
            />

            {/* Custom Prompt Toggle */}
            <CustomPromptToggle
              enabled={customPromptEnabled}
              onEnabledChange={setCustomPromptEnabled}
              prompt={customPrompt}
              onPromptChange={setCustomPrompt}
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
                  {Math.round(progress)}%
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  Gerar Imagem
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

            {/* Reconcile button - appears after 60s of processing */}
            {isProcessing && showReconcileButton && jobId && (
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs border-amber-500/30 text-amber-300 hover:bg-amber-500/10"
                disabled={isReconciling}
                onClick={async () => {
                  setIsReconciling(true);
                  try {
                    const { data, error } = await supabase.functions.invoke(
                      'runninghub-arcano-cloner/reconcile',
                      { body: { jobId } }
                    );
                    if (error) throw error;
                    if (data?.reconciled && data?.status === 'completed') {
                      toast.success('Status atualizado! Imagem pronta.');
                    } else if (data?.reconciled && data?.status === 'failed') {
                      toast.error('O processamento falhou na RunningHub.');
                    } else if (data?.alreadyFinalized) {
                      toast.info('Job já finalizado, aguarde a atualização.');
                    } else {
                      toast.info('Ainda processando. Tente novamente em alguns segundos.');
                    }
                  } catch (err) {
                    console.error('[ArcanoCloner] Reconcile error:', err);
                    toast.error('Erro ao atualizar status');
                  } finally {
                    setIsReconciling(false);
                  }
                }}
              >
                {isReconciling ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                )}
                Atualizar status
              </Button>
            )}

            {/* Debug Panel - commented until backend is ready */}
            {/* <JobDebugPanel
              jobId={jobId}
              tableName="arcano_cloner_jobs"
              currentStep={currentStep}
              failedAtStep={failedAtStep}
              errorMessage={debugErrorMessage}
              position={queuePosition}
              status={status}
            /> */}
          </div>

          {/* Right Side - Result Viewer (5/7 on desktop) */}
          <div className="lg:col-span-5 flex flex-col min-h-[280px] lg:min-h-0">
            <Card className="relative overflow-hidden bg-purple-900/20 border-purple-500/30 flex-1 flex flex-col min-h-[250px] lg:min-h-0">
              {/* Header */}
              <div className="px-3 py-2 border-b border-purple-500/20 flex items-center justify-between flex-shrink-0">
                <h3 className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-fuchsia-400" />
                  Resultado
                </h3>
                
                {outputImage && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-purple-300 hover:text-white hover:bg-purple-500/20"
                      onClick={() => transformRef.current?.zoomOut(0.5)}
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </Button>
                    <span className="text-[10px] text-purple-300 w-8 text-center">
                      {Math.round(zoomLevel * 100)}%
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-purple-300 hover:text-white hover:bg-purple-500/20"
                      onClick={() => transformRef.current?.zoomIn(0.5)}
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Result Area */}
              <div className="relative flex-1 min-h-0 flex items-center justify-center">
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
                    <TransformComponent
                      wrapperStyle={{
                        width: '100%',
                        height: '100%',
                      }}
                      contentStyle={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <img
                        src={outputImage}
                        alt="Resultado"
                        className="w-full h-full object-contain"
                        draggable={false}
                      />
                    </TransformComponent>
                  </TransformWrapper>
                ) : isProcessing ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                    <div className="relative">
                      <div className="w-14 h-14 rounded-full border-4 border-fuchsia-500/30 border-t-fuchsia-500 animate-spin" />
                      <Sparkles className="absolute inset-0 m-auto w-6 h-6 text-fuchsia-400" />
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
                    <div className="w-16 h-16 rounded-xl bg-fuchsia-500/10 border-2 border-dashed border-fuchsia-500/30 flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-fuchsia-500/40" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-purple-300">
                        O resultado aparecerá aqui
                      </p>
                      <p className="text-xs text-purple-400 mt-0.5">
                        Envie as imagens e clique em "Gerar Imagem"
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              {outputImage && status === 'completed' && (
                <div className="absolute bottom-3 left-3 right-3 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-8 text-xs bg-purple-600/80 border-purple-400/50 text-white hover:bg-purple-500/90"
                    onClick={handleNewImage}
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                    Nova
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

      {/* Photo Library Modal */}
      <PhotoLibraryModal
        isOpen={showPhotoLibrary}
        onClose={() => setShowPhotoLibrary(false)}
        onSelectPhoto={handleSelectFromLibrary}
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
      <NotificationPromptToast toolName="cloner" />

      {/* Free Trial Auth Modal */}
      <AIToolsAuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthSuccess={handleAuthSuccess}
      />
    </div>
    </AppLayout>
  );
};

export default ArcanoClonerTool;
