import { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowLeft, Download, Upload, Sparkles, X, Loader2, Video, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { useUpscalerCredits } from '@/hooks/useUpscalerCredits';
import { useAIToolSettings } from '@/hooks/useAIToolSettings';
import { useSmartBackNavigation } from '@/hooks/useSmartBackNavigation';
import AIToolsAuthModal from '@/components/ai-tools/AIToolsAuthModal';
import { useAIToolsAuthModal } from '@/hooks/useAIToolsAuthModal';
import NoCreditsModal from '@/components/upscaler/NoCreditsModal';
import AppLayout from '@/components/layout/AppLayout';
import { AnimatedCreditsDisplay } from '@/components/upscaler/AnimatedCreditsDisplay';

const ASPECT_RATIOS = ['16:9', '9:16'] as const;
const DURATIONS = [5, 8] as const;

interface FrameImage {
  file: File;
  preview: string;
  base64: string;
  mimeType: string;
}

const GerarVideoTool = () => {
  const { goBack } = useSmartBackNavigation({ fallback: '/ferramentas-ia-aplicativo' });
  const { user } = usePremiumStatus();
  const { balance: credits, isLoading: creditsLoading, refetch: refetchCredits, checkBalance } = useUpscalerCredits(user?.id);
  const { showAuthModal, setShowAuthModal, handleAuthSuccess } = useAIToolsAuthModal({ user, refetchCredits });
  const { getCreditCost } = useAIToolSettings();

  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<string>('16:9');
  const [duration, setDuration] = useState<number>(5);
  const [startFrame, setStartFrame] = useState<FrameImage | null>(null);
  const [endFrame, setEndFrame] = useState<FrameImage | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showNoCreditsModal, setShowNoCreditsModal] = useState(false);
  const [noCreditsReason, setNoCreditsReason] = useState<'not_logged' | 'insufficient'>('insufficient');

  const startFrameRef = useRef<HTMLInputElement>(null);
  const endFrameRef = useRef<HTMLInputElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollingStartRef = useRef<number>(0);

  const creditCost = getCreditCost('gerar_video', 150);

  const handleFrameSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'start' | 'end') => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1];
      const frame: FrameImage = { file, preview: dataUrl, base64, mimeType: file.type };
      if (type === 'start') setStartFrame(frame);
      else setEndFrame(frame);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setIsPolling(false);
  }, []);

  const pollStatus = useCallback(async () => {
    if (!jobId) return;

    // 10 minute timeout
    if (Date.now() - pollingStartRef.current > 600_000) {
      stopPolling();
      setErrorMessage('Tempo limite excedido. Tente novamente.');
      setIsGenerating(false);
      return;
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) return;

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/poll-video-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ job_id: jobId }),
      });

      const data = await response.json();

      if (data.status === 'completed') {
        stopPolling();
        setResultUrl(data.output_url);
        setIsGenerating(false);
        await refetchCredits();
        toast.success('Vídeo gerado com sucesso!');
      } else if (data.status === 'failed') {
        stopPolling();
        setErrorMessage(data.error_message || 'Erro na geração');
        setIsGenerating(false);
        await refetchCredits();
        toast.error(data.error_message || 'Erro na geração do vídeo');
      }
      // else still processing
    } catch (err) {
      console.error('[GerarVideo] Poll error:', err);
    }
  }, [jobId, stopPolling, refetchCredits]);

  useEffect(() => {
    if (isPolling && jobId) {
      // Initial delay of 5s, then every 10s
      const timeout = setTimeout(() => {
        pollStatus();
        pollingRef.current = setInterval(pollStatus, 10_000);
      }, 5_000);

      return () => {
        clearTimeout(timeout);
        if (pollingRef.current) clearInterval(pollingRef.current);
      };
    }
  }, [isPolling, jobId, pollStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Digite um prompt para gerar o vídeo');
      return;
    }

    if (!user?.id) {
      setNoCreditsReason('not_logged');
      setShowNoCreditsModal(true);
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);
    setResultUrl(null);

    try {
      const freshCredits = await checkBalance();
      if (freshCredits < creditCost) {
        setNoCreditsReason('insufficient');
        setShowNoCreditsModal(true);
        setIsGenerating(false);
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        toast.error('Sessão expirada. Faça login novamente.');
        setIsGenerating(false);
        return;
      }

      const body: any = {
        prompt: prompt.trim(),
        aspect_ratio: aspectRatio,
        duration_seconds: duration,
      };

      if (startFrame) {
        body.start_frame = { base64: startFrame.base64, mimeType: startFrame.mimeType };
      }
      if (endFrame) {
        body.end_frame = { base64: endFrame.base64, mimeType: endFrame.mimeType };
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-video`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error === 'INSUFFICIENT_CREDITS') {
          setNoCreditsReason('insufficient');
          setShowNoCreditsModal(true);
        } else {
          toast.error(data.error || 'Erro ao iniciar geração');
          setErrorMessage(data.error || 'Erro ao iniciar geração');
        }
        setIsGenerating(false);
        return;
      }

      setJobId(data.job_id);
      setIsPolling(true);
      pollingStartRef.current = Date.now();
      toast.success('Geração de vídeo iniciada! Aguarde...');
    } catch (err) {
      console.error('[GerarVideo] Error:', err);
      toast.error('Erro ao gerar vídeo');
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (resultUrl) {
      const link = document.createElement('a');
      link.href = resultUrl;
      link.download = `veo-video-${Date.now()}.mp4`;
      link.target = '_blank';
      link.click();
    }
  };

  const handleNewGeneration = () => {
    setResultUrl(null);
    setJobId(null);
    setErrorMessage(null);
  };

  const FrameUploadCard = ({ label, frame, onRemove, inputRef, type }: {
    label: string;
    frame: FrameImage | null;
    onRemove: () => void;
    inputRef: React.RefObject<HTMLInputElement>;
    type: 'start' | 'end';
  }) => (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-purple-300">{label}</label>
      {frame ? (
        <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-purple-500/30">
          <img src={frame.preview} alt={label} className="w-full h-full object-cover" />
          <button
            onClick={onRemove}
            className="absolute top-2 right-2 bg-red-600 rounded-full p-1"
          >
            <X className="h-3 w-3 text-white" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          disabled={isGenerating}
          className="w-full aspect-video rounded-xl border-2 border-dashed border-purple-500/40 flex flex-col items-center justify-center text-purple-400 hover:border-purple-400 hover:text-purple-300 transition-colors bg-black/20"
        >
          <Upload className="h-6 w-6 mb-1" />
          <span className="text-[10px]">Clique para upload</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={(e) => handleFrameSelect(e, type)}
        className="hidden"
      />
    </div>
  );

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-[#0f0a15] via-[#1a0f25] to-[#0a0510]">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#0f0a15]/90 backdrop-blur-md border-b border-purple-500/20 px-4 py-3">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            <div className="flex items-center gap-3">
              <button onClick={goBack} className="text-purple-300 hover:text-white transition-colors">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-lg font-bold text-white flex items-center gap-2">
                  <Video className="h-5 w-5 text-fuchsia-400" />
                  Gerar Vídeo
                </h1>
                <p className="text-[10px] text-purple-400">Veo 3.1 Fast • Google</p>
              </div>
            </div>
            <AnimatedCreditsDisplay credits={credits} isLoading={creditsLoading} size="sm" />
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
          {/* Result */}
          {resultUrl && (
            <div className="space-y-3">
              <div className="rounded-xl overflow-hidden border border-purple-500/30 bg-black/40">
                <video
                  src={resultUrl}
                  controls
                  autoPlay
                  className="w-full h-auto"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleDownload} className="flex-1 bg-green-600 hover:bg-green-700 text-white">
                  <Download className="h-4 w-4 mr-2" /> Baixar Vídeo
                </Button>
                <Button onClick={handleNewGeneration} variant="outline" className="flex-1 border-purple-500/50 text-purple-200 hover:bg-purple-500/20">
                  <Video className="h-4 w-4 mr-2" /> Novo Vídeo
                </Button>
              </div>
            </div>
          )}

          {/* Error */}
          {errorMessage && !resultUrl && (
            <div className="p-4 rounded-xl border border-red-500/30 bg-red-900/20 text-red-300 text-sm">
              {errorMessage}
            </div>
          )}

          {/* Processing status */}
          {isGenerating && !resultUrl && (
            <div className="p-6 rounded-xl border border-purple-500/30 bg-purple-900/20 flex flex-col items-center gap-3">
              <Loader2 className="h-10 w-10 text-fuchsia-400 animate-spin" />
              <div className="text-center">
                <p className="text-white font-medium">Gerando vídeo...</p>
                <p className="text-xs text-purple-400 mt-1">Isso pode levar de 2 a 5 minutos</p>
              </div>
            </div>
          )}

          {/* Prompt */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-purple-300">Prompt</label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Descreva o vídeo que você quer gerar..."
              className="min-h-[100px] bg-black/30 border-purple-500/30 text-white placeholder:text-purple-500/50 resize-none"
              disabled={isGenerating}
            />
          </div>

          {/* Frames */}
          <div className="grid grid-cols-2 gap-3">
            <FrameUploadCard
              label="Start Frame (opcional)"
              frame={startFrame}
              onRemove={() => setStartFrame(null)}
              inputRef={startFrameRef as React.RefObject<HTMLInputElement>}
              type="start"
            />
            <FrameUploadCard
              label="End Frame (opcional)"
              frame={endFrame}
              onRemove={() => setEndFrame(null)}
              inputRef={endFrameRef as React.RefObject<HTMLInputElement>}
              type="end"
            />
          </div>

          {/* Aspect Ratio & Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-purple-300">Aspect Ratio</label>
              <div className="flex gap-2">
                {ASPECT_RATIOS.map(ratio => (
                  <button
                    key={ratio}
                    onClick={() => setAspectRatio(ratio)}
                    className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      aspectRatio === ratio
                        ? 'bg-fuchsia-600 text-white'
                        : 'bg-purple-900/40 text-purple-300 border border-purple-500/30 hover:bg-purple-800/40'
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-purple-300">Duração</label>
              <div className="flex gap-2">
                {DURATIONS.map(d => (
                  <button
                    key={d}
                    onClick={() => setDuration(d)}
                    className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      duration === d
                        ? 'bg-fuchsia-600 text-white'
                        : 'bg-purple-900/40 text-purple-300 border border-purple-500/30 hover:bg-purple-800/40'
                    }`}
                  >
                    {d}s
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Generate button */}
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="w-full h-12 bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white font-semibold text-sm disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Video className="h-5 w-5 mr-2" />
                Gerar Vídeo ({creditCost} créditos)
              </>
            )}
          </Button>
        </div>

        {/* Modals */}
        <AIToolsAuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onAuthSuccess={handleAuthSuccess}
        />
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
