import { useState, useRef, useCallback, useEffect } from 'react';
import { ArrowLeft, Download, ImagePlus, Sparkles, X, Loader2, Paperclip, Coins, RefreshCw, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { useCredits } from '@/contexts/CreditsContext';
import { useAIToolSettings } from '@/hooks/useAIToolSettings';
import { useSmartBackNavigation } from '@/hooks/useSmartBackNavigation';
import { useProcessingButton } from '@/hooks/useProcessingButton';
import { useQueueSessionCleanup } from '@/hooks/useQueueSessionCleanup';
import { useJobStatusSync } from '@/hooks/useJobStatusSync';
import { useJobPendingWatchdog } from '@/hooks/useJobPendingWatchdog';
import { useNotificationTokenRecovery } from '@/hooks/useNotificationTokenRecovery';
import { useAIJob } from '@/contexts/AIJobContext';
import { useResilientDownload } from '@/hooks/useResilientDownload';
import { optimizeForAI } from '@/hooks/useImageOptimizer';
import { createJob, startJob, checkActiveJob, cancelJob as centralCancelJob } from '@/ai/JobManager';
import { uploadToStorage } from '@/ai/JobManager';
import { getAIErrorMessage } from '@/utils/errorMessages';
import NoCreditsModal from '@/components/upscaler/NoCreditsModal';
import ActiveJobBlockModal from '@/components/ai-tools/ActiveJobBlockModal';
import { DownloadProgressOverlay, NotificationPromptToast } from '@/components/ai-tools';
import AppLayout from '@/components/layout/AppLayout';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';

const ASPECT_RATIOS = [
  { ratio: '1:1',   label: 'Quadrado',      w: 12, h: 12 },
  { ratio: '3:4',   label: 'Feed Vertical',  w: 10, h: 13 },
  { ratio: '16:9',  label: 'Wide',           w: 16, h: 9 },
] as const;

const ASPECT_RATIOS_WITH_STORIES = [
  { ratio: '1:1',   label: 'Quadrado',      w: 12, h: 12 },
  { ratio: '3:4',   label: 'Feed Vertical',  w: 10, h: 13 },
  { ratio: '16:9',  label: 'Wide',           w: 16, h: 9 },
  { ratio: '9:16',  label: 'Stories',         w: 9, h: 16 },
] as const;

const ENGINE_STORAGE_KEY = 'gerar-imagem:selected-engine';

const GerarImagemTool = () => {
  const { goBack } = useSmartBackNavigation({ fallback: '/ferramentas-ia-aplicativo' });
  const { user, planType } = usePremiumStatus();
  const { balance: credits, refetch: refetchCredits, checkBalance, isUnlimited, isGptImageFreeTrial, gptImageFreeUntil } = useCredits();
  // Acesso liberado para todos com créditos (avulsos ou de plano)
  const { getCreditCost } = useAIToolSettings();
  const { isSubmitting, startSubmit, endSubmit } = useProcessingButton();
  const { registerJob } = useAIJob();
  const { isDownloading, progress: downloadProgress, download: resilientDownload } = useResilientDownload();

  const [prompt, setPrompt] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<string>('1:1');
  const [aspectDropdownOpen, setAspectDropdownOpen] = useState(false);
  const aspectDropdownRef = useRef<HTMLDivElement>(null);
  const [engine, setEngine] = useState<'flux2_klein' | 'nano_banana' | 'gpt_image_2' | 'gpt_image_evolink'>(() => {
    try {
      const savedEngine = sessionStorage.getItem(ENGINE_STORAGE_KEY);
      return savedEngine === 'nano_banana' ? 'nano_banana' : savedEngine === 'gpt_image_2' ? 'gpt_image_evolink' : savedEngine === 'gpt_image_evolink' ? 'gpt_image_evolink' : 'flux2_klein';
    } catch {
      return 'flux2_klein';
    }
  });
  const [engineDropdownOpen, setEngineDropdownOpen] = useState(false);
  const engineDropdownRef = useRef<HTMLDivElement>(null);
  const [referenceImages, setReferenceImages] = useState<{ file: File; preview: string }[]>([]);

  // Job state
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('idle');
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [queuePosition, setQueuePosition] = useState<number>(0);
  const [progress, setProgress] = useState(0);

  const [showNoCreditsModal, setShowNoCreditsModal] = useState(false);
  const [noCreditsReason, setNoCreditsReason] = useState<'not_logged' | 'insufficient'>('insufficient');
  const [showActiveJobModal, setShowActiveJobModal] = useState(false);
  const [activeJobToolName, setActiveJobToolName] = useState('');
  const [activeJobId, setActiveJobId] = useState<string | undefined>();
  const [activeStatus, setActiveStatus] = useState<string | undefined>();
  const [showReconcileButton, setShowReconcileButton] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sessionIdRef = useRef(crypto.randomUUID());
  const reconcileTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const effectiveEngineRef = useRef<'flux2_klein' | 'nano_banana' | 'gpt_image_2' | 'gpt_image_evolink'>('flux2_klein');
  const gptPollIntervalRef = useRef<ReturnType<typeof setInterval>>();

  const isGptEngine = engine === 'gpt_image_2' || engine === 'gpt_image_evolink';
  const creditCost = isUnlimited ? 0 : (isGptEngine && isGptImageFreeTrial) ? 0 : (engine === 'flux2_klein' ? 50 : engine === 'gpt_image_2' ? 80 : engine === 'gpt_image_evolink' ? 80 : getCreditCost('gerar_imagem', 100));

  // Dynamic max refs: 4 for GPT Image 2, 5 for others
  const maxRefs = (engine === 'gpt_image_2' || engine === 'gpt_image_evolink') ? 4 : 5;

  // Aspect ratios: GPT Image engines don't support 9:16
  const availableAspectRatios = (engine === 'gpt_image_2' || engine === 'gpt_image_evolink') ? ASPECT_RATIOS : ASPECT_RATIOS_WITH_STORIES;

  // Reset aspect ratio if switching to GPT Image 2 with unsupported ratio
  useEffect(() => {
    if ((engine === 'gpt_image_2' || engine === 'gpt_image_evolink') && aspectRatio === '9:16') {
      setAspectRatio('3:4');
    }
    // Trim excess reference images when switching to GPT Image engines
    if ((engine === 'gpt_image_2' || engine === 'gpt_image_evolink') && referenceImages.length > 4) {
      setReferenceImages(prev => prev.slice(0, 4));
    }
  }, [engine]);

  const isProcessing = ['pending', 'starting', 'running', 'queued'].includes(status);

  // Session cleanup
  useQueueSessionCleanup(sessionIdRef.current, status);

  useEffect(() => {
    try {
      sessionStorage.setItem(ENGINE_STORAGE_KEY, engine);
    } catch {}
  }, [engine]);

  // Close aspect dropdown on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (aspectDropdownRef.current && !aspectDropdownRef.current.contains(e.target as Node)) {
        setAspectDropdownOpen(false);
      }
      if (engineDropdownRef.current && !engineDropdownRef.current.contains(e.target as Node)) {
        setEngineDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Triple sync
  useJobStatusSync({
    jobId,
    toolType: 'image_generator',
    enabled: isProcessing && !!jobId,
    onStatusChange: (update) => {
      setStatus(update.status);
      if (update.position !== undefined) setQueuePosition(update.position);
      if (update.currentStep) {
        // Progress mapping
        const stepProgress: Record<string, number> = {
          'validating': 10, 'downloading_ref_image_1': 15, 'uploading_ref_image_1': 20,
          'consuming_credits': 30, 'delegating_to_queue': 40, 'starting': 50, 'running': 60,
        };
        setProgress(stepProgress[update.currentStep] || progress);
      }
      if (update.status === 'completed' && update.outputUrl) {
        setResultUrl(update.outputUrl);
        setProgress(100);
        refetchCredits();
        toast.success('Imagem gerada com sucesso!');
      } else if (update.status === 'failed') {
        setErrorMessage(update.errorMessage || 'Erro ao gerar imagem');
        const errInfo = getAIErrorMessage(update.errorMessage || 'Erro desconhecido');
        toast.error(errInfo.message);
        refetchCredits();
      }
    },
    onGlobalStatusChange: (s) => {
      if (jobId) registerJob(jobId, 'image_generator', s);
    },
  });

  // Pending watchdog
  useJobPendingWatchdog({
    jobId,
    toolType: 'image_generator',
    enabled: status === 'pending',
    onJobFailed: (msg: string) => {
      setStatus('failed');
      setErrorMessage(msg || 'Servidor não respondeu. Tente novamente.');
      refetchCredits();
    },
  });

  // Notification token recovery
  useNotificationTokenRecovery({
    userId: user?.id,
    toolTable: 'image_generator_jobs',
    onRecovery: (result) => {
      if (result.outputUrl) {
        setResultUrl(result.outputUrl);
        setStatus('completed');
      }
      if (result.jobId) setJobId(result.jobId);
      if (result.status === 'failed') {
        setStatus('failed');
        setErrorMessage('Falha na geração');
      }
    },
  });

  // Reconcile timer
  useEffect(() => {
    if (reconcileTimerRef.current) clearTimeout(reconcileTimerRef.current);
    if (isProcessing && jobId) {
      reconcileTimerRef.current = setTimeout(() => setShowReconcileButton(true), 60000);
    } else {
      setShowReconcileButton(false);
    }
    return () => { if (reconcileTimerRef.current) clearTimeout(reconcileTimerRef.current); };
  }, [isProcessing, jobId]);

  // GPT Image client-side polling
  const stopGptImagePolling = useCallback(() => {
    if (gptPollIntervalRef.current) {
      clearInterval(gptPollIntervalRef.current);
      gptPollIntervalRef.current = undefined;
    }
  }, []);

  const startGptImagePolling = useCallback((pollJobId: string) => {
    stopGptImagePolling();
    let pollCount = 0;
    const MAX_CLIENT_POLLS = 120; // 120 × 5s = 10 min max
    gptPollIntervalRef.current = setInterval(async () => {
      pollCount++;
      if (pollCount > MAX_CLIENT_POLLS) {
        stopGptImagePolling();
        setStatus('failed');
        setErrorMessage('Tempo esgotado na geração.');
        toast.error('Tempo esgotado. Tente novamente.');
        refetchCredits();
        return;
      }
      try {
        const pollFunction = effectiveEngineRef.current === 'gpt_image_evolink' ? 'evolink-gpt-image/poll' : 'runninghub-gpt-image/poll';
        const { data } = await supabase.functions.invoke(pollFunction, {
          body: { jobId: pollJobId },
        });
        if (data?.status === 'completed' && data?.outputUrl) {
          stopGptImagePolling();
          setResultUrl(data.outputUrl);
          setStatus('completed');
          setProgress(100);
          toast.success('Imagem gerada com sucesso!');
          refetchCredits();
        } else if (data?.status === 'failed') {
          stopGptImagePolling();
          setStatus('failed');
          setErrorMessage(data.error || 'Falha na geração');
          const errInfo = getAIErrorMessage(data.error || 'Erro');
          toast.error(errInfo.message);
          refetchCredits();
        } else {
          // Still running — update progress
          setProgress(Math.min(90, 40 + pollCount));
        }
      } catch (e) {
        console.warn('[GerarImagem] GPT poll error:', e);
      }
    }, 5000);
  }, [stopGptImagePolling, refetchCredits]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => stopGptImagePolling();
  }, [stopGptImagePolling]);

  // File processing
  const processFiles = useCallback((files: File[]) => {
    const remaining = maxRefs - referenceImages.length;
    const toProcess = files.filter(f => f.type.startsWith('image/')).slice(0, remaining);
    for (const file of toProcess) {
      const preview = URL.createObjectURL(file);
      setReferenceImages(prev => {
        if (prev.length >= maxRefs) return prev;
        return [...prev, { file, preview }];
      });
    }
  }, [referenceImages.length, maxRefs]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    processFiles(Array.from(files));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeReferenceImage = (index: number) => {
    setReferenceImages(prev => {
      const removed = prev[index];
      if (removed) URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  // Drag & drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (referenceImages.length < maxRefs) setIsDragOver(true);
  }, [referenceImages.length, maxRefs]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setIsDragOver(false);
    processFiles(Array.from(e.dataTransfer.files));
  }, [processFiles]);

  // Ctrl+V paste
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (referenceImages.length >= maxRefs) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      const imageFiles: File[] = [];
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) imageFiles.push(file);
        }
      }
      if (imageFiles.length > 0) processFiles(imageFiles);
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [processFiles, referenceImages.length, maxRefs]);

  // Reset state for new generation
  const resetJobState = () => {
    setJobId(null);
    setStatus('idle');
    setResultUrl(null);
    setErrorMessage(null);
    setQueuePosition(0);
    setProgress(0);
    setShowReconcileButton(false);
  };

  // Generate
  const handleGenerate = async () => {
    if (!prompt.trim()) { toast.error('Digite um prompt para gerar a imagem'); return; }
    if (!user?.id) { setNoCreditsReason('not_logged'); setShowNoCreditsModal(true); return; }
    if (!startSubmit()) return;

    resetJobState();

    try {
      // Check active job
      const activeCheck = await checkActiveJob(user.id);
      if (activeCheck.hasActiveJob) {
        setActiveJobToolName(activeCheck.activeTool || 'outra ferramenta');
        setActiveJobId(activeCheck.activeJobId);
        setActiveStatus(activeCheck.activeStatus);
        setShowActiveJobModal(true);
        endSubmit();
        return;
      }

      // Check credits
      const freshCredits = await checkBalance();
      if (freshCredits < creditCost) {
        setNoCreditsReason('insufficient');
        setShowNoCreditsModal(true);
        endSubmit();
        return;
      }

      setStatus('pending');
      setProgress(5);

      // Check Nano Banana limit for Unlimited users — silently redirect to Flux2 Klein if exceeded
      let effectiveEngine = engine;
      if (engine === 'nano_banana') {
        try {
          const { data: limitData } = await supabase.rpc('check_nano_banana_limit', { _user_id: user.id });
          if (limitData && typeof limitData === 'object' && (limitData as any).exceeded) {
            // 80% chance redirect to Flux2 Klein, 20% chance stay on Nano Banana
            const roll = Math.random();
            if (roll < 0.8) {
              console.log(`[GerarImagem] Nano Banana limit exceeded, random roll ${roll.toFixed(3)} < 0.8 → redirecting to Flux2 Klein`);
              effectiveEngine = 'flux2_klein';
            } else {
              console.log(`[GerarImagem] Nano Banana limit exceeded, random roll ${roll.toFixed(3)} >= 0.8 → keeping Nano Banana`);
            }
          }
          // Increment counter for all nano_banana generations (even redirected ones)
          void supabase.rpc('increment_nano_banana_usage', { _user_id: user.id }).then(() => {
            console.log('[GerarImagem] Nano Banana usage incremented');
          });
        } catch (err) {
          console.warn('[GerarImagem] Failed to check nano banana limit, proceeding normally:', err);
        }
      }

      effectiveEngineRef.current = effectiveEngine;

      if (effectiveEngine === 'flux2_klein') {
        // ========== FLUX2 KLEIN FLOW ==========
        // Optimize and upload reference images
        const uploadedUrls: string[] = [];
        for (let i = 0; i < referenceImages.length; i++) {
          toast.info(`Otimizando imagem ${i + 1}/${referenceImages.length}...`);
          const optimized = await optimizeForAI(referenceImages[i].file);
          const uploadResult = await uploadToStorage(optimized.file, 'image-generator', user.id);
          if (!uploadResult.url) throw new Error(`Falha ao enviar imagem ${i + 1}`);
          uploadedUrls.push(uploadResult.url);
          setProgress(5 + Math.round((i + 1) / referenceImages.length * 15));
        }

        const { jobId: newJobId, error: createError } = await createJob('image_generator', user.id, sessionIdRef.current, {
          prompt: prompt.trim(),
          aspect_ratio: aspectRatio,
          model: 'flux2_klein',
          engine: 'flux2_klein',
          input_urls: uploadedUrls,
        });

        if (createError || !newJobId) throw new Error(createError || 'Falha ao criar job');

        setJobId(newJobId);
        registerJob(newJobId, 'image_generator', 'pending');
        setStatus('running');
        setProgress(20);

        // Call Flux2 Klein edge function directly
        const { data, error } = await supabase.functions.invoke('runninghub-flux2-klein/run', {
          body: {
            jobId: newJobId,
            prompt: prompt.trim(),
            aspectRatio,
            creditCost,
            referenceImageUrls: uploadedUrls,
          },
        });

        if (error) {
          const errMsg = error.message || 'Erro desconhecido';
          setStatus('failed');
          setErrorMessage(errMsg);
          const errInfo = getAIErrorMessage(errMsg);
          toast.error(errInfo.message);
          refetchCredits();
          endSubmit();
          return;
        }

        if (data?.code === 'INSUFFICIENT_CREDITS') {
          setNoCreditsReason('insufficient');
          setShowNoCreditsModal(true);
          resetJobState();
          refetchCredits();
          endSubmit();
          return;
        }

        if (data?.error && !data?.success) {
          setStatus('failed');
          setErrorMessage(data.error);
          const errInfo = getAIErrorMessage(data.error);
          toast.error(errInfo.message);
          refetchCredits();
          endSubmit();
          return;
        }

        if (data?.success && data?.outputUrl) {
          setResultUrl(data.outputUrl);
          setStatus('completed');
          setProgress(100);
          toast.success('Imagem gerada com sucesso!');
          refetchCredits();
        }

      } else {
        // ========== NANO BANANA FLOW (unchanged) ==========
        if (effectiveEngine === 'nano_banana') {
        // Optimize and upload reference images
        const uploadedUrls: string[] = [];
        for (let i = 0; i < referenceImages.length; i++) {
          toast.info(`Otimizando imagem ${i + 1}/${referenceImages.length}...`);
          const optimized = await optimizeForAI(referenceImages[i].file);
          const uploadResult = await uploadToStorage(optimized.file, 'image-generator', user.id);
          if (!uploadResult.url) throw new Error(`Falha ao enviar imagem ${i + 1}`);
          uploadedUrls.push(uploadResult.url);
          setProgress(5 + Math.round((i + 1) / referenceImages.length * 15));
        }

        // Create job in DB
        const { jobId: newJobId, error: createError } = await createJob('image_generator', user.id, sessionIdRef.current, {
          prompt: prompt.trim(),
          aspect_ratio: aspectRatio,
          model: 'runninghub',
          engine: 'nano_banana',
          input_urls: uploadedUrls,
        });

        if (createError || !newJobId) {
          throw new Error(createError || 'Falha ao criar job');
        }

        setJobId(newJobId);
        registerJob(newJobId, 'image_generator', 'pending');

        // Start job via edge function
        const result = await startJob('image_generator', newJobId, {
          referenceImageUrls: uploadedUrls,
          aspectRatio,
          creditCost,
          prompt: prompt.trim(),
        });

        if (!result.success) {
          if (result.code === 'INSUFFICIENT_CREDITS') {
            setNoCreditsReason('insufficient');
            setShowNoCreditsModal(true);
            resetJobState();
          } else {
            setStatus('failed');
            setErrorMessage(result.error || 'Erro desconhecido');
            const errInfo = getAIErrorMessage(result.error || 'Erro desconhecido');
            toast.error(errInfo.message);
          }
          endSubmit();
          return;
        }

        if (result.queued) {
          setStatus('queued');
          setQueuePosition(result.position || 0);
          toast.info(`Na fila — posição ${result.position}`);
        }
        } else {
          // ========== GPT IMAGE FLOW (RunningHub or Evolink) ==========
          const uploadedUrls: string[] = [];
          for (let i = 0; i < referenceImages.length; i++) {
            toast.info(`Otimizando imagem ${i + 1}/${referenceImages.length}...`);
            const optimized = await optimizeForAI(referenceImages[i].file);
            const uploadResult = await uploadToStorage(optimized.file, 'image-generator', user.id);
            if (!uploadResult.url) throw new Error(`Falha ao enviar imagem ${i + 1}`);
            uploadedUrls.push(uploadResult.url);
            setProgress(5 + Math.round((i + 1) / referenceImages.length * 15));
          }

          const { jobId: newJobId, error: createError } = await createJob('image_generator', user.id, sessionIdRef.current, {
            prompt: prompt.trim(),
            aspect_ratio: aspectRatio,
            model: 'gpt_image_2',
            engine: effectiveEngine,
            input_urls: uploadedUrls,
          });

          if (createError || !newJobId) throw new Error(createError || 'Falha ao criar job');

          setJobId(newJobId);
          registerJob(newJobId, 'image_generator', 'pending');
          setStatus('running');
          setProgress(20);

          // Call GPT Image edge function (submit only — returns immediately)
          const runFunction = effectiveEngine === 'gpt_image_evolink' ? 'evolink-gpt-image/run' : 'runninghub-gpt-image/run';
          const { data: runData, error: runError } = await supabase.functions.invoke(runFunction, {
            body: {
              jobId: newJobId,
              prompt: prompt.trim(),
              aspectRatio,
              creditCost,
              referenceImageUrls: uploadedUrls,
            },
          });

          if (runError) {
            const errMsg = runError.message || 'Erro desconhecido';
            setStatus('failed');
            setErrorMessage(errMsg);
            const errInfo = getAIErrorMessage(errMsg);
            toast.error(errInfo.message);
            refetchCredits();
            endSubmit();
            return;
          }

          if (runData?.code === 'INSUFFICIENT_CREDITS') {
            setNoCreditsReason('insufficient');
            setShowNoCreditsModal(true);
            resetJobState();
            refetchCredits();
            endSubmit();
            return;
          }

          if (runData?.error && !runData?.success) {
            setStatus('failed');
            setErrorMessage(runData.error);
            const errInfo = getAIErrorMessage(runData.error);
            toast.error(errInfo.message);
            refetchCredits();
            endSubmit();
            return;
          }

          // Submit succeeded — start client-side polling
          if (runData?.success) {
            setStatus('running');
            setProgress(40);
            startGptImagePolling(newJobId);
          }
        }
      }

      // useJobStatusSync handles the rest for Nano Banana

    } catch (error: any) {
      console.error('[GerarImagem] Error:', error);
      setStatus('failed');
      setErrorMessage(error.message || 'Erro ao gerar imagem');
      const errInfo = getAIErrorMessage(error.message || 'Erro desconhecido');
      toast.error(errInfo.message);

      // Defensive close
      if (jobId) {
        try {
          await supabase.rpc('mark_pending_job_as_failed' as any, { p_table_name: 'image_generator_jobs', p_job_id: jobId });
        } catch {}
      }
    } finally {
      endSubmit();
    }
  };

  const handleReconcile = async () => {
    if (!jobId) return;
    toast.info('Verificando status...');
    try {
      if (effectiveEngineRef.current === 'gpt_image_2' || effectiveEngineRef.current === 'gpt_image_evolink') {
        // GPT Image: reconcile via appropriate edge function
        const reconcileFunc = effectiveEngineRef.current === 'gpt_image_evolink' ? 'evolink-gpt-image/reconcile' : 'runninghub-gpt-image/reconcile';
        const { data } = await supabase.functions.invoke(reconcileFunc, {
          body: { jobId },
        });
        if (data?.status === 'completed' && data?.outputUrl) {
          setStatus('completed');
          setResultUrl(data.outputUrl);
          setProgress(100);
          toast.success('Imagem recuperada!');
          refetchCredits();
        } else if (data?.status === 'failed') {
          setStatus('failed');
          setErrorMessage(data.error || 'Falha');
          toast.error('Geração falhou.');
          refetchCredits();
        } else {
          toast.info('Ainda processando...');
        }
        return;
      }

      const reconcileEndpoint = effectiveEngineRef.current === 'flux2_klein' ? 'runninghub-flux2-klein/reconcile' : 'runninghub-image-generator/reconcile';
      const { data } = await supabase.functions.invoke(reconcileEndpoint, {
        body: { jobId },
      });
      if (data?.reconciled && data?.status === 'completed' && data?.outputUrl) {
        setStatus('completed');
        setResultUrl(data.outputUrl);
        setProgress(100);
        toast.success('Imagem recuperada!');
        refetchCredits();
      } else if (data?.reconciled && data?.status === 'failed') {
        setStatus('failed');
        setErrorMessage('Falha confirmada pelo servidor');
        toast.error('Geração falhou.');
        refetchCredits();
      } else if (data?.alreadyFinalized) {
        if (data.status === 'completed' && data.outputUrl) {
          setStatus('completed');
          setResultUrl(data.outputUrl);
          setProgress(100);
        }
      } else {
        toast.info('Ainda processando...');
      }
    } catch {
      toast.error('Erro ao verificar status');
    }
  };

  const handleDownload = () => {
    if (resultUrl) {
      resilientDownload({ url: resultUrl, filename: `gerar-imagem-${Date.now()}.png` });
    }
  };

  const handleNewGeneration = () => {
    resetJobState();
  };

  const handleCancel = async () => {
    if (!jobId) return;
    const result = await centralCancelJob('image_generator', jobId);
    if (result.success) {
      resetJobState();
      toast.success(result.refundedAmount > 0 ? `Cancelado. ${result.refundedAmount} créditos estornados.` : 'Cancelado.');
      refetchCredits();
    }
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-md border-b border-border px-4 py-3">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <div className="flex items-center gap-3">
              <button onClick={goBack} className="text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-muted-foreground" />
                  Gerar Imagem
                </h1>
                <p className="text-[10px] text-muted-foreground">IA Generativa</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main content area */}
        <div
          className="flex-1 flex items-center justify-center p-4 relative"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Drag overlay */}
          {isDragOver && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-background/60 backdrop-blur-sm border-2 border-dashed border-border pointer-events-none">
              <ImagePlus className="h-12 w-12 text-muted-foreground mb-2" />
              <p className="text-muted-foreground font-semibold text-sm">Solte para adicionar referência</p>
            </div>
          )}

          {/* Download progress overlay */}
          {isDownloading && <DownloadProgressOverlay isVisible={isDownloading} progress={downloadProgress} />}

          {resultUrl ? (
            <div className="w-full h-full flex flex-col items-center justify-center space-y-3 overflow-hidden">
              <div className="rounded-2xl overflow-hidden border border-border bg-muted/50 shadow-2xl max-w-2xl max-h-full flex items-center justify-center">
                <TransformWrapper>
                  <TransformComponent wrapperClass="!w-full !h-full !flex !items-center !justify-center" contentClass="!w-full !h-full !flex !items-center !justify-center">
                    <img src={resultUrl} alt="Imagem gerada" className="max-w-full max-h-[calc(100vh-180px)] object-contain" />
                  </TransformComponent>
                </TransformWrapper>
              </div>
            </div>
          ) : isProcessing ? (
            <div className="flex flex-col items-center gap-4 text-muted-foreground">
              <div className="relative">
                <div className="w-20 h-20 rounded-full border-2 border-border flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              </div>
              {status === 'queued' && queuePosition > 0 ? (
                <div className="text-center space-y-1">
                  <p className="text-sm font-medium">Na fila — posição {queuePosition}</p>
                  <p className="text-xs text-muted-foreground">Aguardando vaga...</p>
                </div>
              ) : (
                <p className="text-sm">Gerando imagem...</p>
              )}
              {/* Progress bar */}
              <div className="w-48 h-1.5 rounded-full bg-accent overflow-hidden">
                <div className="h-full rounded-full bg-accent0 transition-all duration-700" style={{ width: `${progress}%` }} />
              </div>
              {/* Cancel & reconcile */}
              <div className="flex gap-2">
                {status === 'queued' && (
                  <button onClick={handleCancel} className="text-xs text-red-400 hover:text-red-300 underline">Cancelar</button>
                )}
                {showReconcileButton && (
                  <button onClick={handleReconcile} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-muted-foreground">
                    <RefreshCw className="h-3 w-3" /> Verificar status
                  </button>
                )}
              </div>
            </div>
          ) : status === 'failed' ? (
            <div className="flex flex-col items-center gap-3 text-red-400">
              <p className="text-sm text-center font-medium">{(() => { const info = getAIErrorMessage(errorMessage || ''); return info.message; })()}</p>
              <p className="text-xs text-center text-red-300/70">{(() => { const info = getAIErrorMessage(errorMessage || ''); return info.solution; })()}</p>
              <button onClick={resetJobState} className="text-xs text-muted-foreground hover:text-muted-foreground underline">Tentar novamente</button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <Sparkles className="h-12 w-12 opacity-50" />
              <p className="text-sm text-center text-foreground font-medium">Digite um prompt e clique em Gerar</p>
              <p className="text-xs text-center text-muted-foreground/70">
                Arraste imagens aqui ou cole com Ctrl+V para adicionar referências
              </p>
            </div>
          )}
        </div>

        {/* Bottom bar */}
        <div className="sticky bottom-0 z-20 bg-background/95 backdrop-blur-xl border-t border-slate-500/15 w-full">
          {/* Reference images strip */}
          {referenceImages.length > 0 && (
            <div className="px-3 pt-2">
              <div className="max-w-3xl mx-auto flex gap-2 items-center bg-card/90 rounded-xl p-2 border border-border overflow-x-auto">
                {referenceImages.map((img, idx) => (
                  <div key={idx} className="relative w-14 h-14 rounded-lg overflow-visible flex-shrink-0">
                    <img src={img.preview} alt="" className="w-full h-full object-cover rounded-lg border border-border" />
                    <button
                      onClick={() => removeReferenceImage(idx)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-600 hover:bg-red-500/100 rounded-full flex items-center justify-center shadow-lg transition-colors z-10"
                    >
                      <X className="h-3 w-3 text-foreground" />
                    </button>
                  </div>
                ))}
                <span className="text-[10px] text-muted-foreground ml-1 flex-shrink-0">{referenceImages.length}/{maxRefs}</span>
              </div>
            </div>
          )}

          <div className="max-w-3xl mx-auto px-3 py-3 space-y-2">

            {/* Prompt input row */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing || referenceImages.length >= maxRefs}
                className="relative flex-shrink-0 w-9 h-9 rounded-full border border-border bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-border/60 transition-colors disabled:opacity-40 self-end mb-0.5"
              >
                <Paperclip className="h-4 w-4" />
                {referenceImages.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-green-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {referenceImages.length}
                  </span>
                )}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileSelect} className="hidden" />

              <textarea
                ref={textareaRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Descreva a imagem que você quer gerar..."
                rows={2}
                className="flex-1 bg-accent border border-slate-500/25 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:border-border transition-colors [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                style={{ minHeight: '56px', maxHeight: '100px', overflow: 'auto' }}
                disabled={isProcessing}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = '56px';
                  target.style.height = Math.min(target.scrollHeight, 100) + 'px';
                }}
              />
            </div>

            {/* Controls row */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Engine dropdown */}
              <div className="relative" ref={engineDropdownRef}>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => setEngineDropdownOpen(!engineDropdownOpen)}
                  className="flex items-center gap-1.5 bg-accent border border-slate-500/25 rounded-lg pl-2 pr-5 py-1.5 text-[11px] text-muted-foreground font-medium cursor-pointer hover:border-border disabled:opacity-40 transition-colors relative"
                >
                  <span>{engine === 'flux2_klein' ? '⚡ Flux2 Klein' : engine === 'gpt_image_2' ? '🎨 GPT Image 2' : engine === 'gpt_image_evolink' ? '🌐 GPT Image Evolink' : '🍌 Nano Banana'}</span>
                  <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                </button>
                {engineDropdownOpen && (
                  <div className="absolute bottom-full mb-1 left-0 z-50 bg-popover border border-border rounded-lg shadow-xl py-1 min-w-[150px]">
                    {([
                      { value: 'flux2_klein' as const, label: '⚡ Flux2 Klein' },
                      { value: 'nano_banana' as const, label: '🍌 Nano Banana' },
                      { value: 'gpt_image_evolink' as const, label: '🌐 GPT Image Evolink' },
                    ]).map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => { setEngine(opt.value); setEngineDropdownOpen(false); }}
                        className={`flex items-center gap-2 w-full px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                          engine === opt.value ? 'text-muted-foreground bg-accent0/15' : 'text-muted-foreground hover:bg-accent0/15 hover:text-foreground'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* GPT Image Free Trial indicator */}
              {isGptEngine && isGptImageFreeTrial && gptImageFreeUntil && (
                <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-[10px] text-emerald-400 font-bold animate-pulse">
                  🎁 Grátis por {Math.max(1, Math.ceil((new Date(gptImageFreeUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} dia{Math.ceil((new Date(gptImageFreeUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) !== 1 ? 's' : ''}
                </span>
              )}

              {/* Aspect ratio dropdown */}
              <div className="relative" ref={aspectDropdownRef}>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => setAspectDropdownOpen(!aspectDropdownOpen)}
                  className="flex items-center gap-1.5 bg-accent border border-slate-500/25 rounded-lg pl-2 pr-5 py-1.5 text-[11px] text-muted-foreground font-medium cursor-pointer hover:border-border disabled:opacity-40 transition-colors relative"
                >
                  {(() => {
                    const current = ASPECT_RATIOS.find(a => a.ratio === aspectRatio) || ASPECT_RATIOS[0];
                    return (
                      <>
                        <svg width={current.w} height={current.h} viewBox={`0 0 ${current.w} ${current.h}`} className="flex-shrink-0">
                          <rect x="0.5" y="0.5" width={current.w - 1} height={current.h - 1} rx="1" stroke="currentColor" strokeWidth="1" fill="rgba(217,70,239,0.15)" />
                        </svg>
                        <span>{current.label}</span>
                      </>
                    );
                  })()}
                  <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                </button>
                {aspectDropdownOpen && (
                  <div className="absolute bottom-full mb-1 left-0 z-50 bg-popover border border-border rounded-lg shadow-xl py-1 min-w-[140px]">
                    {availableAspectRatios.map(({ ratio, label, w, h }) => {
                      const isSelected = aspectRatio === ratio;
                      return (
                        <button
                          key={ratio}
                          type="button"
                          onClick={() => { setAspectRatio(ratio); setAspectDropdownOpen(false); }}
                          className={`flex items-center gap-2 w-full px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                            isSelected ? 'text-muted-foreground bg-accent0/15' : 'text-muted-foreground hover:bg-accent0/15 hover:text-foreground'
                          }`}
                        >
                          <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="flex-shrink-0">
                            <rect x="0.5" y="0.5" width={w - 1} height={h - 1} rx="1"
                              stroke="currentColor" strokeWidth="1"
                              fill={isSelected ? 'rgba(217,70,239,0.2)' : 'rgba(147,51,234,0.1)'}
                            />
                          </svg>
                          <span>{label}</span>
                          <span className="ml-auto opacity-60">{ratio}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {resultUrl && (
                <>
                  <button onClick={handleDownload} className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-green-600/80 border border-green-500/40 text-xs text-white hover:bg-green-600 transition-colors">
                    <Download className="h-3 w-3" />
                    <span className="font-medium">Baixar</span>
                  </button>
                  <button onClick={handleNewGeneration} className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-accent border border-slate-500/25 text-xs text-muted-foreground hover:bg-muted/50 transition-colors">
                    <Sparkles className="h-3 w-3" />
                    <span className="font-medium">Nova</span>
                  </button>
                </>
              )}

              <div className="flex-1" />

              {/* Generate button */}
              <Button
                onClick={handleGenerate}
                disabled={isSubmitting || isProcessing || !prompt.trim()}
                size="sm"
                className="bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-semibold text-xs disabled:opacity-50 rounded-lg px-3 h-8 shrink-0"
              >
                {isSubmitting || isProcessing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                    {status === 'queued' ? 'Na fila...' : 'Gerando...'}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 mr-1" />
                    Gerar Imagem
                    <span className="ml-1.5 flex items-center gap-0.5 text-xs opacity-90">
                      <Coins className="w-3 h-3" />
                      {isUnlimited ? '∞' : (isGptEngine && isGptImageFreeTrial) ? '🎁 FREE' : creditCost}
                    </span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        <NoCreditsModal isOpen={showNoCreditsModal} onClose={() => setShowNoCreditsModal(false)} reason={noCreditsReason} />
        <ActiveJobBlockModal isOpen={showActiveJobModal} onClose={() => setShowActiveJobModal(false)} activeTool={activeJobToolName} activeJobId={activeJobId} activeStatus={activeStatus} onCancelJob={centralCancelJob} />
        <NotificationPromptToast toolName="gerar imagem" />
      </div>
    </AppLayout>
  );
};

export default GerarImagemTool;