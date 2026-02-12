import { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowLeft, Download, Upload, Sparkles, X, Loader2, Video, ChevronDown, Coins, ImagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
  const { balance: credits, refetch: refetchCredits, checkBalance } = useUpscalerCredits(user?.id);
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const creditCost = getCreditCost('gerar_video', 700);

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
    } catch (err) {
      console.error('[GerarVideo] Poll error:', err);
    }
  }, [jobId, stopPolling, refetchCredits]);

  useEffect(() => {
    if (isPolling && jobId) {
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

  const hasFrames = startFrame || endFrame;

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
                  <Video className="h-5 w-5 text-fuchsia-400" />
                  Gerar Vídeo
                </h1>
                <p className="text-[10px] text-purple-400">Veo 3.1 Fast • Google</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main content area */}
        <div className="flex-1 flex items-center justify-center p-4">
          {resultUrl ? (
            <div className="w-full max-w-2xl space-y-3">
              <div className="rounded-2xl overflow-hidden border border-purple-500/20 bg-black/30 shadow-2xl">
                <video src={resultUrl} controls autoPlay className="w-full h-auto" />
              </div>
              <div className="flex gap-2 justify-center">
                <Button onClick={handleDownload} size="sm" className="bg-green-600 hover:bg-green-700 text-white rounded-full px-5">
                  <Download className="h-4 w-4 mr-2" /> Baixar
                </Button>
                <Button onClick={handleNewGeneration} size="sm" variant="outline" className="border-purple-500/50 text-purple-200 hover:bg-purple-500/20 rounded-full px-5">
                  <Video className="h-4 w-4 mr-2" /> Novo
                </Button>
              </div>
            </div>
          ) : isGenerating ? (
            <div className="flex flex-col items-center gap-4 text-purple-300">
              <div className="w-20 h-20 rounded-full border-2 border-purple-500/30 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-fuchsia-400" />
              </div>
              <div className="text-center">
                <p className="text-sm text-white font-medium">Gerando vídeo...</p>
                <p className="text-xs text-purple-400 mt-1">Isso pode levar de 2 a 5 minutos</p>
              </div>
            </div>
          ) : errorMessage ? (
            <div className="max-w-md p-4 rounded-xl border border-red-500/30 bg-red-900/20 text-red-300 text-sm text-center">
              {errorMessage}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 text-purple-500/60">
              <Video className="h-12 w-12" />
              <p className="text-sm text-center">Digite um prompt e clique em Gerar Vídeo</p>
            </div>
          )}
        </div>

        {/* Frame previews strip */}
        {hasFrames && (
          <div className="sticky bottom-[110px] z-20 px-4">
            <div className="max-w-3xl mx-auto flex gap-2 items-center bg-[#1a1525]/90 backdrop-blur-md rounded-xl p-2 border border-purple-500/20">
              {startFrame && (
                <div className="relative w-16 h-10 rounded-lg overflow-hidden border border-purple-500/30 flex-shrink-0">
                  <img src={startFrame.preview} alt="Start" className="w-full h-full object-cover" />
                  <button onClick={() => setStartFrame(null)} className="absolute -top-1 -right-1 bg-red-600 rounded-full p-0.5">
                    <X className="h-2.5 w-2.5 text-white" />
                  </button>
                  <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-[8px] text-white text-center">Início</span>
                </div>
              )}
              {endFrame && (
                <div className="relative w-16 h-10 rounded-lg overflow-hidden border border-purple-500/30 flex-shrink-0">
                  <img src={endFrame.preview} alt="End" className="w-full h-full object-cover" />
                  <button onClick={() => setEndFrame(null)} className="absolute -top-1 -right-1 bg-red-600 rounded-full p-0.5">
                    <X className="h-2.5 w-2.5 text-white" />
                  </button>
                  <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-[8px] text-white text-center">Final</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bottom bar */}
        <div className="sticky bottom-0 z-20 bg-[#120e1a]/95 backdrop-blur-xl border-t border-purple-500/15 w-full">
          <div className="max-w-3xl mx-auto px-3 py-3 space-y-2.5">
            {/* Prompt input row */}
            <div className="flex items-end gap-2">
              {/* Frame upload dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    disabled={isGenerating}
                    className="relative flex-shrink-0 w-9 h-9 rounded-full border border-purple-500/30 bg-purple-900/30 flex items-center justify-center text-purple-300 hover:text-white hover:border-purple-400/60 transition-colors disabled:opacity-40"
                  >
                    <ImagePlus className="h-4 w-4" />
                    {hasFrames && (
                      <span className="absolute -top-1 -right-1 bg-green-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                        {(startFrame ? 1 : 0) + (endFrame ? 1 : 0)}
                      </span>
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="bg-[#1a1525] border-purple-500/30">
                  <DropdownMenuItem
                    onClick={() => startFrameRef.current?.click()}
                    className="text-xs text-purple-200"
                  >
                    {startFrame ? '✅ ' : ''}Start Frame (início)
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => endFrameRef.current?.click()}
                    className="text-xs text-purple-200"
                  >
                    {endFrame ? '✅ ' : ''}End Frame (final)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <input ref={startFrameRef} type="file" accept="image/*" onChange={(e) => handleFrameSelect(e, 'start')} className="hidden" />
              <input ref={endFrameRef} type="file" accept="image/*" onChange={(e) => handleFrameSelect(e, 'end')} className="hidden" />

              {/* Prompt textarea */}
              <div className="flex-1">
                <textarea
                  ref={textareaRef}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Descreva o vídeo que você quer gerar..."
                  rows={1}
                  className="w-full bg-purple-900/20 border border-purple-500/25 rounded-xl px-3 py-2 text-sm text-white placeholder:text-purple-500/50 resize-none focus:outline-none focus:border-purple-400/50 transition-colors"
                  style={{ minHeight: '36px', maxHeight: '80px' }}
                  disabled={isGenerating}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = '36px';
                    target.style.height = Math.min(target.scrollHeight, 80) + 'px';
                  }}
                />
              </div>
            </div>

            {/* Controls row */}
            <div className="flex items-center gap-1.5">
              {/* Aspect ratio dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-purple-900/40 border border-purple-500/25 text-xs text-purple-200 hover:bg-purple-800/50 transition-colors">
                    <span>⬜</span>
                    <span className="font-medium">{aspectRatio}</span>
                    <ChevronDown className="h-3 w-3 text-purple-400" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="bg-[#1a1525] border-purple-500/30">
                  {ASPECT_RATIOS.map(ratio => (
                    <DropdownMenuItem
                      key={ratio}
                      onClick={() => setAspectRatio(ratio)}
                      className={`text-xs ${aspectRatio === ratio ? 'text-fuchsia-300 bg-fuchsia-500/10' : 'text-purple-200'}`}
                    >
                      {ratio}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Duration dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-purple-900/40 border border-purple-500/25 text-xs text-purple-200 hover:bg-purple-800/50 transition-colors">
                    <span>⏱</span>
                    <span className="font-medium">{duration}s</span>
                    <ChevronDown className="h-3 w-3 text-purple-400" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="bg-[#1a1525] border-purple-500/30">
                  {DURATIONS.map(d => (
                    <DropdownMenuItem
                      key={d}
                      onClick={() => setDuration(d)}
                      className={`text-xs ${duration === d ? 'text-fuchsia-300 bg-fuchsia-500/10' : 'text-purple-200'}`}
                    >
                      {d} segundos
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="flex-1" />

              {/* Generate button */}
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                size="sm"
                className="bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white font-semibold text-xs disabled:opacity-50 rounded-lg px-4 h-8"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                    Gerar Vídeo
                    <span className="ml-2 flex items-center gap-1 text-xs opacity-90">
                      <Coins className="w-3.5 h-3.5" />
                      {creditCost}
                    </span>
                  </>
                )}
              </Button>
            </div>
          </div>
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
