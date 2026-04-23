import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { ArrowLeft, Download, Sparkles, Loader2, Video, Coins, Clock, Type, RotateCcw, AlertCircle, ImageIcon, X, Plus, Check, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useCollaboratorAttribution } from '@/hooks/useCollaboratorAttribution';
import { useGeminiVideoQueue, type GeminiQueueJob } from '@/hooks/useGeminiVideoQueue';

import MovieLedLibraryModal, { type MovieLedItem } from '@/components/movieled-maker/MovieLedLibraryModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { useCredits } from '@/contexts/CreditsContext';
import { useSmartBackNavigation } from '@/hooks/useSmartBackNavigation';
import { useProcessingButton } from '@/hooks/useProcessingButton';
import { useJobPendingWatchdog } from '@/hooks/useJobPendingWatchdog';
import { useJobStatusSync } from '@/hooks/useJobStatusSync';
import { useQueueSessionCleanup } from '@/hooks/useQueueSessionCleanup';
import { useAIJob } from '@/contexts/AIJobContext';
import { markJobAsFailedInDb } from '@/utils/markJobAsFailedInDb';
import { checkActiveJob } from '@/ai/JobManager';
import { getAIErrorMessage } from '@/utils/errorMessages';

import NoCreditsModal from '@/components/upscaler/NoCreditsModal';
import ActiveJobBlockModal from '@/components/ai-tools/ActiveJobBlockModal';
import { cancelJob as centralCancelJob } from '@/ai/JobManager';
import AppLayout from '@/components/layout/AppLayout';
import MovieLedTutorial, { MOVIELED_TUTORIAL_STORAGE_KEY } from '@/components/movieled-maker/MovieLedTutorial';

type ProcessingStatus = 'idle' | 'uploading' | 'processing' | 'completed' | 'error';

interface LibraryItem {
  id: string;
  title: string;
  image_url: string;
  thumbnail_url?: string | null;
  reference_images: string[] | null;
  prompt: string;
}

const ENGINES = [
  { id: 'wan2.2', name: 'Wan 2.2', cost: 500, duration: '15s', resolution: '720p', time: '4 a 5 min' },
  // EVOLINK_BACKUP — descomente para reverter para EvoLink
  // { id: 'veo3.1', name: 'Veo 3.1', cost: 1500, duration: '6s', resolution: '1080p', time: '2 a 4 min' },
  { id: 'gemini-lite', name: 'Veo 3.1 Lite', cost: 900, duration: '8s', resolution: '720p', time: '2 a 5 min' },
  { id: 'kling2.5', name: 'Kling 2.5 Turbo', cost: 900, duration: '5s', resolution: '720p', time: '3 a 6 min' },
] as const;

