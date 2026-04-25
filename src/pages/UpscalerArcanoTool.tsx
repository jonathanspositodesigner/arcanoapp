import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Upload, Sparkles, Download, RotateCcw, Loader2, ZoomIn, ZoomOut, Info, AlertCircle, Clock, MessageSquare, Crown, Coins, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Card } from '@/components/ui/card';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import upscalerExampleBefore from '@/assets/upscaler-example-before.webp';
import upscalerExampleAfter from '@/assets/upscaler-example-after.webp';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { useSmartBackNavigation } from '@/hooks/useSmartBackNavigation';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { useCredits } from '@/contexts/CreditsContext';
import { useQueueSessionCleanup } from '@/hooks/useQueueSessionCleanup';
import { useProcessingButton } from '@/hooks/useProcessingButton';
import { useAIJob } from '@/contexts/AIJobContext';
import { optimizeForUpscaler, validateImageDimensions, getImageDimensions, compressToMaxDimension, MAX_AI_DIMENSION } from '@/hooks/useImageOptimizer';
import AppLayout from '@/components/layout/AppLayout';
import NoCreditsModal from '@/components/upscaler/NoCreditsModal';
import ActiveJobBlockModal from '@/components/ai-tools/ActiveJobBlockModal';
import { JobDebugPanel, DownloadProgressOverlay, NotificationPromptToast } from '@/components/ai-tools';
import { ResilientImage } from '@/components/upscaler/ResilientImage';
import { cancelJob as centralCancelJob, checkActiveJob } from '@/ai/JobManager';
import { useResilientDownload } from '@/hooks/useResilientDownload';
import { useJobStatusSync } from '@/hooks/useJobStatusSync';
import { useIsMobile } from '@/hooks/use-mobile';
import { useNotificationTokenRecovery } from '@/hooks/useNotificationTokenRecovery';
import { useJobPendingWatchdog } from '@/hooks/useJobPendingWatchdog';
import { getAIErrorMessage } from '@/utils/errorMessages';
import { useAIToolSettings } from '@/hooks/useAIToolSettings';
import LandingTrialExpiredModal from '@/components/arcano-cloner/LandingTrialExpiredModal';

// Max dimension for mobile slider preview optimization
const SLIDER_PREVIEW_MAX_PX = 1500;
type ProcessingStatus = 'idle' | 'uploading' | 'processing' | 'completed' | 'error';

interface ErrorDetails {
  message: string;
  code?: string | number;
  solution?: string;
  details?: any;
}

// Prompt categories for image types
const PROMPT_CATEGORIES = {
  pessoas_perto: "Enhance the close-up portrait photo while maintaining 100% of the original identity and lighting. Increase hyper-realism: natural and realistic skin texture, visible micro-pores, subtle microvilli/peach fuzz, hairs corrected strand by strand, defined eyebrows with natural hairs, sharper eyes with realistic reflections, defined eyelashes without exaggeration, lips with natural texture and lines, noise reduction preserving fine details, high yet clean sharpness, balanced contrast and skin tones, PBR detail enhancement (skin with subtle subsurface scattering), realistic depth of field and 4K/8K photographic finish.",
  pessoas_longe: "Enhance the full-body or wide-angle photo of people while maintaining 100% of the original identity and lighting. Focus on overall sharpness, clean silhouettes, natural body proportions, clothing texture enhancement, hair definition, balanced skin tones across the entire figure, environmental context clarity, noise reduction while preserving fine details, and 4K/8K photographic finish.",
  comida: "Realistic food photography: boost sharpness and micro-textures, enhance ingredient detail, natural highlights, true-to-life appetizing colors, soft studio lighting, clean professional finish.",
  fotoAntiga: "Realistic photo restoration: remove scratches/tears/stains, reduce blur, recover sharpness and fine details, fix faded colors, balanced contrast, preserve original texture and identity, natural look.",
  logo: "Preserve exact colors, proportions, typography, spacing, outlines, and alignment. Restore clean, sharp edges; remove jaggies/blur/artifacts and noise while keeping the same visual identity.",
  render3d: "Premium 3D detailing: sharpen edges and emboss depth, add fine surface micro-textures (metal/plastic), realistic reflections and highlights, clean shadows, consistent depth, high-end render finish."
} as const;

type PromptCategory = keyof typeof PROMPT_CATEGORIES;
type PessoasFraming = 'perto' | 'longe';

