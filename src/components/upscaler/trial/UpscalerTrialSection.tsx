import { useState, useCallback } from "react";
import { Sparkles, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTrialState } from "./useTrialState";
import TrialSignupModal from "./TrialSignupModal";
import UpscalerMockup from "./UpscalerMockup";
import browserImageCompression from "browser-image-compression";

export default function UpscalerTrialSection() {
  const { phase, email, usesRemaining, openSignup, closeSignup, onVerified, consumeUse } = useTrialState();
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const scrollToPricing = () => {
    const el = document.getElementById("pricing-section");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  const handleGenerate = useCallback(async () => {
    if (!uploadedFile || !email) return;

    setIsProcessing(true);
    try {
      // 1. Consume a use
      const { data: consumeData, error: consumeErr } = await supabase.functions.invoke("landing-trial-code/consume", {
        body: { email },
      });

      if (consumeErr || consumeData?.error) {
        toast.error(consumeData?.error || "Erro ao consumir teste");
        setIsProcessing(false);
        return;
      }

      // 2. Compress and upload image
      const compressed = await browserImageCompression(uploadedFile, {
        maxSizeMB: 4,
        maxWidthOrHeight: 4096,
        useWebWorker: true,
      });

      const fileName = `trial_${Date.now()}_${uploadedFile.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("upscaler-uploads")
        .upload(fileName, compressed, { contentType: compressed.type });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        toast.error("Erro ao enviar imagem");
        setIsProcessing(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from("upscaler-uploads")
        .getPublicUrl(fileName);

      // 3. Call upscaler
      const { data: upscaleData, error: upscaleErr } = await supabase.functions.invoke("runninghub-upscaler/run", {
        body: {
          image_url: publicUrlData.publicUrl,
          mode: "standard",
          category: "photo",
          trial_mode: true,
        },
      });

      if (upscaleErr || upscaleData?.error) {
        toast.error("Erro ao processar imagem. Tente novamente.");
        setIsProcessing(false);
        return;
      }

      // 4. Poll for result
      if (upscaleData?.task_id) {
        await pollForResult(upscaleData.task_id);
      } else if (upscaleData?.output_url) {
        setResultUrl(upscaleData.output_url);
        consumeUse();
        toast.success("Imagem melhorada com sucesso!");
      }
    } catch (err: any) {
      console.error("Generate error:", err);
      toast.error("Erro inesperado. Tente novamente.");
    } finally {
      setIsProcessing(false);
    }
  }, [uploadedFile, email, consumeUse]);

  const pollForResult = async (taskId: string) => {
    let attempts = 0;
    const maxAttempts = 60;
    const interval = 3000;

    const poll = async () => {
      attempts++;
      try {
        const { data } = await supabase.functions.invoke("runninghub-upscaler/run", {
          body: { action: "status", task_id: taskId },
        });

        if (data?.status === "completed" && data?.output_url) {
          setResultUrl(data.output_url);
          consumeUse();
          setIsProcessing(false);
          toast.success("Imagem melhorada com sucesso!");
          return;
        }

        if (data?.status === "failed") {
          setIsProcessing(false);
          toast.error("Falha ao processar. Tente novamente.");
          return;
        }

        if (attempts < maxAttempts) {
          setTimeout(poll, interval);
        } else {
          setIsProcessing(false);
          toast.error("Tempo limite excedido.");
        }
      } catch {
        setIsProcessing(false);
        toast.error("Erro ao verificar status.");
      }
    };

    await poll();
  };

  const handleNewUpload = () => {
    setUploadedFile(null);
    setResultUrl(null);
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
                    <p className="text-purple-300/60 text-sm">3 upscales gratuitos • Sem compromisso</p>
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
                isProcessing={isProcessing}
                resultUrl={resultUrl}
                uploadedFile={uploadedFile}
                onFileSelect={(file) => { setUploadedFile(file); setResultUrl(null); }}
              />
              {resultUrl && (
                <div className="text-center mt-4">
                  <Button
                    variant="outline"
                    className="border-fuchsia-500/30 text-fuchsia-300 hover:bg-fuchsia-500/10"
                    onClick={handleNewUpload}
                  >
                    Testar outra imagem ({usesRemaining} {usesRemaining === 1 ? 'teste restante' : 'testes restantes'})
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
    </div>
  );
}
