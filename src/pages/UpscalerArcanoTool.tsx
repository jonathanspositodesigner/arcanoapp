import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Upload, Sparkles, Download, RotateCcw, Loader2, ZoomIn, ZoomOut, Info, AlertCircle, Clock, MessageSquare, Crown, Coins } from 'lucide-react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Card } from '@/components/ui/card';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { useSmartBackNavigation } from '@/hooks/useSmartBackNavigation';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { useUpscalerCredits } from '@/hooks/useUpscalerCredits';
import { useQueueSessionCleanup } from '@/hooks/useQueueSessionCleanup';
import { useProcessingButton } from '@/hooks/useProcessingButton';
import { useAIJob } from '@/contexts/AIJobContext';
import { optimizeForAI, validateImageDimensions, getImageDimensions, compressToMaxDimension, MAX_AI_DIMENSION } from '@/hooks/useImageOptimizer';
import ToolsHeader from '@/components/ToolsHeader';
import NoCreditsModal from '@/components/upscaler/NoCreditsModal';
import ActiveJobBlockModal from '@/components/ai-tools/ActiveJobBlockModal';
import { JobDebugPanel, ImageCompressionModal } from '@/components/ai-tools';
import { cancelJob as centralCancelJob, checkActiveJob } from '@/ai/JobManager';

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
  const { t } = useTranslation('tools');
  const { goBack } = useSmartBackNavigation({ fallback: '/ferramentas-ia-aplicativo' });
  const { user } = usePremiumStatus();
  const { balance: credits, isLoading: creditsLoading, refetch: refetchCredits } = useUpscalerCredits(user?.id);
  
  // Contexto global de jobs - para notificação sonora e trava de navegação
  const { registerJob, updateJobStatus, clearJob: clearGlobalJob } = useAIJob();

  // State
  const [version, setVersion] = useState<'standard' | 'pro'>('standard');
  const [detailDenoise, setDetailDenoise] = useState(0.15);
  const [resolution, setResolution] = useState<'2k' | '4k'>('2k');
  const [useCustomPrompt, setUseCustomPrompt] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [promptCategory, setPromptCategory] = useState<PromptCategory>('pessoas_perto');
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

  // CRITICAL: Instant button lock to prevent duplicate clicks
  const { isSubmitting, startSubmit, endSubmit } = useProcessingButton();
 
   // Active job block modal state
   const [showActiveJobModal, setShowActiveJobModal] = useState(false);
   const [activeToolName, setActiveToolName] = useState<string>('');
   const [activeJobId, setActiveJobId] = useState<string | undefined>();
   const [activeStatus, setActiveStatus] = useState<string | undefined>();
   // Now using centralized checkActiveJob from JobManager

  // Compression modal state
  const [showCompressionModal, setShowCompressionModal] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingDimensions, setPendingDimensions] = useState<{ w: number; h: number } | null>(null);
  const [inputDimensions, setInputDimensions] = useState<{ w: number; h: number } | null>(null);

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
  const realtimeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Initialize session ID (fresh each visit - no recovery)
  useEffect(() => {
    sessionIdRef.current = crypto.randomUUID();
  }, []);

  // Cleanup queued jobs when user leaves page
  useQueueSessionCleanup(sessionIdRef.current, status);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
      }
    };
  }, []);

  // Reset promptCategory when custom prompt is disabled
  useEffect(() => {
    if (!useCustomPrompt) {
      setPromptCategory('pessoas_perto');
      setPessoasFraming('perto');
    }
  }, [useCustomPrompt]);

  // Disable custom prompt when switching to standard version
  useEffect(() => {
    if (version === 'standard') {
      setUseCustomPrompt(false);
    }
  }, [version]);

  // Flag to check if we're in "De Longe" mode (full body photos use different WebApp)
  const isLongeMode = pessoasFraming === 'longe' && promptCategory.startsWith('pessoas');

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
  // Subscribe to Realtime updates when jobId changes
  useEffect(() => {
    if (!jobId) return;

    console.log('[Upscaler] Subscribing to Realtime for job:', jobId);
    
    // Registrar job no contexto global (para som e trava de navegação)
    registerJob(jobId, 'Upscaler Arcano', 'pending');

    // Remove previous channel if exists
    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current);
    }

    const channel = supabase
      .channel(`upscaler-job-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'upscaler_jobs',
          filter: `id=eq.${jobId}`
        },
        (payload) => {
          console.log('[Upscaler] Realtime update:', payload.new);
          const job = payload.new as any;
          
          // Atualizar contexto global (dispara som automaticamente em status terminal)
          updateJobStatus(job.status);

          // Update debug state
          setCurrentStep(job.current_step || job.status);
          if (job.failed_at_step) setFailedAtStep(job.failed_at_step);

          if (job.status === 'completed' && job.output_url) {
            console.log('[Upscaler] Job completed! Output:', job.output_url);
            setOutputImage(job.output_url);
            setStatus('completed');
            setProgress(100);
            setIsWaitingInQueue(false);
            setQueuePosition(0);
            toast.success(t('upscalerTool.toast.success'));
          } else if (job.status === 'failed') {
            console.log('[Upscaler] Job failed:', job.error_message);
            setStatus('error');
            setLastError({
              message: job.error_message || 'Processing failed',
              code: 'TASK_FAILED',
              solution: 'Tente novamente com uma imagem diferente ou configurações menores.'
            });
            setIsWaitingInQueue(false);
            toast.error('Erro no processamento. Tente novamente.');
          } else if (job.status === 'running') {
            console.log('[Upscaler] Job running');
            setStatus('processing');
            setIsWaitingInQueue(false);
            setQueuePosition(0);
            // Start progress animation
            setProgress(prev => Math.min(prev + 5, 90));
          } else if (job.status === 'queued') {
            console.log('[Upscaler] Job queued at position:', job.position);
            setIsWaitingInQueue(true);
            setQueuePosition(job.position || 1);
          }
        }
      )
      .subscribe((status) => {
        console.log('[Upscaler] Realtime subscription status:', status);
      });

    realtimeChannelRef.current = channel;

    return () => {
      console.log('[Upscaler] Cleaning up Realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [jobId, t, registerJob, updateJobStatus]);

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
    // ALWAYS optimize for AI tools (1536px max) to prevent VRAM overflow
    toast.info('Otimizando imagem...');
    const optimizationResult = await optimizeForAI(file);
    const processedFile = optimizationResult.file;

    // Get final dimensions after optimization
    const finalDims = await getImageDimensions(processedFile);
    setInputDimensions({ w: finalDims.width, h: finalDims.height });

    const reader = new FileReader();
    reader.onload = (e) => {
      setInputImage(e.target?.result as string);
      setInputFileName(processedFile.name || file.name);
      setOutputImage(null);
      setStatus('idle');
    };
    reader.readAsDataURL(processedFile);
  }, []);

  // Handle file selection with dimension validation and compression
  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error(t('upscalerTool.errors.selectImage'));
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error(t('upscalerTool.errors.maxSize'));
      return;
    }

    try {
      // Get dimensions first
      const dimensions = await getImageDimensions(file);
      
      // Check if image exceeds limit - show modal instead of error
      if (dimensions.width > MAX_AI_DIMENSION || dimensions.height > MAX_AI_DIMENSION) {
        setPendingFile(file);
        setPendingDimensions({ w: dimensions.width, h: dimensions.height });
        setShowCompressionModal(true);
        return;
      }

      // Image is within limits, process directly
      await processFileWithDimensions(file, dimensions);
    } catch (error) {
      console.error('[Upscaler] Error getting dimensions:', error);
      toast.error('Erro ao processar imagem');
    }
  }, [t, processFileWithDimensions]);

  // Handle compression complete from modal
  const handleCompressionComplete = useCallback(async (compressedFile: File, newWidth: number, newHeight: number) => {
    setShowCompressionModal(false);
    setPendingFile(null);
    setPendingDimensions(null);
    
    toast.success(`Imagem comprimida para ${newWidth}x${newHeight}px`);
    await processFileWithDimensions(compressedFile, { width: newWidth, height: newHeight });
  }, [processFileWithDimensions]);

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

    const creditCost = version === 'pro' ? 80 : 60;
    
    // Optimistic check - backend will validate for real
    if (credits < creditCost) {
      setNoCreditsReason('insufficient');
      setShowNoCreditsModal(true);
      endSubmit();
      return;
    }

    // Credits will be consumed by the backend after successful job start

    setLastError(null);
    setStatus('uploading');
    setProgress(10);

    try {
      // Step 1: Upload image FIRST (before creating job to prevent orphans)
      const base64Data = inputImage.split(',')[1];
      const binaryStr = atob(base64Data);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }

      const ext = (inputFileName || 'image.png').split('.').pop()?.toLowerCase() || 'png';
      const tempId = crypto.randomUUID();
      const storagePath = `upscaler/${user.id}/${tempId}.${ext}`;
      
      setProgress(20);
      console.log('[Upscaler] Uploading image...');
      
      const { error: uploadError } = await supabase.storage
        .from('artes-cloudinary')
        .upload(storagePath, bytes.buffer, {
          contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
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
      const { data: job, error: jobError } = await supabase
        .from('upscaler_jobs')
        .insert({
          session_id: sessionIdRef.current,
          status: 'pending',
          detail_denoise: detailDenoise,
          prompt: getFinalPrompt(),
          user_id: user.id,
          input_file_name: storagePath.split('/').pop() || `${tempId}.${ext}`,
        })
        .select()
        .single();

      if (jobError || !job) {
        throw new Error('Erro ao criar job: ' + (jobError?.message || 'Unknown'));
      }

      console.log('[Upscaler] Job created with image:', job.id);
      setJobId(job.id);
      setProgress(45);

      // Step 3: Call edge function with URL (not base64)
      const creditCost = version === 'pro' ? 80 : 60;
      const resolutionValue = resolution === '4k' ? 4096 : 2048;
      const framingMode = isLongeMode ? 'longe' : 'perto';

      const { data: response, error: fnError } = await supabase.functions.invoke('runninghub-upscaler/run', {
        body: {
          jobId: job.id,
          imageUrl: imageUrl,
          version: version,
          userId: user.id,
           creditCost: creditCost,
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

  // Download result
  const downloadResult = useCallback(() => {
    if (!outputImage) return;

    const link = document.createElement('a');
    link.href = outputImage;
    link.download = `upscaled-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(t('upscalerTool.toast.downloaded'));
  }, [outputImage, t]);

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
    <div className="h-screen overflow-hidden flex flex-col bg-gradient-to-br from-[#0D0221] via-[#1A0A2E] to-[#16082A] text-white">
      {/* Header */}
      <ToolsHeader 
        title={t('upscalerTool.title')}
        onBack={goBack}
      />

      {/* Main Content - Two Column Layout */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 py-2 overflow-y-auto lg:overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-7 gap-2 lg:gap-3 lg:h-full">
          
          {/* Left Side - Controls Panel (~28%) */}
          <div className="lg:col-span-2 flex flex-col gap-2 pb-2 lg:pb-0 lg:overflow-y-auto">
            
            {/* Version Switcher - Compact */}
            <TooltipProvider>
              <ToggleGroup 
                type="single" 
                value={version} 
                onValueChange={(val) => val && setVersion(val as 'standard' | 'pro')}
                className="w-full grid grid-cols-2 gap-0 bg-[#1A0A2E]/50 border border-purple-500/30 rounded-lg p-1"
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <ToggleGroupItem 
                      value="standard" 
                      className={`w-full py-2 px-2 text-xs rounded-md transition-all font-medium ${
                        version === 'standard' 
                          ? 'bg-purple-600 text-white border border-purple-400' 
                          : 'border border-transparent text-purple-300/70 hover:bg-purple-500/10'
                      }`}
                    >
                      Standard
                    </ToggleGroupItem>
                  </TooltipTrigger>
                  <TooltipContent className="bg-black/90 border-purple-500/30">
                    <div className="flex items-center gap-1.5 text-xs text-white">
                      <Clock className="w-3 h-3 text-purple-400" />
                      <span>~2m 20s</span>
                    </div>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <ToggleGroupItem 
                      value="pro" 
                      className={`w-full py-2 px-2 text-xs rounded-md transition-all font-medium flex items-center justify-center gap-1 ${
                        version === 'pro' 
                          ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white border border-purple-400' 
                          : 'border border-transparent text-purple-300/70 hover:bg-purple-500/10'
                      }`}
                    >
                      <Crown className="w-3 h-3" />
                      PRO
                    </ToggleGroupItem>
                  </TooltipTrigger>
                  <TooltipContent className="bg-black/90 border-purple-500/30">
                    <div className="flex items-center gap-1.5 text-xs text-white">
                      <Clock className="w-3 h-3 text-purple-400" />
                      <span>~3m 30s</span>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </ToggleGroup>
            </TooltipProvider>
            
            {/* Estimated Time */}
            <div className="flex items-center justify-center gap-1 text-xs text-white/60">
              <Clock className="w-3 h-3 text-purple-400" />
              <span>{version === 'pro' ? '~3m 30s' : '~2m 20s'}</span>
            </div>

            {/* Image Upload - Compact */}
            <Card 
              className="bg-[#1A0A2E]/50 border-purple-500/20 border-dashed border-2 p-4 cursor-pointer hover:bg-[#1A0A2E]/70 transition-colors"
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
                      <p className="text-[10px] text-purple-300/70">Clique para trocar</p>
                      {inputDimensions && (
                        <span className="text-[10px] text-purple-400">
                          📐 {inputDimensions.w}x{inputDimensions.h}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <Upload className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{t('upscalerTool.upload.dragHere')}</p>
                    <p className="text-[10px] text-purple-300/50">{t('upscalerTool.upload.formats')}</p>
                  </div>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              />
            </Card>

            {/* Image Type Selector - Only show when not using custom prompt */}
            {(!useCustomPrompt || version === 'standard') && (
              <Card className="bg-[#1A0A2E]/50 border-purple-500/20 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="w-3.5 h-3.5 text-pink-400" />
                  <span className="text-xs font-medium text-white">Tipo de Imagem</span>
                </div>
                <ToggleGroup 
                  type="single" 
                  value={promptCategory.startsWith('pessoas') ? 'pessoas' : promptCategory} 
                  onValueChange={(value) => {
                    if (value) {
                      if (value === 'pessoas') {
                        setPromptCategory(`pessoas_${pessoasFraming}` as PromptCategory);
                      } else {
                        setPromptCategory(value as PromptCategory);
                      }
                    }
                  }}
                  className="flex flex-col gap-1"
                >
                  {/* Top row: 3 buttons */}
                  <div className="flex gap-1">
                    {['pessoas', 'comida', 'fotoAntiga'].map((cat) => (
                      <ToggleGroupItem 
                        key={cat}
                        value={cat} 
                        className={`flex-1 px-2 py-1 text-[10px] rounded-md transition-all ${
                          (cat === 'pessoas' ? promptCategory.startsWith('pessoas') : promptCategory === cat)
                            ? 'bg-purple-600 text-white border border-purple-400' 
                            : 'border border-purple-500/30 text-purple-300/70 hover:bg-purple-500/10'
                        }`}
                      >
                        {cat === 'pessoas' ? 'Pessoas' : cat === 'comida' ? 'Comida/Objeto' : 'Foto Antiga'}
                      </ToggleGroupItem>
                    ))}
                  </div>
                  {/* Bottom row: 2 buttons */}
                  <div className="flex gap-1">
                    {['render3d', 'logo'].map((cat) => (
                      <ToggleGroupItem 
                        key={cat}
                        value={cat} 
                        className={`flex-1 px-2 py-1 text-[10px] rounded-md transition-all ${
                          promptCategory === cat
                            ? 'bg-purple-600 text-white border border-purple-400' 
                            : 'border border-purple-500/30 text-purple-300/70 hover:bg-purple-500/10'
                        }`}
                      >
                        {cat === 'render3d' ? 'Selo 3D' : 'Logo/Arte'}
                      </ToggleGroupItem>
                    ))}
                  </div>
                </ToggleGroup>

                {/* Pessoas Framing Selector */}
                {promptCategory.startsWith('pessoas') && (
                 !isSpecialWorkflow && (
                  <div className="mt-3 pt-3 border-t border-purple-500/20">
                    <ToggleGroup 
                      type="single" 
                      value={pessoasFraming} 
                      onValueChange={(value) => {
                        if (value) {
                          setPessoasFraming(value as PessoasFraming);
                          setPromptCategory(`pessoas_${value}` as PromptCategory);
                        }
                      }}
                      className="grid w-full grid-cols-2 gap-2"
                    >
                      <ToggleGroupItem 
                        value="perto" 
                        className={`flex flex-col items-center gap-1 rounded-lg px-2 py-2 transition-all h-auto ${
                          pessoasFraming === 'perto'
                            ? 'bg-purple-600 text-white border border-purple-400' 
                            : 'border border-purple-500/30 text-purple-300/70 hover:bg-purple-500/10'
                        }`}
                      >
                        <div className="w-8 h-8 rounded bg-purple-900/50 flex items-center justify-center border border-purple-500/30 relative">
                          <svg width="24" height="24" viewBox="0 0 48 48" fill="none" className="text-current">
                            <circle cx="24" cy="20" r="14" fill="currentColor" opacity="0.85" />
                            <ellipse cx="24" cy="48" rx="18" ry="14" fill="currentColor" opacity="0.55" />
                          </svg>
                        </div>
                        <span className="text-[10px] font-medium">De Perto</span>
                      </ToggleGroupItem>
                      <ToggleGroupItem 
                        value="longe" 
                        className={`flex flex-col items-center gap-1 rounded-lg px-2 py-2 transition-all h-auto ${
                          pessoasFraming === 'longe'
                            ? 'bg-purple-600 text-white border border-purple-400' 
                            : 'border border-purple-500/30 text-purple-300/70 hover:bg-purple-500/10'
                        }`}
                      >
                        <div className="w-8 h-8 rounded bg-purple-900/50 flex items-center justify-center border border-purple-500/30 relative">
                          <svg width="24" height="24" viewBox="0 0 48 48" fill="none" className="text-current">
                            <circle cx="24" cy="14" r="5" fill="currentColor" opacity="0.85" />
                            <rect x="20" y="19" width="8" height="12" rx="3" fill="currentColor" opacity="0.75" />
                            <rect x="20" y="30" width="3.5" height="13" rx="1.5" fill="currentColor" opacity="0.55" />
                            <rect x="24.5" y="30" width="3.5" height="13" rx="1.5" fill="currentColor" opacity="0.55" />
                          </svg>
                        </div>
                        <span className="text-[10px] font-medium">De Longe</span>
                      </ToggleGroupItem>
                    </ToggleGroup>
                  </div>
                 ))}
              </Card>
            )}

             {/* Detail Level Slider - PRO only, not in Longe mode, not in special workflows */}
             {version === 'pro' && !isLongeMode && !isSpecialWorkflow && (
              <Card className="bg-[#1A0A2E]/50 border-purple-500/20 p-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    <span className="text-xs font-medium text-white">{t('upscalerTool.controls.detailLevel')}</span>
                  </div>
                  <span className="text-xs text-purple-300 font-mono">{detailDenoise.toFixed(2)}</span>
                </div>
                <Slider
                  value={[detailDenoise]}
                  onValueChange={([value]) => setDetailDenoise(value)}
                  min={0}
                  max={1}
                  step={0.01}
                  className="w-full"
                />
                <div className="flex justify-between text-[10px] text-purple-300/50 mt-1">
                  <span>Menos</span>
                  <span>Mais</span>
                </div>
              </Card>
            )}

             {/* Editing Level Slider - PRO + Pessoas + De Perto only */}
             {version === 'pro' && promptCategory === 'pessoas_perto' && (
               <Card className="bg-[#1A0A2E]/50 border-purple-500/20 p-3">
                 <div className="flex items-center justify-between mb-1">
                   <div className="flex items-center gap-1.5">
                     <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                     <span className="text-xs font-medium text-white">Nível de Edição</span>
                   </div>
                   <span className="text-xs text-purple-300 font-mono">{editingLevel.toFixed(2)}</span>
                 </div>
                 <Slider
                   value={[editingLevel]}
                   onValueChange={([value]) => setEditingLevel(value)}
                   min={0}
                   max={1}
                   step={0.01}
                   className="w-full"
                 />
                 <div className="flex justify-between text-[10px] text-purple-300/50 mt-1">
                   <span>Menos Edição</span>
                   <span>Mais Edição</span>
                 </div>
               </Card>
             )}
 
             {/* Comida/Objeto Detail Level Slider (0.70 to 1.00) */}
             {isComidaMode && (
               <Card className="bg-[#1A0A2E]/50 border-purple-500/20 p-3">
                 <div className="flex items-center justify-between mb-1">
                   <div className="flex items-center gap-1.5">
                     <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                     <span className="text-xs font-medium text-white">Nível de Detalhes</span>
                   </div>
                   <span className="text-xs text-purple-300 font-mono">{Math.round(comidaDetailLevel * 100)}%</span>
                 </div>
                 <Slider
                   value={[comidaDetailLevel]}
                   onValueChange={([value]) => setComidaDetailLevel(value)}
                   min={0.70}
                   max={1.00}
                   step={0.01}
                   className="w-full"
                 />
                 <div className="flex justify-between text-[10px] text-purple-300/50 mt-1">
                   <span>Mais Fiel</span>
                   <span>Mais Criativo</span>
                 </div>
               </Card>
             )}
 
             {/* Logo/Arte Detail Level Slider - PRO only */}
             {isLogoMode && version === 'pro' && (
               <Card className="bg-[#1A0A2E]/50 border-purple-500/20 p-3">
                 <div className="flex items-center justify-between mb-1">
                   <div className="flex items-center gap-1.5">
                     <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                     <span className="text-xs font-medium text-white">Nível de Detalhe</span>
                   </div>
                   <span className="text-xs text-purple-300 font-mono">{logoDetailLevel.toFixed(2)}</span>
                 </div>
                 <Slider
                   value={[logoDetailLevel]}
                   onValueChange={([value]) => setLogoDetailLevel(value)}
                   min={0.01}
                   max={1.00}
                   step={0.01}
                   className="w-full"
                 />
                 <div className="flex justify-between text-[10px] text-purple-300/50 mt-1">
                   <span>Mais Fidelidade</span>
                   <span>Mais Criatividade</span>
                 </div>
                 <p className="text-[9px] text-purple-300/40 mt-1 text-center">
                   Recomendado: 0,30 a 0,60
                 </p>
               </Card>
             )}

             {/* Selos 3D Detail Level Slider - PRO only */}
             {isRender3dMode && version === 'pro' && (
               <Card className="bg-[#1A0A2E]/50 border-purple-500/20 p-3">
                 <div className="flex items-center justify-between mb-1">
                   <div className="flex items-center gap-1.5">
                     <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                     <span className="text-xs font-medium text-white">Nível de Detalhe</span>
                   </div>
                   <span className="text-xs text-purple-300 font-mono">{render3dDetailLevel.toFixed(2)}</span>
                 </div>
                 <Slider
                   value={[render3dDetailLevel]}
                   onValueChange={([value]) => setRender3dDetailLevel(value)}
                   min={0.01}
                   max={1.00}
                   step={0.01}
                   className="w-full"
                 />
                 <div className="flex justify-between text-[10px] text-purple-300/50 mt-1">
                   <span>Mais Fidelidade</span>
                   <span>Mais Criatividade</span>
                 </div>
                 <p className="text-[9px] text-purple-300/40 mt-1 text-center">
                   Recomendado: 0,70 a 0,90
                 </p>
               </Card>
             )}

             {/* Resolution Selector - hide for special workflows */}
             {!isSpecialWorkflow && (
            <Card className="bg-[#1A0A2E]/50 border-purple-500/20 p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium text-white">📐 Resolução</span>
              </div>
              <ToggleGroup 
                type="single" 
                value={resolution} 
                onValueChange={(val) => val && setResolution(val as '2k' | '4k')}
                className="flex gap-1"
              >
                <ToggleGroupItem 
                  value="2k" 
                  className={`px-3 py-1.5 text-xs rounded-md transition-all ${
                    resolution === '2k' 
                      ? 'bg-purple-600 text-white border border-purple-400' 
                      : 'border border-purple-500/30 text-purple-300/70 hover:bg-purple-500/10'
                  }`}
                >
                  2K
                </ToggleGroupItem>
                <ToggleGroupItem 
                  value="4k" 
                  className={`px-3 py-1.5 text-xs rounded-md transition-all ${
                    resolution === '4k' 
                      ? 'bg-purple-600 text-white border border-purple-400' 
                      : 'border border-purple-500/30 text-purple-300/70 hover:bg-purple-500/10'
                  }`}
                >
                  4K
                </ToggleGroupItem>
              </ToggleGroup>
            </Card>
             )}

             {/* Custom Prompt - PRO only, not in Longe mode, not in special workflows */}
             {version === 'pro' && !isLongeMode && !isSpecialWorkflow && (
              <Card className="bg-[#1A0A2E]/50 border-purple-500/20 p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-pink-400" />
                    <span className="text-xs font-medium text-white">{t('upscalerTool.controls.usePrompt')}</span>
                  </div>
                  <Switch
                    checked={useCustomPrompt}
                    onCheckedChange={setUseCustomPrompt}
                  />
                </div>
                
                {useCustomPrompt && (
                  <Textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder={t('upscalerTool.controls.promptPlaceholder')}
                    className="min-h-[60px] text-xs bg-[#0D0221]/50 border-purple-500/30 text-white placeholder:text-purple-300/50"
                  />
                )}
              </Card>
            )}

            {/* Generate Button */}
            {inputImage && !isProcessing && status !== 'completed' && (
              <Button
                className="w-full py-3 text-sm font-semibold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg shadow-purple-500/25"
                onClick={processImage}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Iniciando...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    {t('upscalerTool.buttons.increaseQuality')}
                    <span className="ml-2 flex items-center gap-1 text-xs opacity-90">
                      <Coins className="w-3.5 h-3.5" />
                      {version === 'pro' ? '80' : '60'}
                    </span>
                  </>
                )}
              </Button>
            )}

            {/* Completed Actions */}
            {status === 'completed' && (
              <div className="space-y-2">
                <Button
                  className="w-full py-3 text-sm font-semibold bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                  onClick={downloadResult}
                >
                  <Download className="w-4 h-4 mr-2" />
                  {t('upscalerTool.buttons.downloadHD')}
                </Button>
                <Button
                  variant="outline"
                  className="w-full py-3 text-sm border-purple-500/30 text-purple-300 hover:bg-purple-500/20"
                  onClick={resetTool}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  {t('upscalerTool.buttons.processNew')}
                </Button>
              </div>
            )}

            {/* Error State */}
            {status === 'error' && lastError && (
              <Card className="bg-red-950/30 border-red-500/30 p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-1">
                    <p className="text-xs font-medium text-red-300">{lastError.message}</p>
                    {lastError.solution && (
                      <p className="text-[10px] text-purple-300/80">💡 {lastError.solution}</p>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full mt-2 py-2 text-xs border-purple-500/30 text-purple-300 hover:bg-purple-500/20"
                  onClick={resetTool}
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1" />
                  {t('upscalerTool.buttons.tryAgain')}
                </Button>
              </Card>
            )}

            {/* Debug Panel - only visible when debug mode is ON */}
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

          {/* Right Side - Result Viewer (~72%) */}
          <div className="lg:col-span-5 flex flex-col min-h-[280px] lg:min-h-0">
            <Card className="flex-1 bg-[#1A0A2E]/50 border-purple-500/20 overflow-hidden flex flex-col min-h-[250px] lg:min-h-0">
              {/* Warning Banner */}
              {isProcessing && (
                <div className="bg-amber-500/20 border-b border-amber-500/50 px-3 py-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <p className="text-xs text-amber-200">{t('upscalerTool.warnings.dontClose')}</p>
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
                      <p className="text-3xl font-bold text-white mt-2">
                        {queueMessageCombos[currentQueueCombo].position(queuePosition)}
                      </p>
                      <p className="text-sm text-purple-300/70 mt-2">
                        {queueMessageCombos[currentQueueCombo].subtitle}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={cancelQueue}
                      className="text-red-300 hover:text-red-100 hover:bg-red-500/20"
                    >
                      Sair da fila
                    </Button>
                  </div>
                ) : status === 'completed' && outputImage ? (
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
                            <ZoomOut className="w-4 h-4 text-white" />
                          </button>
                          <span className="text-xs font-mono min-w-[3rem] text-center text-white">
                            {Math.round(zoomLevel * 100)}%
                          </span>
                          <button 
                            onClick={() => zoomIn(0.14)}
                            className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
                          >
                            <ZoomIn className="w-4 h-4 text-white" />
                          </button>
                          {zoomLevel > 1 && (
                            <button 
                              onClick={() => resetTransform()}
                              className="p-1.5 hover:bg-white/20 rounded-full transition-colors ml-1"
                            >
                              <RotateCcw className="w-4 h-4 text-white" />
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
                            {/* AFTER image */}
                            <TransformComponent 
                              wrapperStyle={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }} 
                              contentStyle={{ width: '100%', height: '100%' }}
                            >
                              <img 
                                src={outputImage} 
                                alt="Depois" 
                                className="w-full h-full object-contain"
                                draggable={false}
                              />
                            </TransformComponent>

                            {/* BEFORE image - overlay clipped */}
                            <div 
                              className="absolute inset-0 pointer-events-none"
                              style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
                            >
                              <div 
                                ref={beforeTransformRef}
                                className="w-full h-full"
                                style={{ transformOrigin: '0% 0%' }}
                              >
                                <img 
                                  src={inputImage || ''} 
                                  alt="Antes" 
                                  className="w-full h-full object-contain"
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
                                  <div className="w-0.5 h-4 bg-gray-400 rounded-full" />
                                  <div className="w-0.5 h-4 bg-gray-400 rounded-full" />
                                </div>
                              </div>
                            </div>

                            {/* Labels */}
                            <div className="absolute top-2 left-2 px-2 py-1 rounded-full bg-black/90 border border-white/30 text-white text-xs font-bold z-20 pointer-events-none">
                              {t('upscalerTool.labels.before')}
                            </div>
                            <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-purple-600/90 border border-purple-400/50 text-white text-xs font-bold z-20 pointer-events-none">
                              {t('upscalerTool.labels.after')}
                            </div>
                          </div>
                        </div>

                        {/* Zoom Hint */}
                        <div className="hidden sm:block absolute bottom-3 left-1/2 -translate-x-1/2 text-xs text-white/90 bg-black/80 px-4 py-1.5 rounded-full z-20 border border-white/20">
                          🔍 {t('upscalerTool.zoomHint')}
                        </div>
                      </div>
                    )}
                  </TransformWrapper>
                ) : (status === 'uploading' || status === 'processing') && !isWaitingInQueue ? (
                  /* Processing State */
                  <div className="flex flex-col items-center justify-center gap-4">
                    <Loader2 className="w-12 h-12 text-purple-400 animate-spin" />
                    <div className="text-center">
                      <p className="text-lg font-medium text-white">
                        {status === 'uploading' ? t('upscalerTool.status.uploading') : t('upscalerTool.status.processing')}
                      </p>
                      <p className="text-sm text-purple-300/70">
                        {t('upscalerTool.status.mayTake2Min')}
                      </p>
                    </div>
                    {/* Progress bar */}
                    <div className="w-48 h-2 bg-purple-900/50 rounded-full overflow-hidden">
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
                  /* Empty State */
                  <div className="flex flex-col items-center gap-4 text-center text-purple-300/50">
                    <Upload className="w-16 h-16" />
                    <p className="text-sm">Carregue uma imagem para começar</p>
                  </div>
                )}
              </div>
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

      {/* Image Compression Modal */}
      <ImageCompressionModal
        isOpen={showCompressionModal}
        onClose={() => {
          setShowCompressionModal(false);
          setPendingFile(null);
          setPendingDimensions(null);
        }}
        file={pendingFile}
        originalWidth={pendingDimensions?.w || 0}
        originalHeight={pendingDimensions?.h || 0}
        onCompress={handleCompressionComplete}
      />
    </div>
  );
};

export default UpscalerArcanoTool;
