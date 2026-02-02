import React, { useState } from 'react';
import { Sparkles, Download, RotateCcw, Loader2, ZoomIn, ZoomOut, ImageIcon } from 'lucide-react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { toast } from 'sonner';
import { useSmartBackNavigation } from '@/hooks/useSmartBackNavigation';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { useUpscalerCredits } from '@/hooks/useUpscalerCredits';
import ToolsHeader from '@/components/ToolsHeader';
import ImageUploadCard from '@/components/pose-changer/ImageUploadCard';
import PoseLibraryModal from '@/components/pose-changer/PoseLibraryModal';
import NoCreditsModal from '@/components/upscaler/NoCreditsModal';

type ProcessingStatus = 'idle' | 'uploading' | 'processing' | 'completed' | 'error';

const CREDIT_COST = 60;

const PoseChangerTool: React.FC = () => {
  const { goBack } = useSmartBackNavigation({ fallback: '/ferramentas-ia-aplicativo' });
  const { user } = usePremiumStatus();
  const { balance: credits, isLoading: creditsLoading } = useUpscalerCredits(user?.id);

  // Image states
  const [personImage, setPersonImage] = useState<string | null>(null);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [outputImage, setOutputImage] = useState<string | null>(null);

  // UI states
  const [showPoseLibrary, setShowPoseLibrary] = useState(false);
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);

  // No credits modal
  const [showNoCreditsModal, setShowNoCreditsModal] = useState(false);
  const [noCreditsReason, setNoCreditsReason] = useState<'not_logged' | 'insufficient'>('insufficient');

  const canProcess = personImage && referenceImage && status === 'idle';
  const isProcessing = status === 'uploading' || status === 'processing';

  const handleProcess = async () => {
    if (!personImage || !referenceImage) {
      toast.error('Por favor, selecione ambas as imagens');
      return;
    }

    if (!user?.id) {
      setNoCreditsReason('not_logged');
      setShowNoCreditsModal(true);
      return;
    }

    if (credits < CREDIT_COST) {
      setNoCreditsReason('insufficient');
      setShowNoCreditsModal(true);
      return;
    }

    // For now, just show a toast - motor will be connected later
    toast.info('Motor de IA será conectado na próxima fase');
    
    // Simulate processing for layout testing
    setStatus('processing');
    setProgress(0);
    
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setStatus('completed');
          // Use person image as "output" for demo
          setOutputImage(personImage);
          toast.success('Processamento concluído!');
          return 100;
        }
        return prev + 10;
      });
    }, 500);
  };

  const handleReset = () => {
    setPersonImage(null);
    setReferenceImage(null);
    setOutputImage(null);
    setStatus('idle');
    setProgress(0);
    setZoomLevel(1);
  };

  const handleDownload = () => {
    if (!outputImage) return;
    
    // For demo, open in new tab
    const link = document.createElement('a');
    link.href = outputImage;
    link.download = `pose-changer-${Date.now()}.png`;
    link.click();
    toast.success('Download iniciado!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0D0221] via-[#1A0A2E] to-[#16082A]">
      <ToolsHeader title="Pose Changer" onBack={goBack} />

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          
          {/* Left Side - Inputs (2/5 on desktop) */}
          <div className="lg:col-span-2 space-y-4">
            {/* Person Image Upload */}
            <ImageUploadCard
              title="Sua Foto"
              subtitle="Foto da pessoa que terá a pose alterada"
              image={personImage}
              onImageChange={setPersonImage}
              disabled={isProcessing}
            />

            {/* Reference Image Upload */}
            <ImageUploadCard
              title="Referência de Pose"
              subtitle="Imagem com a pose desejada"
              image={referenceImage}
              onImageChange={setReferenceImage}
              showLibraryButton
              onOpenLibrary={() => setShowPoseLibrary(true)}
              disabled={isProcessing}
            />

            {/* Action Button */}
            <Button
              size="lg"
              className="w-full bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-semibold py-6 text-lg disabled:opacity-50"
              disabled={!canProcess || isProcessing}
              onClick={handleProcess}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Processando... {progress}%
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Gerar Nova Pose ({CREDIT_COST} créditos)
                </>
              )}
            </Button>

            {/* Credits Info */}
            {user && (
              <p className="text-xs text-purple-400 text-center">
                Você tem <span className="text-purple-200 font-semibold">{credits}</span> créditos disponíveis
              </p>
            )}
          </div>

          {/* Right Side - Result Viewer (3/5 on desktop) */}
          <div className="lg:col-span-3">
            <Card className="relative overflow-hidden bg-purple-900/20 border-purple-500/30 h-full min-h-[400px] lg:min-h-[600px]">
              {/* Header */}
              <div className="px-4 py-3 border-b border-purple-500/20 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-purple-400" />
                  Resultado
                </h3>
                
                {outputImage && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-purple-300 hover:text-white hover:bg-purple-500/20"
                      onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.25))}
                    >
                      <ZoomOut className="w-4 h-4" />
                    </Button>
                    <span className="text-xs text-purple-300 w-12 text-center">
                      {Math.round(zoomLevel * 100)}%
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-purple-300 hover:text-white hover:bg-purple-500/20"
                      onClick={() => setZoomLevel(Math.min(4, zoomLevel + 0.25))}
                    >
                      <ZoomIn className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Result Area */}
              <div className="relative flex-1 h-[calc(100%-60px)]">
                {outputImage ? (
                  <TransformWrapper
                    initialScale={1}
                    minScale={0.5}
                    maxScale={4}
                    wheel={{ step: 0.4 }}
                    onTransformed={(_, state) => setZoomLevel(state.scale)}
                  >
                    <TransformComponent
                      wrapperClass="w-full h-full"
                      contentClass="w-full h-full flex items-center justify-center"
                    >
                      <img
                        src={outputImage}
                        alt="Resultado"
                        className="max-w-full max-h-full object-contain"
                        draggable={false}
                      />
                    </TransformComponent>
                  </TransformWrapper>
                ) : isProcessing ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-full border-4 border-purple-500/30 border-t-purple-500 animate-spin" />
                      <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-purple-400" />
                    </div>
                    <div className="text-center">
                      <p className="text-lg text-white font-medium">
                        Processando sua imagem...
                      </p>
                      <p className="text-sm text-purple-300 mt-1">
                        {progress}% concluído
                      </p>
                    </div>
                    {/* Progress bar */}
                    <div className="w-48 h-2 bg-purple-900/50 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-500 transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                    <div className="w-24 h-24 rounded-2xl bg-purple-500/10 border-2 border-dashed border-purple-500/30 flex items-center justify-center">
                      <ImageIcon className="w-12 h-12 text-purple-500/40" />
                    </div>
                    <div className="text-center">
                      <p className="text-lg text-purple-300">
                        O resultado aparecerá aqui
                      </p>
                      <p className="text-sm text-purple-400 mt-1">
                        Envie as duas imagens e clique em "Gerar Nova Pose"
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              {outputImage && status === 'completed' && (
                <div className="absolute bottom-4 left-4 right-4 flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 bg-purple-500/10 border-purple-500/30 text-purple-200 hover:bg-purple-500/20"
                    onClick={handleReset}
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Nova Imagem
                  </Button>
                  <Button
                    className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white"
                    onClick={handleDownload}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Baixar HD
                  </Button>
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* Mobile hint */}
        <p className="text-xs text-purple-400 text-center mt-4 lg:hidden">
          💡 Use pinch ou scroll para zoom no resultado
        </p>
      </div>

      {/* Pose Library Modal */}
      <PoseLibraryModal
        isOpen={showPoseLibrary}
        onClose={() => setShowPoseLibrary(false)}
        onSelectPose={(url) => setReferenceImage(url)}
      />

      {/* No Credits Modal */}
      <NoCreditsModal
        isOpen={showNoCreditsModal}
        onClose={() => setShowNoCreditsModal(false)}
        reason={noCreditsReason}
      />
    </div>
  );
};

export default PoseChangerTool;
