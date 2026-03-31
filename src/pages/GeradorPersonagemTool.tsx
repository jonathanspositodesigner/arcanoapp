import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, Download, RotateCcw, Loader2, ZoomIn, ZoomOut, ImageIcon, XCircle, AlertTriangle, Coins, RefreshCw, Save, ArrowRight, Wand2 } from 'lucide-react';
import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { useSmartBackNavigation } from '@/hooks/useSmartBackNavigation';
import { useNavigate } from 'react-router-dom';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { useCredits } from '@/contexts/CreditsContext';
import { useQueueSessionCleanup } from '@/hooks/useQueueSessionCleanup';
import { useProcessingButton } from '@/hooks/useProcessingButton';
import { useAIJob } from '@/contexts/AIJobContext';
import { supabase } from '@/integrations/supabase/client';
import AppLayout from '@/components/layout/AppLayout';
import AngleUploadCard from '@/components/character-generator/AngleUploadCard';
import AngleExamplesModal from '@/components/character-generator/AngleExamplesModal';
import SaveCharacterDialog from '@/components/character-generator/SaveCharacterDialog';
import SavedCharactersPanel from '@/components/character-generator/SavedCharactersPanel';
import RefineSelector from '@/components/character-generator/RefineSelector';
import RefinementCarousel, { type RefinementHistoryItem } from '@/components/character-generator/RefinementCarousel';
import NoCreditsModal from '@/components/upscaler/NoCreditsModal';
import ActiveJobBlockModal from '@/components/ai-tools/ActiveJobBlockModal';
import { DownloadProgressOverlay, NotificationPromptToast } from '@/components/ai-tools';
// optimizeForAI removed — images are already optimized in AngleUploadCard
import { cancelJob as centralCancelJob, checkActiveJob } from '@/ai/JobManager';
import { useResilientDownload } from '@/hooks/useResilientDownload';
import { useJobStatusSync } from '@/hooks/useJobStatusSync';
import { useNotificationTokenRecovery } from '@/hooks/useNotificationTokenRecovery';
import { useJobPendingWatchdog } from '@/hooks/useJobPendingWatchdog';
import { getAIErrorMessage } from '@/utils/errorMessages';
import { useAIToolSettings } from '@/hooks/useAIToolSettings';

type ProcessingStatus = 'idle' | 'uploading' | 'processing' | 'waiting' | 'completed' | 'error';

const queueMessages = [
  { emoji: '🎨', text: 'Criando seu avatar...' },
  { emoji: '✨', text: 'Analisando suas fotos...' },
  { emoji: '🚀', text: 'Quase lá, continue esperando!' },
  { emoji: '🌟', text: 'Gerando avatar único...' },
];

