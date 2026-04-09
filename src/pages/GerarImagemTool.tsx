import { useState, useRef, useCallback, useEffect } from 'react';
import { ArrowLeft, Download, ImagePlus, Sparkles, X, Loader2, Paperclip, Coins, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { useCredits } from '@/contexts/CreditsContext';
import { useAIToolSettings } from '@/hooks/useAIToolSettings';
import { useSmartBackNavigation } from '@/hooks/useSmartBackNavigation';
import { useAuth } from '@/contexts/AuthContext';
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
  { ratio: '9:16',  label: 'Story',  w: 14, h: 22 },
  { ratio: '1:1',   label: 'Quadrado', w: 18, h: 18 },
  { ratio: '3:4',   label: 'Retrato', w: 16, h: 20 },
  { ratio: '4:3',   label: 'Clássico', w: 22, h: 16 },
  { ratio: '16:9',  label: 'Wide',   w: 26, h: 14 },
  { ratio: '2:3',   label: '2:3',   w: 14, h: 20 },
  { ratio: '3:2',   label: '3:2',   w: 20, h: 14 },
  { ratio: '4:5',   label: '4:5',   w: 16, h: 19 },
  { ratio: '5:4',   label: '5:4',   w: 19, h: 16 },
  { ratio: '21:9',  label: 'Ultra',  w: 28, h: 12 },
] as const;

