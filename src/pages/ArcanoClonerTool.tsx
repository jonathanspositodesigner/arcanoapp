import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ResilientImage } from '@/components/upscaler/ResilientImage';
import { useLocation } from 'react-router-dom';
import { Sparkles, Download, RotateCcw, Loader2, ZoomIn, ZoomOut, ImageIcon, XCircle, AlertTriangle, Coins, RefreshCw, Wand2, Settings, ChevronDown, ChevronUp } from 'lucide-react';
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
import AspectRatioSelector, { AspectRatio } from '@/components/arcano-cloner/AspectRatioSelector';
import CreativitySlider from '@/components/arcano-cloner/CreativitySlider';
import CustomPromptToggle from '@/components/arcano-cloner/CustomPromptToggle';
import NoCreditsModal from '@/components/upscaler/NoCreditsModal';
import ActiveJobBlockModal from '@/components/ai-tools/ActiveJobBlockModal';
import { JobDebugPanel, DownloadProgressOverlay, NotificationPromptToast } from '@/components/ai-tools';
import { optimizeForAI } from '@/hooks/useImageOptimizer';
import { cancelJob as centralCancelJob, checkActiveJob, createJob } from '@/ai/JobManager';
import { useResilientDownload } from '@/hooks/useResilientDownload';
import { useJobStatusSync } from '@/hooks/useJobStatusSync';
import { useNotificationTokenRecovery } from '@/hooks/useNotificationTokenRecovery';
import { useJobPendingWatchdog } from '@/hooks/useJobPendingWatchdog';
import { getAIErrorMessage } from '@/utils/errorMessages';
import { useAIToolSettings } from '@/hooks/useAIToolSettings';
import LandingTrialExpiredModal from '@/components/arcano-cloner/LandingTrialExpiredModal';
import RefinePanel from '@/components/arcano-cloner/RefinePanel';
import RefinementTimeline, { type RefinementVersion } from '@/components/arcano-cloner/RefinementTimeline';

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
  const { user, isPremium } = usePremiumStatus();
  const { balance: credits, isLoading: creditsLoading, refetch: refetchCredits, checkBalance } = useCredits();
  const { getCreditCost } = useAIToolSettings();
  const creditCost = getCreditCost('Arcano Cloner', 100);
  const isMobile = useIsMobile();
  const [showMobileConfig, setShowMobileConfig] = useState(false);
  
  // Contexto global de jobs
  const { registerJob, updateJobStatus, clearJob: clearGlobalJob, playNotificationSound } = useAIJob();

  // Image states
  const [userImage, setUserImage] = useState<string | null>(null);
  const [userFile, setUserFile] = useState<File | null>(null);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [referencePromptId, setReferencePromptId] = useState<string | null>(null);
  const [outputImage, setOutputImage] = useState<string | null>(null);

  // Aspect ratio state
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('3:4');

  // Creativity & custom prompt states
  const [creativity, setCreativity] = useState(20);
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
  
  const [activeStatus, setActiveStatus] = useState<string | undefined>();

  // Refine states
  const [refineMode, setRefineMode] = useState(false);
  const [refinePrompt, setRefinePrompt] = useState('');
  const [refineReferenceFile, setRefineReferenceFile] = useState<File | null>(null);
  const [refineReferencePreview, setRefineReferencePreview] = useState<string | null>(null);
  const [isRefining, setIsRefining] = useState(false);
  const [refinementHistory, setRefinementHistory] = useState<RefinementVersion[]>([]);
  const [selectedHistoryIndex, setSelectedHistoryIndex] = useState(0);
  const [refineJobId, setRefineJobId] = useState<string | null>(null);

  // Refs for refine callback (avoid stale closures)
  const outputImageRef = useRef<string | null>(null);
  const refinementHistoryRef = useRef<RefinementVersion[]>([]);
  outputImageRef.current = outputImage;
  refinementHistoryRef.current = refinementHistory;

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
        // Prefer thumbnail_url (local Storage) over output_url (external CDN) for preview
        const previewUrl = update.thumbnailUrl || update.outputUrl;
        setOutputImage(previewUrl);
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

  // Refine job sync (uses image_generator table)
  useJobStatusSync({
    jobId: refineJobId,
    toolType: 'image_generator',
    enabled: isRefining && !!refineJobId,
    onStatusChange: useCallback((update) => {
      console.log('[ArcanoCloner] Refine job status update:', update);
      if (update.status === 'completed' && update.outputUrl) {
        const newUrl = update.thumbnailUrl || update.outputUrl;
        const history = refinementHistoryRef.current;
        const newIndex = history.length === 0 ? 1 : history.length;
        const newVersion: RefinementVersion = { url: newUrl, label: `Refinamento ${newIndex}` };

        setRefinementHistory(prev => {
          const updated = prev.length === 0
            ? [{ url: outputImageRef.current!, label: 'Original' }, newVersion]
            : [...prev, newVersion];
          setSelectedHistoryIndex(updated.length - 1);
          return updated;
        });

        setOutputImage(newUrl);
        setRefineMode(false);
        setRefinePrompt('');
        setRefineReferenceFile(null);
        setRefineReferencePreview(null);
        setIsRefining(false);
        setRefineJobId(null);
        endSubmit();
        playNotificationSound();
        refetchCredits();
        toast.success('Imagem refinada com sucesso!');
      } else if (update.status === 'failed' || update.status === 'cancelled') {
        setIsRefining(false);
        setRefineJobId(null);
        endSubmit();
        refetchCredits();
        const friendlyError = getAIErrorMessage(update.errorMessage);
        toast.error(friendlyError.message);
      }
    }, [endSubmit, playNotificationSound, refetchCredits]),
    onGlobalStatusChange: updateJobStatus,
  });

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
    enabled: !!jobId && status !== 'idle' && status !== 'completed',
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

  // Handle reference from library (with meta for partner earnings)
  const handleSelectFromLibrary = (imageUrl: string, meta?: { promptId: string; promptType: 'admin' | 'partner' } | null) => {
    handleReferenceImageChange(imageUrl);
    setReferencePromptId(meta?.promptType === 'partner' ? meta.promptId : null);
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
    setReferencePromptId(null);
  };

  // Compress image before upload
  const compressImage = async (file: File): Promise<Blob> => {
    const result = await optimizeForAI(file);
    return result.file;
  };

  // Upload image to Supabase storage
  const uploadToStorage = async (file: File | Blob, prefix: string, verifiedUserId: string): Promise<string> => {
    const timestamp = Date.now();
    const fileName = `${prefix}-${timestamp}.jpg`;
    const filePath = `arcano-cloner/${verifiedUserId}/${fileName}`;

    const { data, error } = await supabase.storage
      .from('artes-cloudinary')
      .upload(filePath, file, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (error) {
      // If RLS/auth error, try refreshing session once
      if (error.message?.includes('row-level security') || error.message?.includes('security policy') || (error as any).statusCode === 403) {
        console.warn('[ArcanoCloner] RLS error on upload, attempting session refresh...');
        const { error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) throw new Error('Sessão expirada. Faça login novamente.');
        
        // Retry upload once
        const { error: retryError } = await supabase.storage
          .from('artes-cloudinary')
          .upload(filePath, file, { contentType: 'image/jpeg', upsert: true });
        if (retryError) throw retryError;
      } else {
        throw error;
      }
    }

    const { data: urlData } = supabase.storage
      .from('artes-cloudinary')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  };

  const handleProcess = async () => {
    if (!startSubmit()) {
      console.log('[ArcanoCloner] Already submitting, ignoring duplicate click');
      return;
    }

    let localJobId: string | null = null;

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
      setCurrentStep('validating_auth');
      const { data: authData, error: authError } = await supabase.auth.getUser();
      const verifiedUserId = authData?.user?.id;
      
      if (authError || !verifiedUserId) {
        console.error('[ArcanoCloner] Auth revalidation failed:', authError);
        toast.error('Sua sessão expirou. Faça login novamente.');
        endSubmit();
        setStatus('idle');
        return;
      }

      setProgress(10);
      setCurrentStep('compressing_user_image');
      const compressedUser = await compressImage(userFile);
      const userUrl = await uploadToStorage(compressedUser, 'user', verifiedUserId);

      setProgress(30);
      setCurrentStep('compressing_reference_image');
      let referenceUrl: string;
      if (referenceFile) {
        const compressedRef = await compressImage(referenceFile);
        referenceUrl = await uploadToStorage(compressedRef, 'reference', verifiedUserId);
      } else {
        referenceUrl = referenceImage;
      }

      setProgress(50);
      setCurrentStep('creating_job');

      const { jobId: newJobId, error: createError } = await createJob(
        'arcano_cloner',
        verifiedUserId,
        sessionIdRef.current,
        {
          status: 'pending',
          creativity,
          custom_prompt: customPromptEnabled ? customPrompt : '',
          aspect_ratio: aspectRatio,
          user_image_url: userUrl,
          reference_image_url: referenceUrl,
          reference_prompt_id: referencePromptId,
        }
      );

      if (createError || !newJobId) {
        if (createError?.includes('ux_arcano_cloner_one_active_job_per_user')) {
          setActiveToolName('Arcano Cloner');
          setActiveStatus('pending');
          setShowActiveJobModal(true);
          setStatus('idle');
          endSubmit();
          return;
        }
        throw new Error(createError || 'Falha ao criar job do Arcano Cloner');
      }

      localJobId = newJobId;
      setJobId(newJobId);
      registerJob(newJobId, 'Arcano Cloner', 'pending');

      setProgress(60);
      setCurrentStep('starting_processing');
      setStatus('processing');

      // Single invoke (no retry loop) - backend has idempotent charging via consume_credits_for_job
      const { data: runResult, error: runError } = await supabase.functions.invoke('runninghub-arcano-cloner/run', {
        body: {
          jobId: newJobId,
          userImageUrl: userUrl,
          referenceImageUrl: referenceUrl,
          aspectRatio: aspectRatio,
          userId: verifiedUserId,
          creditCost: creditCost,
          creativity: creativity,
          customPrompt: customPromptEnabled ? customPrompt : '',
        },
      });

      if (runError && !runResult) {
        console.error('[ArcanoCloner] Edge function error:', runError);
        throw new Error(runError.message || 'Erro ao iniciar processamento');
      }

      if (runResult?.code === 'INSUFFICIENT_CREDITS') {
        setStatus('idle');
        setNoCreditsReason('insufficient');
        setShowNoCreditsModal(true);
        endSubmit();
        return;
      }

      if (runResult?.code === 'RATE_LIMIT_EXCEEDED') {
        toast.error('Muitas requisições. Aguarde 1 minuto.');
        setStatus('error');
        endSubmit();
        return;
      }

       if (runResult?.code === 'DUPLICATE_ACTIVE_JOB') {
        setStatus('idle');
        setActiveToolName('Arcano Cloner');
        setActiveJobId(runResult.activeJobId);
        setActiveStatus(runResult.activeStatus);
        setShowActiveJobModal(true);
        endSubmit();
        return;
      }

      if (runResult?.error && !runResult?.success && !runResult?.queued) {
        throw new Error(runResult.error);
      }

      if (runResult?.queued) {
        setStatus('waiting');
        setQueuePosition(runResult.position || 1);
        toast.info(`Você está na fila (posição ${runResult.position})`);
      } else {
        setStatus('processing');
        setProgress(70);
      }
    } catch (error: any) {
      console.error('[ArcanoCloner] Process error:', error);
      if (localJobId) {
        const { markJobAsFailedInDb } = await import('@/utils/markJobAsFailedInDb');
        await markJobAsFailedInDb(localJobId, 'arcano_cloner', error.message || 'Erro desconhecido');
      }
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
    setRefineMode(false);
    setRefinePrompt('');
    setRefineReferenceFile(null);
    setRefineReferencePreview(null);
    setIsRefining(false);
    setRefinementHistory([]);
    setRefinementHistory([]);
    setSelectedHistoryIndex(0);
    setRefineJobId(null);
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
    setRefineMode(false);
    setRefinePrompt('');
    setRefineReferenceFile(null);
    setRefineReferencePreview(null);
    setIsRefining(false);
    setRefinementHistory([]);
    setSelectedHistoryIndex(0);
    setRefineJobId(null);
  };

  // Handle refine submission (via RunningHub queue)
  const handleRefine = async () => {
    if (!startSubmit()) return;
    
    if (!outputImage || !refinePrompt.trim() || !user?.id) {
      endSubmit();
      return;
    }

    const REFINE_COST = 100;

    // Check active job
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
    if (freshCredits < REFINE_COST) {
      setNoCreditsReason('insufficient');
      setShowNoCreditsModal(true);
      endSubmit();
      return;
    }

    setIsRefining(true);

    let localRefineJobId: string | null = null;

    try {
      // Build reference URLs — outputImage is already a storage URL
      const referenceImageUrls: string[] = [outputImage];

      // Upload extra reference if provided
      if (refineReferenceFile) {
        const compressed = await compressImage(refineReferenceFile);
        const extraUrl = await uploadToStorage(compressed, 'refine-ref', user.id);
        referenceImageUrls.push(extraUrl);
      }

      // If first refinement, seed history with original
      if (refinementHistory.length === 0) {
        setRefinementHistory([{ url: outputImage, label: 'Original' }]);
      }

      // Create job in image_generator_jobs
      const { data: job, error: jobError } = await supabase
        .from('image_generator_jobs')
        .insert({
          session_id: sessionIdRef.current,
          user_id: user.id,
          status: 'pending',
          prompt: refinePrompt.trim(),
          aspect_ratio: aspectRatio,
          model: 'refine',
        } as any)
        .select('id')
        .single();

      if (jobError || !job) throw new Error(jobError?.message || 'Erro ao criar job de refinamento');

      localRefineJobId = job.id;
      setRefineJobId(job.id);
      registerJob(job.id, 'Gerar Imagem', 'pending');

      // Start via edge function
      const { data: runResult, error: runError } = await supabase.functions.invoke('runninghub-image-generator/run', {
        body: {
          jobId: job.id,
          referenceImageUrls,
          aspectRatio,
          creditCost: REFINE_COST,
          prompt: refinePrompt.trim(),
          source: 'arcano_cloner_refine',
        },
      });

      if (runError) throw new Error(runError.message || 'Erro ao iniciar refinamento');

      if (runResult?.code === 'INSUFFICIENT_CREDITS') {
        setNoCreditsReason('insufficient');
        setShowNoCreditsModal(true);
        setIsRefining(false);
        setRefineJobId(null);
        endSubmit();
        return;
      }

      if (runResult?.error && !runResult?.success && !runResult?.queued) {
        throw new Error(runResult.error);
      }

      // Now wait for useJobStatusSync to deliver the result via Realtime

    } catch (err: any) {
      console.error('[ArcanoCloner] Refine error:', err);
      toast.error(err.message || 'Erro ao refinar imagem');
      // Mark job as failed in DB to prevent orphan pending jobs
      if (localRefineJobId) {
        const { markJobAsFailedInDb } = await import('@/utils/markJobAsFailedInDb');
        await markJobAsFailedInDb(localRefineJobId, 'image_generator', err.message || 'Refine invocation failed');
      }
      setIsRefining(false);
      setRefineJobId(null);
      endSubmit();
    }
  };

  // Handle selecting a version from the timeline
  const handleSelectVersion = (index: number) => {
    setSelectedHistoryIndex(index);
    if (refinementHistory[index]) {
      setOutputImage(refinementHistory[index].url);
    }
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
      <div className={`flex-1 max-w-7xl w-full mx-auto px-4 py-4 flex flex-col h-full ${isMobile ? 'overflow-y-auto pb-40' : 'overflow-hidden'}`}>
        <div className={`grid grid-cols-1 lg:grid-cols-7 gap-4 lg:gap-5 ${isMobile ? 'content-start' : 'flex-1 min-h-0'}`}>
          
          {/* Left Side - Controls Panel */}
          <div className={`lg:col-span-2 ${isMobile ? 'overflow-visible' : 'min-h-0 overflow-hidden'}`}>
            <div className={`bg-card border border-border rounded-2xl p-5 flex flex-col gap-5 ${isMobile ? '' : 'overflow-y-auto h-full max-h-full'}`}
              style={!isMobile ? { scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.15) transparent' } : undefined}
            >
              {/* Title */}
              <div>
                <h1 className="text-xl font-bold text-foreground">Arcano Cloner</h1>
                <p className="text-xs text-muted-foreground mt-1">Transforme sua foto usando qualquer imagem como referência. A IA clona o estilo, pose e cenário na sua pessoa.</p>
              </div>

              {/* Inputs: always visible on both mobile and desktop */}
              {refineMode ? (
                <RefinePanel
                  prompt={refinePrompt}
                  onPromptChange={setRefinePrompt}
                  referencePreview={refineReferencePreview}
                  onReferenceChange={(file, preview) => {
                    setRefineReferenceFile(file);
                    setRefineReferencePreview(preview);
                  }}
                  onSubmit={handleRefine}
                  onCancel={() => {
                    setRefineMode(false);
                    setRefinePrompt('');
                    setRefineReferenceFile(null);
                    setRefineReferencePreview(null);
                  }}
                  isRefining={isRefining}
                />
              ) : (
                <>
                  {/* User Image */}
                  <PersonInputSwitch
                    image={userImage}
                    onImageChange={handleUserImageChange}
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

                  {/* DESKTOP ONLY: Controls + Action Button */}
                  {!isMobile && (
                    <>
                      <AspectRatioSelector
                        value={aspectRatio}
                        onChange={setAspectRatio}
                        disabled={isProcessing}
                      />
                      <CreativitySlider
                        value={creativity}
                        onChange={setCreativity}
                        disabled={isProcessing}
                      />
                      <CustomPromptToggle
                        enabled={customPromptEnabled}
                        onEnabledChange={setCustomPromptEnabled}
                        prompt={customPrompt}
                        onPromptChange={setCustomPrompt}
                        disabled={isProcessing}
                      />

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
                              Gerar Imagem
                              <span className="ml-2 flex items-center gap-1 text-xs opacity-90">
                                <Coins className="w-3.5 h-3.5" />
                                {creditCost}
                              </span>
                            </>
                          )}
                        </Button>
                      )}

                      {/* Cancel button when in queue - DESKTOP */}
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

                      {/* Reconcile button - DESKTOP */}
                      {isProcessing && showReconcileButton && jobId && (
                        <Button
                          variant="outline"
                          className="w-full py-3 text-sm border-amber-500/30 text-amber-300 hover:bg-amber-500/10 rounded-xl"
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
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <RefreshCw className="w-4 h-4 mr-2" />
                          )}
                          Atualizar status
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
                            className="w-full py-3 text-sm font-semibold bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 rounded-xl"
                            onClick={() => setRefineMode(true)}
                            disabled={isRefining}
                          >
                            <Wand2 className="w-4 h-4 mr-2" />
                            Refinar
                          </Button>
                          <Button
                            variant="outline"
                            className="w-full py-3 text-sm border-border text-muted-foreground hover:bg-accent rounded-xl"
                            onClick={handleNewImage}
                          >
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Nova Imagem
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
                </>
              )}

              {/* Debug Panel */}
              <JobDebugPanel
                jobId={jobId}
                tableName="arcano_cloner_jobs"
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
                ) : isRefining ? (
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="relative">
                      <div className="w-14 h-14 rounded-full border-4 border-border border-t-slate-400 animate-spin" />
                      <Wand2 className="absolute inset-0 m-auto w-6 h-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-foreground font-medium">Refinando imagem...</p>
                  </div>
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
                      <h2 className="text-lg font-bold text-foreground">Arcano Cloner</h2>
                      <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                        Envie as imagens e clique em "Gerar Imagem"
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Refinement Timeline */}
              <RefinementTimeline
                versions={refinementHistory}
                selectedIndex={selectedHistoryIndex}
                onSelect={handleSelectVersion}
              />
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE FIXED BOTTOM BAR */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border safe-area-pb">
          
          {/* Expandable Configurações panel */}
          {showMobileConfig && !isProcessing && status !== 'completed' && status !== 'error' && !refineMode && (
            <div className="px-4 pt-3 pb-2 space-y-3 border-b border-border max-h-[50vh] overflow-y-auto">
              <AspectRatioSelector
                value={aspectRatio}
                onChange={setAspectRatio}
                disabled={isProcessing}
              />
              <CreativitySlider
                value={creativity}
                onChange={setCreativity}
                disabled={isProcessing}
              />
              <CustomPromptToggle
                enabled={customPromptEnabled}
                onEnabledChange={setCustomPromptEnabled}
                prompt={customPrompt}
                onPromptChange={setCustomPrompt}
                disabled={isProcessing}
              />
            </div>
          )}

          {/* Main bottom bar content */}
          <div className="px-4 py-3 space-y-2.5">
            {/* Idle state */}
            {!isProcessing && status !== 'completed' && status !== 'error' && !refineMode && (
              <>
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
                      Gerar Imagem
                      <span className="ml-2 flex items-center gap-1 text-xs opacity-90">
                        <Coins className="w-3.5 h-3.5" />
                        {creditCost}
                      </span>
                    </>
                  )}
                </Button>
                <button
                  onClick={() => setShowMobileConfig(!showMobileConfig)}
                  className="w-full flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Settings className="w-3.5 h-3.5" />
                  Configurações
                  {showMobileConfig ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                </button>
              </>
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
                  onClick={() => setRefineMode(true)}
                  disabled={isRefining}
                >
                  <Wand2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  className="py-4 px-4 text-sm border-border text-muted-foreground hover:bg-accent rounded-xl"
                  onClick={handleNewImage}
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

      {/* Photo Library Modal */}
      <PhotoLibraryModal
        isOpen={showPhotoLibrary}
        onClose={() => setShowPhotoLibrary(false)}
        onSelectPhoto={(url) => handleSelectFromLibrary(url)}
        onSelectPhotoWithMeta={(url, meta) => handleSelectFromLibrary(url, meta)}
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

      {/* Landing Trial Expired Modal */}
      <LandingTrialExpiredModal userId={user?.id} balance={credits} />
    </AppLayout>
  );
};

export default ArcanoClonerTool;