const UpscalerArcanoTool: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation('tools');
  const { goBack } = useSmartBackNavigation({ fallback: '/ferramentas-ia-aplicativo' });
  const { user } = usePremiumStatus();
  const { balance: credits, isLoading: creditsLoading, refetch: refetchCredits, checkBalance } = useCredits();
  
  const isMobile = useIsMobile();
  const { getCreditCost } = useAIToolSettings();
  
  // Contexto global de jobs - para notificação sonora e trava de navegação
  const { registerJob, updateJobStatus, clearJob: clearGlobalJob } = useAIJob();

  // State
  const [version, setVersion] = useState<'standard' | 'pro'>('standard');
  const [detailDenoise, setDetailDenoise] = useState(0);
  const [resolution, setResolution] = useState<'2k' | '4k'>('4k');
  const [useCustomPrompt, setUseCustomPrompt] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [promptCategory, setPromptCategory] = useState<PromptCategory | null>(isMobile ? null : 'pessoas_perto');
  const [pessoasFraming, setPessoasFraming] = useState<PessoasFraming>('perto');
   const [comidaDetailLevel, setComidaDetailLevel] = useState(0.85);
   const [editingLevel, setEditingLevel] = useState(0.10);
  const [logoDetailLevel, setLogoDetailLevel] = useState(0.40);
  const [render3dDetailLevel, setRender3dDetailLevel] = useState(0.80);
  const [inputImage, setInputImage] = useState<string | null>(null);
  const [inputFileName, setInputFileName] = useState<string>('');
  const [outputImage, setOutputImage] = useState<string | null>(null);
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [lastError, setLastError] = useState<ErrorDetails | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  
  // Queue state
  const [isWaitingInQueue, setIsWaitingInQueue] = useState(false);
  const [queuePosition, setQueuePosition] = useState(0);
  const [jobId, setJobId] = useState<string | null>(null);
  
  // Debug state for observability
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const [failedAtStep, setFailedAtStep] = useState<string | null>(null);
  
  // No credits modal state
  const [showNoCreditsModal, setShowNoCreditsModal] = useState(false);
  const [noCreditsReason, setNoCreditsReason] = useState<'not_logged' | 'insufficient'>('insufficient');
  const [currentQueueCombo, setCurrentQueueCombo] = useState(0);
  const [showMobileConfig, setShowMobileConfig] = useState(false);

  // CRITICAL: Instant button lock to prevent duplicate clicks
  const { isSubmitting, startSubmit, endSubmit } = useProcessingButton();
  
  // Resilient download hook for cross-device compatibility
  const { isDownloading, progress: downloadProgress, download, cancel: cancelDownload } = useResilientDownload();
 
   // Active job block modal state
   const [showActiveJobModal, setShowActiveJobModal] = useState(false);
   const [activeToolName, setActiveToolName] = useState<string>('');
   const [activeJobId, setActiveJobId] = useState<string | undefined>();
   const [activeStatus, setActiveStatus] = useState<string | undefined>();
   // Now using centralized checkActiveJob from JobManager

  const [inputDimensions, setInputDimensions] = useState<{ w: number; h: number } | null>(null);

  // Mobile slider optimization state (only for preview, download uses original)
  const [optimizedInputImage, setOptimizedInputImage] = useState<string | null>(null);
  const [optimizedOutputImage, setOptimizedOutputImage] = useState<string | null>(null);
  const [isOptimizingForSlider, setIsOptimizingForSlider] = useState(false);

  // Queue message combos for friendly waiting experience
  const queueMessageCombos = [
    { emoji: "🔥", title: "Tá bombando!", position: (n: number) => `Você é o ${n}º da fila`, subtitle: "Relaxa que já já é sua vez!" },
    { emoji: "☕", title: "Hora do cafezinho", position: (n: number) => `Posição: ${n}`, subtitle: "Aproveita pra dar aquela relaxada" },
    { emoji: "🎨", title: "Artistas trabalhando...", position: (n: number) => `${n > 1 ? n - 1 : 0} pessoas na sua frente`, subtitle: "Grandes obras levam tempo, confia!" },
    { emoji: "🚀", title: "Decolagem em breve", position: (n: number) => `Você é o ${n}º na pista`, subtitle: "Preparando sua foto para o espaço!" },
    { emoji: "⚡", title: "Alta demanda agora", position: (n: number) => `Posição ${n} na fila`, subtitle: "Isso aqui tá voando, já já chega sua vez!" },
    { emoji: "🤖", title: "Robôzinhos a mil!", position: (n: number) => `Faltam ${n > 1 ? n - 1 : 0} na sua frente`, subtitle: "Eles tão trabalhando pesado pra você" },
    { emoji: "✨", title: "Preparando sua mágica", position: (n: number) => `${n}º lugar na fila VIP`, subtitle: "Magia de qualidade leva um tempinho" },
    { emoji: "🎮", title: "Loading...", position: (n: number) => `Player ${n} na fila`, subtitle: "Próxima fase desbloqueando em breve!" },
    { emoji: "🌟", title: "Sucesso gera fila", position: (n: number) => `Você é o ${n}º`, subtitle: "Todo mundo quer essa qualidade, né?" },
    { emoji: "😎", title: "Fica tranquilo", position: (n: number) => `${n}º da galera esperando`, subtitle: "Vale a pena esperar, resultado top vem aí!" },
  ];
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const beforeTransformRef = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef<string>('');

  // Initialize session ID (fresh each visit - no recovery)
  useEffect(() => {
    sessionIdRef.current = crypto.randomUUID();
  }, []);

  // Cleanup queued jobs when user leaves page
  useQueueSessionCleanup(sessionIdRef.current, status);

  // NOTIFICATION TOKEN RECOVERY - Recupera job via notificação push
  useNotificationTokenRecovery({
    userId: user?.id,
    toolTable: 'upscaler_jobs',
    onRecovery: useCallback((result) => {
      console.log('[Upscaler] Recovering job from notification:', result);
      if (result.outputUrl) {
        setInputImage(result.inputUrl);
        setOutputImage(result.outputUrl);
        setJobId(result.jobId);
        setStatus('completed');
        setProgress(100);
        toast.success('Resultado carregado!');
      }
    }, []),
  });

  // RECOVERY: reanexa ao último job recente para não "sumir" após refresh/reload.
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    (async () => {
      try {
        const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();
        const { data, error } = await supabase
          .from('upscaler_jobs')
          .select('id, status, output_url, thumbnail_url, input_url, error_message, created_at, position')
          .eq('user_id', user.id)
          .gte('created_at', since)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (cancelled || error || !data) return;
        if (outputImage || status === 'processing' || status === 'uploading' || isWaitingInQueue) return;

        const recoveredJob = data as any;

        if (recoveredJob.status === 'completed' && recoveredJob.output_url) {
          if (recoveredJob.input_url) setInputImage(recoveredJob.input_url);
          setOutputImage(recoveredJob.output_url);
          setJobId(recoveredJob.id);
          setStatus('completed');
          setProgress(100);
          toast.success('Resultado recuperado da última sessão!');
        } else if (['pending', 'queued', 'starting', 'running'].includes(recoveredJob.status)) {
          if (recoveredJob.input_url) setInputImage(recoveredJob.input_url);
          setJobId(recoveredJob.id);
          if (recoveredJob.status === 'queued') {
            setIsWaitingInQueue(true);
            setQueuePosition(recoveredJob.position || 1);
            setStatus('uploading');
          } else {
            setStatus('processing');
          }
          toast.info('Reconectando ao processamento em andamento...');
        }
      } catch (recoveryError) {
        console.error('[Upscaler] Recovery error:', recoveryError);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // PENDING WATCHDOG v2 - Detecta jobs travados como 'pending' e marca como failed após 30s
  // CORREÇÃO: Usa 'enabled' ao invés de status da UI (que nunca é 'pending')
  useJobPendingWatchdog({
    jobId,
    toolType: 'upscaler',
    enabled: status !== 'idle' && status !== 'completed' && status !== 'error',
    onJobFailed: useCallback((errorMessage) => {
      console.log('[Upscaler] Watchdog triggered - job stuck as pending');
      setStatus('error');
      setLastError({
        message: errorMessage,
        code: 'INIT_TIMEOUT',
        solution: 'Verifique sua conexão e tente novamente.',
      });
      toast.error(errorMessage);
      endSubmit();
    }, [endSubmit]),
  });

  // Reset promptCategory when custom prompt is disabled
  useEffect(() => {
    if (!useCustomPrompt) {
      setPromptCategory(isMobile ? null : 'pessoas_perto');
      setPessoasFraming('perto');
    }
  }, [useCustomPrompt, isMobile]);

  // Disable custom prompt when switching to standard version
  useEffect(() => {
    if (version === 'standard') {
      setUseCustomPrompt(false);
    }
  }, [version]);

  // Flag to check if we're in "De Longe" mode (full body photos use different WebApp)
  const isLongeMode = pessoasFraming === 'longe' && (promptCategory?.startsWith('pessoas') ?? false);

   // Flags for special workflows (Foto Antiga and Comida/Objeto)
   const isSpecialWorkflow = promptCategory === 'fotoAntiga' || promptCategory === 'comida' || promptCategory === 'logo' || promptCategory === 'render3d';
   const isFotoAntigaMode = promptCategory === 'fotoAntiga';
   const isComidaMode = promptCategory === 'comida';
   const isLogoMode = promptCategory === 'logo';
   const isRender3dMode = promptCategory === 'render3d';
 
  // Get the final prompt to send
  const getFinalPrompt = (): string => {
    if (useCustomPrompt) {
      return customPrompt;
    }
    return PROMPT_CATEGORIES[promptCategory];
  };

  // Optimize images for mobile slider preview (1500px max)
  const optimizeImagesForSlider = useCallback(async (
    inputUrl: string,
    outputUrl: string
  ) => {
    console.log('[Upscaler] Starting slider image optimization for mobile');
    setIsOptimizingForSlider(true);
    
    try {
      // Fetch both images in parallel
      const [inputResponse, outputResponse] = await Promise.all([
        fetch(inputUrl),
        fetch(outputUrl)
      ]);
      
      const [inputBlob, outputBlob] = await Promise.all([
        inputResponse.blob(),
        outputResponse.blob()
      ]);
      
      // Create Files from blobs
      const inputFile = new File([inputBlob], 'input.webp', { type: inputBlob.type });
      const outputFile = new File([outputBlob], 'output.webp', { type: outputBlob.type });
      
      // Compress to 1500px in parallel
      const [optimizedInput, optimizedOutput] = await Promise.all([
        compressToMaxDimension(inputFile, SLIDER_PREVIEW_MAX_PX),
        compressToMaxDimension(outputFile, SLIDER_PREVIEW_MAX_PX)
      ]);
      
      // Create URLs for optimized images
      const optimizedInputUrl = URL.createObjectURL(optimizedInput.file);
      const optimizedOutputUrl = URL.createObjectURL(optimizedOutput.file);
      
      setOptimizedInputImage(optimizedInputUrl);
      setOptimizedOutputImage(optimizedOutputUrl);
      
      console.log('[Upscaler] Slider images optimized for mobile preview:', {
        inputDims: `${optimizedInput.width}x${optimizedInput.height}`,
        outputDims: `${optimizedOutput.width}x${optimizedOutput.height}`
      });
    } catch (error) {
      console.error('[Upscaler] Failed to optimize slider images:', error);
      // Fallback: use original images
      setOptimizedInputImage(inputUrl);
      setOptimizedOutputImage(outputUrl);
    } finally {
      setIsOptimizingForSlider(false);
    }
  }, []);

  // Cleanup object URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (optimizedInputImage?.startsWith('blob:')) {
        URL.revokeObjectURL(optimizedInputImage);
      }
      if (optimizedOutputImage?.startsWith('blob:')) {
        URL.revokeObjectURL(optimizedOutputImage);
      }
    };
  }, [optimizedInputImage, optimizedOutputImage]);

  // SISTEMA DE SINCRONIZAÇÃO TRIPLA (Realtime + Polling + Visibility)
  // Garante que o usuário sempre receba o resultado, mesmo com problemas de rede
  useJobStatusSync({
    jobId,
    toolType: 'upscaler',
    enabled: status === 'processing' || isWaitingInQueue || status === 'uploading',
    onStatusChange: (update) => {
      console.log('[Upscaler] JobSync update:', update);
      
      // Update debug state
      setCurrentStep(update.currentStep || update.status);
      
      if (update.status === 'completed' && update.outputUrl) {
        console.log('[Upscaler] Job completed! Output:', update.outputUrl);
        setOutputImage(update.outputUrl);
        setStatus('completed');
        setProgress(100);
        setIsWaitingInQueue(false);
        setQueuePosition(0);
        toast.success(t('upscalerTool.toast.success'));
        
        // Optimize images for mobile slider preview
        if (isMobile && inputImage) {
          optimizeImagesForSlider(inputImage, update.outputUrl);
        }
      } else if (update.status === 'failed') {
        console.log('[Upscaler] Job failed:', update.errorMessage);
        setStatus('error');
        const friendlyError = getAIErrorMessage(update.errorMessage);
        setLastError({
          message: friendlyError.message,
          code: 'TASK_FAILED',
          solution: friendlyError.solution
        });
        setIsWaitingInQueue(false);
        toast.error(friendlyError.message);
        endSubmit(); // Libera o botão para nova tentativa
      } else if (update.status === 'running') {
        console.log('[Upscaler] Job running');
        setStatus('processing');
        setIsWaitingInQueue(false);
        setQueuePosition(0);
        setProgress(prev => Math.min(prev + 5, 90));
      } else if (update.status === 'queued') {
        console.log('[Upscaler] Job queued at position:', update.position);
        setIsWaitingInQueue(true);
        setQueuePosition(update.position || 1);
      }
    },
    onGlobalStatusChange: updateJobStatus,
  });

  // Registrar job no contexto global quando jobId muda (para som e trava de navegação)
  useEffect(() => {
    if (jobId) {
      registerJob(jobId, 'Upscaler Arcano', 'pending');
    }
  }, [jobId, registerJob]);

  // Progress animation while processing
  useEffect(() => {
    if (status !== 'processing') return;

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return prev;
        return prev + 1;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [status]);

  // Process file after dimension check or compression
  const processFileWithDimensions = useCallback(async (file: File, dimensions: { width: number; height: number }) => {
    // Optimize specifically for Upscaler (1024px max) to prevent VRAM OOM
    toast.info('Otimizando imagem...');
    const optimizationResult = await optimizeForUpscaler(file);
    const processedFile = optimizationResult.file;

    // Get final dimensions after optimization
    const finalDims = await getImageDimensions(processedFile);
    setInputDimensions({ w: finalDims.width, h: finalDims.height });

    const reader = new FileReader();
    reader.onload = (e) => {
      setInputImage(e.target?.result as string);
      setInputFileName(processedFile.name || file.name);
      setOutputImage(null);
      setJobId(null);
      setIsWaitingInQueue(false);
      setQueuePosition(0);
      setStatus('idle');
      setProgress(0);
    };
    reader.readAsDataURL(processedFile);
  }, []);

  // Handle file selection with dimension validation and compression
  const handleFileSelect = useCallback(async (rawFile: File) => {
    const { isAcceptedImage, ensureBrowserCompatibleImage } = await import('@/lib/heicConverter');
    if (!isAcceptedImage(rawFile)) {
      toast.error(t('upscalerTool.errors.selectImage'));
      return;
    }

    if (rawFile.size > 15 * 1024 * 1024) {
      toast.error(t('upscalerTool.errors.maxSize'));
      return;
    }

    let file: File;
    try {
      file = await ensureBrowserCompatibleImage(rawFile);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao processar a imagem.');
      return;
    }

    try {
      // Get dimensions first
      let dimensions = await getImageDimensions(file);
      let fileToProcess = file;
      
      // Auto-compress if image exceeds limit (silent, no modal)
      if (dimensions.width > MAX_AI_DIMENSION || dimensions.height > MAX_AI_DIMENSION) {
        toast.info('Redimensionando imagem automaticamente...');
        const compressed = await compressToMaxDimension(file, MAX_AI_DIMENSION - 1);
        fileToProcess = compressed.file;
        dimensions = { width: compressed.width, height: compressed.height };
        console.log(`[Upscaler] Auto-compressed: ${file.name} → ${compressed.width}x${compressed.height}`);
      }

      await processFileWithDimensions(fileToProcess, dimensions);
    } catch (error) {
      console.error('[Upscaler] Error getting dimensions, attempting fallback:', error);
      // Fallback: try to process anyway without dimension check
      try {
        await processFileWithDimensions(file, { width: 0, height: 0 });
      } catch (fallbackError) {
        console.error('[Upscaler] Fallback also failed:', fallbackError);
        toast.error('Erro ao processar imagem. Tente outro formato (JPG/PNG).');
      }
    }
  }, [t, processFileWithDimensions]);

  // Handle drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  // Handle paste
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (items) {
        for (const item of items) {
          if (item.type.startsWith('image/')) {
            const file = item.getAsFile();
            if (file) handleFileSelect(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handleFileSelect]);

  // Process image
  const processImage = async () => {
    // CRITICAL: Instant lock to prevent duplicate clicks
    if (!startSubmit()) {
      console.log('[Upscaler] Already submitting, ignoring duplicate click');
      return;
    }

    if (!inputImage) {
      toast.error(t('upscalerTool.errors.selectFirst'));
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

    const upscalerCreditCost = isLogoMode ? 50 : (version === 'pro' ? getCreditCost('Upscaler Pro', 80) : getCreditCost('Upscaler Arcano', 60));
    
    const freshCredits = await checkBalance();
    if (freshCredits < upscalerCreditCost) {
      setNoCreditsReason('insufficient');
      setShowNoCreditsModal(true);
      endSubmit();
      return;
    }

    // Credits will be consumed by the backend after successful job start

    // Cleanup previous optimized slider images (mobile only)
    if (optimizedInputImage?.startsWith('blob:')) {
      URL.revokeObjectURL(optimizedInputImage);
    }
    if (optimizedOutputImage?.startsWith('blob:')) {
      URL.revokeObjectURL(optimizedOutputImage);
    }
    setOptimizedInputImage(null);
    setOptimizedOutputImage(null);

    setLastError(null);
    setStatus('uploading');
    setProgress(10);

    let createdJobId: string | null = null;

    try {
      // Step 1: Upload image FIRST (before creating job to prevent orphans)
      const base64Data = inputImage.split(',')[1];
      const binaryStr = atob(base64Data);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }

      // optimizeForAI always converts to JPEG
      const tempId = crypto.randomUUID();
      const storagePath = `upscaler/${user.id}/${tempId}.jpg`;
      
      setProgress(20);
      console.log('[Upscaler] Uploading image...');
      
      const { error: uploadError } = await supabase.storage
        .from('artes-cloudinary')
        .upload(storagePath, bytes.buffer, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (uploadError) {
        throw new Error('Erro no upload: ' + uploadError.message);
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('artes-cloudinary')
        .getPublicUrl(storagePath);

      const imageUrl = publicUrlData.publicUrl;
      console.log('[Upscaler] Image uploaded:', imageUrl);
      setProgress(35);

      // Step 2: Create job in database ONLY AFTER successful upload
      // This prevents orphaned jobs if user closes page during upload
      // IMPORTANTE: Gravar category, version, resolution para o fallback funcionar
      // VRAM safety: always cap at 2048 to prevent OOM (backend also enforces this)
      const resolutionValue = 2048;
      const framingMode = isLongeMode ? 'longe' : 'perto';
      const effectiveCategory = isLongeMode ? 'pessoas_longe' : promptCategory;
      
      const { data: job, error: jobError } = await supabase
        .from('upscaler_jobs')
        .insert({
          session_id: sessionIdRef.current,
          status: 'pending',
          detail_denoise: detailDenoise,
          prompt: getFinalPrompt(),
          user_id: user.id,
          input_file_name: storagePath.split('/').pop() || `${tempId}.jpg`,
          input_url: imageUrl,
          // Campos necessários para o fallback De Longe → Standard
          category: effectiveCategory,
          version: version,
          resolution: resolutionValue,
          framing_mode: framingMode,
        })
        .select()
        .single();

      if (jobError || !job) {
        throw new Error('Erro ao criar job: ' + (jobError?.message || 'Unknown'));
      }

      console.log('[Upscaler] Job created with image:', job.id);
      setJobId(job.id);
      createdJobId = job.id;
      setProgress(45);

      // Step 3: Call edge function with URL (not base64)
      const edgeCreditCost = isLogoMode ? 50 : (version === 'pro' ? getCreditCost('Upscaler Pro', 80) : getCreditCost('Upscaler Arcano', 60));

      const { data: response, error: fnError } = await supabase.functions.invoke('runninghub-upscaler/run', {
        body: {
          jobId: job.id,
          imageUrl: imageUrl,
          version: version,
          userId: user.id,
           creditCost: edgeCreditCost,
           category: promptCategory,
           // Conditional parameters based on workflow type
           detailDenoise: isComidaMode 
             ? comidaDetailLevel 
             : isLogoMode 
               ? (version === 'pro' ? logoDetailLevel : undefined)
               : isRender3dMode
                 ? (version === 'pro' ? render3dDetailLevel : undefined)
                 : (isSpecialWorkflow ? undefined : detailDenoise),
           resolution: isSpecialWorkflow ? undefined : resolutionValue,
           prompt: isSpecialWorkflow ? undefined : getFinalPrompt(),
           framingMode: isSpecialWorkflow ? undefined : framingMode,
           editingLevel: (version === 'pro' && promptCategory === 'pessoas_perto') ? editingLevel : undefined,
        }
      });

      if (fnError) {
        throw new Error('Erro na função: ' + fnError.message);
      }

      if (!response.success) {
        throw new Error(response.error || 'Unknown error from edge function');
      }

      console.log('[Upscaler] Edge function response:', response);
      setProgress(50);
      setStatus('processing');

      // Refetch credits after successful job start (they were consumed in the backend)
      refetchCredits();

    } catch (error: any) {
      console.error('[Upscaler] Error:', error);

      // Marcar job como failed no banco imediatamente para evitar jobs órfãos
      if (createdJobId) {
        try {
          await supabase.rpc('mark_pending_job_as_failed', {
            p_table_name: 'upscaler_jobs',
            p_job_id: createdJobId,
            p_error_message: `Erro no cliente: ${(error.message || 'Desconhecido').substring(0, 200)}`
          });
          console.log('[Upscaler] Job marked as failed in DB:', createdJobId);
        } catch (rpcErr) {
          console.error('[Upscaler] Failed to mark job in DB:', rpcErr);
        }
      }

      setStatus('error');
      setLastError({
        message: error.message || 'Erro desconhecido',
        code: 'UPLOAD_ERROR',
        solution: 'Tente novamente ou use uma imagem menor.'
      });
      toast.error('Erro ao processar imagem');
      endSubmit();
    }
  };

  // Cancel queue - using centralized JobManager
  const cancelQueue = async () => {
    if (!jobId) return;

    try {
      const result = await centralCancelJob('upscaler', jobId);
      
      if (result.success) {
        setStatus('idle');
        setIsWaitingInQueue(false);
        setQueuePosition(0);
        setJobId(null);
        endSubmit();
        if (result.refundedAmount > 0) {
          toast.success(`Cancelado! ${result.refundedAmount} créditos devolvidos.`);
        } else {
          toast.info('Saiu da fila');
        }
        refetchCredits();
      } else {
        toast.error(result.errorMessage || 'Erro ao cancelar');
      }
    } catch (error) {
      console.error('[Upscaler] Error cancelling:', error);
      toast.error('Erro ao cancelar');
    }
  };

  // Download result with resilient fallbacks
  const downloadResult = useCallback(async () => {
    if (!outputImage) return;
    
    await download({
      url: outputImage,
      filename: `upscaled-${Date.now()}.png`,
      mediaType: 'image',
      timeout: 10000,
      onSuccess: () => toast.success(t('upscalerTool.toast.downloaded')),
      locale: 'pt'
    });
  }, [outputImage, download, t]);

  // Reset tool
  const resetTool = useCallback(() => {
    setInputImage(null);
    setInputFileName('');
    setOutputImage(null);
    setStatus('idle');
    setProgress(0);
    setSliderPosition(50);
    setLastError(null);
    setJobId(null);
    setIsWaitingInQueue(false);
    setQueuePosition(0);
    endSubmit();
    // Clear file input to allow re-selecting same file
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    // Limpar job do contexto global
    clearGlobalJob();
  }, [endSubmit, clearGlobalJob]);

  // Slider handlers for before/after comparison
  const updateSliderPositionFromClientX = useCallback((clientX: number) => {
    if (sliderRef.current) {
      const rect = sliderRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setSliderPosition(percentage);
    }
  }, []);

  const handleSliderPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isDraggingRef.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    updateSliderPositionFromClientX(e.clientX);
  }, [updateSliderPositionFromClientX]);

  const handleSliderPointerMove = useCallback((e: React.PointerEvent) => {
    if (isDraggingRef.current) {
      e.preventDefault();
      e.stopPropagation();
      updateSliderPositionFromClientX(e.clientX);
    }
  }, [updateSliderPositionFromClientX]);

  const handleSliderPointerUp = useCallback((e: React.PointerEvent) => {
    isDraggingRef.current = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  }, []);

  // Check if we're processing or in queue
  const isProcessing = status === 'processing' || status === 'uploading' || isWaitingInQueue;

  return (
    <AppLayout fullScreen>

      {/* Main Content - Two Column Layout */}
      <div className={`flex-1 max-w-7xl w-full mx-auto px-4 py-4 flex flex-col h-full ${isMobile ? 'overflow-y-auto pb-40' : 'overflow-hidden'}`}>
        <div className={`grid grid-cols-1 lg:grid-cols-7 gap-4 lg:gap-5 ${isMobile ? 'content-start' : 'flex-1 min-h-0'}`}>
          
          {/* Left Side - Controls Panel inside ONE card */}
          {/* On mobile: only show upload area. Controls move to bottom bar */}
          <div className={`lg:col-span-2 ${isMobile ? 'overflow-visible' : 'min-h-0 overflow-hidden'}`}>
            <div className={`bg-card border border-border rounded-2xl p-5 flex flex-col gap-5 ${isMobile ? '' : 'overflow-y-auto h-full max-h-full'}`}
              style={!isMobile ? { scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.15) transparent' } : undefined}
            >
              
              {/* Title inside card */}
              <div>
                <h1 className="text-xl font-bold text-foreground">Upscaler Arcano App</h1>
                <p className="text-xs text-muted-foreground mt-1">Aumente a qualidade das suas imagens com inteligência artificial. Transforme fotos em alta resolução sem perder detalhes.</p>
              </div>

              {/* Upload Area */}
              <div 
                className="bg-black/70 border border-white/10 border-dashed rounded-xl p-6 cursor-pointer hover:bg-black/80 transition-colors"
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
              >
                {inputImage ? (
                  <div className="flex items-center gap-3">
                    <img src={inputImage} alt="Preview" className="w-12 h-12 object-cover rounded-lg" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white truncate">{inputFileName || 'Imagem selecionada'}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-[10px] text-white/60">Clique para trocar</p>
                        {inputDimensions && (
                          <span className="text-[10px] text-white/60">
                            📐 {inputDimensions.w}x{inputDimensions.h}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center gap-2 py-6">
                    <Upload className="w-6 h-6 text-white/60" />
                    <p className="text-sm font-medium text-white">Arraste sua imagem aqui</p>
                    <p className="text-[10px] text-white/60">PNG, JPEG, WEBP - Máximo 10MB</p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,image/heic,image/heif,.heic,.heif"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                />
              </div>

              {/* DESKTOP ONLY: All controls below upload */}
              {!isMobile && (
                <>
                  {/* Modo */}
                  <div>
                    <span className="text-sm font-medium text-foreground mb-2 block">Modo</span>
                    <div className="grid grid-cols-2 gap-0 bg-muted border border-border rounded-lg p-1">
                      <button
                        onClick={() => setVersion('standard')}
                        className={`py-2.5 px-3 text-sm rounded-md transition-all font-medium ${
                          version === 'standard'
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        V3 Turbo
                      </button>
                      <button
                        onClick={() => setVersion('pro')}
                        className={`py-2.5 px-3 text-sm rounded-md transition-all font-medium ${
                          version === 'pro'
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        V3 Pro
                      </button>
                    </div>
                  </div>

                  {/* Tipo de Imagem */}
                  {(!useCustomPrompt || version === 'standard') && (
                    <div>
                      <span className="text-sm font-medium text-foreground mb-2 block">Tipo de Imagem</span>
                      <Select
                        value={(promptCategory?.startsWith('pessoas') ?? false) ? 'pessoas' : (promptCategory ?? '')}
                        onValueChange={(value) => {
                          if (value === 'pessoas') {
                            setPromptCategory(`pessoas_${pessoasFraming}` as PromptCategory);
                          } else {
                            setPromptCategory(value as PromptCategory);
                          }
                        }}
                      >
                        <SelectTrigger className="w-full bg-muted border-border text-foreground text-sm h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          <SelectItem value="pessoas" className="text-foreground text-sm">Pessoas</SelectItem>
                          <SelectItem value="comida" className="text-foreground text-sm">Comida/Objeto</SelectItem>
                          <SelectItem value="fotoAntiga" className="text-foreground text-sm">Foto Antiga</SelectItem>
                          <SelectItem value="render3d" className="text-foreground text-sm">Selo 3D</SelectItem>
                          <SelectItem value="logo" className="text-foreground text-sm">Logo/Arte</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Tamanho */}
                  {!isSpecialWorkflow && (
                    <div>
                      <span className="text-sm font-medium text-foreground mb-2 block">Tamanho</span>
                      <div className="inline-flex gap-0 bg-muted border border-border rounded-lg p-1">
                        <button
                          onClick={() => setResolution('2k')}
                          className={`px-6 py-2 text-sm rounded-md transition-all font-medium ${
                            resolution === '2k'
                              ? 'bg-primary text-primary-foreground shadow-sm'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          2K
                        </button>
                        <button
                          onClick={() => setResolution('4k')}
                          className={`px-6 py-2 text-sm rounded-md transition-all font-medium ${
                            resolution === '4k'
                              ? 'bg-primary text-primary-foreground shadow-sm'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          4k
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Detalhar Rosto */}
                  {version === 'pro' && !isLongeMode && !isSpecialWorkflow && (
                    <div className="border border-border rounded-xl p-4 space-y-3 bg-muted/50">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">Detalhar Rosto</span>
                        <Switch
                          checked={detailDenoise > 0}
                          onCheckedChange={(checked) => {
                            if (!checked) setDetailDenoise(0);
                            else setDetailDenoise(0.15);
                          }}
                          className="data-[state=checked]:bg-white/30 data-[state=unchecked]:bg-accent [&>span]:bg-white"
                        />
                      </div>
                      {detailDenoise > 0 && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-muted-foreground">Nível de detalhes</span>
                            <span className="text-xs text-muted-foreground font-mono">{detailDenoise.toFixed(2)}</span>
                          </div>
                          <Slider
                            value={[detailDenoise]}
                            onValueChange={([value]) => setDetailDenoise(value)}
                            min={0.01}
                            max={1}
                            step={0.01}
                            className="w-full [&_[role=slider]]:bg-white [&_[role=slider]]:border-border0 [&_.relative>div:first-child]:bg-white/20 [&_.relative>div:first-child>div]:bg-white/60"
                          />
                          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                            <span>Menos</span>
                            <span>Mais</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Comida/Objeto Detail Level Slider */}
                  {isComidaMode && (
                    <div className="border border-border rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-foreground">Nível de Detalhes</span>
                        <span className="text-xs text-muted-foreground font-mono">{Math.round(comidaDetailLevel * 100)}%</span>
                      </div>
                      <Slider
                        value={[comidaDetailLevel]}
                        onValueChange={([value]) => setComidaDetailLevel(value)}
                        min={0.70}
                        max={1.00}
                        step={0.01}
                        className="w-full"
                      />
                      <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                        <span>Mais Fiel</span>
                        <span>Mais Criativo</span>
                      </div>
                    </div>
                  )}

                  {/* Logo/Arte Detail Level Slider */}
                  {isLogoMode && version === 'pro' && (
                    <div className="border border-border rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-foreground">Nível de Detalhe</span>
                        <span className="text-xs text-muted-foreground font-mono">{logoDetailLevel.toFixed(2)}</span>
                      </div>
                      <Slider
                        value={[logoDetailLevel]}
                        onValueChange={([value]) => setLogoDetailLevel(value)}
                        min={0.01}
                        max={1.00}
                        step={0.01}
                        className="w-full"
                      />
                      <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                        <span>Mais Fidelidade</span>
                        <span>Mais Criatividade</span>
                      </div>
                    </div>
                  )}

                  {/* Selos 3D Detail Level Slider */}
                  {isRender3dMode && version === 'pro' && (
                    <div className="border border-border rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-foreground">Nível de Detalhe</span>
                        <span className="text-xs text-muted-foreground font-mono">{render3dDetailLevel.toFixed(2)}</span>
                      </div>
                      <Slider
                        value={[render3dDetailLevel]}
                        onValueChange={([value]) => setRender3dDetailLevel(value)}
                        min={0.01}
                        max={1.00}
                        step={0.01}
                        className="w-full"
                      />
                      <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                        <span>Mais Fidelidade</span>
                        <span>Mais Criatividade</span>
                      </div>
                    </div>
                  )}

                  {/* Generate Button - DESKTOP ONLY */}
                  {!isProcessing && status !== 'completed' && (
                    <Button
                      className="w-full py-4 text-sm font-semibold bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white rounded-xl shadow-lg disabled:opacity-50"
                      onClick={processImage}
                      disabled={isSubmitting || !inputImage}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Iniciando...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Gerar Upscaling
                          <span className="ml-2 flex items-center gap-1 text-xs opacity-90">
                            <Coins className="w-3.5 h-3.5" />
                            {isLogoMode ? 50 : (version === 'pro' ? getCreditCost('Upscaler Pro', 80) : getCreditCost('Upscaler Arcano', 60))}
                          </span>
                        </>
                      )}
                    </Button>
                  )}

                  {/* Completed Actions - DESKTOP ONLY */}
                  {status === 'completed' && (
                    <div className="space-y-2">
                      <Button
                        className="w-full py-4 text-sm font-semibold bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-xl"
                        onClick={downloadResult}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        {t('upscalerTool.buttons.downloadHD')}
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full py-3 text-sm border-border text-muted-foreground hover:bg-accent rounded-xl"
                        onClick={resetTool}
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        {t('upscalerTool.buttons.processNew')}
                      </Button>
                    </div>
                  )}

                  {/* Error State - DESKTOP ONLY */}
                  {status === 'error' && lastError && (
                    <div className="bg-red-950/30 border border-red-500/30 rounded-xl p-3">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 space-y-1">
                          <p className="text-xs font-medium text-red-300">{lastError.message}</p>
                          {lastError.solution && (
                            <p className="text-[10px] text-muted-foreground">💡 {lastError.solution}</p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        className="w-full mt-2 py-2 text-xs border-border text-muted-foreground hover:bg-accent rounded-lg"
                        onClick={resetTool}
                      >
                        <RotateCcw className="w-3.5 h-3.5 mr-1" />
                        {t('upscalerTool.buttons.tryAgain')}
                      </Button>
                    </div>
                  )}
                </>
              )}

              {/* Debug Panel */}
              <JobDebugPanel
                jobId={jobId}
                tableName="upscaler_jobs"
                currentStep={currentStep}
                failedAtStep={failedAtStep}
                errorMessage={lastError?.message}
                position={queuePosition}
                status={status}
              />
            </div>
          </div>

          {/* Right Side - Result Viewer (~72%) */}
          <div className="lg:col-span-5 min-h-0 overflow-hidden">
            <div className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col min-h-[400px] h-full">
              {/* Warning Banner */}
              {isProcessing && (
                <div className="bg-amber-500/20 border-b border-amber-500/50 px-3 py-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                  <p className="text-xs text-amber-700 dark:text-amber-200">{t('upscalerTool.warnings.dontClose')}</p>
                </div>
              )}

              {/* Content Area */}
              <div className="flex-1 flex items-center justify-center p-4 min-h-0">
                {/* Queue Waiting UI */}
                {isWaitingInQueue ? (
                  <div className="flex flex-col items-center gap-4 text-center">
                    <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center animate-pulse">
                      <Clock className="w-8 h-8 text-yellow-400" />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-yellow-300">
                        {queueMessageCombos[currentQueueCombo].emoji} {queueMessageCombos[currentQueueCombo].title}
                      </p>
                      <p className="text-3xl font-bold text-foreground mt-2">
                        {queueMessageCombos[currentQueueCombo].position(queuePosition)}
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        {queueMessageCombos[currentQueueCombo].subtitle}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={cancelQueue}
                      className="text-red-300 hover:text-red-100 hover:bg-red-500/100/20"
                    >
                      Sair da fila
                    </Button>
                  </div>
                ) : status === 'completed' && outputImage && (!isMobile || !isOptimizingForSlider) ? (
                  /* Result View - Before/After Slider with Zoom */
                  <TransformWrapper
                    key={outputImage}
                    initialScale={1}
                    minScale={1}
                    maxScale={6}
                    smooth={true}
                    onInit={(ref) => {
                      setZoomLevel(ref.state.scale);
                      (window as any).__upscalerTransformRef = ref;
                      if (beforeTransformRef.current) {
                        beforeTransformRef.current.style.transform = `translate(${ref.state.positionX}px, ${ref.state.positionY}px) scale(${ref.state.scale})`;
                        beforeTransformRef.current.style.transformOrigin = '0% 0%';
                      }
                    }}
                    onTransformed={(_, state) => {
                      setZoomLevel(state.scale);
                      if (beforeTransformRef.current) {
                        beforeTransformRef.current.style.transform = `translate(${state.positionX}px, ${state.positionY}px) scale(${state.scale})`;
                      }
                    }}
                    wheel={{ disabled: true }}
                    pinch={{ step: 3 }}
                    doubleClick={{ mode: 'zoomIn', step: 0.14 }}
                    panning={{ disabled: zoomLevel <= 1 }}
                  >
                    {({ zoomIn, zoomOut, resetTransform }) => (
                      <div className="relative w-full h-full">
                        {/* Zoom Controls */}
                        <div className="hidden sm:flex absolute top-4 left-1/2 -translate-x-1/2 z-30 items-center gap-1 bg-black/80 rounded-full px-2 py-1">
                          <button 
                            onClick={() => zoomOut(0.14)}
                            className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
                          >
                            <ZoomOut className="w-4 h-4 text-foreground" />
                          </button>
                          <span className="text-xs font-mono min-w-[3rem] text-center text-foreground">
                            {Math.round(zoomLevel * 100)}%
                          </span>
                          <button 
                            onClick={() => zoomIn(0.14)}
                            className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
                          >
                            <ZoomIn className="w-4 h-4 text-foreground" />
                          </button>
                          {zoomLevel > 1 && (
                            <button 
                              onClick={() => resetTransform()}
                              className="p-1.5 hover:bg-white/20 rounded-full transition-colors ml-1"
                            >
                              <RotateCcw className="w-4 h-4 text-foreground" />
                            </button>
                          )}
                        </div>

                        <div 
                          ref={sliderRef} 
                          className="relative w-full h-full overflow-hidden"
                          onWheel={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            
                            const transformRef = (window as any).__upscalerTransformRef;
                            if (!transformRef) return;
                            
                            const MIN_ZOOM = 1;
                            const MAX_ZOOM = 6;
                            const WHEEL_FACTOR = 1.40;
                            
                            const { scale, positionX, positionY } = transformRef.state;
                            const wrapperComponent = transformRef.instance?.wrapperComponent;
                            
                            if (!wrapperComponent) return;
                            
                            const rect = wrapperComponent.getBoundingClientRect();
                            const mouseX = e.clientX - rect.left;
                            const mouseY = e.clientY - rect.top;
                            
                            let newScale: number;
                            if (e.deltaY < 0) {
                              newScale = scale * WHEEL_FACTOR;
                            } else {
                              newScale = scale / WHEEL_FACTOR;
                            }
                            
                            newScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newScale));
                            
                            if (newScale === scale) return;
                            
                            const scaleDiff = newScale - scale;
                            const newPosX = positionX - mouseX * scaleDiff;
                            const newPosY = positionY - mouseY * scaleDiff;
                            
                            transformRef.setTransform(newPosX, newPosY, newScale, 150, 'easeOut');
                          }}
                        >
                          <div className="relative w-full h-full bg-black">
                            {/* AFTER image - Using ResilientImage for robust loading */}
                            {/* On mobile: use optimized image for preview, but ResilientImage uses original for download */}
                            <TransformComponent 
                              wrapperStyle={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }} 
                              contentStyle={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                              <ResilientImage 
                                src={isMobile && optimizedOutputImage ? optimizedOutputImage : outputImage} 
                                alt="Depois" 
                                className="w-full h-full"
                                objectFit="contain"
                                timeout={10000}
                                compressOnFailure={true}
                                showDownloadOnFail={true}
                                onDownloadClick={downloadResult}
                                downloadFileName={`upscaled-${Date.now()}.png`}
                              />
                            </TransformComponent>

                            {/* BEFORE image - overlay clipped */}
                            {/* On mobile: use optimized image for preview */}
                            <div 
                              className="absolute inset-0 pointer-events-none overflow-hidden"
                              style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
                            >
                              <div 
                                ref={beforeTransformRef}
                                className="w-full h-full flex items-center justify-center"
                                style={{ transformOrigin: '0% 0%' }}
                              >
                                <img 
                                  src={isMobile && optimizedInputImage ? optimizedInputImage : (inputImage || '')} 
                                  alt="Antes" 
                                  className="w-full h-full"
                                  style={{ objectFit: 'contain' }}
                                  draggable={false}
                                />
                              </div>
                            </div>

                            {/* Slider Line and Handle */}
                            <div 
                              className="absolute top-0 bottom-0 w-1 bg-white shadow-lg z-20"
                              style={{ 
                                left: `${sliderPosition}%`, 
                                transform: 'translateX(-50%)', 
                                cursor: 'ew-resize',
                                touchAction: 'none'
                              }}
                              onPointerDown={handleSliderPointerDown}
                              onPointerMove={handleSliderPointerMove}
                              onPointerUp={handleSliderPointerUp}
                              onPointerCancel={handleSliderPointerUp}
                            >
                              <div 
                                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center cursor-ew-resize"
                                style={{ touchAction: 'none' }}
                              >
                                <div className="flex gap-0.5">
                                  <div className="w-0.5 h-4 bg-border rounded-full" />
                                  <div className="w-0.5 h-4 bg-border rounded-full" />
                                </div>
                              </div>
                            </div>

                            {/* Labels */}
                            <div className="absolute top-2 left-2 px-2 py-1 rounded-full bg-black/90 border border-border text-foreground text-xs font-bold z-20 pointer-events-none">
                              {t('upscalerTool.labels.before')}
                            </div>
                            <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-purple-600/90 border border-border text-white text-xs font-bold z-20 pointer-events-none">
                              {t('upscalerTool.labels.after')}
                            </div>
                          </div>
                        </div>

                        {/* Zoom Hint */}
                        <div className="hidden sm:block absolute bottom-3 left-1/2 -translate-x-1/2 text-xs text-white/90 bg-black/80 px-4 py-1.5 rounded-full z-20 border border-border">
                          🔍 {t('upscalerTool.zoomHint')}
                        </div>
                      </div>
                    )}
                  </TransformWrapper>
                ) : status === 'completed' && isMobile && isOptimizingForSlider ? (
                  /* Mobile: Optimization loading state */
                  <div className="flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
                    <p className="text-sm text-muted-foreground">Preparando visualização...</p>
                  </div>
                ) : (status === 'uploading' || status === 'processing') && !isWaitingInQueue ? (
                  /* Processing State */
                  <div className="flex flex-col items-center justify-center gap-4">
                    <Loader2 className="w-12 h-12 text-muted-foreground animate-spin" />
                    <div className="text-center">
                      <p className="text-lg font-medium text-foreground">
                        {status === 'uploading' ? t('upscalerTool.status.uploading') : t('upscalerTool.status.processing')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {t('upscalerTool.status.mayTake2Min')}
                      </p>
                    </div>
                    {/* Progress bar */}
                    <div className="w-48 h-2 bg-accent rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                ) : inputImage ? (
                  /* Preview uploaded image */
                  <div className="relative w-full h-full flex items-center justify-center">
                    <img 
                      src={inputImage} 
                      alt="Preview" 
                      className="max-w-full max-h-full object-contain rounded-lg"
                    />
                  </div>
                ) : (
                  /* Empty State - Example Before/After */
                  <div 
                    ref={sliderRef}
                    className="relative w-full h-full overflow-hidden rounded-lg cursor-ew-resize select-none"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      isDraggingRef.current = true;
                      (e.target as HTMLElement).setPointerCapture(e.pointerId);
                      updateSliderPositionFromClientX(e.clientX);
                    }}
                    onPointerMove={(e) => {
                      if (isDraggingRef.current) {
                        e.preventDefault();
                        updateSliderPositionFromClientX(e.clientX);
                      }
                    }}
                    onPointerUp={(e) => {
                      isDraggingRef.current = false;
                      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
                    }}
                  >
                    {/* After image (full) */}
                    <img 
                      src={upscalerExampleAfter} 
                      alt="Exemplo depois" 
                      className="w-full h-full object-cover pointer-events-none"
                      draggable={false}
                    />
                    {/* Before image (clipped) */}
                    <div 
                      className="absolute inset-0 overflow-hidden pointer-events-none"
                      style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
                    >
                      <img 
                        src={upscalerExampleBefore} 
                        alt="Exemplo antes" 
                        className="w-full h-full object-cover"
                        draggable={false}
                      />
                    </div>
                    {/* Slider line */}
                    <div 
                      className="absolute top-0 bottom-0 w-[2px] bg-white/70 z-10 pointer-events-none"
                      style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
                    >
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center">
                        <div className="flex gap-[1px]">
                          <div className="w-[1px] h-3 bg-border rounded-full" />
                          <div className="w-[1px] h-3 bg-border rounded-full" />
                        </div>
                      </div>
                    </div>
                    {/* Labels */}
                    <div className="absolute top-3 left-3 text-[10px] px-2.5 py-1 bg-black/70 text-white font-medium rounded-full z-10 pointer-events-none">
                      Antes
                    </div>
                    <div className="absolute top-3 right-3 text-[10px] px-2.5 py-1 bg-white/20 text-white font-medium rounded-full z-10 pointer-events-none backdrop-blur-sm">
                      Depois
                    </div>
                    {/* Hint text */}
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs text-white/80 bg-black/70 px-3 py-1 rounded-full z-10 pointer-events-none">
                      Arraste para comparar • Exemplo
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
          
          {/* Expandable Configurações panel */}
          {showMobileConfig && !isProcessing && status !== 'completed' && status !== 'error' && (
            <div className="px-4 pt-3 pb-2 space-y-3 border-b border-border max-h-[50vh] overflow-y-auto">
              {/* Modo */}
              <div>
                <span className="text-xs font-medium text-muted-foreground mb-1.5 block">Modo</span>
                <div className="grid grid-cols-2 gap-0 bg-muted border border-border rounded-lg p-1">
                  <button
                    onClick={() => setVersion('standard')}
                    className={`py-2 px-3 text-sm rounded-md transition-all font-medium ${
                      version === 'standard' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground'
                    }`}
                  >
                    V3 Turbo
                  </button>
                  <button
                    onClick={() => setVersion('pro')}
                    className={`py-2 px-3 text-sm rounded-md transition-all font-medium ${
                      version === 'pro' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground'
                    }`}
                  >
                    V3 Pro
                  </button>
                </div>
              </div>

              {/* Tamanho */}
              {!isSpecialWorkflow && (
                <div>
                  <span className="text-xs font-medium text-muted-foreground mb-1.5 block">Tamanho</span>
                  <div className="inline-flex gap-0 bg-muted border border-border rounded-lg p-1">
                    <button
                      onClick={() => setResolution('2k')}
                      className={`px-6 py-2 text-sm rounded-md transition-all font-medium ${
                        resolution === '2k' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground'
                      }`}
                    >
                      2K
                    </button>
                    <button
                      onClick={() => setResolution('4k')}
                      className={`px-6 py-2 text-sm rounded-md transition-all font-medium ${
                        resolution === '4k' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground'
                      }`}
                    >
                      4k
                    </button>
                  </div>
                </div>
              )}

              {/* Detalhar Rosto */}
              {version === 'pro' && !isLongeMode && !isSpecialWorkflow && (
                <div className="border border-border rounded-xl p-3 space-y-2 bg-muted/50">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-foreground">Detalhar Rosto</span>
                    <Switch
                      checked={detailDenoise > 0}
                      onCheckedChange={(checked) => {
                        if (!checked) setDetailDenoise(0);
                        else setDetailDenoise(0.15);
                      }}
                      className="data-[state=checked]:bg-white/30 data-[state=unchecked]:bg-accent [&>span]:bg-white"
                    />
                  </div>
                  {detailDenoise > 0 && (
                    <div>
                      <Slider
                        value={[detailDenoise]}
                        onValueChange={([value]) => setDetailDenoise(value)}
                        min={0.01}
                        max={1}
                        step={0.01}
                        className="w-full"
                      />
                      <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                        <span>Menos</span>
                        <span>Mais</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Comida slider */}
              {isComidaMode && (
                <div className="border border-border rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-foreground">Nível de Detalhes</span>
                    <span className="text-[10px] text-muted-foreground font-mono">{Math.round(comidaDetailLevel * 100)}%</span>
                  </div>
                  <Slider value={[comidaDetailLevel]} onValueChange={([v]) => setComidaDetailLevel(v)} min={0.70} max={1.00} step={0.01} className="w-full" />
                </div>
              )}

              {/* Logo slider */}
              {isLogoMode && version === 'pro' && (
                <div className="border border-border rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-foreground">Nível de Detalhe</span>
                    <span className="text-[10px] text-muted-foreground font-mono">{logoDetailLevel.toFixed(2)}</span>
                  </div>
                  <Slider value={[logoDetailLevel]} onValueChange={([v]) => setLogoDetailLevel(v)} min={0.01} max={1.00} step={0.01} className="w-full" />
                </div>
              )}

              {/* 3D slider */}
              {isRender3dMode && version === 'pro' && (
                <div className="border border-border rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-foreground">Nível de Detalhe</span>
                    <span className="text-[10px] text-muted-foreground font-mono">{render3dDetailLevel.toFixed(2)}</span>
                  </div>
                  <Slider value={[render3dDetailLevel]} onValueChange={([v]) => setRender3dDetailLevel(v)} min={0.01} max={1.00} step={0.01} className="w-full" />
                </div>
              )}
            </div>
          )}

          {/* Main bottom bar content */}
          <div className="px-4 py-3 space-y-2.5">
            {/* Idle state: Tipo de Imagem + Gerar + Configurações */}
            {!isProcessing && status !== 'completed' && status !== 'error' && (
              <>
                {/* Tipo de Imagem */}
                {(!useCustomPrompt || version === 'standard') && (
                  <Select
                    value={promptCategory === null ? '' : (promptCategory.startsWith('pessoas') ? 'pessoas' : promptCategory)}
                    onValueChange={(value) => {
                      if (value === 'pessoas') {
                        setPromptCategory(`pessoas_${pessoasFraming}` as PromptCategory);
                      } else {
                        setPromptCategory(value as PromptCategory);
                      }
                    }}
                  >
                    <SelectTrigger className="w-full bg-muted border-border text-foreground text-sm h-9">
                      <SelectValue placeholder="Escolha o tipo de imagem" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="pessoas" className="text-foreground text-sm">Pessoas</SelectItem>
                      <SelectItem value="comida" className="text-foreground text-sm">Comida/Objeto</SelectItem>
                      <SelectItem value="fotoAntiga" className="text-foreground text-sm">Foto Antiga</SelectItem>
                      <SelectItem value="render3d" className="text-foreground text-sm">Selo 3D</SelectItem>
                      <SelectItem value="logo" className="text-foreground text-sm">Logo/Arte</SelectItem>
                    </SelectContent>
                  </Select>
                )}

                {/* Gerar button */}
                <Button
                  className="w-full py-4 text-sm font-semibold bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white rounded-xl shadow-lg disabled:opacity-50"
                  onClick={processImage}
                  disabled={isSubmitting || !inputImage || promptCategory === null}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Iniciando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Gerar Upscaling
                      <span className="ml-2 flex items-center gap-1 text-xs opacity-90">
                        <Coins className="w-3.5 h-3.5" />
                        {isLogoMode ? 50 : (version === 'pro' ? getCreditCost('Upscaler Pro', 80) : getCreditCost('Upscaler Arcano', 60))}
                      </span>
                    </>
                  )}
                </Button>

                {/* Configurações toggle */}
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

            {/* Completed state */}
            {status === 'completed' && (
              <div className="flex gap-2">
                <Button
                  className="flex-1 py-4 text-sm font-semibold bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-xl"
                  onClick={downloadResult}
                >
                  <Download className="w-4 h-4 mr-2" />
                  {t('upscalerTool.buttons.downloadHD')}
                </Button>
                <Button
                  variant="outline"
                  className="py-4 px-4 text-sm border-border text-muted-foreground hover:bg-accent rounded-xl"
                  onClick={resetTool}
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </div>
            )}

            {/* Error state */}
            {status === 'error' && lastError && (
              <div className="flex gap-2 items-center">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-red-300 truncate">{lastError.message}</p>
                </div>
                <Button
                  variant="outline"
                  className="py-3 px-4 text-xs border-border text-muted-foreground hover:bg-accent rounded-lg flex-shrink-0"
                  onClick={resetTool}
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1" />
                  Tentar
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

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

      {/* Notification Prompt Toast */}
      <NotificationPromptToast toolName="upscale" />


      {/* Landing Trial Expired Modal */}
      <LandingTrialExpiredModal userId={user?.id} balance={credits} />
    </AppLayout>
  );
};

export default UpscalerArcanoTool;