const GerarImagemTool = () => {
  const { goBack } = useSmartBackNavigation({ fallback: '/ferramentas-ia-aplicativo' });
  const { user, planType } = usePremiumStatus();
  const { balance: credits, refetch: refetchCredits, checkBalance } = useCredits();
  const { isPlanos2User, hasImageGeneration } = useAuth();
  const { getCreditCost } = useAIToolSettings();
  const { isSubmitting, startSubmit, endSubmit } = useProcessingButton();
  const { registerJob } = useAIJob();
  const { isDownloading, progress: downloadProgress, download: resilientDownload } = useResilientDownload();

  const [prompt, setPrompt] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<string>('4:3');
  const [engine, setEngine] = useState<'flux2_klein' | 'nano_banana'>('flux2_klein');
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

  const creditCost = getCreditCost('gerar_imagem', 100);

  const isProcessing = ['pending', 'starting', 'running', 'queued'].includes(status);

  // Session cleanup
  useQueueSessionCleanup(sessionIdRef.current, status);

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

  // File processing
  const processFiles = useCallback((files: File[]) => {
    const remaining = 5 - referenceImages.length;
    const toProcess = files.filter(f => f.type.startsWith('image/')).slice(0, remaining);
    for (const file of toProcess) {
      const preview = URL.createObjectURL(file);
      setReferenceImages(prev => {
        if (prev.length >= 5) return prev;
        return [...prev, { file, preview }];
      });
    }
  }, [referenceImages.length]);

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
    if (referenceImages.length < 5) setIsDragOver(true);
  }, [referenceImages.length]);

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
      if (referenceImages.length >= 5) return;
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
  }, [processFiles, referenceImages.length]);

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

      if (engine === 'flux2_klein') {
        // ========== FLUX2 KLEIN FLOW ==========
        // Create job in DB with engine field
        const { jobId: newJobId, error: createError } = await createJob('image_generator', user.id, sessionIdRef.current, {
          prompt: prompt.trim(),
          aspect_ratio: aspectRatio,
          model: 'flux2_klein',
          engine: 'flux2_klein',
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
      const reconcileEndpoint = engine === 'flux2_klein' ? 'runninghub-flux2-klein/reconcile' : 'runninghub-image-generator/reconcile';
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

  // Block access for planos2 users without image generation permission
  if (isPlanos2User && !hasImageGeneration) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gradient-to-br from-[#0f0a15] via-[#1a0f25] to-[#0a0510] flex flex-col items-center justify-center p-6">
          <div className="max-w-md text-center space-y-4">
            <div className="text-6xl">🔒</div>
            <h1 className="text-xl font-bold text-white">Recurso não disponível no seu plano</h1>
            <p className="text-purple-300 text-sm">
              A geração de imagens está disponível a partir do plano <strong className="text-fuchsia-400">Pro</strong>.
            </p>
            <button onClick={goBack} className="mt-4 px-6 py-2.5 rounded-full bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors">
              Voltar
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-[#0f0a15] via-[#1a0f25] to-[#0a0510] flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#0f0a15]/90 backdrop-blur-md border-b border-purple-500/20 px-4 py-3">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <div className="flex items-center gap-3">
              <button onClick={goBack} className="text-purple-300 hover:text-white transition-colors">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-lg font-bold text-white flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-fuchsia-400" />
                  Gerar Imagem
                </h1>
                <p className="text-[10px] text-purple-400">RunningHub AI</p>
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
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-fuchsia-900/60 backdrop-blur-sm border-2 border-dashed border-fuchsia-400 pointer-events-none">
              <ImagePlus className="h-12 w-12 text-fuchsia-300 mb-2" />
              <p className="text-fuchsia-200 font-semibold text-sm">Solte para adicionar referência</p>
            </div>
          )}

          {/* Download progress overlay */}
          {isDownloading && <DownloadProgressOverlay isVisible={isDownloading} progress={downloadProgress} />}

          {resultUrl ? (
            <div className="w-full max-w-2xl space-y-3">
              <div className="rounded-2xl overflow-hidden border border-purple-500/20 bg-black/30 shadow-2xl">
                <TransformWrapper>
                  <TransformComponent wrapperClass="!w-full" contentClass="!w-full">
                    <img src={resultUrl} alt="Imagem gerada" className="w-full h-auto" />
                  </TransformComponent>
                </TransformWrapper>
              </div>
            </div>
          ) : isProcessing ? (
            <div className="flex flex-col items-center gap-4 text-purple-300">
              <div className="relative">
                <div className="w-20 h-20 rounded-full border-2 border-purple-500/30 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-fuchsia-400" />
                </div>
              </div>
              {status === 'queued' && queuePosition > 0 ? (
                <div className="text-center space-y-1">
                  <p className="text-sm font-medium">Na fila — posição {queuePosition}</p>
                  <p className="text-xs text-purple-400">Aguardando vaga...</p>
                </div>
              ) : (
                <p className="text-sm">Gerando com {engine === 'flux2_klein' ? 'Flux2 Klein' : 'Nano Banana'}...</p>
              )}
              {/* Progress bar */}
              <div className="w-48 h-1.5 rounded-full bg-purple-900/50 overflow-hidden">
                <div className="h-full rounded-full bg-fuchsia-500 transition-all duration-700" style={{ width: `${progress}%` }} />
              </div>
              {/* Cancel & reconcile */}
              <div className="flex gap-2">
                {status === 'queued' && (
                  <button onClick={handleCancel} className="text-xs text-red-400 hover:text-red-300 underline">Cancelar</button>
                )}
                {showReconcileButton && (
                  <button onClick={handleReconcile} className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-200">
                    <RefreshCw className="h-3 w-3" /> Verificar status
                  </button>
                )}
              </div>
            </div>
          ) : status === 'failed' ? (
            <div className="flex flex-col items-center gap-3 text-red-400">
              <p className="text-sm text-center font-medium">{(() => { const info = getAIErrorMessage(errorMessage || ''); return info.message; })()}</p>
              <p className="text-xs text-center text-red-300/70">{(() => { const info = getAIErrorMessage(errorMessage || ''); return info.solution; })()}</p>
              <button onClick={resetJobState} className="text-xs text-purple-400 hover:text-purple-200 underline">Tentar novamente</button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 text-purple-500/60">
              <Sparkles className="h-12 w-12" />
              <p className="text-sm text-center">Digite um prompt e clique em Gerar</p>
              <p className="text-xs text-purple-500/40 text-center">Arraste imagens aqui ou cole com Ctrl+V para adicionar referências</p>
            </div>
          )}
        </div>

        {/* Bottom bar */}
        <div className="sticky bottom-0 z-20 bg-[#120e1a]/95 backdrop-blur-xl border-t border-purple-500/15 w-full">
          {/* Reference images strip */}
          {referenceImages.length > 0 && (
            <div className="px-3 pt-2">
              <div className="max-w-3xl mx-auto flex gap-2 items-center bg-[#1a1525]/90 rounded-xl p-2 border border-purple-500/20 overflow-x-auto">
                {referenceImages.map((img, idx) => (
                  <div key={idx} className="relative w-14 h-14 rounded-lg overflow-visible flex-shrink-0">
                    <img src={img.preview} alt="" className="w-full h-full object-cover rounded-lg border border-purple-500/30" />
                    <button
                      onClick={() => removeReferenceImage(idx)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-600 hover:bg-red-500 rounded-full flex items-center justify-center shadow-lg transition-colors z-10"
                    >
                      <X className="h-3 w-3 text-white" />
                    </button>
                  </div>
                ))}
                <span className="text-[10px] text-purple-400 ml-1 flex-shrink-0">{referenceImages.length}/5</span>
              </div>
            </div>
          )}

          <div className="max-w-3xl mx-auto px-3 py-3 space-y-2">
            {/* Engine selector */}
            <div className="flex items-center gap-1 bg-purple-900/30 rounded-lg p-0.5 border border-purple-500/20 w-fit">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setEngine('flux2_klein')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all disabled:opacity-50 ${
                  engine === 'flux2_klein'
                    ? 'bg-fuchsia-600/80 text-white shadow-sm'
                    : 'text-purple-400 hover:text-purple-200'
                }`}
              >
                ⚡ Flux2 Klein
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setEngine('nano_banana')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all disabled:opacity-50 ${
                  engine === 'nano_banana'
                    ? 'bg-fuchsia-600/80 text-white shadow-sm'
                    : 'text-purple-400 hover:text-purple-200'
                }`}
              >
                🍌 Nano Banana
              </button>
            </div>

            {/* Prompt input row */}
            <div className="flex items-center gap-2">
              {engine === 'nano_banana' && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing || referenceImages.length >= 5}
                  className="relative flex-shrink-0 w-9 h-9 rounded-full border border-purple-500/30 bg-purple-900/30 flex items-center justify-center text-purple-300 hover:text-white hover:border-purple-400/60 transition-colors disabled:opacity-40 self-end mb-0.5"
                >
                  <Paperclip className="h-4 w-4" />
                  {referenceImages.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-green-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                      {referenceImages.length}
                    </span>
                  )}
                </button>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileSelect} className="hidden" />

              <textarea
                ref={textareaRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Descreva a imagem que você quer gerar..."
                rows={2}
                className="flex-1 bg-purple-900/20 border border-purple-500/25 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-purple-500/50 resize-none focus:outline-none focus:border-purple-400/50 transition-colors [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
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
              {/* Aspect ratio buttons */}
              {ASPECT_RATIOS.slice(0, 5).map(({ ratio, label, w, h }) => {
                const isSelected = aspectRatio === ratio;
                return (
                  <button
                    key={ratio}
                    type="button"
                    disabled={isProcessing}
                    onClick={() => setAspectRatio(ratio)}
                    className={`flex flex-col items-center justify-center gap-0.5 px-1.5 py-1 rounded-lg border transition-all disabled:opacity-40 ${
                      isSelected
                        ? 'border-fuchsia-500 bg-fuchsia-500/20 text-fuchsia-300'
                        : 'border-purple-500/25 bg-purple-900/40 text-purple-400 hover:border-purple-400/50 hover:text-purple-200'
                    }`}
                  >
                    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none">
                      <rect x="1" y="1" width={w - 2} height={h - 2} rx="1.5"
                        stroke="currentColor" strokeWidth="1.5"
                        fill={isSelected ? 'rgba(217,70,239,0.15)' : 'rgba(147,51,234,0.1)'}
                      />
                    </svg>
                    <span className="text-[8px] font-medium leading-none">{label}</span>
                  </button>
                );
              })}

              {resultUrl && (
                <>
                  <button onClick={handleDownload} className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-green-600/80 border border-green-500/40 text-xs text-white hover:bg-green-600 transition-colors">
                    <Download className="h-3 w-3" />
                    <span className="font-medium">Baixar</span>
                  </button>
                  <button onClick={handleNewGeneration} className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-purple-900/40 border border-purple-500/25 text-xs text-purple-200 hover:bg-purple-800/50 transition-colors">
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
                className="bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white font-semibold text-xs disabled:opacity-50 rounded-lg px-3 h-8 shrink-0"
              >
                {isSubmitting || isProcessing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                    {status === 'queued' ? 'Na fila...' : 'Gerando...'}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 mr-1" />
                    {engine === 'flux2_klein' ? 'Gerar com Flux2 Klein' : 'Gerar com Nano Banana'}
                    <span className="ml-1.5 flex items-center gap-0.5 text-xs opacity-90">
                      <Coins className="w-3 h-3" />
                      {creditCost}
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
