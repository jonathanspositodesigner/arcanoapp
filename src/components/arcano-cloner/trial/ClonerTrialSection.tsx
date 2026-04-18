import { useState, useCallback, useRef, useEffect } from "react";
import { Sparkles, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useClonerTrialState } from "./useClonerTrialState";
import TrialSignupModal from "@/components/upscaler/trial/TrialSignupModal";
import ClonerTrialMockup from "./ClonerTrialMockup";
import PhotoLibraryModal from "@/components/arcano-cloner/PhotoLibraryModal";
import { optimizeForAI, getImageDimensions, compressToMaxDimension, MAX_AI_DIMENSION } from "@/hooks/useImageOptimizer";
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

  // Photo library
  const [showPhotoLibrary, setShowPhotoLibrary] = useState(false);


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
      const previewUrl = update.thumbnailUrl || update.outputUrl;
      setResultUrl(previewUrl);
      setStatus('completed');
      setProgress(100);
      setJobId(null);
      endSubmit();
      toast.success("Imagem gerada com sucesso!");
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
      // Reset processing state when user picks a new image
      setStatus('idle');
      setProgress(0);
      setResultUrl(null);
      setJobId(null);

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
      let fileToProcess = file;
      
      if (dimensions.width > MAX_AI_DIMENSION || dimensions.height > MAX_AI_DIMENSION) {
        toast.info('Redimensionando imagem automaticamente...');
        const compressed = await compressToMaxDimension(file, MAX_AI_DIMENSION - 1);
        fileToProcess = compressed.file;
      }
      await processFile(fileToProcess, target);
    } catch (error) {
      console.error('[ClonerTrial] Error getting dimensions, trying fallback:', error);
      try {
        await processFile(file, target);
      } catch {
        toast.error('Erro ao processar imagem. Tente outro formato.');
      }
    }
  }, [processFile]);

  // Main generate function - mirrors ArcanoClonerTool.handleProcess
  const handleGenerate = useCallback(async () => {
    if (!userFile || !referenceFile || !email) return;
    if (!startSubmit()) return;

    let localJobId: string | null = null;

    setStatus('uploading');
    setProgress(10);

    try {
      const compressedUser = await optimizeForAI(userFile);
      const compressedRef = await optimizeForAI(referenceFile);
      setProgress(25);

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

      const { data: authData } = await supabase.auth.getUser();
      const trialUserId = authData?.user?.id || null;
      const clientJobId = crypto.randomUUID();
      localJobId = clientJobId;
      setJobId(clientJobId);
      setProgress(50);
      setStatus('processing');

      const MAX_INVOKE_RETRIES = 3;
      let response: any = null;
      let fnError: any = null;

      for (let attempt = 0; attempt < MAX_INVOKE_RETRIES; attempt++) {
        const result = await supabase.functions.invoke('runninghub-arcano-cloner/run', {
          body: {
            jobId: clientJobId,
            userImageUrl: userUrl,
            referenceImageUrl: refUrl,
            aspectRatio: aspectRatio,
            userId: trialUserId,
            creditCost: 0,
            creativity: creativity,
            customPrompt: '',
            trial_mode: true,
          },
        });

        response = result.data;
        fnError = result.error;

        if (response?.success || response?.error) break;

        const isNetworkError = !response && fnError && (
          fnError.message?.includes('non-2xx') ||
          fnError.message?.includes('Failed to fetch') ||
          fnError.message?.includes('NetworkError') ||
          fnError.message?.includes('FunctionsFetchError')
        );

        if (isNetworkError && attempt < MAX_INVOKE_RETRIES - 1) {
          console.warn(`[ClonerTrial] Edge function retry ${attempt + 1}/${MAX_INVOKE_RETRIES}`);
          await new Promise(r => setTimeout(r, 3000 * (attempt + 1)));
          continue;
        }

        break;
      }

      if (fnError && !response) {
        console.error('[ClonerTrial] Edge function error:', fnError);
        throw new Error(fnError.message || 'Erro ao iniciar processamento');
      }

      if (!response?.success && response?.error) {
        throw new Error(response.error);
      }

      console.log('[ClonerTrial] Edge function response:', response);

      const { data: consumeData, error: consumeErr } = await supabase.functions.invoke("landing-trial-code/consume", {
        body: { email, tool_name: "cloner" },
      });

      if (!consumeErr && !consumeData?.error) {
        consumeUse();
      } else {
        console.error('[ClonerTrial] Consume error:', consumeData?.error);
      }
    } catch (err: any) {
      console.error('[ClonerTrial] Generate error:', err);
      if (localJobId) {
        try {
          const { markJobAsFailedInDb } = await import('@/utils/markJobAsFailedInDb');
          await markJobAsFailedInDb(localJobId, 'arcano_cloner', err?.message || 'Erro desconhecido');
        } catch {}
      }
      const errorInfo = getAIErrorMessage(err?.message || null);
      toast.error(errorInfo.message, { description: errorInfo.solution });
      setStatus('failed');
      setProgress(0);
      setJobId(null);
      endSubmit();
    }
  }, [userFile, referenceFile, email, aspectRatio, creativity, startSubmit, endSubmit, consumeUse]);

  const handleNewUpload = () => {
    if (usesRemaining <= 0) {
      finishTrial();
      return;
    }
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
    <div className="px-4 py-16 md:py-20 bg-muted/50">
      <div className="max-w-3xl mx-auto">
        <h2 className="font-space-grotesk font-bold text-2xl md:text-3xl text-foreground text-center mb-3">
          Quer <span className="text-muted-foreground">testar antes</span> de comprar?
        </h2>
        <p className="text-muted-foreground text-sm text-center mb-8">
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
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-500 flex items-center justify-center">
                      <Sparkles className="w-10 h-10 text-white" />
                    </div>
                    <Button
                      size="lg"
                      className="bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-bold text-lg px-8 py-6 rounded-xl border-0 shadow-lg shadow-primary/10"
                      onClick={openSignup}
                    >
                      <Sparkles className="w-5 h-5 mr-2" />
                      Fazer Teste Grátis
                    </Button>
                    <p className="text-muted-foreground/60 text-sm">1 geração gratuita • Sem compromisso</p>
                  </>
                ) : (
                  <div className="text-center px-6 max-w-md">
                    <div className="text-4xl mb-4">🏆</div>
                    <h3 className="text-2xl font-bold text-foreground mb-3">Teste Concluído!</h3>
                    <p className="text-muted-foreground/80 mb-6">
                      Você viu o poder do Arcano Cloner. Garanta acesso completo para transformar todas as suas fotos!
                    </p>
                    <Button
                      size="lg"
                      className="bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-bold text-lg px-8 py-6 rounded-xl border-0 shadow-lg shadow-primary/10"
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
              onOpenLibrary={() => setShowPhotoLibrary(true)}
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
        toolName="cloner"
      />

      {/* Photo Library Modal */}
      <PhotoLibraryModal
        isOpen={showPhotoLibrary}
        onClose={() => setShowPhotoLibrary(false)}
        onSelectPhoto={async (url: string) => {
          setShowPhotoLibrary(false);
          try {
            toast.info('Carregando referência...');
            const response = await fetch(url);
            const blob = await response.blob();
            const file = new File([blob], 'reference.jpg', { type: 'image/jpeg' });
            await processFile(file, 'reference');
          } catch (err) {
            console.error('[ClonerTrial] Library select error:', err);
            toast.error('Erro ao carregar referência');
          }
        }}
        onUploadPhoto={(dataUrl: string, file: File) => {
          setShowPhotoLibrary(false);
          setReferenceImage(dataUrl);
          setReferenceFile(file);
        }}
      />

    </div>
  );
}