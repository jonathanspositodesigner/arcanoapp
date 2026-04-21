import { useState, useRef, useEffect, useCallback } from 'react';
import { optimizeForAI } from '@/hooks/useImageOptimizer';
import { useGeminiVideoQueue, type GeminiQueueJob } from '@/hooks/useGeminiVideoQueue';
import { getAIErrorMessage } from '@/utils/errorMessages';
import { ArrowLeft, Download, Upload, Sparkles, X, Loader2, Video, ChevronDown, Coins, ImagePlus, Clock, Image, Type, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { useCredits } from '@/contexts/CreditsContext';
import { useAIToolSettings } from '@/hooks/useAIToolSettings';
import { useSmartBackNavigation } from '@/hooks/useSmartBackNavigation';
import { useAuth } from '@/contexts/AuthContext';
import { useProcessingButton } from '@/hooks/useProcessingButton';
import { useJobPendingWatchdog } from '@/hooks/useJobPendingWatchdog';
import { useJobStatusSync } from '@/hooks/useJobStatusSync';
import { markJobAsFailedInDb } from '@/utils/markJobAsFailedInDb';
import NoCreditsModal from '@/components/upscaler/NoCreditsModal';
import AppLayout from '@/components/layout/AppLayout';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const ASPECT_RATIOS = ['16:9', '9:16'] as const;
const ASPECT_RATIO_LABELS: Record<string, string> = {
  '16:9': 'Landscape',
  '9:16': 'Portrait',
};

const MODEL_DURATIONS: Record<string, number> = {
  'veo3.1-fast': 8,
  'veo3.1-pro': 8,
  'wan2.2': 5,
  'gemini-lite': 8,
};

interface FrameImage {
  file: File;
  preview: string;
  base64: string;
  mimeType: string;
}

interface ModelOption {
  id: string;
  name: string;
  cost: number;
  costWithAudio: number;
  description: string;
  isGeminiQueue?: boolean;
}

const ALL_MODELS: ModelOption[] = [
  { id: 'wan2.2', name: 'Wan 2.2', cost: 400, costWithAudio: 400, description: '5 segundos' },
  { id: 'gemini-lite', name: 'Veo 3.1 Lite', cost: 900, costWithAudio: 900, description: '8s • Sem áudio', isGeminiQueue: true },
  { id: 'veo3.1-fast', name: 'Veo 3.1 Fast', cost: 1500, costWithAudio: 2500, description: '8s • 1080p' },
  { id: 'veo3.1-pro', name: 'Veo 3.1 Pro', cost: 2800, costWithAudio: 5000, description: '8s • 1080p' },
];

type GenerationMode = 'prompt_only' | 'with_frames';

const GerarVideoTool = () => {
  const { goBack } = useSmartBackNavigation({ fallback: '/ferramentas-ia-aplicativo' });
  const { user, planType } = usePremiumStatus();
  const { balance: credits, refetch: refetchCredits, checkBalance } = useCredits();
  // Acesso liberado para todos com créditos (avulsos ou de plano)
  const { isSubmitting, startSubmit, endSubmit } = useProcessingButton();

  // Check if user is unlimited
  const [isUnlimited, setIsUnlimited] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    const checkUnlimited = async () => {
      try {
        const { data: unlimitedData } = await supabase.rpc('is_unlimited_subscriber', { _user_id: user.id });
        setIsUnlimited(!!unlimitedData);
      } catch (e) {
        console.error('[GerarVideo] Error checking unlimited status:', e);
      }
    };
    checkUnlimited();
  }, [user?.id]);

  const availableModels: ModelOption[] = ALL_MODELS;

  // Watchdog: detect stuck pending jobs (5 min timeout)
  const handleWatchdogFailed = useCallback((msg: string) => {
    const errInfo = getAIErrorMessage(msg);
    setErrorMessage(errInfo.message);
    setIsGenerating(false);
    setIsQueued(false);
    refetchCredits();
    toast.error(`${errInfo.message}. ${errInfo.solution}`);
  }, [refetchCredits]);

  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<string>('16:9');
  const [selectedModel, setSelectedModel] = useState<string>('wan2.2');
  const [generateAudio, setGenerateAudio] = useState(false);
  const [generationMode, setGenerationMode] = useState<GenerationMode>('prompt_only');
  const [startFrame, setStartFrame] = useState<FrameImage | null>(null);
  const [endFrame, setEndFrame] = useState<FrameImage | null>(null);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isQueued, setIsQueued] = useState(false);
  const [queuePosition, setQueuePosition] = useState(0);
  const [jobId, setJobId] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showNoCreditsModal, setShowNoCreditsModal] = useState(false);
  const [noCreditsReason, setNoCreditsReason] = useState<'not_logged' | 'insufficient'>('insufficient');

  const startFrameRef = useRef<HTMLInputElement>(null);
  const endFrameRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Evolink polling ref
  const evolinkPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentModel = availableModels.find(m => m.id === selectedModel) || availableModels[0];
  const isVeoModel = selectedModel === 'veo3.1-fast' || selectedModel === 'veo3.1-pro';
  const isGeminiLite = selectedModel === 'gemini-lite';
  
  const effectiveCost = (isVeoModel && generateAudio) ? currentModel.costWithAudio : currentModel.cost;
  const creditCost = (isUnlimited && selectedModel === 'wan2.2') 
    ? 0 
    : effectiveCost;

  // Gemini queue hook
  const { enqueueVideo: enqueueGemini, subscribeToJob: subscribeGemini, triggerProcessing, isSubmitting: isGeminiSubmitting } = useGeminiVideoQueue();
  const geminiChannelRef = useRef<ReturnType<typeof subscribeGemini> | null>(null);

  // Reset audio when switching away from Veo models
  useEffect(() => {
    if (!isVeoModel) setGenerateAudio(false);
  }, [selectedModel, isVeoModel]);

  // 5 min watchdog for stuck pending jobs
  useJobPendingWatchdog({
    jobId,
    toolType: 'video_generator',
    enabled: !!jobId && isGenerating,
    onJobFailed: handleWatchdogFailed,
  });

  // Triple sync: realtime + polling backup + visibility recovery
  useJobStatusSync({
    jobId,
    toolType: 'video_generator',
    enabled: !!jobId && isGenerating,
    onStatusChange: useCallback((update) => {
      console.log(`[GerarVideo] StatusSync update:`, update.status);
      if (update.status === 'queued') {
        setIsQueued(true);
        setQueuePosition(update.position || 1);
      } else if (update.status === 'starting' || update.status === 'running') {
        setIsQueued(false);
        setQueuePosition(0);
      } else if (update.status === 'completed') {
        if (update.outputUrl) setResultUrl(update.outputUrl);
        setIsGenerating(false);
        setIsQueued(false);
        refetchCredits();
        toast.success('Vídeo gerado com sucesso!');
      } else if (update.status === 'failed' || update.status === 'cancelled') {
        const errInfo = getAIErrorMessage(update.errorMessage || 'Erro na geração');
        setErrorMessage(errInfo.message);
        setIsGenerating(false);
        setIsQueued(false);
        refetchCredits();
        if (update.errorMessage) toast.error(`${errInfo.message}. ${errInfo.solution}`);
      }
    }, [refetchCredits]),
  });

  const handleFrameSelect = (type: 'start' | 'end') => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    e.target.value = '';

    try {
      const { file: optimizedFile } = await optimizeForAI(file);
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(',')[1];
        const frame: FrameImage = { file: optimizedFile, preview: dataUrl, base64, mimeType: optimizedFile.type };
        if (type === 'start') setStartFrame(frame);
        else setEndFrame(frame);
      };
      reader.readAsDataURL(optimizedFile);
    } catch (err) {
      console.error('[VideoTool] Frame compression failed, using original:', err);
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(',')[1];
        const frame: FrameImage = { file, preview: dataUrl, base64, mimeType: file.type };
        if (type === 'start') setStartFrame(frame);
        else setEndFrame(frame);
      };
      reader.readAsDataURL(file);
    }
  };

  // Clear frames when switching to prompt_only mode
  useEffect(() => {
    if (generationMode === 'prompt_only') {
      setStartFrame(null);
      setEndFrame(null);
    }
  }, [generationMode]);

  // Cleanup evolink polling and gemini channel on unmount
  useEffect(() => {
    return () => {
      if (evolinkPollRef.current) clearInterval(evolinkPollRef.current);
      if (geminiChannelRef.current) geminiChannelRef.current.unsubscribe();
    };
  }, []);

  // Evolink polling logic
  const evolinkErrorCountRef = useRef(0);

  const startEvolinkPolling = useCallback((jId: string) => {
    if (evolinkPollRef.current) clearInterval(evolinkPollRef.current);
    evolinkErrorCountRef.current = 0;

    const poll = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        if (!token) {
          console.warn('[GerarVideo] Evolink poll: no auth token, skipping');
          return;
        }

        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-video/poll-evolink`, {
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
          console.error(`[GerarVideo] Evolink poll HTTP error: ${res.status} (attempt ${evolinkErrorCountRef.current})`);
          if (evolinkErrorCountRef.current >= 10) {
            console.error('[GerarVideo] Too many poll errors, stopping polling');
            if (evolinkPollRef.current) clearInterval(evolinkPollRef.current);
          }
          return;
        }

        const data = await res.json();
        console.log(`[GerarVideo] Evolink poll result:`, data.status, data.progress);
        evolinkErrorCountRef.current = 0; // Reset on success

        if (data.status === 'completed') {
          if (data.output_url) setResultUrl(data.output_url);
          setIsGenerating(false);
          setIsQueued(false);
          refetchCredits();
          toast.success('Vídeo gerado com sucesso!');
          if (evolinkPollRef.current) clearInterval(evolinkPollRef.current);
        } else if (data.status === 'failed') {
          const errInfo = getAIErrorMessage(data.error || 'Erro na geração');
          setErrorMessage(errInfo.message);
          setIsGenerating(false);
          setIsQueued(false);
          refetchCredits();
          toast.error(`${errInfo.message}. ${errInfo.solution}`);
          if (evolinkPollRef.current) clearInterval(evolinkPollRef.current);
        }
      } catch (e) {
        evolinkErrorCountRef.current++;
        console.error(`[GerarVideo] Evolink poll error (attempt ${evolinkErrorCountRef.current}):`, e);
        if (evolinkErrorCountRef.current >= 10) {
          console.error('[GerarVideo] Too many consecutive poll errors, stopping');
          if (evolinkPollRef.current) clearInterval(evolinkPollRef.current);
        }
      }
    };

    // Poll every 10 seconds
    evolinkPollRef.current = setInterval(poll, 10000);
    // First poll after 5s
    setTimeout(poll, 5000);
  }, [refetchCredits]);

  // Realtime subscription for job status
  useEffect(() => {
    if (!jobId) return;

    const channel = supabase
      .channel(`video-job-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'video_generator_jobs',
          filter: `id=eq.${jobId}`,
        },
        (payload) => {
          const job = payload.new as any;
          console.log(`[GerarVideo] Realtime update:`, job.status, job.current_step);

          if (job.status === 'queued') {
            setIsQueued(true);
            setQueuePosition(job.position || 1);
          } else if (job.status === 'starting' || job.status === 'running') {
            setIsQueued(false);
            setQueuePosition(0);
          } else if (job.status === 'completed') {
            setResultUrl(job.output_url);
            setIsGenerating(false);
            setIsQueued(false);
            refetchCredits();
            toast.success('Vídeo gerado com sucesso!');
            if (evolinkPollRef.current) clearInterval(evolinkPollRef.current);
          } else if (job.status === 'failed' || job.status === 'cancelled') {
            const errInfo = getAIErrorMessage(job.error_message || 'Erro na geração');
            setErrorMessage(errInfo.message);
            setIsGenerating(false);
            setIsQueued(false);
            refetchCredits();
            if (job.error_message) toast.error(`${errInfo.message}. ${errInfo.solution}`);
            if (evolinkPollRef.current) clearInterval(evolinkPollRef.current);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId, refetchCredits]);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Digite um prompt para gerar o vídeo');
      return;
    }

    // Validate frames when in with_frames mode
    if (generationMode === 'with_frames') {
      const needsBothFrames = selectedModel === 'wan2.2';
      if (needsBothFrames && (!startFrame || !endFrame)) {
        toast.error('Selecione o primeiro e o último frame para gerar o vídeo');
        return;
      }
      if (!needsBothFrames && !startFrame) {
        toast.error('Selecione a imagem de referência para gerar o vídeo');
        return;
      }
    }

    if (!user?.id) {
      setNoCreditsReason('not_logged');
      setShowNoCreditsModal(true);
      return;
    }

    if (!startSubmit()) return;

    setIsGenerating(true);
    setErrorMessage(null);
    setResultUrl(null);
    setIsQueued(false);
    setQueuePosition(0);

    try {
      // Upload reference image to storage if needed (for Gemini Lite with_frames)
      let referenceImageUrl: string | undefined;
      if (generationMode === 'with_frames' && startFrame) {
        const base64Data = startFrame.base64;
        const binaryStr = atob(base64Data);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        const tempId = crypto.randomUUID();
        const storagePath = `video-refs/${user.id}/${tempId}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from('artes-cloudinary')
          .upload(storagePath, bytes.buffer, { contentType: 'image/jpeg', upsert: true });
        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage
            .from('artes-cloudinary')
            .getPublicUrl(storagePath);
          referenceImageUrl = publicUrlData.publicUrl;
        }
      }

      // ===== GEMINI LITE PATH =====
      if (isGeminiLite) {
        try {
          const job = await enqueueGemini({
            prompt: prompt.trim(),
            aspectRatio: aspectRatio as '16:9' | '9:16',
            duration: 8,
            quality: '720p',
            context: 'video-generator',
            referenceImageUrl,
          });

          setJobId(job.id);
          setIsQueued(true);
          toast.success('Vídeo adicionado à fila! Pronto em 2-5 minutos.');

          // Subscribe to realtime updates
          const channel = subscribeGemini(job.id, (updatedJob: GeminiQueueJob) => {
            if (updatedJob.status === 'completed' && updatedJob.video_url) {
              setResultUrl(updatedJob.video_url);
              setIsGenerating(false);
              setIsQueued(false);
              refetchCredits();
              toast.success('Vídeo gerado com sucesso!');
              channel.unsubscribe();
            } else if (updatedJob.status === 'failed') {
              const errInfo = getAIErrorMessage(updatedJob.error_message || 'Erro na geração');
              setErrorMessage(errInfo.message);
              setIsGenerating(false);
              setIsQueued(false);
              refetchCredits();
              toast.error(`${errInfo.message}. ${errInfo.solution}`);
              channel.unsubscribe();
            } else if (updatedJob.status === 'processing') {
              setIsQueued(false);
            }
          });
          geminiChannelRef.current = channel;

          // Trigger processing immediately (cron will also pick it up)
          triggerProcessing();
        } catch (err: any) {
          if (err.message?.includes('INSUFFICIENT_CREDITS') || err.message?.includes('Créditos insuficientes')) {
            setNoCreditsReason('insufficient');
            setShowNoCreditsModal(true);
          } else if (err.message?.includes('USER_HAS_ACTIVE_JOB')) {
            toast.error('Você já tem uma geração na fila. Aguarde finalizar.');
          } else {
            toast.error(err.message || 'Erro ao enfileirar vídeo');
            setErrorMessage(err.message || 'Erro ao enfileirar vídeo');
          }
          setIsGenerating(false);
        }
        endSubmit();
        return;
      }

      // ===== EXISTING MODELS PATH (unchanged) =====
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        toast.error('Sessão expirada. Faça login novamente.');
        setIsGenerating(false);
        endSubmit();
        return;
      }

      if (creditCost > 0) {
        const freshCredits = await checkBalance();
        if (freshCredits < creditCost) {
          setNoCreditsReason('insufficient');
          setShowNoCreditsModal(true);
          setIsGenerating(false);
          endSubmit();
          return;
        }
      }

      const bodyData: any = {
        prompt: prompt.trim(),
        aspect_ratio: isVeoModel ? aspectRatio : undefined,
        model: selectedModel,
        generate_audio: isVeoModel ? generateAudio : undefined,
      };

      if (generationMode === 'with_frames' && startFrame) {
        bodyData.start_frame = { base64: startFrame.base64, mimeType: startFrame.mimeType };
        if (selectedModel === 'wan2.2' && endFrame) {
          bodyData.end_frame = { base64: endFrame.base64, mimeType: endFrame.mimeType };
        }
        // For Veo models with 2 frames (start+end)
        if (isVeoModel && endFrame) {
          bodyData.end_frame = { base64: endFrame.base64, mimeType: endFrame.mimeType };
        }
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-video/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify(bodyData),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.code === 'INSUFFICIENT_CREDITS') {
          setNoCreditsReason('insufficient');
          setShowNoCreditsModal(true);
        } else if (data.code === 'USER_HAS_ACTIVE_JOB') {
          toast.error(data.error);
        } else {
          toast.error(data.error || 'Erro ao iniciar geração');
          setErrorMessage(data.error || 'Erro ao iniciar geração');
        }
        setIsGenerating(false);
        endSubmit();
        return;
      }

      setJobId(data.job_id);

      if (data.engine === 'evolink') {
        // Start Evolink polling
        startEvolinkPolling(data.job_id);
        toast.success('Geração de vídeo iniciada! Aguarde...');
      } else if (data.queued) {
        setIsQueued(true);
        setQueuePosition(data.position || 1);
        toast.info(`Você está na fila (posição ${data.position || 1}). Aguarde...`);
      } else {
        toast.success('Geração de vídeo iniciada! Aguarde...');
      }
    } catch (err: any) {
      console.error('[GerarVideo] Error:', err);
      const errMsg = err?.message || 'Erro ao gerar vídeo';
      toast.error(errMsg);
      setIsGenerating(false);
      if (jobId) {
        markJobAsFailedInDb(jobId, 'video_generator', errMsg);
      }
    } finally {
      endSubmit();
    }
  };

  const handleDownload = () => {
    if (resultUrl) {
      const link = document.createElement('a');
      link.href = resultUrl;
      link.download = `video-${selectedModel}-${Date.now()}.mp4`;
      link.target = '_blank';
      link.click();
    }
  };

  const handleNewGeneration = () => {
    setResultUrl(null);
    setJobId(null);
    setErrorMessage(null);
    setIsQueued(false);
    setQueuePosition(0);
    if (evolinkPollRef.current) clearInterval(evolinkPollRef.current);
  };

  const hasFrames = !!startFrame || !!endFrame;
  const framesReady = selectedModel === 'wan2.2' ? (!!startFrame && !!endFrame) : !!startFrame;

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-[#0f0a15] via-[#1a0f25] to-[#0a0510] flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-md border-b border-border px-4 py-3">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <div className="flex items-center gap-3">
              <button onClick={goBack} className="text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Video className="h-5 w-5 text-muted-foreground" />
                  Gerar Vídeo
                </h1>
                <p className="text-[10px] text-muted-foreground">{currentModel.name} • {currentModel.description}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Beta warning */}
        <div className="mx-4 mt-2 mb-0 max-w-4xl self-center w-full">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 text-xs">
            <span className="text-yellow-400 text-sm">⚠️</span>
            <span>Ferramenta em fase de teste — podem ocorrer erros ou resultados inesperados.</span>
          </div>
        </div>

        {/* Main content area */}
        <div className="flex-1 flex items-center justify-center p-4">
          {resultUrl ? (
            <div className="w-full max-w-2xl">
              <div className="rounded-2xl overflow-hidden border border-border bg-muted/50 shadow-2xl">
                <video src={resultUrl} controls autoPlay className="w-full h-auto" />
              </div>
            </div>
          ) : isGenerating ? (
            <div className="flex flex-col items-center gap-4 text-muted-foreground">
              <div className="w-20 h-20 rounded-full border-2 border-border flex items-center justify-center">
                {isQueued ? (
                  <Clock className="h-8 w-8 text-muted-foreground animate-pulse" />
                ) : (
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                )}
              </div>
              <div className="text-center">
                {isQueued ? (
                  <>
                    <p className="text-sm text-foreground font-medium">Você está na fila</p>
                    <p className="text-lg text-muted-foreground font-bold mt-1">Posição {queuePosition}</p>
                    <p className="text-xs text-muted-foreground mt-2">Sua geração será processada em breve</p>
                    <p className="text-[10px] text-slate-400 mt-1">Fila global compartilhada</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-foreground font-medium">Gerando vídeo...</p>
                    <p className="text-xs text-muted-foreground mt-1">Isso pode levar de 2 a 5 minutos</p>
                    <p className="text-[10px] text-slate-400 mt-1">Você pode sair da página — receberá uma notificação</p>
                  </>
                )}
              </div>
            </div>
          ) : errorMessage ? (
            <div className="max-w-md text-center space-y-3">
              {errorMessage.includes('celebridade') || errorMessage.includes('pessoa pública') || errorMessage.includes('filtro de segurança') || errorMessage.includes('bloqueado') ? (
                <div className="p-5 rounded-xl border border-orange-500/40 bg-orange-900/20 space-y-2">
                  <div className="flex items-center justify-center gap-2 text-orange-400 font-semibold text-base">
                    <span>⚠️</span> Conteúdo bloqueado
                  </div>
                  <p className="text-orange-300/90 text-sm leading-relaxed">{errorMessage}</p>
                  <p className="text-orange-400/60 text-xs">Seus créditos foram estornados automaticamente.</p>
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-red-500/30 bg-red-900/20 text-red-300 text-sm">
                  {errorMessage}
                  <p className="text-red-400/60 text-xs mt-2">Seus créditos foram estornados automaticamente.</p>
                </div>
              )}
              <Button onClick={handleNewGeneration} size="sm" variant="outline" className="border-slate-500/50 text-muted-foreground hover:bg-accent0/20 rounded-full px-5">
                Tentar novamente
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 text-slate-400/60">
              <Video className="h-12 w-12" />
              <p className="text-sm text-center">Digite um prompt e clique em Gerar Vídeo</p>
            </div>
          )}
        </div>

        <input ref={startFrameRef} type="file" accept="image/*" onChange={handleFrameSelect('start')} className="hidden" />
        <input ref={endFrameRef} type="file" accept="image/*" onChange={handleFrameSelect('end')} className="hidden" />

        {/* Bottom bar */}
        <div className="sticky bottom-0 z-20 bg-background/95 backdrop-blur-xl border-t border-slate-500/15 w-full">
          <div className="max-w-3xl mx-auto px-3 py-3 space-y-2.5">

            {/* When result is showing: Download + Novo buttons */}
            {resultUrl ? (
              <div className="flex gap-2 justify-center">
                <Button onClick={handleDownload} size="sm" className="bg-green-600 hover:bg-green-700 text-white rounded-full px-5">
                  <Download className="h-4 w-4 mr-2" /> Baixar
                </Button>
                <Button onClick={handleNewGeneration} size="sm" variant="outline" className="border-slate-500/50 text-muted-foreground hover:bg-accent0/20 rounded-full px-5">
                  <Video className="h-4 w-4 mr-2" /> Gerar Novo
                </Button>
              </div>
            ) : (
              <>
                {/* Frame upload area - when with_frames mode */}
                {generationMode === 'with_frames' && (
                  <div className="flex items-center gap-3">
                    {/* Start Frame / Reference Image Upload */}
                    <div className="flex-1">
                      <p className="text-[10px] text-muted-foreground mb-1 font-medium">
                        {isVeoModel ? 'Imagem de Referência' : '1º Frame (início)'}
                      </p>
                      {startFrame ? (
                        <div className="relative h-16 rounded-lg overflow-hidden border border-green-500/50 bg-muted/50">
                          <img src={startFrame.preview} alt={isVeoModel ? 'Imagem de referência' : 'Primeiro frame'} className="w-full h-full object-cover" />
                          <button 
                            onClick={() => setStartFrame(null)} 
                            className="absolute top-1 right-1 bg-red-600 hover:bg-red-500/100 rounded-full p-0.5 transition-colors"
                          >
                            <X className="h-3 w-3 text-foreground" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startFrameRef.current?.click()}
                          disabled={isGenerating}
                          className="w-full h-16 rounded-lg border-2 border-dashed border-purple-500/40 hover:border-border/60 bg-accent hover:bg-accent flex flex-col items-center justify-center gap-1 transition-colors"
                        >
                          <Upload className="h-4 w-4 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground">Enviar imagem</span>
                        </button>
                      )}
                    </div>

                    {/* Arrow indicator + End Frame - for Wan 2.2 and Veo FIRST&LAST */}
                    {(selectedModel === 'wan2.2' || isVeoModel) && (
                      <>
                        <div className="flex flex-col items-center gap-0.5 pt-4 flex-shrink-0">
                          <span className="text-muted-foreground text-lg">→</span>
                          <span className="text-[8px] text-slate-400">{MODEL_DURATIONS[selectedModel] || 8}s</span>
                        </div>

                        <div className="flex-1">
                          <p className="text-[10px] text-muted-foreground mb-1 font-medium">
                            {isVeoModel ? 'Último Frame (opcional)' : 'Último Frame (fim)'}
                          </p>
                          {endFrame ? (
                            <div className="relative h-16 rounded-lg overflow-hidden border border-green-500/50 bg-muted/50">
                              <img src={endFrame.preview} alt="Último frame" className="w-full h-full object-cover" />
                              <button 
                                onClick={() => setEndFrame(null)} 
                                className="absolute top-1 right-1 bg-red-600 hover:bg-red-500/100 rounded-full p-0.5 transition-colors"
                              >
                                <X className="h-3 w-3 text-foreground" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => endFrameRef.current?.click()}
                              disabled={isGenerating}
                              className="w-full h-16 rounded-lg border-2 border-dashed border-purple-500/40 hover:border-border/60 bg-accent hover:bg-accent flex flex-col items-center justify-center gap-1 transition-colors"
                            >
                              <Upload className="h-4 w-4 text-muted-foreground" />
                              <span className="text-[10px] text-muted-foreground">Enviar imagem</span>
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Prompt input row */}
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <textarea
                      ref={textareaRef}
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder={generationMode === 'with_frames' ? "Descreva a transição entre os frames..." : "Descreva o vídeo que você quer gerar..."}
                      rows={1}
                      className="w-full bg-accent border border-slate-500/25 rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:border-border transition-colors"
                      style={{ minHeight: '36px', maxHeight: '80px' }}
                      disabled={isGenerating}
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = '36px';
                        target.style.height = Math.min(target.scrollHeight, 80) + 'px';
                      }}
                    />
                  </div>

                  <Button
                    onClick={handleGenerate}
                    disabled={isGenerating || isSubmitting || !prompt.trim() || (generationMode === 'with_frames' && !framesReady)}
                    size="sm"
                    className="bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-semibold text-xs disabled:opacity-50 rounded-lg px-3 h-9 min-w-0 shrink-0"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                        {isQueued ? 'Fila...' : '...'}
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 mr-1" />
                        Gerar
                      </>
                    )}
                  </Button>
                </div>

                {/* Controls row */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <div className="flex rounded-lg border border-slate-500/25 overflow-hidden">
                    <button
                      onClick={() => setGenerationMode('prompt_only')}
                      disabled={isGenerating}
                      className={`flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium transition-colors ${
                        generationMode === 'prompt_only' 
                          ? 'bg-accent/60 text-accent-foreground' 
                          : 'bg-accent text-muted-foreground hover:text-muted-foreground'
                      }`}
                    >
                      <Type className="h-3 w-3" />
                      <span>Só Prompt</span>
                    </button>
                    <button
                      onClick={() => setGenerationMode('with_frames')}
                      disabled={isGenerating}
                      className={`flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium transition-colors ${
                        generationMode === 'with_frames' 
                          ? 'bg-accent/60 text-accent-foreground' 
                          : 'bg-accent text-muted-foreground hover:text-muted-foreground'
                      }`}
                    >
                      <ImagePlus className="h-3 w-3" />
                      <span>Com Imagens</span>
                    </button>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-1 px-2 py-1 rounded-lg bg-accent border border-slate-500/25 text-[10px] text-muted-foreground hover:bg-muted/50 transition-colors">
                        <span className="font-medium">{currentModel.name}</span>
                        <ChevronDown className="h-3 w-3 text-muted-foreground" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="bg-card border-border">
                      {availableModels.map(model => (
                        <DropdownMenuItem
                          key={model.id}
                          onClick={() => setSelectedModel(model.id)}
                          className={`text-xs ${selectedModel === model.id ? 'text-muted-foreground bg-accent0/10' : 'text-muted-foreground'}`}
                        >
                          <div className="flex flex-col">
                            <span className="font-medium">{model.name}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {model.description} • {
                                (isUnlimited && model.id === 'wan2.2')
                                  ? '∞ Grátis'
                                  : model.id === 'wan2.2' 
                                    ? `${model.cost} créditos`
                                    : `${model.cost}~${model.costWithAudio} créditos`
                              }
                            </span>
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {(isVeoModel || isGeminiLite) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="flex items-center gap-1 px-2 py-1 rounded-lg bg-accent border border-slate-500/25 text-[10px] text-muted-foreground hover:bg-muted/50 transition-colors">
                          <span className="font-medium">{ASPECT_RATIO_LABELS[aspectRatio] || aspectRatio}</span>
                          <ChevronDown className="h-3 w-3 text-muted-foreground" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="bg-card border-border">
                        {ASPECT_RATIOS.map(ratio => (
                          <DropdownMenuItem
                            key={ratio}
                            onClick={() => setAspectRatio(ratio)}
                            className={`text-xs ${aspectRatio === ratio ? 'text-muted-foreground bg-accent0/10' : 'text-muted-foreground'}`}
                          >
                            {ASPECT_RATIO_LABELS[ratio]} ({ratio})
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}

                  {isVeoModel && (
                    <button
                      onClick={() => setGenerateAudio(!generateAudio)}
                      disabled={isGenerating}
                      className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-medium transition-colors ${
                        generateAudio
                          ? 'bg-muted/30 border-border/50 text-muted-foreground'
                          : 'bg-accent border-slate-500/25 text-muted-foreground hover:text-muted-foreground hover:bg-muted/50'
                      } disabled:opacity-40 disabled:cursor-not-allowed`}
                      title={generateAudio ? 'Desativar áudio' : 'Ativar áudio (custo extra)'}
                    >
                      {generateAudio ? <Volume2 className="h-3 w-3" /> : <VolumeX className="h-3 w-3" />}
                      <span>{generateAudio ? 'Com Áudio' : 'Sem Áudio'}</span>
                    </button>
                  )}

                  <span className="text-[10px] text-muted-foreground ml-auto flex items-center gap-1.5">
                    <span>⏱ {MODEL_DURATIONS[selectedModel] || 8}s</span>
                    <span>•</span>
                    <span className="flex items-center gap-0.5">
                      <Coins className="h-3 w-3" />
                      {creditCost === 0 ? '∞ Grátis' : creditCost}
                    </span>
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        <NoCreditsModal
          isOpen={showNoCreditsModal}
          onClose={() => setShowNoCreditsModal(false)}
          reason={noCreditsReason}
        />
        
      </div>
    </AppLayout>
  );
};

export default GerarVideoTool;