import { useState, useCallback, useRef, useEffect } from "react";
import { Sparkles, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useClonerTrialState } from "./useClonerTrialState";
import TrialSignupModal from "@/components/upscaler/trial/TrialSignupModal";
import ClonerTrialMockup from "./ClonerTrialMockup";
import { ImageCompressionModal } from "@/components/ai-tools";
import { optimizeForAI, getImageDimensions, MAX_AI_DIMENSION } from "@/hooks/useImageOptimizer";
import { useProcessingButton } from "@/hooks/useProcessingButton";
import { getAIErrorMessage } from "@/utils/errorMessages";
import { useJobStatusSync } from "@/hooks/useJobStatusSync";
import { AspectRatio } from "@/components/arcano-cloner/AspectRatioSelector";

type ProcessingStatus = 'idle' | 'uploading' | 'processing' | 'completed' | 'failed';

export default function ClonerTrialSection() {
  const { phase, email, usesRemaining, openSignup, closeSignup, onVerified, consumeUse, finishTrial } = useClonerTrialState();
  const { isSubmitting, startSubmit, endSubmit } = useProcessingButton();

  // Image state
  const [userImage, setUserImage] = useState<string | null>(null);
  const [userFile, setUserFile] = useState<File | null>(null);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  // Settings
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [creativity, setCreativity] = useState(4);

  // Compression modal
  const [showCompressionModal, setShowCompressionModal] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingDimensions, setPendingDimensions] = useState<{ w: number; h: number } | null>(null);
  const [pendingTarget, setPendingTarget] = useState<'user' | 'reference'>('user');

  // Job tracking
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [progress, setProgress] = useState(0);

  const sessionIdRef = useRef(`cloner_trial_${Date.now()}`);

  // Progress animation
  useEffect(() => {
    if (status !== 'processing') return;
    const interval = setInterval(() => {
      setProgress(prev => prev >= 90 ? prev : prev + 1);
    }, 2000);
    return () => clearInterval(interval);
  }, [status]);

  // Job status sync callback
  const statusCallbackRef = useRef<(update: any) => void>();
  statusCallbackRef.current = (update: any) => {
    if (update.status === 'completed' && update.outputUrl) {
      setResultUrl(update.outputUrl);
      setStatus('completed');
      setProgress(100);
      setJobId(null);
      endSubmit();
      toast.success("Imagem gerada com sucesso!");
      if (usesRemaining <= 0) {
        setTimeout(() => finishTrial(), 5000);
      }
    } else if (update.status === 'failed' || update.status === 'cancelled') {
      setStatus('failed');
      setProgress(0);
      setJobId(null);
      endSubmit();
      const errorInfo = getAIErrorMessage(update.errorMessage || null);
      toast.error(errorInfo.message, { description: errorInfo.solution });
      if (usesRemaining <= 0) {
        finishTrial();
      }
    } else if (update.status === 'queued' || update.status === 'running') {
      setProgress(prev => Math.min(prev + 5, 90));
    }
  };

  const stableOnStatusChange = useCallback((update: any) => {
    statusCallbackRef.current?.(update);
  }, []);

  useJobStatusSync({
    jobId,
    toolType: 'arcano_cloner',
    enabled: (status === 'processing' || status === 'uploading') && !!jobId,
    onStatusChange: stableOnStatusChange,
  });

  const scrollToPricing = () => {
    const el = document.getElementById("pricing-section");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  // Process file with optimizeForAI
  const processFile = useCallback(async (file: File, target: 'user' | 'reference') => {
    try {
      toast.info('Otimizando imagem...');
      const result = await optimizeForAI(file);
      const url = URL.createObjectURL(result.file);

      if (target === 'user') {
        setUserImage(url);
        setUserFile(result.file as File);
      } else {
        setReferenceImage(url);
        setReferenceFile(result.file as File);
      }
    } catch (error) {
      console.error('[ClonerTrial] Optimization error:', error);
      toast.error('Erro ao otimizar imagem');
    }
  }, []);

  // Handle file selection with dimension check
  const handleFileSelect = useCallback(async (file: File, target: 'user' | 'reference') => {
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
      if (dimensions.width > MAX_AI_DIMENSION || dimensions.height > MAX_AI_DIMENSION) {
        setPendingFile(file);
        setPendingDimensions({ w: dimensions.width, h: dimensions.height });
        setPendingTarget(target);
        setShowCompressionModal(true);
        return;
      }
      await processFile(file, target);
    } catch (error) {
      console.error('[ClonerTrial] Error getting dimensions:', error);
      toast.error('Erro ao processar imagem');
    }
  }, [processFile]);

  const handleCompressionComplete = useCallback(async (compressedFile: File, newWidth: number, newHeight: number) => {
    setShowCompressionModal(false);
    setPendingFile(null);
    setPendingDimensions(null);
    toast.success(`Imagem comprimida para ${newWidth}x${newHeight}px`);
    await processFile(compressedFile, pendingTarget);
  }, [processFile, pendingTarget]);

  // Main generate function - mirrors ArcanoClonerTool.handleProcess
  const handleGenerate = useCallback(async () => {
    if (!userFile || !referenceFile || !email) return;
    if (!startSubmit()) return;

    setStatus('uploading');
    setProgress(10);

    try {
      // 1. Compress both images
      const compressedUser = await optimizeForAI(userFile);
      const compressedRef = await optimizeForAI(referenceFile);
      setProgress(25);

      // 2. Upload both to upscaler-uploads bucket
      const emailHash = email.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 20);
      const tempId = crypto.randomUUID();

      const userPath = `arcano-cloner/trial_${emailHash}/${tempId}-user.jpg`;
      const refPath = `arcano-cloner/trial_${emailHash}/${tempId}-ref.jpg`;

      const [userUpload, refUpload] = await Promise.all([
        supabase.storage.from('upscaler-uploads').upload(userPath, compressedUser.file, { contentType: 'image/jpeg', upsert: true }),
        supabase.storage.from('upscaler-uploads').upload(refPath, compressedRef.file, { contentType: 'image/jpeg', upsert: true }),
      ]);

      if (userUpload.error || refUpload.error) {
        console.error('[ClonerTrial] Upload error:', userUpload.error || refUpload.error);
        toast.error("Erro ao enviar imagens");
        setStatus('idle');
        setProgress(0);
        endSubmit();
        return;
      }

      const userUrl = supabase.storage.from('upscaler-uploads').getPublicUrl(userPath).data.publicUrl;
      const refUrl = supabase.storage.from('upscaler-uploads').getPublicUrl(refPath).data.publicUrl;
      setProgress(40);

      // 3. Create job in arcano_cloner_jobs with user_id: null
      const { data: job, error: jobError } = await supabase
        .from('arcano_cloner_jobs')
        .insert({
          session_id: sessionIdRef.current,
          user_id: null,
          status: 'pending',
          user_image_url: userUrl,
          reference_image_url: refUrl,
          aspect_ratio: aspectRatio,
          creativity: creativity,
          custom_prompt: null,
        } as any)
        .select('id')
        .single();

      if (jobError || !job) {
        console.error('[ClonerTrial] Job creation error:', jobError);
        toast.error('Erro ao criar processamento');
        setStatus('idle');
        setProgress(0);
        endSubmit();
        return;
      }

      const createdJobId = (job as any).id;
      setJobId(createdJobId);
      setProgress(50);
      setStatus('processing');

      // 4. Call edge function with trial_mode
      const { data: response, error: fnError } = await supabase.functions.invoke('runninghub-arcano-cloner/run', {
        body: {
          jobId: createdJobId,
          userImageUrl: userUrl,
          referenceImageUrl: refUrl,
          aspectRatio: aspectRatio,
          userId: null,
          creditCost: 0,
          creativity: creativity,
          customPrompt: '',
          trial_mode: true,
        },
      });

      if (fnError) {
        console.error('[ClonerTrial] Edge function error:', fnError);
        const errorInfo = getAIErrorMessage(fnError.message || null);
        toast.error(errorInfo.message, { description: errorInfo.solution });
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

      // 5. Job started - consume trial use
      console.log('[ClonerTrial] Edge function response:', response);

      const { data: consumeData, error: consumeErr } = await supabase.functions.invoke("landing-trial-code/consume", {
        body: { email },
      });

      if (!consumeErr && !consumeData?.error) {
        consumeUse();
      } else {
        console.error('[ClonerTrial] Consume error:', consumeData?.error);
      }

      // useJobStatusSync handles the rest

    } catch (err: any) {
      console.error('[ClonerTrial] Generate error:', err);
      const errorInfo = getAIErrorMessage(err?.message || null);
      toast.error(errorInfo.message, { description: errorInfo.solution });
      setStatus('failed');
      setProgress(0);
      setJobId(null);
      endSubmit();
    }
  }, [userFile, referenceFile, email, aspectRatio, creativity, startSubmit, endSubmit, consumeUse]);

  const handleNewUpload = () => {
    if (userImage) URL.revokeObjectURL(userImage);
    if (referenceImage) URL.revokeObjectURL(referenceImage);
    setUserImage(null);
    setUserFile(null);
    setReferenceImage(null);
    setReferenceFile(null);
    setResultUrl(null);
    setJobId(null);
    setStatus('idle');
    setProgress(0);
  };

  return (
    <div className="px-4 py-16 md:py-20 bg-black/30">
      <div className="max-w-3xl mx-auto">
        <h2 className="font-space-grotesk font-bold text-2xl md:text-3xl text-white text-center mb-3">
          Quer <span className="text-fuchsia-400">testar antes</span> de comprar?
        </h2>
        <p className="text-white/50 text-sm text-center mb-8">
          Faça um teste gratuito do Arcano Cloner e veja o resultado por conta própria
        </p>

        <div className="relative">
          {/* Blurred/locked state */}
          {(phase === "locked" || phase === "finished") && (
            <>
              <div className="filter blur-[6px] pointer-events-none select-none">
                <ClonerTrialMockup
                  userImage={null}
                  referenceImage={null}
                  resultUrl={null}
                  aspectRatio="1:1"
                  creativity={4}
                  onAspectRatioChange={() => {}}
                  onCreativityChange={() => {}}
                  onUserImageSelect={() => {}}
                  onReferenceImageSelect={() => {}}
                  onGenerate={() => {}}
                  onNewUpload={() => {}}
                  isProcessing={false}
                  progress={0}
                  status="idle"
                />
              </div>

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
                    <p className="text-purple-300/60 text-sm">1 geração gratuita • Sem compromisso</p>
                  </>
                ) : (
                  <div className="text-center px-6 max-w-md">
                    <div className="text-4xl mb-4">🏆</div>
                    <h3 className="text-2xl font-bold text-white mb-3">Teste Concluído!</h3>
                    <p className="text-purple-200/80 mb-6">
                      Você viu o poder do Arcano Cloner. Garanta acesso completo para transformar todas as suas fotos!
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
            <ClonerTrialMockup
              isActive
              usesRemaining={usesRemaining}
              userImage={userImage}
              referenceImage={referenceImage}
              resultUrl={resultUrl}
              aspectRatio={aspectRatio}
              creativity={creativity}
              onAspectRatioChange={setAspectRatio}
              onCreativityChange={setCreativity}
              onUserImageSelect={(file) => handleFileSelect(file, 'user')}
              onReferenceImageSelect={(file) => handleFileSelect(file, 'reference')}
              onGenerate={handleGenerate}
              onNewUpload={handleNewUpload}
              isProcessing={status === 'uploading' || status === 'processing'}
              progress={progress}
              status={status}
            />
          )}
        </div>

        <p className="text-white/30 text-xs mt-3 text-center">* Verificação por email necessária</p>
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
