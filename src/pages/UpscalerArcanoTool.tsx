import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ArrowLeft, Upload, Sparkles, Eraser, Download, RotateCcw, Loader2, ZoomIn, ZoomOut, Info, AlertCircle } from 'lucide-react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

type Mode = 'upscale' | 'rembg';
type Resolution = 2048 | 4096;
type ProcessingStatus = 'idle' | 'uploading' | 'processing' | 'completed' | 'error';

interface ErrorDetails {
  message: string;
  code?: string | number;
  solution?: string;
  details?: any;
}

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
  const [lastError, setLastError] = useState<ErrorDetails | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  
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

    // Clear previous error
    setLastError(null);

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
        setLastError({
          message: uploadResponse.data.error,
          code: uploadResponse.data.code,
          solution: uploadResponse.data.solution,
          details: uploadResponse.data.details
        });
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

      // Check for API error in run response
      if (runResponse.data?.error) {
        setLastError({
          message: runResponse.data.error,
          code: runResponse.data.code,
          solution: runResponse.data.solution,
          details: runResponse.data.details
        });
        throw new Error(runResponse.data.error);
      }

      const { taskId } = runResponse.data;
      
      // Validate taskId exists
      if (!taskId) {
        setLastError({
          message: 'O servidor não retornou um ID de tarefa',
          code: 'NO_TASK_ID',
          solution: 'Verifique a configuração do workflow no RunningHub'
        });
        throw new Error('Servidor não retornou taskId');
      }
      
      console.log('Workflow started, taskId:', taskId, 'method:', runResponse.data.method);
      setProgress(40);

      // Step 3: Poll for status
      let attempts = 0;
      const maxAttempts = 60; // 30 minutes max (30s * 60)

      pollingRef.current = setInterval(async () => {
        attempts++;
        
        if (attempts > maxAttempts) {
          clearInterval(pollingRef.current!);
          setStatus('error');
          setLastError({
            message: 'Tempo limite excedido',
            code: 'TIMEOUT',
            solution: 'O processamento demorou mais de 6 minutos. Tente com uma imagem menor ou com menos resolução.'
          });
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

          // Check for API error in status
          if (statusResponse.data?.error) {
            clearInterval(pollingRef.current!);
            setStatus('error');
            setLastError({
              message: statusResponse.data.error,
              code: statusResponse.data.code,
              solution: 'Erro ao verificar status do processamento'
            });
            toast.error('Erro ao verificar status');
            return;
          }

          const taskStatus = statusResponse.data?.status;
          
          // Handle undefined status
          if (!taskStatus) {
            console.warn('Status undefined, continuing polling...');
            return;
          }
          
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

            if (outputsResponse.data?.error) {
              setLastError({
                message: outputsResponse.data.error,
                code: outputsResponse.data.code
              });
              throw new Error(outputsResponse.data.error);
            }

            const { outputs } = outputsResponse.data;
            console.log('[Upscaler] Raw outputs:', outputs);

            // Filter and validate URLs - only keep non-empty strings
            const validOutputs = (outputs || []).filter(
              (url: unknown) => typeof url === 'string' && url.trim().length > 0
            );
            console.log('[Upscaler] Valid outputs:', validOutputs);

            if (validOutputs.length > 0) {
              // Get the last valid output (usually the final processed image)
              const finalUrl = validOutputs[validOutputs.length - 1];
              console.log('[Upscaler] Selected finalUrl:', finalUrl);
              
              setOutputImage(finalUrl);
              setStatus('completed');
              setProgress(100);
              toast.success('Imagem processada com sucesso!');
            } else {
              setLastError({
                message: 'Nenhuma imagem válida retornada',
                code: 'NO_VALID_OUTPUT',
                solution: 'O processamento foi concluído mas não retornou URLs de imagem válidas. Tente novamente.'
              });
              throw new Error('Nenhuma imagem válida retornada');
            }
          } else if (taskStatus === 'FAILED') {
            clearInterval(pollingRef.current!);
            setStatus('error');
            setLastError({
              message: 'O processamento falhou no servidor',
              code: 'TASK_FAILED',
              solution: 'Tente novamente com uma imagem diferente ou configurações menores.'
            });
            toast.error('Erro no processamento. Tente novamente.');
          }
        } catch (error) {
          console.error('Polling error:', error);
        }
      }, 30000); // 30 seconds polling interval

    } catch (error: any) {
      console.error('Process error:', error);
      setStatus('error');
      
      // Set error details if not already set
      if (!lastError) {
        setLastError({
          message: error.message || 'Erro desconhecido ao processar imagem',
          code: 'PROCESS_ERROR'
        });
      }
      
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
    setLastError(null);
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
            onClick={() => navigate("/ferramentas-ia")}
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
              /* Before/After Slider with Zoom */
              <TransformWrapper
                initialScale={1}
                minScale={1}
                maxScale={5}
                onTransformed={(_, state) => setZoomLevel(state.scale)}
                wheel={{ step: 0.2 }}
                pinch={{ step: 5 }}
                doubleClick={{ mode: 'toggle', step: 2 }}
                panning={{ disabled: zoomLevel <= 1 }}
              >
                {({ zoomIn, zoomOut, resetTransform }) => (
                  <div className="relative">
                    {/* Zoom Controls */}
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 bg-black/80 rounded-full px-2 py-1">
                      <button 
                        onClick={() => zoomOut()}
                        className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
                        title="Diminuir zoom"
                      >
                        <ZoomOut className="w-4 h-4" />
                      </button>
                      <span className="text-xs font-mono min-w-[3rem] text-center">
                        {Math.round(zoomLevel * 100)}%
                      </span>
                      <button 
                        onClick={() => zoomIn()}
                        className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
                        title="Aumentar zoom"
                      >
                        <ZoomIn className="w-4 h-4" />
                      </button>
                      {zoomLevel > 1 && (
                        <button 
                          onClick={() => resetTransform()}
                          className="p-1.5 hover:bg-white/20 rounded-full transition-colors ml-1"
                          title="Resetar zoom"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <TransformComponent wrapperStyle={{ width: '100%' }} contentStyle={{ width: '100%' }}>
                      <div 
                        ref={sliderRef}
                        className="relative aspect-video select-none"
                        style={{ cursor: zoomLevel > 1 ? 'grab' : 'ew-resize' }}
                        onMouseDown={zoomLevel <= 1 ? handleSliderMouseDown : undefined}
                        onMouseMove={zoomLevel <= 1 ? handleSliderMouseMove : undefined}
                        onMouseUp={zoomLevel <= 1 ? handleSliderMouseUp : undefined}
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
                          style={{ width: `${sliderPosition}%` }}
                        >
                          <img 
                            src={inputImage} 
                            alt="Antes" 
                            className="h-full object-contain bg-black"
                            style={{ 
                              width: sliderRef.current ? `${sliderRef.current.offsetWidth}px` : '100vw',
                              maxWidth: 'none'
                            }}
                            draggable={false}
                          />
                        </div>
                        
                        {/* Slider Line */}
                        <div 
                          className="absolute top-0 bottom-0 w-1 bg-white shadow-lg"
                          style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)', cursor: 'ew-resize' }}
                        >
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center">
                            <div className="flex gap-0.5">
                              <div className="w-0.5 h-4 bg-gray-400 rounded-full" />
                              <div className="w-0.5 h-4 bg-gray-400 rounded-full" />
                            </div>
                          </div>
                        </div>

                        {/* Labels */}
                        <div className="absolute top-14 left-4 px-3 py-1 rounded-full bg-black/70 text-sm font-medium">
                          ANTES
                        </div>
                        <div className="absolute top-14 right-4 px-3 py-1 rounded-full bg-black/70 text-sm font-medium">
                          DEPOIS
                        </div>
                      </div>
                    </TransformComponent>

                    {/* Zoom Hint */}
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs text-purple-300/60 bg-black/50 px-3 py-1 rounded-full">
                      🔍 Scroll ou pinch para zoom • Duplo clique para zoom rápido
                    </div>
                  </div>
                )}
              </TransformWrapper>
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
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span className="font-medium text-white">Nível de Detalhe</span>
                  <div className="group relative">
                    <Info className="w-4 h-4 text-purple-400/70 cursor-help" />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-black/90 rounded-lg text-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                      Controla a quantidade de detalhes adicionados
                    </div>
                  </div>
                </div>
                <span className="text-purple-300 font-mono">{detailDenoise.toFixed(2)}</span>
              </div>
              <div className="text-xs text-purple-300 mb-3">
                ✨ Recomendado: 0.10 - 0.30
              </div>
              <Slider
                value={[detailDenoise]}
                onValueChange={([value]) => setDetailDenoise(value)}
                min={0}
                max={1}
                step={0.01}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-purple-300/70 mt-2">
                <span>Menos detalhe</span>
                <span>Mais detalhe</span>
              </div>
            </Card>

            {/* Creativity Denoise */}
            <Card className="bg-[#1A0A2E]/50 border-purple-500/20 p-4">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-pink-400" />
                  <span className="font-medium text-white">Criatividade da IA</span>
                  <div className="group relative">
                    <Info className="w-4 h-4 text-purple-400/70 cursor-help" />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-black/90 rounded-lg text-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                      Valores baixos = mais fiel à original
                    </div>
                  </div>
                </div>
                <span className="text-purple-300 font-mono">{creativityDenoise.toFixed(2)}</span>
              </div>
              <div className="text-xs text-pink-300 mb-3">
                ✨ Recomendado: 0.05 - 0.20
              </div>
              <Slider
                value={[creativityDenoise]}
                onValueChange={([value]) => setCreativityDenoise(value)}
                min={0}
                max={1}
                step={0.01}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-purple-300/70 mt-2">
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
            <>
              {/* Error Details Card */}
              {lastError && (
                <Card className="bg-red-950/30 border-red-500/30 p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 space-y-2">
                      <p className="font-medium text-red-300">
                        {lastError.message}
                      </p>
                      {lastError.code && (
                        <p className="text-sm text-red-400/70">
                          Código: {lastError.code}
                        </p>
                      )}
                      {lastError.solution && (
                        <p className="text-sm text-purple-300/80 mt-2">
                          💡 {lastError.solution}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              )}
              <Button
                variant="outline"
                className="w-full py-6 text-lg border-purple-500/30 text-purple-300 hover:bg-purple-500/20"
                onClick={resetTool}
              >
                <RotateCcw className="w-5 h-5 mr-2" />
                Tentar Novamente
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default UpscalerArcanoTool;
