import React, { useState, useRef } from 'react';
import { Sparkles, Download, RotateCcw, Loader2, ZoomIn, ZoomOut, ImageIcon, XCircle, AlertTriangle, Coins } from 'lucide-react';
import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { useSmartBackNavigation } from '@/hooks/useSmartBackNavigation';
import { useAIToolProcessor } from '@/hooks/useAIToolProcessor';
import ToolsHeader from '@/components/ToolsHeader';
import ImageUploadCard from '@/components/pose-changer/ImageUploadCard';
import ClothingLibraryModal from '@/components/veste-ai/ClothingLibraryModal';
import NoCreditsModal from '@/components/upscaler/NoCreditsModal';
import ActiveJobBlockModal from '@/components/ai-tools/ActiveJobBlockModal';
import { optimizeForAI } from '@/hooks/useImageOptimizer';

const CREDIT_COST = 60;

const QUEUE_MESSAGES = [
  { emoji: '👕', text: 'Preparando sua transformação...' },
  { emoji: '✨', text: 'Vestindo nova roupa...' },
  { emoji: '🚀', text: 'Quase lá, continue esperando!' },
  { emoji: '🌟', text: 'Processando seu look incrível...' },
];

const VesteAITool: React.FC = () => {
  const { goBack } = useSmartBackNavigation({ fallback: '/ferramentas-ia-aplicativo' });

  // Use unified processor hook
  const {
    status,
    progress,
    queuePosition,
    outputUrl,
    isProcessing,
    currentQueueMessage,
    showNoCreditsModal,
    setShowNoCreditsModal,
    noCreditsReason,
    showActiveJobModal,
    setShowActiveJobModal,
    activeToolName,
    activeJobStatus,
    activeJobId,
    activeTable,
    activeStartedAt,
    startJob,
    cancelJob,
    reset,
    uploadToStorage,
    setProgress,
  } = useAIToolProcessor({
    toolName: 'veste-ai',
    tableName: 'veste_ai_jobs',
    edgeFunctionPath: 'runninghub-veste-ai/run',
    creditCost: CREDIT_COST,
    storagePath: 'veste-ai',
    successMessage: 'Look aplicado com sucesso!',
    queueMessages: QUEUE_MESSAGES,
  });

  // UI-specific states
  const [personImage, setPersonImage] = useState<string | null>(null);
  const [personFile, setPersonFile] = useState<File | null>(null);
  const [clothingImage, setClothingImage] = useState<string | null>(null);
  const [clothingFile, setClothingFile] = useState<File | null>(null);
  const [showClothingLibrary, setShowClothingLibrary] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const transformRef = useRef<ReactZoomPanPinchRef>(null);

  const canProcess = personImage && clothingImage && status === 'idle';

  // Handle person image upload
  const handlePersonImageChange = (dataUrl: string | null, file?: File) => {
    setPersonImage(dataUrl);
    setPersonFile(file || null);
  };

  // Handle clothing image selection
  const handleClothingImageChange = async (imageUrl: string | null, file?: File) => {
    setClothingImage(imageUrl);

    if (imageUrl && !file) {
      try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        setClothingFile(new File([blob], 'clothing.png', { type: blob.type }));
      } catch (error) {
        console.error('[VesteAI] Error fetching clothing image:', error);
      }
    } else {
      setClothingFile(file || null);
    }
  };

  const handleProcess = async () => {
    if (!personImage || !clothingImage || !personFile) {
      toast.error('Por favor, selecione ambas as imagens');
      return;
    }

    try {
      // Compress and upload images
      setProgress(10);
      const compressedPerson = await optimizeForAI(personFile);
      const personUrl = await uploadToStorage(compressedPerson.file, 'person');

      setProgress(30);
      let clothingUrl: string;
      if (clothingFile) {
        const compressedClothing = await optimizeForAI(clothingFile);
        clothingUrl = await uploadToStorage(compressedClothing.file, 'clothing');
      } else {
        clothingUrl = clothingImage;
      }

      // Start the job
      await startJob({
        edgeFunctionPayload: {
          personImageUrl: personUrl,
          clothingImageUrl: clothingUrl,
        },
        jobInsertData: {
          person_file_name: personUrl.split('/').pop() || 'person.webp',
          clothing_file_name: clothingUrl.split('/').pop() || 'clothing.webp',
        },
      });
    } catch (error: any) {
      console.error('[VesteAI] Process error:', error);
      toast.error(error.message || 'Erro ao processar imagem');
    }
  };

  const handleReset = () => {
    reset();
    setPersonImage(null);
    setPersonFile(null);
    setClothingImage(null);
    setClothingFile(null);
    setZoomLevel(1);
  };

  const handleDownload = () => {
    if (!outputUrl) return;
    const link = document.createElement('a');
    link.href = outputUrl;
    link.download = `veste-ai-${Date.now()}.png`;
    link.target = '_blank';
    link.click();
    toast.success('Download iniciado!');
  };

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-[#0D0221] via-[#1A0A2E] to-[#16082A] flex flex-col">
      <ToolsHeader title="Veste AI" onBack={goBack} />

      {isProcessing && (
        <div className="bg-amber-500/20 border-b border-amber-500/30 px-4 py-2 flex items-center justify-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <span className="text-xs text-amber-200">Não feche esta página durante o processamento</span>
        </div>
      )}

      <div className="flex-1 max-w-7xl w-full mx-auto px-4 py-2 overflow-y-auto lg:overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-7 gap-2 lg:gap-3 lg:h-full">
          {/* Left Side - Inputs */}
          <div className="lg:col-span-2 flex flex-col gap-2 pb-2 lg:pb-0 lg:overflow-y-auto">
            <ImageUploadCard
              title="Sua Foto"
              image={personImage}
              onImageChange={handlePersonImageChange}
              disabled={isProcessing}
            />

            <ImageUploadCard
              title="Roupa de Referência"
              image={clothingImage}
              onImageChange={handleClothingImageChange}
              showLibraryButton
              libraryButtonLabel="Biblioteca de Roupas"
              onOpenLibrary={() => setShowClothingLibrary(true)}
              disabled={isProcessing}
            />

            <Button
              size="sm"
              className="w-full bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-medium py-2 text-xs disabled:opacity-50"
              disabled={!canProcess || isProcessing}
              onClick={handleProcess}
            >
              {status === 'uploading' ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Enviando...
                </>
              ) : status === 'waiting' ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Fila #{queuePosition}
                </>
              ) : status === 'processing' ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  {Math.round(progress)}%
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  Trocar Roupa
                  <span className="ml-2 flex items-center gap-1 text-xs opacity-90">
                    <Coins className="w-3.5 h-3.5" />
                    {CREDIT_COST}
                  </span>
                </>
              )}
            </Button>

            {status === 'waiting' && (
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs border-red-500/30 text-red-300 hover:bg-red-500/10"
                onClick={cancelJob}
              >
                <XCircle className="w-3.5 h-3.5 mr-1.5" />
                Sair da Fila
              </Button>
            )}
          </div>

          {/* Right Side - Result Viewer */}
          <div className="lg:col-span-5 flex flex-col min-h-[280px] lg:min-h-0">
            <Card className="relative overflow-hidden bg-purple-900/20 border-purple-500/30 flex-1 flex flex-col min-h-[250px] lg:min-h-0">
              <div className="px-3 py-2 border-b border-purple-500/20 flex items-center justify-between flex-shrink-0">
                <h3 className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
                  Resultado
                </h3>

                {outputUrl && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-purple-300 hover:text-white hover:bg-purple-500/20"
                      onClick={() => transformRef.current?.zoomOut(0.5)}
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </Button>
                    <span className="text-[10px] text-purple-300 w-8 text-center">{Math.round(zoomLevel * 100)}%</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-purple-300 hover:text-white hover:bg-purple-500/20"
                      onClick={() => transformRef.current?.zoomIn(0.5)}
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="relative flex-1 min-h-0 flex items-center justify-center">
                {outputUrl ? (
                  <TransformWrapper
                    ref={transformRef}
                    key={outputUrl}
                    initialScale={1}
                    minScale={0.5}
                    maxScale={4}
                    wheel={{ step: 0.4 }}
                    onTransformed={(_, state) => setZoomLevel(state.scale)}
                  >
                    <TransformComponent
                      wrapperStyle={{ width: '100%', height: '100%' }}
                      contentStyle={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <img src={outputUrl} alt="Resultado" className="w-full h-full object-contain" draggable={false} />
                    </TransformComponent>
                  </TransformWrapper>
                ) : isProcessing ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                    <div className="relative">
                      <div className="w-14 h-14 rounded-full border-4 border-purple-500/30 border-t-purple-500 animate-spin" />
                      <Sparkles className="absolute inset-0 m-auto w-6 h-6 text-purple-400" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-white font-medium flex items-center gap-2">
                        <span>{currentQueueMessage.emoji}</span>
                        <span>{currentQueueMessage.text}</span>
                      </p>
                      {status === 'waiting' && queuePosition > 0 && (
                        <p className="text-xs text-purple-300 mt-1">Posição na fila: #{queuePosition}</p>
                      )}
                      {status === 'processing' && (
                        <p className="text-xs text-purple-300 mt-0.5">{Math.round(progress)}% concluído</p>
                      )}
                    </div>
                    <div className="w-36 h-1.5 bg-purple-900/50 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-500 transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                ) : status === 'error' ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                    <div className="w-16 h-16 rounded-xl bg-red-500/10 border-2 border-dashed border-red-500/30 flex items-center justify-center">
                      <XCircle className="w-8 h-8 text-red-500/60" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-red-300">Erro no processamento</p>
                      <Button variant="link" size="sm" className="text-xs text-purple-400" onClick={handleReset}>
                        Tentar novamente
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                    <div className="w-16 h-16 rounded-xl bg-purple-500/10 border-2 border-dashed border-purple-500/30 flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-purple-500/40" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-purple-300">O resultado aparecerá aqui</p>
                      <p className="text-xs text-purple-400 mt-0.5">Envie as imagens e clique em "Trocar Roupa"</p>
                    </div>
                  </div>
                )}
              </div>

              {outputUrl && status === 'completed' && (
                <div className="absolute bottom-3 left-3 right-3 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-8 text-xs bg-purple-500/10 border-purple-500/30 text-purple-200 hover:bg-purple-500/20"
                    onClick={handleReset}
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                    Nova
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 h-8 text-xs bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white"
                    onClick={handleDownload}
                  >
                    <Download className="w-3.5 h-3.5 mr-1.5" />
                    Baixar HD
                  </Button>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>

      <ClothingLibraryModal
        isOpen={showClothingLibrary}
        onClose={() => setShowClothingLibrary(false)}
        onSelectClothing={(url) => handleClothingImageChange(url)}
      />

      <NoCreditsModal isOpen={showNoCreditsModal} onClose={() => setShowNoCreditsModal(false)} reason={noCreditsReason} />

      <ActiveJobBlockModal
        isOpen={showActiveJobModal}
        onClose={() => setShowActiveJobModal(false)}
        activeTool={activeToolName}
        activeStatus={activeJobStatus}
        activeJobId={activeJobId}
        activeTable={activeTable}
        activeStartedAt={activeStartedAt}
      />
    </div>
  );
};

export default VesteAITool;