const GeradorPersonagemTool: React.FC = () => {
  const { goBack } = useSmartBackNavigation({ fallback: '/ferramentas-ia-aplicativo' });
  const navigate = useNavigate();
  const { user } = usePremiumStatus();
  const { balance: credits, isLoading: creditsLoading, refetch: refetchCredits, checkBalance } = useCredits();
  
  const { getCreditCost } = useAIToolSettings();
  const creditCost = getCreditCost('Gerador Avatar', 75);
  const refineCreditCost = getCreditCost('Refinar Avatar', 75);
  const { registerJob, updateJobStatus, clearJob: clearGlobalJob, playNotificationSound } = useAIJob();

  // 4 image states
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [semiProfileImage, setSemiProfileImage] = useState<string | null>(null);
  const [semiProfileFile, setSemiProfileFile] = useState<File | null>(null);
  const [lowAngleImage, setLowAngleImage] = useState<string | null>(null);
  const [lowAngleFile, setLowAngleFile] = useState<File | null>(null);

  // Storage URLs (saved after first upload for refine reuse)
  const [frontStorageUrl, setFrontStorageUrl] = useState<string | null>(null);
  const [profileStorageUrl, setProfileStorageUrl] = useState<string | null>(null);
  const [semiProfileStorageUrl, setSemiProfileStorageUrl] = useState<string | null>(null);
  const [lowAngleStorageUrl, setLowAngleStorageUrl] = useState<string | null>(null);

  const [outputImage, setOutputImage] = useState<string | null>(null);
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [jobId, setJobId] = useState<string | null>(null);
  const [queuePosition, setQueuePosition] = useState(0);
  const [queueMessageIndex, setQueueMessageIndex] = useState(0);
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const [debugErrorMessage, setDebugErrorMessage] = useState<string | null>(null);
  
  // Save character
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [savedRefreshTrigger, setSavedRefreshTrigger] = useState(0);
  const [showExamplesModal, setShowExamplesModal] = useState(false);

  // Refine
  const [showRefinePanel, setShowRefinePanel] = useState(false);
  const [isRefining, setIsRefining] = useState(false);

  // Refinement history
  const [refinementHistory, setRefinementHistory] = useState<RefinementHistoryItem[]>([]);
  const [selectedHistoryIndex, setSelectedHistoryIndex] = useState(0);
  const refinementCountRef = useRef(0);

  const sessionIdRef = useRef<string>('');
  const { isSubmitting, startSubmit, endSubmit } = useProcessingButton();
  const { isDownloading, progress: downloadProgress, download, cancel: cancelDownload } = useResilientDownload();
  const transformRef = useRef<ReactZoomPanPinchRef>(null);

  const [isReconciling, setIsReconciling] = useState(false);
  const [processingStartTime, setProcessingStartTime] = useState<number | null>(null);
  const [showReconcileButton, setShowReconcileButton] = useState(false);

  const [showNoCreditsModal, setShowNoCreditsModal] = useState(false);
  const [noCreditsReason, setNoCreditsReason] = useState<'not_logged' | 'insufficient'>('insufficient');
  const [showActiveJobModal, setShowActiveJobModal] = useState(false);
  const [activeToolName, setActiveToolName] = useState<string>('');
  const [activeJobId, setActiveJobId] = useState<string | undefined>();
  const [activeStatus, setActiveStatus] = useState<string | undefined>();

  const allImagesReady = frontImage && profileImage && semiProfileImage && lowAngleImage;
  const canProcess = allImagesReady && status === 'idle';
  const isProcessing = status === 'uploading' || status === 'processing' || status === 'waiting';

  useEffect(() => { sessionIdRef.current = crypto.randomUUID(); }, []);
  useQueueSessionCleanup(sessionIdRef.current, status);

  useJobStatusSync({
    jobId,
    toolType: 'character_generator',
    enabled: status === 'processing' || status === 'waiting' || status === 'uploading',
    onStatusChange: useCallback((update) => {
      if (update.status === 'completed' && update.outputUrl) {
        setOutputImage(update.outputUrl);
        setStatus('completed');
        setProgress(100);
        setShowRefinePanel(false);
        endSubmit();
        playNotificationSound();
        refetchCredits();

        // Add to refinement history
        if (isRefining) {
          refinementCountRef.current += 1;
          setRefinementHistory(prev => {
            const newHistory = [...prev, { url: update.outputUrl!, label: `Ref. #${refinementCountRef.current}`, timestamp: Date.now() }];
            setSelectedHistoryIndex(newHistory.length - 1);
            return newHistory;
          });
          setIsRefining(false);
          toast.success('Refinamento concluído!');
        } else {
          refinementCountRef.current = 0;
          const newHistory = [{ url: update.outputUrl!, label: 'Original', timestamp: Date.now() }];
          setRefinementHistory(newHistory);
          setSelectedHistoryIndex(0);
          setIsRefining(false);
          toast.success('Avatar gerado com sucesso!');
        }
      } else if (update.status === 'failed' || update.status === 'cancelled') {
        setStatus('error');
        const friendlyError = getAIErrorMessage(update.errorMessage);
        setDebugErrorMessage(update.errorMessage);
        setIsRefining(false);
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
    }, [endSubmit, playNotificationSound, refetchCredits, isRefining]),
    onGlobalStatusChange: updateJobStatus,
  });

  useNotificationTokenRecovery({
    userId: user?.id,
    toolTable: 'character_generator_jobs' as any,
    onRecovery: useCallback((result) => {
      if (result.outputUrl) {
        setOutputImage(result.outputUrl);
        setStatus('completed');
        setProgress(100);
        toast.success('Resultado recuperado!');
      }
    }, []),
  });

  useJobPendingWatchdog({
    jobId,
    toolType: 'character_generator',
    enabled: !!jobId && status !== 'idle' && status !== 'completed',
    onJobFailed: useCallback((errorMessage) => {
      setStatus('error');
      setDebugErrorMessage(errorMessage);
      setIsRefining(false);
      endSubmit();
      toast.error(errorMessage);
    }, [endSubmit]),
  });

  useEffect(() => { if (jobId) registerJob(jobId, 'Gerador Avatar', 'pending'); }, [jobId, registerJob]);

  useEffect(() => {
    if (isProcessing && !processingStartTime) { setProcessingStartTime(Date.now()); setShowReconcileButton(false); }
    else if (!isProcessing) { setProcessingStartTime(null); setShowReconcileButton(false); }
  }, [isProcessing, processingStartTime]);

  useEffect(() => {
    if (!isProcessing || !processingStartTime) return;
    const timer = setTimeout(() => setShowReconcileButton(true), 60000);
    return () => clearTimeout(timer);
  }, [isProcessing, processingStartTime]);

  useEffect(() => {
    if (!isProcessing) return;
    const interval = setInterval(() => setQueueMessageIndex(prev => (prev + 1) % queueMessages.length), 3000);
    return () => clearInterval(interval);
  }, [isProcessing]);

  useEffect(() => {
    if (status !== 'processing') return;
    const interval = setInterval(() => setProgress(prev => prev >= 95 ? prev : prev + Math.random() * 3), 1500);
    return () => clearInterval(interval);
  }, [status]);

  const isAuthOrRlsError = (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error ?? '');
    const normalizedMessage = message.toLowerCase();
    const statusCode = typeof error === 'object' && error !== null && 'statusCode' in error
      ? Number((error as { statusCode?: number }).statusCode)
      : undefined;

    return statusCode === 401 || statusCode === 403 ||
      normalizedMessage.includes('401') ||
      normalizedMessage.includes('403') ||
      normalizedMessage.includes('unauthorized') ||
      normalizedMessage.includes('security') ||
      normalizedMessage.includes('row-level security') ||
      normalizedMessage.includes('security policy') ||
      normalizedMessage.includes('permission denied');
  };

  const uploadToStorage = async (file: File | Blob, prefix: string, verifiedUserId: string, attempt = 1): Promise<string> => {
    const MAX_RETRIES = 3;
    const BACKOFF = [1000, 3000, 5000];

    const timestamp = Date.now();
    const fileName = `${prefix}-${timestamp}.jpg`;
    const filePath = `character-generator/${verifiedUserId}/${fileName}`;

    try {
      const { error } = await supabase.storage.from('artes-cloudinary').upload(filePath, file, { contentType: 'image/jpeg', upsert: true });
      if (error) {
        if (attempt === 1 && isAuthOrRlsError(error)) {
          console.warn(`[CharGen Upload] Auth/RLS error on attempt ${attempt}, refreshing session...`);
          await supabase.auth.refreshSession();

          const { error: retryError } = await supabase.storage
            .from('artes-cloudinary')
            .upload(filePath, file, { contentType: 'image/jpeg', upsert: true });

          if (retryError) {
            throw retryError;
          }
        } else {
          throw error;
        }
      }

      const { data: urlData } = supabase.storage.from('artes-cloudinary').getPublicUrl(filePath);
      return urlData.publicUrl;
    } catch (err: any) {
      if (attempt < MAX_RETRIES) {
        const delay = BACKOFF[attempt - 1] || 3000;
        console.warn(`[CharGen Upload] Retry ${attempt}/${MAX_RETRIES} for ${prefix} in ${delay}ms:`, err.message);
        await new Promise(r => setTimeout(r, delay));
        return uploadToStorage(file, prefix, verifiedUserId, attempt + 1);
      }
      throw new Error(`Upload falhou após ${MAX_RETRIES} tentativas (${prefix}): ${err.message}`);
    }
  };

  const handleProcess = async () => {
    if (!startSubmit()) return;

    if (!allImagesReady || !frontFile || !profileFile || !semiProfileFile || !lowAngleFile) {
      toast.error('Por favor, envie todas as 4 fotos');
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

    try {
      // Revalidate session before uploads
      setProgress(5);
      setCurrentStep('validating_session');
      let verifiedUserId = user.id;
      const { data: { user: freshUser }, error: sessionError } = await supabase.auth.getUser();

      if (sessionError || !freshUser) {
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        verifiedUserId = refreshData.session?.user?.id || '';
        if (refreshError || !verifiedUserId) throw new Error('Sessão expirada. Faça login novamente.');
      } else {
        verifiedUserId = freshUser.id;
      }

      // Images already optimized in AngleUploadCard — upload directly (no double optimization)
      setProgress(15);
      setCurrentStep('uploading_images');

      const [frontUrl, profileUrl, semiProfileUrl, lowAngleUrl] = await Promise.all([
        uploadToStorage(frontFile, 'front', verifiedUserId),
        uploadToStorage(profileFile, 'profile', verifiedUserId),
        uploadToStorage(semiProfileFile, 'semi-profile', verifiedUserId),
        uploadToStorage(lowAngleFile, 'low-angle', verifiedUserId),
      ]);

      // Save storage URLs for refine reuse
      setFrontStorageUrl(frontUrl);
      setProfileStorageUrl(profileUrl);
      setSemiProfileStorageUrl(semiProfileUrl);
      setLowAngleStorageUrl(lowAngleUrl);

      setProgress(45);
      setCurrentStep('creating_job');

      const { data: job, error: jobError } = await supabase
        .from('character_generator_jobs' as any)
        .insert({
          session_id: sessionIdRef.current,
          user_id: verifiedUserId,
          status: 'pending',
          front_image_url: frontUrl,
          profile_image_url: profileUrl,
          semi_profile_image_url: semiProfileUrl,
          low_angle_image_url: lowAngleUrl,
        })
        .select()
        .single();

      if (jobError || !job) throw new Error(jobError?.message || 'Falha ao criar job');

      const jobRecord = job as any;
      setJobId(jobRecord.id);
      registerJob(jobRecord.id, 'Gerador Avatar', 'pending');

      setProgress(55);
      setCurrentStep('starting_processing');
      setStatus('processing');

      const { data: runResult, error: runError } = await supabase.functions.invoke(
        'runninghub-character-generator/run',
        {
          body: {
            jobId: jobRecord.id,
            frontImageUrl: frontUrl,
            profileImageUrl: profileUrl,
            semiProfileImageUrl: semiProfileUrl,
            lowAngleImageUrl: lowAngleUrl,
            userId: verifiedUserId,
            creditCost: creditCost,
          },
        }
      );

      if (runError) throw new Error(runError.message || 'Erro ao iniciar processamento');

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

      if (runResult.error && !runResult.success && !runResult.queued) throw new Error(runResult.error);

      if (runResult.queued) {
        setStatus('waiting');
        setQueuePosition(runResult.position || 1);
        toast.info(`Você está na fila (posição ${runResult.position})`);
      } else {
        setStatus('processing');
        setProgress(65);
      }
    } catch (error: any) {
      if (jobId) {
        const { markJobAsFailedInDb } = await import('@/utils/markJobAsFailedInDb');
        await markJobAsFailedInDb(jobId, 'character_generator', error.message || 'Erro desconhecido');
      }
      setStatus('error');
      setDebugErrorMessage(error.message);
      toast.error(error.message || 'Erro ao processar');
      endSubmit();
    }
  };

  const handleRefine = async (selectedNumbers: string) => {
    if (!startSubmit()) return; // Synchronous guard against double-clicks
    
    if (!user?.id) {
      setNoCreditsReason('not_logged');
      setShowNoCreditsModal(true);
      endSubmit();
      return;
    }

    if (!latestResultImage || !frontStorageUrl || !profileStorageUrl || !semiProfileStorageUrl || !lowAngleStorageUrl) {
      toast.error('Dados insuficientes para refinar. Gere um avatar primeiro.');
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
    if (freshCredits < refineCreditCost) {
      setNoCreditsReason('insufficient');
      setShowNoCreditsModal(true);
      endSubmit();
      return;
    }

    setIsRefining(true);
    setShowRefinePanel(false);
    setStatus('uploading');
    setProgress(0);
    setDebugErrorMessage(null);

    try {
      setProgress(10);
      setCurrentStep('creating_refine_job');

      // Create new job for refinement
      const { data: job, error: jobError } = await supabase
        .from('character_generator_jobs' as any)
        .insert({
          session_id: sessionIdRef.current,
          user_id: user.id,
          status: 'pending',
          front_image_url: frontStorageUrl,
          profile_image_url: profileStorageUrl,
          semi_profile_image_url: semiProfileStorageUrl,
          low_angle_image_url: lowAngleStorageUrl,
        })
        .select()
        .single();

      if (jobError || !job) throw new Error(jobError?.message || 'Falha ao criar job de refinamento');

      const jobRecord = job as any;
      setJobId(jobRecord.id);
      registerJob(jobRecord.id, 'Gerador Avatar', 'pending');

      setProgress(30);
      setCurrentStep('starting_refine');
      setStatus('processing');

      const { data: runResult, error: runError } = await supabase.functions.invoke(
        'runninghub-character-generator/refine',
        {
          body: {
            jobId: jobRecord.id,
            frontImageUrl: frontStorageUrl,
            profileImageUrl: profileStorageUrl,
            semiProfileImageUrl: semiProfileStorageUrl,
            lowAngleImageUrl: lowAngleStorageUrl,
            resultImageUrl: latestResultImage,
            selectedNumbers,
            userId: user.id,
            creditCost: refineCreditCost,
          },
        }
      );

      if (runError) throw new Error(runError.message || 'Erro ao iniciar refinamento');

      if (runResult.code === 'INSUFFICIENT_CREDITS') {
        setStatus('idle');
        setIsRefining(false);
        setNoCreditsReason('insufficient');
        setShowNoCreditsModal(true);
        endSubmit();
        return;
      }

      if (runResult.code === 'RATE_LIMIT_EXCEEDED') {
        toast.error('Muitas requisições. Aguarde 1 minuto.');
        setStatus('error');
        setIsRefining(false);
        endSubmit();
        return;
      }

      if (runResult.error && !runResult.success && !runResult.queued) throw new Error(runResult.error);

      if (runResult.queued) {
        setStatus('waiting');
        setQueuePosition(runResult.position || 1);
        toast.info(`Você está na fila (posição ${runResult.position})`);
      } else {
        setStatus('processing');
        setProgress(50);
      }
    } catch (error: any) {
      if (jobId) {
        const { markJobAsFailedInDb } = await import('@/utils/markJobAsFailedInDb');
        await markJobAsFailedInDb(jobId, 'character_generator', error.message || 'Erro desconhecido');
      }
      setStatus('error');
      setIsRefining(false);
      setDebugErrorMessage(error.message);
      toast.error(error.message || 'Erro ao refinar');
      endSubmit();
    }
  };

  const handleCancelQueue = async () => {
    if (!jobId) return;
    try {
      const result = await centralCancelJob('character_generator', jobId);
      if (result.success) {
        setStatus('idle');
        setJobId(null);
        setQueuePosition(0);
        setIsRefining(false);
        endSubmit();
        if (result.refundedAmount > 0) toast.success(`Cancelado! ${result.refundedAmount} créditos devolvidos.`);
        else toast.info('Processamento cancelado');
        refetchCredits();
      } else {
        toast.error(result.errorMessage || 'Erro ao cancelar');
      }
    } catch (error) {
      toast.error('Erro ao cancelar processamento');
    }
  };

  const handleReset = () => {
    endSubmit();
    setOutputImage(null);
    setStatus('idle');
    setProgress(0);
    setZoomLevel(1);
    setJobId(null);
    setQueuePosition(0);
    setCurrentStep(null);
    setDebugErrorMessage(null);
    setShowRefinePanel(false);
    setIsRefining(false);
    setRefinementHistory([]);
    setSelectedHistoryIndex(0);
    refinementCountRef.current = 0;
    clearGlobalJob();
  };

  // The currently viewed image (from history or outputImage)
  const viewedImage = refinementHistory.length > 0
    ? refinementHistory[selectedHistoryIndex]?.url || outputImage
    : outputImage;

  // For refining, always use the latest result
  const latestResultImage = refinementHistory.length > 0
    ? refinementHistory[refinementHistory.length - 1].url
    : outputImage;

  const handleDownload = useCallback(async () => {
    const imgToDownload = viewedImage;
    if (!imgToDownload) return;
    await download({
      url: imgToDownload,
      filename: `avatar-${Date.now()}.png`,
      mediaType: 'image',
      timeout: 10000,
      onSuccess: () => toast.success('Download concluído!'),
      locale: 'pt'
    });
  }, [viewedImage, download]);

  const currentQueueMessage = queueMessages[queueMessageIndex];

  const handleImageChange = (setter: React.Dispatch<React.SetStateAction<string | null>>, fileSetter: React.Dispatch<React.SetStateAction<File | null>>) => {
    return (dataUrl: string | null, file?: File) => {
      setter(dataUrl);
      fileSetter(file || null);
    };
  };

  return (
    <AppLayout fullScreen>
      <div className="h-full lg:overflow-hidden overflow-y-auto bg-gradient-to-br from-[#0D0221] via-[#1A0A2E] to-[#16082A] flex flex-col">

      {isProcessing && (
        <div className="bg-amber-500/20 border-b border-amber-500/30 px-4 py-2 flex items-center justify-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <span className="text-xs text-amber-200">Não feche esta página durante o processamento</span>
        </div>
      )}

      <div className="flex-1 max-w-7xl w-full mx-auto px-4 py-2 overflow-y-auto lg:overflow-hidden flex flex-col">
        {/* Tool intro - full width centered */}
        <div className="text-center py-3">
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Gerador de Avatar</h1>
          <p className="text-sm text-purple-300 mt-1 max-w-lg mx-auto">Crie avatares de alta fidelidade a partir das suas fotos. Envie 4 ângulos diferentes e a IA gera seu personagem.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-7 gap-2 lg:gap-3 flex-1 lg:min-h-0">
          
          {/* Left Side - Inputs */}
          <div className="lg:col-span-2 flex flex-col gap-2 pb-2 lg:pb-0 lg:overflow-y-auto">
            {/* Instructions */}
            <div className="bg-purple-900/30 border border-purple-500/20 rounded-lg p-3 mb-1">
              <p className="text-xs text-purple-100 font-medium mb-0.5">📸 Envie 4 fotos do mesmo rosto</p>
              <p className="text-[10px] text-purple-300/80 leading-relaxed">Para gerar um avatar com alta fidelidade.</p>
            </div>
            <button
              type="button"
              className="text-[10px] text-fuchsia-400 hover:text-fuchsia-300 underline font-medium mb-1 self-start"
              onClick={() => setShowExamplesModal(true)}
            >
              Ver exemplo de fotos →
            </button>

            {/* 4 Upload Cards in 2x2 grid */}
            <div className="grid grid-cols-2 gap-2">
              <AngleUploadCard label="De Frente" angleType="front" image={frontImage} onImageChange={handleImageChange(setFrontImage, setFrontFile)} disabled={isProcessing} />
              <AngleUploadCard label="Perfil" angleType="profile" image={profileImage} onImageChange={handleImageChange(setProfileImage, setProfileFile)} disabled={isProcessing} />
              <AngleUploadCard label="Semi Perfil" angleType="semi_profile" image={semiProfileImage} onImageChange={handleImageChange(setSemiProfileImage, setSemiProfileFile)} disabled={isProcessing} />
              <AngleUploadCard label="Debaixo p/ Cima" angleType="low_angle" image={lowAngleImage} onImageChange={handleImageChange(setLowAngleImage, setLowAngleFile)} disabled={isProcessing} />
            </div>

            {/* Action Button */}
            <Button
              size="sm"
              className="w-full bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-medium py-2 text-xs disabled:opacity-50"
              disabled={!canProcess || isProcessing || isSubmitting}
              onClick={handleProcess}
            >
              {isSubmitting ? (
                <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Iniciando...</>
              ) : status === 'uploading' ? (
                <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Enviando...</>
              ) : status === 'waiting' ? (
                <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Fila #{queuePosition}</>
              ) : status === 'processing' ? (
                <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />{Math.round(progress)}%</>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  Gerar Avatar
                  <span className="ml-2 flex items-center gap-1 text-xs opacity-90">
                    <Coins className="w-3.5 h-3.5" />{creditCost}
                  </span>
                </>
              )}
            </Button>

            {status === 'waiting' && (
              <Button variant="outline" size="sm" className="w-full text-xs border-red-500/30 text-red-300 hover:bg-red-500/10" onClick={handleCancelQueue}>
                <XCircle className="w-3.5 h-3.5 mr-1.5" />Sair da Fila
              </Button>
            )}

            {isProcessing && showReconcileButton && jobId && (
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs border-amber-500/30 text-amber-300 hover:bg-amber-500/10"
                disabled={isReconciling}
                onClick={async () => {
                  setIsReconciling(true);
                  try {
                    const { data, error } = await supabase.functions.invoke('runninghub-character-generator/reconcile', { body: { jobId } });
                    if (error) throw error;
                    if (data?.reconciled && data?.status === 'completed') toast.success('Status atualizado! Avatar pronto.');
                    else if (data?.reconciled && data?.status === 'failed') toast.error('O processamento falhou.');
                    else if (data?.alreadyFinalized) toast.info('Job já finalizado, aguarde a atualização.');
                    else toast.info('Ainda processando. Tente novamente em alguns segundos.');
                  } catch (err) {
                    toast.error('Erro ao atualizar status');
                  } finally {
                    setIsReconciling(false);
                  }
                }}
              >
                {isReconciling ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1.5" />}
                Atualizar status
              </Button>
            )}

            {/* Refine Panel */}
            {showRefinePanel && status === 'completed' && (
              <RefineSelector
                onSubmit={handleRefine}
                onCancel={() => setShowRefinePanel(false)}
                creditCost={refineCreditCost}
                isProcessing={isRefining}
                disabled={isProcessing}
              />
            )}

            {/* Saved Characters Panel */}
            <SavedCharactersPanel userId={user?.id} refreshTrigger={savedRefreshTrigger} />

            {/* Arcano Cloner Shortcut */}
            <button
              type="button"
              onClick={() => navigate('/arcano-cloner-tool')}
              className="w-full flex items-center justify-between gap-2 bg-gradient-to-r from-fuchsia-600/20 to-purple-600/20 border border-fuchsia-500/30 rounded-lg p-3 hover:from-fuchsia-600/30 hover:to-purple-600/30 transition-all group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Sparkles className="w-4 h-4 text-fuchsia-400 flex-shrink-0" />
                <div className="text-left min-w-0">
                  <p className="text-xs font-semibold text-white">Arcano Cloner</p>
                  <p className="text-[10px] text-purple-300/80 leading-tight">Use seu avatar para gerar imagens</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-fuchsia-400 flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          {/* Right Side - Result Viewer */}
          <div className="lg:col-span-5 flex flex-col min-h-[280px] lg:min-h-0">
            <Card className="relative overflow-hidden bg-purple-900/20 border-purple-500/30 flex-1 flex flex-col min-h-[250px] lg:min-h-0">
              <div className="px-3 py-2 border-b border-purple-500/20 flex items-center justify-between flex-shrink-0">
                <h3 className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-fuchsia-400" />Resultado
                </h3>
                {viewedImage && (
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-purple-300 hover:text-white hover:bg-purple-500/20" onClick={() => transformRef.current?.zoomOut(0.5)}>
                      <ZoomOut className="w-3.5 h-3.5" />
                    </Button>
                    <span className="text-[10px] text-purple-300 w-8 text-center">{Math.round(zoomLevel * 100)}%</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-purple-300 hover:text-white hover:bg-purple-500/20" onClick={() => transformRef.current?.zoomIn(0.5)}>
                      <ZoomIn className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="relative flex-1 min-h-0 flex items-center justify-center">
                {viewedImage ? (
                  <TransformWrapper ref={transformRef} key={viewedImage} initialScale={1} minScale={0.5} maxScale={4} wheel={{ step: 0.4 }} onTransformed={(_, state) => setZoomLevel(state.scale)}>
                    <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }} contentStyle={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img src={viewedImage} alt="Resultado" className="w-full h-full object-contain" draggable={false} />
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
                      {status === 'waiting' && queuePosition > 0 && <p className="text-xs text-purple-300 mt-1">Posição na fila: #{queuePosition}</p>}
                      {status === 'processing' && <p className="text-xs text-purple-300 mt-0.5">{Math.round(progress)}% concluído</p>}
                    </div>
                    <div className="w-36 h-1.5 bg-purple-900/50 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-500 transition-all duration-300" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                ) : status === 'error' ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                    <div className="w-16 h-16 rounded-xl bg-red-500/10 border-2 border-dashed border-red-500/30 flex items-center justify-center">
                      <XCircle className="w-8 h-8 text-red-500/60" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-red-300">Erro no processamento</p>
                      <Button variant="link" size="sm" className="text-xs text-purple-400" onClick={handleReset}>Tentar novamente</Button>
                    </div>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                    <div className="w-16 h-16 rounded-xl bg-fuchsia-500/10 border-2 border-dashed border-fuchsia-500/30 flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-fuchsia-500/40" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-purple-300">O resultado aparecerá aqui</p>
                      <p className="text-xs text-purple-400 mt-0.5">Envie as 4 fotos e clique em "Gerar Avatar"</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Refinement History Carousel */}
              {refinementHistory.length > 1 && status === 'completed' && (
                <div className="border-t border-purple-500/20 flex-shrink-0">
                  <RefinementCarousel
                    history={refinementHistory}
                    selectedIndex={selectedHistoryIndex}
                    onSelect={setSelectedHistoryIndex}
                  />
                </div>
              )}

              {/* Action Buttons */}
              {viewedImage && status === 'completed' && (
                <div className="border-t border-purple-500/20 px-3 py-2 flex gap-2 flex-shrink-0">
                  <Button variant="outline" size="sm" className="flex-1 h-8 text-xs bg-purple-600/80 border-purple-400/50 text-white hover:bg-purple-500/90" onClick={handleReset}>
                    <RotateCcw className="w-3.5 h-3.5 mr-1.5" />Nova
                  </Button>
                  <Button size="sm" className="flex-1 h-8 text-xs bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 text-white" onClick={() => setShowRefinePanel(true)}>
                    <Wand2 className="w-3.5 h-3.5 mr-1.5" />Refinar
                  </Button>
                  <Button size="sm" className="flex-1 h-8 text-xs bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white" onClick={() => setShowSaveDialog(true)}>
                    <Save className="w-3.5 h-3.5 mr-1.5" />Salvar
                  </Button>
                  <Button size="sm" className="flex-1 h-8 text-xs bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white" onClick={handleDownload}>
                    <Download className="w-3.5 h-3.5 mr-1.5" />Baixar HD
                  </Button>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* Save Character Dialog */}
      {viewedImage && user?.id && (
        <SaveCharacterDialog
          isOpen={showSaveDialog}
          onClose={() => setShowSaveDialog(false)}
          imageUrl={viewedImage}
          jobId={jobId}
          userId={user.id}
          onSaved={() => setSavedRefreshTrigger(prev => prev + 1)}
        />
      )}

      <AngleExamplesModal open={showExamplesModal} onOpenChange={setShowExamplesModal} />
      <NoCreditsModal isOpen={showNoCreditsModal} onClose={() => setShowNoCreditsModal(false)} reason={noCreditsReason} />
      <ActiveJobBlockModal isOpen={showActiveJobModal} onClose={() => setShowActiveJobModal(false)} activeTool={activeToolName} activeJobId={activeJobId} activeStatus={activeStatus} onCancelJob={centralCancelJob} />
      <DownloadProgressOverlay isVisible={isDownloading} progress={downloadProgress} onCancel={cancelDownload} mediaType="image" locale="pt" />
      <NotificationPromptToast toolName="character-generator" />

    </div>
    </AppLayout>
  );
};

export default GeradorPersonagemTool;