const MovieLedMakerTool = () => {
  const location = useLocation();
  const { goBack } = useSmartBackNavigation({ fallback: '/ferramentas-ia-aplicativo' });
  const { user, isPremium } = usePremiumStatus();
  const { balance: credits, refetch: refetchCredits, checkBalance } = useCredits();
  const { isSubmitting, startSubmit, endSubmit } = useProcessingButton();
  const { registerJob, updateJobStatus, clearJob: clearGlobalJob } = useAIJob();
  const { enqueueVideo: enqueueGemini, subscribeToJob: subscribeGemini, triggerProcessing } = useGeminiVideoQueue();
  const geminiChannelRef = useRef<ReturnType<typeof subscribeGemini> | null>(null);
  const isMobile = useIsMobile();
  const [showMobileConfig, setShowMobileConfig] = useState(false);

  const isTutorialTestUser = false; // Tutorial test mode disabled

  // Engine selection
  const [selectedEngine, setSelectedEngine] = useState<string>('gemini-lite');
  const currentEngine = ENGINES.find(e => e.id === selectedEngine) || ENGINES[0];

  // Image input
  const [selectedLibraryItem, setSelectedLibraryItem] = useState<LibraryItem | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [showLibrary, setShowLibrary] = useState(false);
  const { referencePromptId, setFromLibrary: setAttributionFromLibrary, clear: clearAttribution } = useCollaboratorAttribution();

  // Text input
  const [inputText, setInputText] = useState('');

  // Job state
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [jobId, setJobId] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isQueued, setIsQueued] = useState(false);
  const [queuePosition, setQueuePosition] = useState(0);

  // Modals
  const [showNoCreditsModal, setShowNoCreditsModal] = useState(false);
  const [noCreditsReason, setNoCreditsReason] = useState<'not_logged' | 'insufficient'>('insufficient');
  const [showActiveJobModal, setShowActiveJobModal] = useState(false);
  const [activeToolName, setActiveToolName] = useState('');
  const [activeJobId, setActiveJobId] = useState<string | undefined>();
  const [activeStatus, setActiveStatus] = useState<string | undefined>();
  const [showTutorial, setShowTutorial] = useState(() => !localStorage.getItem(MOVIELED_TUTORIAL_STORAGE_KEY));
  const [tutorialInProgress, setTutorialInProgress] = useState(false);
  
  const sessionIdRef = useRef(crypto.randomUUID());
  const evolinkPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isTutorialTestUser) {
      localStorage.removeItem(MOVIELED_TUTORIAL_STORAGE_KEY);
      setShowTutorial(true);
    }
  }, [isTutorialTestUser]);

  // Pre-select item from navigation state (e.g. from Biblioteca de Prompts)
  useEffect(() => {
    const state = location.state as { preSelectedItem?: LibraryItem; prefillPromptId?: string; prefillPromptType?: string } | null;
    if (state?.preSelectedItem) {
      setSelectedLibraryItem(state.preSelectedItem);
      setShowTutorial(false);
      // Attribution is now handled by useCollaboratorAttribution hook via location.state
      // Clear the state so it doesn't re-apply on re-render
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useQueueSessionCleanup(sessionIdRef.current, status);

  // Watchdog for stuck pending jobs
  const handleWatchdogFailed = useCallback((msg: string) => {
    const errInfo = getAIErrorMessage(msg);
    setErrorMessage(errInfo.message);
    setStatus('error');
    setIsQueued(false);
    refetchCredits();
    toast.error(`${errInfo.message}. ${errInfo.solution}`);
    endSubmit();
  }, [refetchCredits, endSubmit]);

  useJobPendingWatchdog({
    jobId,
    toolType: 'movieled_maker' as any,
    enabled: !!jobId && (status === 'processing' || status === 'uploading' || isQueued),
    onJobFailed: handleWatchdogFailed,
  });

  // Triple sync
  useJobStatusSync({
    jobId,
    toolType: 'movieled_maker' as any,
    enabled: !!jobId && (status === 'processing' || status === 'uploading' || isQueued),
    onStatusChange: useCallback((update) => {
      console.log('[MovieLed] StatusSync update:', update.status);
      if (update.status === 'queued') {
        setIsQueued(true);
        setQueuePosition(update.position || 1);
      } else if (update.status === 'starting' || update.status === 'running') {
        setIsQueued(false);
        setQueuePosition(0);
        setStatus('processing');
      } else if (update.status === 'completed') {
        if (update.outputUrl) setResultUrl(update.outputUrl);
        setStatus('completed');
        setIsQueued(false);
        refetchCredits();
        toast.success('Movie para telão gerado com sucesso!');
      } else if (update.status === 'failed' || update.status === 'cancelled') {
        const errInfo = getAIErrorMessage(update.errorMessage || 'Erro na geração');
        setErrorMessage(errInfo.message);
        setStatus('error');
        setIsQueued(false);
        refetchCredits();
        if (update.errorMessage) toast.error(`${errInfo.message}. ${errInfo.solution}`);
        endSubmit();
      }
    }, [refetchCredits, endSubmit]),
    onGlobalStatusChange: updateJobStatus,
  });

  // Register job globally
  useEffect(() => {
    if (jobId) {
      registerJob(jobId, 'MovieLed Maker', 'pending');
    }
  }, [jobId, registerJob]);

  // Cleanup evolink polling and gemini channel on unmount
  useEffect(() => {
    return () => {
      if (evolinkPollRef.current) clearInterval(evolinkPollRef.current);
      if (geminiChannelRef.current) geminiChannelRef.current.unsubscribe();
    };
  }, []);

  // Evolink polling logic for Veo 3.1
  const evolinkErrorCountRef = useRef(0);

  const startEvolinkPolling = useCallback((jId: string) => {
    if (evolinkPollRef.current) clearInterval(evolinkPollRef.current);
    evolinkErrorCountRef.current = 0;

    const poll = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        if (!token) {
          console.warn('[MovieLed] Evolink poll: no auth token, skipping');
          return;
        }

        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/runninghub-movieled-maker/poll-evolink`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ job_id: jId }),
        });

        if (!res.ok) {
          evolinkErrorCountRef.current++;
          console.error(`[MovieLed] Evolink poll HTTP error: ${res.status} (attempt ${evolinkErrorCountRef.current})`);
          if (evolinkErrorCountRef.current >= 10) {
            console.error('[MovieLed] Too many poll errors, stopping polling');
            if (evolinkPollRef.current) clearInterval(evolinkPollRef.current);
          }
          return;
        }

        const data = await res.json();
        console.log(`[MovieLed] Evolink poll result:`, data.status, data.progress);
        evolinkErrorCountRef.current = 0;

        if (data.status === 'completed') {
          if (data.output_url) setResultUrl(data.output_url);
          setStatus('completed');
          setIsQueued(false);
          refetchCredits();
          toast.success('Movie para telão gerado com sucesso!');
          if (evolinkPollRef.current) clearInterval(evolinkPollRef.current);
          endSubmit();
        } else if (data.status === 'failed') {
          const errInfo = getAIErrorMessage(data.error || 'Erro na geração');
          setErrorMessage(errInfo.message);
          setStatus('error');
          setIsQueued(false);
          refetchCredits();
          toast.error(`${errInfo.message}. ${errInfo.solution}`);
          if (evolinkPollRef.current) clearInterval(evolinkPollRef.current);
          endSubmit();
        }
      } catch (e) {
        evolinkErrorCountRef.current++;
        console.error(`[MovieLed] Evolink poll error (attempt ${evolinkErrorCountRef.current}):`, e);
        if (evolinkErrorCountRef.current >= 10) {
          console.error('[MovieLed] Too many consecutive poll errors, stopping');
          if (evolinkPollRef.current) clearInterval(evolinkPollRef.current);
        }
      }
    };

    // Poll every 10 seconds, first poll after 5s
    evolinkPollRef.current = setInterval(poll, 10000);
    setTimeout(poll, 5000);
  }, [refetchCredits, endSubmit]);


  const getEffectiveImageUrl = (): string | null => {
    if (selectedLibraryItem) {
      return selectedLibraryItem.reference_images?.[0]
        || selectedLibraryItem.thumbnail_url
        || (/\.(png|jpe?g|webp|gif|bmp|svg)(\?|$)/i.test(selectedLibraryItem.image_url) ? selectedLibraryItem.image_url : null);
    }
    return uploadedImage;
  };

  // Handle generate
  const handleGenerate = async () => {
    if (!startSubmit()) return;

    const effectiveImageUrl = getEffectiveImageUrl();
    if (!effectiveImageUrl) {
      toast.error('Selecione uma imagem de referência');
      endSubmit();
      return;
    }
    if (!inputText.trim()) {
      toast.error('Digite o nome para o telão');
      endSubmit();
      return;
    }
    if (!user?.id) {
      setNoCreditsReason('not_logged');
      setShowNoCreditsModal(true);
      endSubmit();
      return;
    }

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
    if (freshCredits < currentEngine.cost) {
      setNoCreditsReason('insufficient');
      setShowNoCreditsModal(true);
      endSubmit();
      return;
    }

    setStatus('uploading');
    setErrorMessage(null);
    setResultUrl(null);
    setIsQueued(false);
    setQueuePosition(0);

    try {
      // Revalidate auth to get fresh token (prevents stale session errors)
      const { data: { user: verifiedUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !verifiedUser) {
        toast.error('Sessão expirada. Faça login novamente.');
        setStatus('idle');
        endSubmit();
        return;
      }

      // If uploading from device, upload to storage first
      let imageUrlForBackend = effectiveImageUrl;
      
      if (uploadedImage && !selectedLibraryItem) {
        const base64Data = uploadedImage.split(',')[1];
        const binaryStr = atob(base64Data);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        
        const tempId = crypto.randomUUID();
        const storagePath = `movieled/${verifiedUser.id}/${tempId}.jpg`;
        
        const { error: uploadError } = await supabase.storage
          .from('artes-cloudinary')
          .upload(storagePath, bytes.buffer, { contentType: 'image/jpeg', upsert: true });
        
        if (uploadError) throw new Error('Erro no upload: ' + uploadError.message);
        
        const { data: publicUrlData } = supabase.storage
          .from('artes-cloudinary')
          .getPublicUrl(storagePath);
        
        imageUrlForBackend = publicUrlData.publicUrl;
      }

      setStatus('processing');

      // ===== GEMINI LITE PATH =====
      if (selectedEngine === 'gemini-lite') {
        try {
          // Placeholder prompt — will be replaced by RunningHub preprocessing output
          const geminiPrompt = `Create a cinematic LED screen video loop for "${inputText.trim()}"`;

          console.log('[MovieLed] Enviando para Gemini Lite com pré-processamento RunningHub:', {
            source: selectedLibraryItem ? 'library' : 'upload',
            referenceImageUrl: imageUrlForBackend,
            rawInputText: inputText.trim(),
          });

          const job = await enqueueGemini({
            prompt: geminiPrompt,
            aspectRatio: '16:9',
            duration: 8,
            quality: '720p',
            context: 'movie-led-maker',
            referenceImageUrl: imageUrlForBackend || undefined,
            rawInputText: inputText.trim(),
          });

          setJobId(job.id);
          setIsQueued(true);
          toast.success('Movie adicionado à fila! Pronto em 2-5 minutos.');

          const channel = subscribeGemini(job.id, (updatedJob: GeminiQueueJob) => {
            if (updatedJob.status === 'completed' && updatedJob.video_url) {
              setResultUrl(updatedJob.video_url);
              setStatus('completed');
              setIsQueued(false);
              refetchCredits();
              toast.success('Movie para telão gerado com sucesso!');
              channel.unsubscribe();
              endSubmit();
            } else if (updatedJob.status === 'failed') {
              const errInfo = getAIErrorMessage(updatedJob.error_message || 'Erro na geração');
              setErrorMessage(errInfo.message);
              setStatus('error');
              setIsQueued(false);
              refetchCredits();
              toast.error(`${errInfo.message}. ${errInfo.solution}`);
              channel.unsubscribe();
              endSubmit();
            } else if (updatedJob.status === 'processing') {
              setIsQueued(false);
              setStatus('processing');
            }
          });
          geminiChannelRef.current = channel;

          // Trigger processing immediately
          triggerProcessing();
          refetchCredits();
        } catch (err: any) {
          if (err.message?.includes('INSUFFICIENT_CREDITS') || err.message?.includes('Créditos insuficientes')) {
            setNoCreditsReason('insufficient');
            setShowNoCreditsModal(true);
          } else if (err.message?.includes('USER_HAS_ACTIVE_JOB')) {
            toast.error('Você já tem uma geração na fila. Aguarde finalizar.');
          } else {
            toast.error(err.message || 'Erro ao enfileirar movie');
            setErrorMessage(err.message || 'Erro ao enfileirar movie');
            setStatus('error');
          }
          setStatus('idle');
          endSubmit();
        }
        return;
      }

      // ===== EXISTING ENGINES PATH (Wan 2.2 + Evolink) =====
      // Send fallback URLs for library items (reference_images[0] + image_url)
      const fallbackImageUrl = selectedLibraryItem?.image_url || null;

      const { data, error: invokeError } = await supabase.functions.invoke(
        'runninghub-movieled-maker/run',
        {
          body: {
            imageUrl: imageUrlForBackend,
            fallbackImageUrl,
            inputText: inputText.trim(),
            engine: selectedEngine,
            referencePromptId: referencePromptId,
          },
        }
      );

      if (invokeError) {
        // supabase.functions.invoke wraps non-2xx as FunctionsHttpError
        const errorData = data || {};
        if (errorData.code === 'INSUFFICIENT_CREDITS') {
          setNoCreditsReason('insufficient');
          setShowNoCreditsModal(true);
        } else if (errorData.code === 'USER_HAS_ACTIVE_JOB') {
          toast.error(errorData.error || 'Você já tem um processamento ativo.');
        } else {
          const msg = errorData.error || invokeError.message || 'Erro ao iniciar geração';
          toast.error(msg);
          setErrorMessage(msg);
        }
        setStatus('idle');
        endSubmit();
        return;
      }

      setJobId(data.job_id);

      // EVOLINK_BACKUP — descomente para reverter para EvoLink
      // if (data.provider === 'evolink') {
      //   toast.success('Geração Veo 3.1 iniciada! Aguarde...');
      //   startEvolinkPolling(data.job_id);
      // } else
      if (data.queued) {
        setIsQueued(true);
        setQueuePosition(data.position || 1);
        toast.info(`Você está na fila (posição ${data.position || 1}). Aguarde...`);
      } else {
        toast.success('Geração iniciada! Aguarde...');
      }

      refetchCredits();
    } catch (err: any) {
      console.error('[MovieLed] Error:', err);
      const errMsg = err?.message || 'Erro ao gerar movie';
      toast.error(errMsg);
      setStatus('error');
      setErrorMessage(errMsg);
      if (jobId) {
        markJobAsFailedInDb(jobId, 'movieled_maker', errMsg);
      }
    } finally {
      endSubmit();
    }
  };

  // Handle new generation (keep inputs)
  const handleNewGeneration = () => {
    setResultUrl(null);
    setJobId(null);
    setErrorMessage(null);
    setStatus('idle');
    setIsQueued(false);
    setQueuePosition(0);
    clearGlobalJob();
  };

  // Handle download
  const handleDownload = () => {
    if (resultUrl) {
      const link = document.createElement('a');
      link.href = resultUrl;
      link.download = `movieled-${selectedEngine}-${Date.now()}.mp4`;
      link.target = '_blank';
      link.click();
    }
  };

  // Cancel queue
  const cancelQueue = async () => {
    if (!jobId) return;
    try {
      const result = await centralCancelJob('movieled_maker' as any, jobId);
      if (result.success) {
        setStatus('idle');
        setIsQueued(false);
        setQueuePosition(0);
        setJobId(null);
        endSubmit();
        if (result.refundedAmount > 0) {
          toast.success(`Cancelado! ${result.refundedAmount} créditos devolvidos.`);
        } else {
          toast.info('Saiu da fila');
        }
        refetchCredits();
      }
    } catch {
      toast.error('Erro ao cancelar');
    }
  };

  const isProcessing = status === 'processing' || status === 'uploading' || isQueued;
  const hasImage = !!selectedLibraryItem || !!uploadedImage;
  const canGenerate = hasImage && inputText.trim().length > 0 && !isProcessing && status !== 'completed';

  return (
    <AppLayout fullScreen>
      <div className={`flex-1 max-w-7xl w-full mx-auto px-4 py-4 flex flex-col h-full ${isMobile ? 'overflow-y-auto pb-40' : 'overflow-hidden'}`}>
        <div className={`grid grid-cols-1 lg:grid-cols-7 gap-4 lg:gap-5 ${isMobile ? 'content-start' : 'flex-1 min-h-0'}`}>
          
          {/* Left Panel - Controls */}
          <div className={`lg:col-span-2 ${isMobile ? 'overflow-visible' : 'min-h-0 overflow-hidden'}`}>
            <div className={`bg-card border border-border rounded-2xl p-5 flex flex-col gap-5 ${isMobile ? '' : 'overflow-y-auto h-full max-h-full'}`}
              style={!isMobile ? { scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.15) transparent' } : undefined}
            >
              {/* Title */}
              <div>
                <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <Video className="h-5 w-5 text-muted-foreground" />
                  MovieLed Maker
                </h1>
                <p className="text-xs text-muted-foreground mt-1">IA que gera movies para telão de LED com um clique.</p>
              </div>

              {/* Reference Image */}
              <div>
                <span className="text-sm font-medium text-foreground mb-2 block flex items-center gap-1.5">
                  <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  Telão de Referência
                </span>
                {(selectedLibraryItem || uploadedImage) ? (
                  <div className="relative rounded-xl overflow-hidden border border-border bg-muted/50" data-tutorial-movieled="reference">
                    <img
                      src={getEffectiveImageUrl() || ''}
                      alt="Telão de referência"
                      className="w-full h-[120px] lg:h-[140px] object-contain"
                    />
                    <div className="absolute bottom-0 inset-x-0 flex gap-1.5 p-1.5 bg-gradient-to-t from-black/70 to-transparent">
                      <button
                        onClick={() => setShowLibrary(true)}
                        disabled={isProcessing}
                        className="flex-1 h-7 text-[10px] rounded-lg bg-accent backdrop-blur-sm text-foreground hover:bg-white/20 transition-colors flex items-center justify-center gap-1"
                      >
                        <ImageIcon className="w-3 h-3" />
                        Trocar
                      </button>
                      <button
                        onClick={() => { setSelectedLibraryItem(null); setUploadedImage(null); setUploadedFileName(''); }}
                        disabled={isProcessing}
                        className="h-7 w-7 rounded-lg bg-accent backdrop-blur-sm text-white hover:bg-red-500/100/40 transition-colors flex items-center justify-center"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowLibrary(true)}
                    disabled={isProcessing}
                    data-tutorial-movieled="reference"
                    className="w-full h-[100px] lg:h-[120px] rounded-xl border border-dashed border-border bg-white/[0.03] hover:bg-white/[0.06] hover:border-border transition-all flex flex-col items-center justify-center gap-2 group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-accent0/10 border border-border/20 flex items-center justify-center group-hover:bg-accent transition-colors">
                      <Plus className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="text-center">
                      <p className="text-[11px] text-muted-foreground font-medium">Escolher Telão</p>
                      <p className="text-[9px] text-muted-foreground">Da biblioteca ou envie sua imagem</p>
                    </div>
                  </button>
                )}
              </div>

              {/* Text Input */}
              <div>
                <span className="text-sm font-medium text-foreground mb-2 block flex items-center gap-1.5">
                  <Type className="h-3.5 w-3.5 text-muted-foreground" />
                  Nome no Telão
                </span>
                <div className="flex gap-2" data-tutorial-movieled="text-input">
                  <Input
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Ex: DJ MARCOS"
                    disabled={isProcessing}
                    className="bg-muted border-border text-foreground placeholder:text-muted-foreground text-sm flex-1"
                    maxLength={50}
                  />
                  <button
                    data-tutorial-movieled="text-confirm"
                    type="button"
                    disabled={!inputText.trim() || isProcessing}
                    className="flex items-center justify-center w-10 h-10 rounded-md bg-green-600 hover:bg-green-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
                  >
                    <Check className="w-4 h-4 text-foreground" />
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">{inputText.length}/50 caracteres</p>
              </div>

              {/* DESKTOP ONLY: Engine + Generate + Actions */}
              {!isMobile && (
                <>
                  {/* Engine Selector */}
                  <div>
                    <span className="text-sm font-medium text-foreground mb-2 block">Motor</span>
                    <div className="grid grid-cols-2 gap-0 bg-muted border border-border rounded-lg p-1" data-tutorial-movieled="engine">
                      {ENGINES.map(engine => (
                        <button
                          key={engine.id}
                          onClick={() => setSelectedEngine(engine.id)}
                          disabled={isProcessing}
                          className={`py-2.5 px-3 text-sm rounded-md transition-all font-medium ${
                            selectedEngine === engine.id
                              ? 'bg-primary text-primary-foreground shadow-sm'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {engine.name}
                        </button>
                      ))}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent text-muted-foreground border border-border">
                        {currentEngine.duration} • {currentEngine.resolution}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent text-muted-foreground border border-border flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        {currentEngine.time}
                      </span>
                    </div>
                  </div>

                  {/* Generate Button - DESKTOP */}
                  {status !== 'completed' && status !== 'error' && !isProcessing && (
                    <Button
                      data-tutorial-movieled="generate"
                      className="w-full py-4 text-sm font-semibold bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white rounded-xl shadow-lg disabled:opacity-50"
                      onClick={handleGenerate}
                      disabled={isSubmitting || !canGenerate}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Iniciando...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Gerar Movie
                          <span className="ml-2 flex items-center gap-1 text-xs opacity-90">
                            <Coins className="w-3.5 h-3.5" />
                            {currentEngine.cost}
                          </span>
                        </>
                      )}
                    </Button>
                  )}

                  {/* Completed Actions - DESKTOP */}
                  {status === 'completed' && (
                    <div className="space-y-2">
                      <Button
                        className="w-full py-4 text-sm font-semibold bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-xl"
                        onClick={handleDownload}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Baixar Movie
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full py-3 text-sm border-border text-muted-foreground hover:bg-accent rounded-xl"
                        onClick={handleNewGeneration}
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Gerar Novo
                      </Button>
                    </div>
                  )}

                  {/* Error State - DESKTOP */}
                  {status === 'error' && errorMessage && (
                    <div className="bg-red-950/30 border border-red-500/30 rounded-xl p-3">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-red-300">{errorMessage}</p>
                      </div>
                      <Button
                        variant="outline"
                        className="w-full mt-2 py-2 text-xs border-border text-muted-foreground hover:bg-accent rounded-lg"
                        onClick={handleNewGeneration}
                      >
                        <RotateCcw className="w-3.5 h-3.5 mr-1" />
                        Tentar Novamente
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Right Panel - Result */}
          <div className="lg:col-span-5 min-h-0 overflow-hidden">
            <div className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col min-h-[400px] h-full">
              {/* Warning Banner */}
              {isProcessing && (
                <div className="bg-amber-500/20 border-b border-amber-500/50 px-3 py-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                  <p className="text-xs text-amber-700 dark:text-amber-200">Não feche esta página enquanto o vídeo está sendo gerado.</p>
                </div>
              )}

              <div className="flex-1 flex items-center justify-center p-4 min-h-0">
                {/* Queue */}
                {isQueued ? (
                  <div className="flex flex-col items-center gap-4 text-center">
                    <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center animate-pulse">
                      <Clock className="w-8 h-8 text-yellow-400" />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-yellow-300">🔥 Na fila!</p>
                      <p className="text-3xl font-bold text-foreground mt-2">Posição {queuePosition}</p>
                      <p className="text-sm text-muted-foreground mt-2">Aguarde, já já é sua vez!</p>
                    </div>
                    <Button
                      variant="ghost" size="sm"
                      onClick={cancelQueue}
                      className="text-red-300 hover:text-red-100 hover:bg-red-500/100/20"
                    >
                      Sair da fila
                    </Button>
                  </div>
                ) : status === 'completed' && resultUrl ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <video
                      src={resultUrl}
                      controls
                      autoPlay
                      loop
                      className="max-w-full max-h-full rounded-lg"
                    />
                  </div>
                ) : (status === 'uploading' || status === 'processing') && !isQueued ? (
                  <div className="flex flex-col items-center justify-center gap-4">
                    <Loader2 className="w-12 h-12 text-muted-foreground animate-spin" />
                    <div className="text-center">
                      <p className="text-lg font-medium text-foreground">
                        {status === 'uploading' ? 'Enviando imagem...' : 'Gerando movie para telão...'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Tempo estimado: {currentEngine.time}
                      </p>
                    </div>
                  </div>
                ) : selectedLibraryItem ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <video
                      src={selectedLibraryItem.image_url}
                      controls
                      loop
                      muted
                      autoPlay
                      playsInline
                      className="max-w-full max-h-full rounded-lg"
                    />
                  </div>
                ) : uploadedImage ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <img src={uploadedImage} alt="Preview" className="max-w-full max-h-full object-contain rounded-lg" />
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4 text-center">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-400/20 border border-border/20 flex items-center justify-center">
                      <Video className="w-10 h-10 text-muted-foreground" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-foreground">MovieLed Maker</h2>
                      <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                        Selecione um telão da biblioteca ou envie sua imagem, digite o nome e gere seu movie para telão de LED!
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
          
          {/* Expandable Configurações panel */}
          {showMobileConfig && !isProcessing && status !== 'completed' && status !== 'error' && (
            <div className="px-4 pt-3 pb-2 space-y-3 border-b border-border max-h-[50vh] overflow-y-auto">
              {/* Engine Selector */}
              <div>
                <span className="text-xs font-medium text-muted-foreground mb-1.5 block">Motor</span>
                <div className="grid grid-cols-2 gap-0 bg-muted border border-border rounded-lg p-1">
                  {ENGINES.map(engine => (
                    <button
                      key={engine.id}
                      onClick={() => setSelectedEngine(engine.id)}
                      disabled={isProcessing}
                      className={`py-2 px-3 text-sm rounded-md transition-all font-medium ${
                        selectedEngine === engine.id ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground'
                      }`}
                    >
                      {engine.name}
                    </button>
                  ))}
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent text-muted-foreground border border-border">
                    {currentEngine.duration} • {currentEngine.resolution}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent text-muted-foreground border border-border flex items-center gap-1">
                    <Clock className="h-2.5 w-2.5" />
                    {currentEngine.time}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Main bottom bar content */}
          <div className="px-4 py-3 space-y-2.5">
            {/* Idle state */}
            {!isProcessing && status !== 'completed' && status !== 'error' && (
              <>
                <Button
                  className="w-full py-4 text-sm font-semibold bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white rounded-xl shadow-lg disabled:opacity-50"
                  onClick={handleGenerate}
                  disabled={isSubmitting || !canGenerate}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Iniciando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Gerar Movie
                      <span className="ml-2 flex items-center gap-1 text-xs opacity-90">
                        <Coins className="w-3.5 h-3.5" />
                        {currentEngine.cost}
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
                    {isQueued ? `Fila #${queuePosition}` : 'Gerando movie...'}
                  </p>
                </div>
                {isQueued && (
                  <Button
                    variant="outline"
                    className="py-3 px-4 text-xs border-border text-muted-foreground hover:bg-accent rounded-lg flex-shrink-0"
                    onClick={cancelQueue}
                  >
                    Sair
                  </Button>
                )}
              </div>
            )}

            {/* Completed state */}
            {status === 'completed' && (
              <div className="flex gap-2">
                <Button
                  className="flex-1 py-4 text-sm font-semibold bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-xl"
                  onClick={handleDownload}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Baixar Movie
                </Button>
                <Button
                  variant="outline"
                  className="py-4 px-4 text-sm border-border text-muted-foreground hover:bg-accent rounded-xl"
                  onClick={handleNewGeneration}
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </div>
            )}

            {/* Error state */}
            {status === 'error' && errorMessage && (
              <div className="flex gap-2 items-center">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-red-300 truncate">{errorMessage}</p>
                </div>
                <Button
                  variant="outline"
                  className="py-3 px-4 text-xs border-border text-muted-foreground hover:bg-accent rounded-lg flex-shrink-0"
                  onClick={handleNewGeneration}
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1" />
                  Tentar
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Library Modal */}
      <MovieLedLibraryModal
        isOpen={showLibrary}
        onClose={() => setShowLibrary(false)}
        onSelectItem={(item) => {
          setSelectedLibraryItem(item as unknown as LibraryItem);
          setUploadedImage(null);
          setUploadedFileName('');
          // Items from MovieLed library are admin prompts — setFromLibrary will clear attribution.
          // If partner items are added in the future, this will correctly set attribution.
          setAttributionFromLibrary({ promptId: item.id, promptType: 'admin' });
        }}
        onUploadPhoto={(dataUrl, file) => {
          setUploadedImage(dataUrl);
          setUploadedFileName(file.name);
          setSelectedLibraryItem(null);
          clearAttribution();
        }}
      />

      {/* Modals */}
      <NoCreditsModal
        isOpen={showNoCreditsModal}
        onClose={() => setShowNoCreditsModal(false)}
        reason={noCreditsReason}
      />
      <ActiveJobBlockModal
        isOpen={showActiveJobModal}
        onClose={() => setShowActiveJobModal(false)}
        activeTool={activeToolName}
        activeJobId={activeJobId}
        activeStatus={activeStatus}
        onCancelJob={centralCancelJob}
      />
      {showTutorial && (
        <MovieLedTutorial
          persistCompletion={!isTutorialTestUser}
          onComplete={() => { setShowTutorial(false); setTutorialInProgress(false); }}
          onPhaseChange={(phase) => setTutorialInProgress(phase === 'active')}
        />
      )}
    </AppLayout>
  );
};

export default MovieLedMakerTool;