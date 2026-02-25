import { useState, useCallback, useRef, useEffect } from "react";
import { Sparkles, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTrialState } from "./useTrialState";
import TrialSignupModal from "./TrialSignupModal";
import UpscalerMockup from "./UpscalerMockup";
import { ImageCompressionModal } from "@/components/ai-tools";
import { optimizeForAI, getImageDimensions, MAX_AI_DIMENSION } from "@/hooks/useImageOptimizer";
import { useProcessingButton } from "@/hooks/useProcessingButton";
import { getAIErrorMessage } from "@/utils/errorMessages";
import { useJobStatusSync } from "@/hooks/useJobStatusSync";

// Prompt categories - exact copy from UpscalerArcanoTool.tsx
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
type ProcessingStatus = 'idle' | 'uploading' | 'processing' | 'completed' | 'failed';

export default function UpscalerTrialSection() {
  const { phase, email, usesRemaining, openSignup, closeSignup, onVerified, consumeUse, finishTrial } = useTrialState();
  const { isSubmitting, startSubmit, endSubmit } = useProcessingButton();
  
  // Image state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [processedFile, setProcessedFile] = useState<File | null>(null);
  const [inputPreviewUrl, setInputPreviewUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  
  // Category state
  const [selectedCategory, setSelectedCategory] = useState<PromptCategory>('pessoas_perto');
  const [pessoasFraming, setPessoasFraming] = useState<PessoasFraming>('perto');
  const [comidaDetailLevel, setComidaDetailLevel] = useState(0.85);
  
  // Compression modal state
  const [showCompressionModal, setShowCompressionModal] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingDimensions, setPendingDimensions] = useState<{ w: number; h: number } | null>(null);
  
  // Job tracking state
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [progress, setProgress] = useState(0);
  
  const sessionIdRef = useRef(`trial_${Date.now()}`);

  // Derived flags - exact same logic as UpscalerArcanoTool.tsx
  const isPessoas = selectedCategory.startsWith('pessoas');
  const isSpecialWorkflow = selectedCategory === 'fotoAntiga' || selectedCategory === 'comida' || selectedCategory === 'logo' || selectedCategory === 'render3d';
  const isComidaMode = selectedCategory === 'comida';
  const isLongeMode = pessoasFraming === 'longe' && isPessoas;

  // Progress animation while processing (same as original tool)
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

  // Stable callback for job status sync - using ref to avoid recreation
  const statusCallbackRef = useRef<(update: any) => void>();
  statusCallbackRef.current = (update: any) => {
    if (update.status === 'completed' && update.outputUrl) {
      setResultUrl(update.outputUrl);
      setStatus('completed');
      setProgress(100);
      setJobId(null);
      endSubmit();
      toast.success("Imagem melhorada com sucesso!");
    } else if (update.status === 'failed' || update.status === 'cancelled') {
      setStatus('failed');
      setProgress(0);
      setJobId(null);
      endSubmit();
      const errorInfo = getAIErrorMessage(update.errorMessage || null);
      toast.error(errorInfo.message, { description: errorInfo.solution });
      // If no uses remaining, finish trial immediately
      if (usesRemaining <= 0) {
        finishTrial();
      }
    } else if (update.status === 'queued') {
      setProgress(prev => Math.min(prev + 5, 90));
    } else if (update.status === 'running') {
      setProgress(prev => Math.min(prev + 5, 90));
    }
  };
  
  const stableOnStatusChange = useCallback((update: any) => {
    statusCallbackRef.current?.(update);
  }, []);

  // Job status sync via Realtime + polling
  useJobStatusSync({
    jobId,
    toolType: 'upscaler',
    enabled: (status === 'processing' || status === 'uploading') && !!jobId,
    onStatusChange: stableOnStatusChange,
  });

  const scrollToPricing = () => {
    const el = document.getElementById("pricing-section");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  // Process file after dimension check or compression - applies optimizeForAI (JPEG 1536px 2MB)
  const processFileForUpload = useCallback(async (file: File) => {
    try {
      toast.info('Otimizando imagem...');
      const optimizationResult = await optimizeForAI(file);
      setProcessedFile(optimizationResult.file);
      setUploadedFile(optimizationResult.file);
      // Store a preview URL of the input for the before/after slider
      const url = URL.createObjectURL(optimizationResult.file);
      setInputPreviewUrl(url);
      setResultUrl(null);
      setStatus('idle');
      setProgress(0);
    } catch (error) {
      console.error('[TrialUpscaler] Optimization error:', error);
      toast.error('Erro ao otimizar imagem');
    }
  }, []);

  // Handle file selection with dimension validation
  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione uma imagem válida');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Imagem deve ter no máximo 10MB');
      return;
    }

    try {
      const dimensions = await getImageDimensions(file);
      
      // If image exceeds MAX_AI_DIMENSION, show compression modal
      if (dimensions.width > MAX_AI_DIMENSION || dimensions.height > MAX_AI_DIMENSION) {
        setPendingFile(file);
        setPendingDimensions({ w: dimensions.width, h: dimensions.height });
        setShowCompressionModal(true);
        return;
      }

      // Image within limits, process directly
      await processFileForUpload(file);
    } catch (error) {
      console.error('[TrialUpscaler] Error getting dimensions:', error);
      toast.error('Erro ao processar imagem');
    }
  }, [processFileForUpload]);

  // Handle compression complete from modal
  const handleCompressionComplete = useCallback(async (compressedFile: File, newWidth: number, newHeight: number) => {
    setShowCompressionModal(false);
    setPendingFile(null);
    setPendingDimensions(null);
    toast.success(`Imagem comprimida para ${newWidth}x${newHeight}px`);
    await processFileForUpload(compressedFile);
  }, [processFileForUpload]);

  // Main generate function
  const handleGenerate = useCallback(async () => {
    if (!processedFile || !email) return;
    if (!startSubmit()) return;

    setStatus('uploading');
    setProgress(10);

    try {
      // 1. Upload processed file to storage
      setProgress(20);
      const tempId = crypto.randomUUID();
      const emailHash = email.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 20);
      const storagePath = `upscaler/trial_${emailHash}/${tempId}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('upscaler-uploads')
        .upload(storagePath, processedFile, {
          contentType: processedFile.type || 'image/jpeg',
          upsert: true,
        });

      if (uploadError) {
        console.error('[TrialUpscaler] Upload error:', uploadError);
        toast.error("Erro ao enviar imagem");
        setStatus('idle');
        setProgress(0);
        endSubmit();
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from('upscaler-uploads')
        .getPublicUrl(storagePath);

      const imageUrl = publicUrlData.publicUrl;
      console.log('[TrialUpscaler] Image uploaded:', imageUrl);
      setProgress(35);

      // 2. Create job in upscaler_jobs table
      const effectiveCategory = isLongeMode ? 'pessoas_longe' : selectedCategory;
      const framingMode = isLongeMode ? 'longe' : (isPessoas ? 'perto' : undefined);
      const detailDenoise = isComidaMode 
        ? comidaDetailLevel 
        : (isSpecialWorkflow ? undefined : 0.15);
      const prompt = isSpecialWorkflow ? undefined : PROMPT_CATEGORIES[effectiveCategory as PromptCategory];
      const inputFileName = storagePath.split('/').pop() || null;

      const { data: job, error: jobError } = await supabase
        .from('upscaler_jobs')
        .insert({
          session_id: sessionIdRef.current,
          status: 'pending',
          user_id: null,
          category: effectiveCategory,
          version: 'standard',
          resolution: isSpecialWorkflow ? null : 4096,
          framing_mode: framingMode || null,
          detail_denoise: detailDenoise ?? null,
          prompt: prompt ?? null,
          input_file_name: inputFileName,
          input_url: imageUrl,
        } as any)
        .select('id')
        .single();

      if (jobError || !job) {
        console.error('[TrialUpscaler] Job creation error:', jobError);
        toast.error('Erro ao criar processamento');
        setStatus('idle');
        setProgress(0);
        endSubmit();
        return;
      }

      const createdJobId = (job as any).id;
      console.log('[TrialUpscaler] Job created:', createdJobId);
      setJobId(createdJobId);
      setProgress(45);

      // 3. Call edge function
      setStatus('processing');
      setProgress(50);

      const { data: response, error: fnError } = await supabase.functions.invoke('runninghub-upscaler/run', {
        body: {
          jobId: createdJobId,
          imageUrl: imageUrl,
          version: 'standard',
          userId: null,
          creditCost: 0,
          category: effectiveCategory,
          trial_mode: true,
          detailDenoise: isComidaMode 
            ? comidaDetailLevel 
            : (isSpecialWorkflow ? undefined : 0.15),
          resolution: isSpecialWorkflow ? undefined : 4096,
          prompt: isSpecialWorkflow ? undefined : PROMPT_CATEGORIES[effectiveCategory as PromptCategory],
          framingMode: isSpecialWorkflow ? undefined : framingMode,
        },
      });

      if (fnError) {
        console.error('[TrialUpscaler] Edge function error:', fnError);
        const errorInfo = getAIErrorMessage(fnError.message || null);
        toast.error(errorInfo.message, { description: errorInfo.solution });
        setStatus('failed');
        setProgress(0);
        setJobId(null);
        endSubmit();
        return;
      }

      if (response?.code === 'INSUFFICIENT_CREDITS') {
        toast.error('Erro no processamento. Tente novamente.');
        setStatus('failed');
        setProgress(0);
        setJobId(null);
        endSubmit();
        return;
      }

      if (!response?.success && response?.error) {
        const errorInfo = getAIErrorMessage(response.error);
        toast.error(errorInfo.message, { description: errorInfo.solution });
        setStatus('failed');
        setProgress(0);
        setJobId(null);
        endSubmit();
        return;
      }

      // 4. Job started successfully! NOW consume the trial use
      console.log('[TrialUpscaler] Edge function response:', response);
      
      const { data: consumeData, error: consumeErr } = await supabase.functions.invoke("landing-trial-code/consume", {
        body: { email, tool_name: "upscaler" },
      });

      if (!consumeErr && !consumeData?.error) {
        consumeUse();
      } else {
        console.error('[TrialUpscaler] Consume error (job already started):', consumeData?.error);
      }

    } catch (err: any) {
      console.error('[TrialUpscaler] Generate error:', err);
      const errorInfo = getAIErrorMessage(err?.message || null);
      toast.error(errorInfo.message, { description: errorInfo.solution });
      setStatus('failed');
      setProgress(0);
      setJobId(null);
      endSubmit();
    }
  }, [processedFile, email, selectedCategory, pessoasFraming, comidaDetailLevel, isLongeMode, isPessoas, isSpecialWorkflow, isComidaMode, startSubmit, endSubmit, consumeUse]);

  const handleNewUpload = () => {
    if (usesRemaining <= 0) {
      finishTrial();
      return;
    }
    // Clean up old preview URL
    if (inputPreviewUrl) {
      URL.revokeObjectURL(inputPreviewUrl);
    }
    setUploadedFile(null);
    setProcessedFile(null);
    setInputPreviewUrl(null);
    setResultUrl(null);
    setJobId(null);
    setStatus('idle');
    setProgress(0);
  };

  return (
    <div className="px-4 py-20 bg-black/30">
      <div className="max-w-4xl mx-auto">
        <h2 className="font-space-grotesk font-bold text-2xl md:text-3xl lg:text-4xl text-white text-center mb-4">
          Ainda na dúvida? <span className="text-fuchsia-400">Faça um teste gratuito!</span>
        </h2>
        <p className="text-purple-200/70 text-center mb-10 max-w-xl mx-auto">
          Experimente o poder do Upscaler Arcano agora mesmo. Sem cadastro, sem compromisso.
        </p>

        <div className="relative">
          {/* Blurred/locked state */}
          {(phase === "locked" || phase === "finished") && (
            <>
              <div className="filter blur-[6px] pointer-events-none select-none">
                <UpscalerMockup />
              </div>

              {/* Overlay */}
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center gap-6 z-10">
                {phase === "locked" ? (
                  <>
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-fuchsia-500 to-purple-600 flex items-center justify-center">
                      <Sparkles className="w-10 h-10 text-white" />
                    </div>
                    <Button
                      size="lg"
                      className="bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white font-bold text-lg px-8 py-6 rounded-xl border-0 shadow-lg shadow-fuchsia-500/25"
                      onClick={openSignup}
                    >
                      <Sparkles className="w-5 h-5 mr-2" />
                      Fazer Teste Grátis
                    </Button>
                    <p className="text-purple-300/60 text-sm">1 upscale gratuito • Sem compromisso</p>
                  </>
                ) : (
                  <div className="text-center px-6 max-w-md">
                    <div className="text-4xl mb-4">🏆</div>
                    <h3 className="text-2xl font-bold text-white mb-3">Teste Concluído!</h3>
                    <p className="text-purple-200/80 mb-6">
                      Você viu o poder do Upscaler Arcano. Garanta acesso completo e ilimitado para transformar todas as suas imagens!
                    </p>
                    <Button
                      size="lg"
                      className="bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white font-bold text-lg px-8 py-6 rounded-xl border-0 shadow-lg shadow-fuchsia-500/25"
                      onClick={scrollToPricing}
                    >
                      <ShoppingCart className="w-5 h-5 mr-2" />
                      Comprar Agora
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Active trial */}
          {phase === "active" && (
            <div>
              <UpscalerMockup
                isActive
                usesRemaining={usesRemaining}
                onGenerate={resultUrl ? handleNewUpload : handleGenerate}
                isProcessing={status === 'uploading' || status === 'processing'}
                resultUrl={resultUrl}
                inputPreviewUrl={inputPreviewUrl}
                uploadedFile={uploadedFile}
                onFileSelect={handleFileSelect}
                selectedCategory={selectedCategory}
                pessoasFraming={pessoasFraming}
                comidaDetailLevel={comidaDetailLevel}
                onCategoryChange={setSelectedCategory}
                onFramingChange={setPessoasFraming}
                onDetailLevelChange={setComidaDetailLevel}
                progress={progress}
                status={status}
              />
              {resultUrl && (
                <div className="text-center mt-4">
                  <Button
                    variant="outline"
                    className="border-fuchsia-500/30 text-fuchsia-300 hover:bg-fuchsia-500/10"
                    onClick={handleNewUpload}
                  >
                    {usesRemaining > 0 
                      ? `Testar outra imagem (${usesRemaining} ${usesRemaining === 1 ? 'teste restante' : 'testes restantes'})` 
                      : '✅ Teste Concluído'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Signup Modal */}
      <TrialSignupModal
        open={phase === "signup"}
        onClose={closeSignup}
        onVerified={onVerified}
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
}
