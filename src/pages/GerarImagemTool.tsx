import { useState, useRef } from 'react';
import { ArrowLeft, Download, ImagePlus, Sparkles, X, Loader2, ZoomIn } from 'lucide-react';
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
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';

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
  const { balance: credits, isLoading: creditsLoading, refetch: refetchCredits, checkBalance } = useUpscalerCredits(user?.id);
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
                  <Sparkles className="h-5 w-5 text-fuchsia-400" />
                  Gerar Imagem
                </h1>
                <p className="text-[10px] text-purple-400">NanoBanana • Google Gemini</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <AnimatedCreditsDisplay credits={credits} isLoading={creditsLoading} size="sm" />
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
          {/* Result */}
          {resultBase64 && (
            <div className="space-y-3">
              <div className="rounded-xl overflow-hidden border border-purple-500/30 bg-black/40">
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
              <div className="flex gap-2">
                <Button onClick={handleDownload} className="flex-1 bg-green-600 hover:bg-green-700 text-white">
                  <Download className="h-4 w-4 mr-2" /> Baixar Imagem
                </Button>
                <Button onClick={handleNewGeneration} variant="outline" className="flex-1 border-purple-500/50 text-purple-200 hover:bg-purple-500/20">
                  <Sparkles className="h-4 w-4 mr-2" /> Nova Geração
                </Button>
              </div>
            </div>
          )}

          {/* Model selector */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-purple-300">Modelo</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setModel('normal')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  model === 'normal'
                    ? 'border-fuchsia-500 bg-fuchsia-500/20 text-white'
                    : 'border-purple-500/30 bg-black/20 text-purple-300 hover:border-purple-400/50'
                }`}
              >
                <div className="text-sm font-semibold">🍌 NanoBanana</div>
                <div className="text-[10px] text-purple-400 mt-0.5">Rápido • {creditCostNormal} créditos</div>
              </button>
              <button
                onClick={() => setModel('pro')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  model === 'pro'
                    ? 'border-amber-500 bg-amber-500/20 text-white'
                    : 'border-purple-500/30 bg-black/20 text-purple-300 hover:border-purple-400/50'
                }`}
              >
                <div className="text-sm font-semibold">🍌 NanoBanana Pro</div>
                <div className="text-[10px] text-purple-400 mt-0.5">Premium • {creditCostPro} créditos</div>
              </button>
            </div>
          </div>

          {/* Prompt */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-purple-300">Prompt</label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Descreva a imagem que você quer gerar..."
              className="min-h-[100px] bg-black/30 border-purple-500/30 text-white placeholder:text-purple-500/50 resize-none"
              disabled={isGenerating}
            />
          </div>

          {/* Reference Images */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-purple-300">Imagens de Referência (opcional)</label>
              <span className="text-[10px] text-purple-500">{referenceImages.length}/5</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {referenceImages.map((img, idx) => (
                <div key={idx} className="relative w-16 h-16 rounded-lg overflow-hidden border border-purple-500/30">
                  <img src={img.preview} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => removeReferenceImage(idx)}
                    className="absolute -top-1 -right-1 bg-red-600 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3 text-white" />
                  </button>
                </div>
              ))}
              {referenceImages.length < 5 && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-16 h-16 rounded-lg border-2 border-dashed border-purple-500/40 flex items-center justify-center text-purple-400 hover:border-purple-400 hover:text-purple-300 transition-colors"
                  disabled={isGenerating}
                >
                  <ImagePlus className="h-5 w-5" />
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Aspect Ratio */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-purple-300">Aspect Ratio</label>
            <div className="flex gap-2 flex-wrap">
              {ASPECT_RATIOS.map(ratio => (
                <button
                  key={ratio}
                  onClick={() => setAspectRatio(ratio)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
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
