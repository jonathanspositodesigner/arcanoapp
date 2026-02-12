import { useState, useRef } from 'react';
import { ArrowLeft, Download, ImagePlus, Sparkles, X, Loader2, Paperclip, ChevronDown } from 'lucide-react';
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

import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const ASPECT_RATIOS = ['1:1', '16:9', '9:16', '4:3', '3:4'] as const;

interface ReferenceImage {
  file: File;
  preview: string;
  base64: string;
  mimeType: string;
}

const GerarImagemTool = () => {
  const { goBack } = useSmartBackNavigation({ fallback: '/ferramentas-ia-aplicativo' });
  const { user } = usePremiumStatus();
  const { balance: credits, refetch: refetchCredits, checkBalance } = useUpscalerCredits(user?.id);
  const { showAuthModal, setShowAuthModal, handleAuthSuccess } = useAIToolsAuthModal({ user, refetchCredits });
  const { getCreditCost } = useAIToolSettings();

  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState<'normal' | 'pro'>('normal');
  const [aspectRatio, setAspectRatio] = useState<string>('1:1');
  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultBase64, setResultBase64] = useState<string | null>(null);
  const [resultMimeType, setResultMimeType] = useState<string>('image/png');
  const [showNoCreditsModal, setShowNoCreditsModal] = useState(false);
  const [noCreditsReason, setNoCreditsReason] = useState<'not_logged' | 'insufficient'>('insufficient');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const creditCostNormal = getCreditCost('gerar_imagem', 40);
  const creditCostPro = getCreditCost('gerar_imagem_pro', 60);
  const currentCreditCost = model === 'pro' ? creditCostPro : creditCostNormal;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const remaining = 5 - referenceImages.length;
    const toProcess = Array.from(files).slice(0, remaining);

    for (const file of toProcess) {
      if (!file.type.startsWith('image/')) continue;
      
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(',')[1];
        setReferenceImages(prev => [...prev, {
          file,
          preview: dataUrl,
          base64,
          mimeType: file.type,
        }]);
      };
      reader.readAsDataURL(file);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeReferenceImage = (index: number) => {
    setReferenceImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Digite um prompt para gerar a imagem');
      return;
    }

    if (!user?.id) {
      setNoCreditsReason('not_logged');
      setShowNoCreditsModal(true);
      return;
    }

    setIsGenerating(true);

    try {
      const freshCredits = await checkBalance();
      if (freshCredits < currentCreditCost) {
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

      const refImgs = referenceImages.map(img => ({
        base64: img.base64,
        mimeType: img.mimeType,
      }));

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          model,
          aspect_ratio: aspectRatio,
          reference_images: refImgs.length > 0 ? refImgs : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error === 'INSUFFICIENT_CREDITS') {
          setNoCreditsReason('insufficient');
          setShowNoCreditsModal(true);
        } else {
          toast.error(data.error || 'Erro ao gerar imagem');
        }
        setIsGenerating(false);
        return;
      }

      setResultUrl(data.output_url);
      setResultBase64(data.image_base64);
      setResultMimeType(data.mime_type || 'image/png');
      await refetchCredits();
      toast.success('Imagem gerada com sucesso!');
    } catch (err) {
      console.error('[GerarImagem] Error:', err);
      toast.error('Erro ao gerar imagem');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (resultBase64) {
      const link = document.createElement('a');
      link.href = `data:${resultMimeType};base64,${resultBase64}`;
      link.download = `nanobanana-${Date.now()}.png`;
      link.click();
    } else if (resultUrl) {
      window.open(resultUrl, '_blank');
    }
  };

  const handleNewGeneration = () => {
    setResultUrl(null);
    setResultBase64(null);
  };

  const modelLabel = model === 'pro' ? 'Nano Banana Pro' : 'Nano Banana';

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
                <p className="text-[10px] text-purple-400">NanoBanana • Google Gemini</p>
              </div>
            </div>
          </div>
        </div>


        {/* Main content area - image result centered */}
        <div className="flex-1 flex items-center justify-center p-4">
          {resultBase64 ? (
            <div className="w-full max-w-2xl space-y-3">
              <div className="rounded-2xl overflow-hidden border border-purple-500/20 bg-black/30 shadow-2xl">
                <TransformWrapper>
                  <TransformComponent wrapperClass="!w-full" contentClass="!w-full">
                    <img
                      src={`data:${resultMimeType};base64,${resultBase64}`}
                      alt="Imagem gerada"
                      className="w-full h-auto"
                    />
                  </TransformComponent>
                </TransformWrapper>
              </div>
              <div className="flex gap-2 justify-center">
                <Button onClick={handleDownload} size="sm" className="bg-green-600 hover:bg-green-700 text-white rounded-full px-5">
                  <Download className="h-4 w-4 mr-2" /> Baixar
                </Button>
                <Button onClick={handleNewGeneration} size="sm" variant="outline" className="border-purple-500/50 text-purple-200 hover:bg-purple-500/20 rounded-full px-5">
                  <Sparkles className="h-4 w-4 mr-2" /> Nova
                </Button>
              </div>
            </div>
          ) : isGenerating ? (
            <div className="flex flex-col items-center gap-4 text-purple-300">
              <div className="relative">
                <div className="w-20 h-20 rounded-full border-2 border-purple-500/30 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-fuchsia-400" />
                </div>
              </div>
              <p className="text-sm">Gerando sua imagem...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 text-purple-500/60">
              <Sparkles className="h-12 w-12" />
              <p className="text-sm text-center">Digite um prompt e clique em Gerar</p>
            </div>
          )}
        </div>

        {/* Reference images preview strip */}
        {referenceImages.length > 0 && (
          <div className="sticky bottom-[110px] z-20 px-4">
            <div className="max-w-3xl mx-auto flex gap-2 items-center bg-[#1a1525]/90 backdrop-blur-md rounded-xl p-2 border border-purple-500/20">
              {referenceImages.map((img, idx) => (
                <div key={idx} className="relative w-12 h-12 rounded-lg overflow-hidden border border-purple-500/30 flex-shrink-0">
                  <img src={img.preview} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => removeReferenceImage(idx)}
                    className="absolute -top-1 -right-1 bg-red-600 rounded-full p-0.5"
                  >
                    <X className="h-2.5 w-2.5 text-white" />
                  </button>
                </div>
              ))}
              <span className="text-[10px] text-purple-400 ml-1">{referenceImages.length}/5</span>
            </div>
          </div>
        )}

        {/* Bottom bar */}
        <div className="sticky bottom-0 z-20 bg-[#120e1a]/95 backdrop-blur-xl border-t border-purple-500/15 w-full">
          <div className="max-w-3xl mx-auto px-3 py-3 space-y-2.5">
            {/* Prompt input row */}
            <div className="flex items-end gap-2">
              {/* Attachment button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isGenerating || referenceImages.length >= 5}
                className="relative flex-shrink-0 w-9 h-9 rounded-full border border-purple-500/30 bg-purple-900/30 flex items-center justify-center text-purple-300 hover:text-white hover:border-purple-400/60 transition-colors disabled:opacity-40"
              >
                <Paperclip className="h-4 w-4" />
                {referenceImages.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-green-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {referenceImages.length}
                  </span>
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* Prompt textarea */}
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Descreva a imagem que você quer gerar..."
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
            <div className="flex items-center gap-1.5 flex-wrap mb-2">
              {/* Model dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-purple-900/40 border border-purple-500/25 text-xs text-purple-200 hover:bg-purple-800/50 transition-colors">
                    <span className="text-green-400 font-bold text-[10px]">G</span>
                    <span className="font-medium">{modelLabel}</span>
                    <ChevronDown className="h-3 w-3 text-purple-400" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="bg-[#1a1525] border-purple-500/30">
                  <DropdownMenuItem
                    onClick={() => setModel('normal')}
                    className={`text-xs ${model === 'normal' ? 'text-fuchsia-300 bg-fuchsia-500/10' : 'text-purple-200'}`}
                  >
                    🍌 Nano Banana — {creditCostNormal} cr
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setModel('pro')}
                    className={`text-xs ${model === 'pro' ? 'text-amber-300 bg-amber-500/10' : 'text-purple-200'}`}
                  >
                    🍌 Nano Banana Pro — {creditCostPro} cr
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

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

              {/* Spacer */}
              <div className="flex-1" />

              {/* Generate button */}
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="w-full h-12 bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white font-semibold text-sm disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Gerando imagem...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5 mr-2" />
                    Gerar Imagem ({currentCreditCost} créditos)
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

export default GerarImagemTool;
