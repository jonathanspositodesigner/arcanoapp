import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ArrowLeft, Upload, Sparkles, Eraser, Download, RotateCcw, Loader2, ZoomIn, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

type Mode = 'upscale' | 'rembg';
type Resolution = 2048 | 4096;
type ProcessingStatus = 'idle' | 'uploading' | 'processing' | 'completed' | 'error';

const UpscalerArcanoTool: React.FC = () => {
  const navigate = useNavigate();
  
  // State
  const [mode, setMode] = useState<Mode>('upscale');
  const [resolution, setResolution] = useState<Resolution>(4096);
  const [detailDenoise, setDetailDenoise] = useState(0.29);
  const [creativityDenoise, setCreativityDenoise] = useState(0.11);
  const [inputImage, setInputImage] = useState<string | null>(null);
  const [inputFileName, setInputFileName] = useState<string>('');
  const [outputImage, setOutputImage] = useState<string | null>(null);
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [sliderPosition, setSliderPosition] = useState(50);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  // Handle file selection
  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem válida');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 10MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setInputImage(e.target?.result as string);
      setInputFileName(file.name);
      setOutputImage(null);
      setStatus('idle');
    };
    reader.readAsDataURL(file);
  }, []);

  // Handle drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  // Handle paste
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (items) {
        for (const item of items) {
          if (item.type.startsWith('image/')) {
            const file = item.getAsFile();
            if (file) handleFileSelect(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handleFileSelect]);

  // Process image
  const processImage = async () => {
    if (!inputImage) {
      toast.error('Selecione uma imagem primeiro');
      return;
    }

    try {
      setStatus('uploading');
      setProgress(10);

      // Extract base64 data from data URL
      const base64Data = inputImage.split(',')[1];

      // Step 1: Upload image
      const uploadResponse = await supabase.functions.invoke('runninghub-upscaler/upload', {
        body: {
          imageBase64: base64Data,
          fileName: inputFileName || 'image.png',
        },
      });

      if (uploadResponse.error) {
        throw new Error(uploadResponse.error.message || 'Erro ao fazer upload');
      }

      // Check for API error in response data
      if (uploadResponse.data?.error) {
        throw new Error(uploadResponse.data.error);
      }

      const { fileName } = uploadResponse.data;
      if (!fileName) {
        throw new Error('Upload não retornou nome do arquivo');
      }
      console.log('Upload successful, fileName:', fileName);
      setProgress(25);

      // Step 2: Run workflow
      setStatus('processing');
      const runResponse = await supabase.functions.invoke('runninghub-upscaler/run', {
        body: {
          fileName,
          mode,
          resolution,
          creativityDenoise,
          detailDenoise,
        },
      });

      if (runResponse.error) {
        throw new Error(runResponse.error.message || 'Erro ao iniciar processamento');
      }

      const { taskId } = runResponse.data;
      console.log('Workflow started, taskId:', taskId);
      setProgress(40);

      // Step 3: Poll for status
      let attempts = 0;
      const maxAttempts = 120; // 6 minutes max (3s * 120)

      pollingRef.current = setInterval(async () => {
        attempts++;
        
        if (attempts > maxAttempts) {
          clearInterval(pollingRef.current!);
          setStatus('error');
          toast.error('Tempo limite excedido. Tente novamente.');
          return;
        }

        try {
          const statusResponse = await supabase.functions.invoke('runninghub-upscaler/status', {
            body: { taskId },
          });

          if (statusResponse.error) {
            console.error('Status check error:', statusResponse.error);
            return;
          }

          const { status: taskStatus } = statusResponse.data;
          console.log('Task status:', taskStatus);

          // Update progress based on status
          if (taskStatus === 'RUNNING' || taskStatus === 'PENDING') {
            setProgress(Math.min(40 + (attempts * 0.5), 90));
          } else if (taskStatus === 'SUCCESS') {
            clearInterval(pollingRef.current!);
            setProgress(95);

            // Get outputs
            const outputsResponse = await supabase.functions.invoke('runninghub-upscaler/outputs', {
              body: { taskId },
            });

            if (outputsResponse.error) {
              throw new Error('Erro ao obter resultado');
            }

            const { outputs } = outputsResponse.data;
            console.log('Outputs:', outputs);

            if (outputs && outputs.length > 0) {
              // Get the last output (usually the final processed image)
              setOutputImage(outputs[outputs.length - 1]);
              setStatus('completed');
              setProgress(100);
              toast.success('Imagem processada com sucesso!');
            } else {
              throw new Error('Nenhuma imagem retornada');
            }
          } else if (taskStatus === 'FAILED') {
            clearInterval(pollingRef.current!);
            setStatus('error');
            toast.error('Erro no processamento. Tente novamente.');
          }
        } catch (error) {
          console.error('Polling error:', error);
        }
      }, 3000);

    } catch (error: any) {
      console.error('Process error:', error);
      setStatus('error');
      toast.error(error.message || 'Erro ao processar imagem');
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    }
  };

  // Download result
  const downloadResult = async () => {
    if (!outputImage) return;

    try {
      const response = await fetch(outputImage);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = mode === 'rembg' ? 'sem-fundo.png' : 'upscaled.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Download iniciado!');
    } catch (error) {
      toast.error('Erro ao baixar imagem');
    }
  };

  // Reset
  const resetTool = () => {
    setInputImage(null);
    setInputFileName('');
    setOutputImage(null);
    setStatus('idle');
    setProgress(0);
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }
  };

  // Slider drag handling
  const handleSliderMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    updateSliderPosition(e);
  };

  const handleSliderMouseMove = (e: React.MouseEvent) => {
    if (isDraggingRef.current) {
      updateSliderPosition(e);
    }
  };

  const handleSliderMouseUp = () => {
    isDraggingRef.current = false;
  };

  const updateSliderPosition = (e: React.MouseEvent) => {
    if (sliderRef.current) {
      const rect = sliderRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setSliderPosition(percentage);
    }
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      isDraggingRef.current = false;
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0D0221] via-[#1A0A2E] to-[#16082A] text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#0D0221]/80 backdrop-blur-lg border-b border-purple-500/20">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="text-purple-300 hover:text-white hover:bg-purple-500/20"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Upscaler Arcano
          </h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Mode Toggle */}
        <Card className="bg-[#1A0A2E]/50 border-purple-500/20 p-2">
          <div className="flex gap-2">
            <Button
              variant={mode === 'upscale' ? 'default' : 'ghost'}
              className={`flex-1 gap-2 ${mode === 'upscale' 
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700' 
                : 'text-purple-300 hover:text-white hover:bg-purple-500/20'}`}
              onClick={() => setMode('upscale')}
            >
              <Sparkles className="w-4 h-4" />
              Aumentar Qualidade
            </Button>
            <Button
              variant={mode === 'rembg' ? 'default' : 'ghost'}
              className={`flex-1 gap-2 ${mode === 'rembg' 
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700' 
                : 'text-purple-300 hover:text-white hover:bg-purple-500/20'}`}
              onClick={() => setMode('rembg')}
            >
              <Eraser className="w-4 h-4" />
              Remover Fundo
            </Button>
          </div>
        </Card>

        {/* Image Upload */}
        {!inputImage ? (
          <Card 
            className="bg-[#1A0A2E]/50 border-purple-500/20 border-dashed border-2 p-12 cursor-pointer hover:bg-[#1A0A2E]/70 transition-colors"
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Upload className="w-8 h-8 text-purple-400" />
              </div>
              <div>
                <p className="text-lg font-medium text-white">Arraste sua imagem aqui</p>
                <p className="text-sm text-purple-300/70">ou clique para selecionar • Cole com Ctrl+V</p>
                <p className="text-xs text-purple-300/50 mt-2">PNG, JPG, WebP • Máximo 10MB</p>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
            />
          </Card>
        ) : status === 'completed' && outputImage ? (
          /* Result View */
          <Card className="bg-[#1A0A2E]/50 border-purple-500/20 overflow-hidden">
            {mode === 'upscale' ? (
              /* Before/After Slider */
              <div 
                ref={sliderRef}
                className="relative aspect-video cursor-ew-resize select-none"
                onMouseDown={handleSliderMouseDown}
                onMouseMove={handleSliderMouseMove}
                onMouseUp={handleSliderMouseUp}
              >
                {/* After Image (full) */}
                <img 
                  src={outputImage} 
                  alt="Depois" 
                  className="absolute inset-0 w-full h-full object-contain bg-black"
                  draggable={false}
                />
                
                {/* Before Image (clipped) */}
                <div 
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: `${Math.max(sliderPosition, 1)}%` }}
                >
                  <img 
                    src={inputImage} 
                    alt="Antes" 
                    className="absolute inset-0 w-full h-full object-contain bg-black"
                    style={{ width: `${100 / Math.max(sliderPosition / 100, 0.01)}%` }}
                    draggable={false}
                  />
                </div>
                
                {/* Slider Line */}
                <div 
                  className="absolute top-0 bottom-0 w-1 bg-white shadow-lg cursor-ew-resize"
                  style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
                >
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center">
                    <div className="flex gap-0.5">
                      <div className="w-0.5 h-4 bg-gray-400 rounded-full" />
                      <div className="w-0.5 h-4 bg-gray-400 rounded-full" />
                    </div>
                  </div>
                </div>

                {/* Labels */}
                <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-black/70 text-sm font-medium">
                  ANTES
                </div>
                <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-black/70 text-sm font-medium">
                  DEPOIS
                </div>
              </div>
            ) : (
              /* PNG Preview with checkerboard background */
              <div 
                className="relative aspect-video"
                style={{
                  backgroundImage: `
                    linear-gradient(45deg, #1a1a2e 25%, transparent 25%),
                    linear-gradient(-45deg, #1a1a2e 25%, transparent 25%),
                    linear-gradient(45deg, transparent 75%, #1a1a2e 75%),
                    linear-gradient(-45deg, transparent 75%, #1a1a2e 75%)
                  `,
                  backgroundSize: '20px 20px',
                  backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                  backgroundColor: '#0d0d1a'
                }}
              >
                <img 
                  src={outputImage} 
                  alt="Sem fundo" 
                  className="w-full h-full object-contain"
                />
              </div>
            )}
          </Card>
        ) : (
          /* Input Preview */
          <Card className="bg-[#1A0A2E]/50 border-purple-500/20 overflow-hidden">
            <div className="relative aspect-video bg-black/50">
              <img 
                src={inputImage} 
                alt="Preview" 
                className="w-full h-full object-contain"
              />
              {(status === 'uploading' || status === 'processing') && (
                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-4">
                  <Loader2 className="w-12 h-12 text-purple-400 animate-spin" />
                  <div className="text-center">
                    <p className="text-lg font-medium">
                      {status === 'uploading' ? 'Enviando imagem...' : 'Processando...'}
                    </p>
                    <p className="text-sm text-purple-300/70">
                      Isso pode levar até 2 minutos
                    </p>
                  </div>
                  <div className="w-64 h-2 bg-purple-900/50 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-sm text-purple-300">{Math.round(progress)}%</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (pollingRef.current) clearInterval(pollingRef.current);
                      setStatus('idle');
                      setProgress(0);
                    }}
                    className="text-purple-300 hover:text-white hover:bg-purple-500/20 mt-2"
                  >
                    Cancelar
                  </Button>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Controls - Only show for upscale mode */}
        {mode === 'upscale' && inputImage && status === 'idle' && (
          <div className="space-y-4">
            {/* Resolution */}
            <Card className="bg-[#1A0A2E]/50 border-purple-500/20 p-4">
              <div className="flex items-center gap-2 mb-3">
                <ZoomIn className="w-4 h-4 text-purple-400" />
                <span className="font-medium">Resolução Final</span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={resolution === 2048 ? 'default' : 'outline'}
                  className={resolution === 2048 
                    ? 'flex-1 bg-purple-600 hover:bg-purple-700' 
                    : 'flex-1 border-purple-500/30 text-purple-300 hover:bg-purple-500/20'}
                  onClick={() => setResolution(2048)}
                >
                  2K (2048px)
                </Button>
                <Button
                  variant={resolution === 4096 ? 'default' : 'outline'}
                  className={resolution === 4096 
                    ? 'flex-1 bg-purple-600 hover:bg-purple-700' 
                    : 'flex-1 border-purple-500/30 text-purple-300 hover:bg-purple-500/20'}
                  onClick={() => setResolution(4096)}
                >
                  4K (4096px)
                </Button>
              </div>
            </Card>

            {/* Detail Denoise */}
            <Card className="bg-[#1A0A2E]/50 border-purple-500/20 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span className="font-medium">Nível de Detalhe</span>
                  <div className="group relative">
                    <Info className="w-4 h-4 text-purple-400/50 cursor-help" />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-black/90 rounded-lg text-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                      Controla a quantidade de detalhes adicionados
                    </div>
                  </div>
                </div>
                <span className="text-purple-300 font-mono">{detailDenoise.toFixed(2)}</span>
              </div>
              <Slider
                value={[detailDenoise]}
                onValueChange={([value]) => setDetailDenoise(value)}
                min={0}
                max={1}
                step={0.01}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-purple-300/50 mt-2">
                <span>Menos detalhe</span>
                <span>Mais detalhe</span>
              </div>
            </Card>

            {/* Creativity Denoise */}
            <Card className="bg-[#1A0A2E]/50 border-purple-500/20 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-pink-400" />
                  <span className="font-medium">Criatividade da IA</span>
                  <div className="group relative">
                    <Info className="w-4 h-4 text-purple-400/50 cursor-help" />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-black/90 rounded-lg text-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                      Valores baixos = mais fiel à original
                    </div>
                  </div>
                </div>
                <span className="text-purple-300 font-mono">{creativityDenoise.toFixed(2)}</span>
              </div>
              <Slider
                value={[creativityDenoise]}
                onValueChange={([value]) => setCreativityDenoise(value)}
                min={0}
                max={1}
                step={0.01}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-purple-300/50 mt-2">
                <span>Fiel à original</span>
                <span>Mais criativo</span>
              </div>
            </Card>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          {status === 'idle' && inputImage && (
            <Button
              className="w-full py-6 text-lg font-semibold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg shadow-purple-500/25"
              onClick={processImage}
            >
              <Sparkles className="w-5 h-5 mr-2" />
              {mode === 'upscale' ? 'Aumentar Qualidade' : 'Remover Fundo'}
            </Button>
          )}

          {status === 'completed' && (
            <>
              <Button
                className="w-full py-6 text-lg font-semibold bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg shadow-green-500/25"
                onClick={downloadResult}
              >
                <Download className="w-5 h-5 mr-2" />
                Baixar {mode === 'upscale' ? 'Imagem HD' : 'PNG'}
              </Button>
              <Button
                variant="outline"
                className="w-full py-6 text-lg border-purple-500/30 text-purple-300 hover:bg-purple-500/20"
                onClick={resetTool}
              >
                <RotateCcw className="w-5 h-5 mr-2" />
                Processar Nova Imagem
              </Button>
            </>
          )}

          {status === 'error' && (
            <Button
              variant="outline"
              className="w-full py-6 text-lg border-purple-500/30 text-purple-300 hover:bg-purple-500/20"
              onClick={resetTool}
            >
              <RotateCcw className="w-5 h-5 mr-2" />
              Tentar Novamente
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default UpscalerArcanoTool;
