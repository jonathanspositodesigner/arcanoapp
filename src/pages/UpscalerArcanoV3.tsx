import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ArrowLeft, Upload, Sparkles, Eraser, Download, RotateCcw, Loader2, ZoomIn, ZoomOut, Info, AlertCircle, Clock } from 'lucide-react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useSmartBackNavigation } from '@/hooks/useSmartBackNavigation';

type Mode = 'upscale' | 'rembg';
type Resolution = 2048 | 4096;
type ProcessingStatus = 'idle' | 'uploading' | 'processing' | 'completed' | 'error';

interface ErrorDetails {
  message: string;
  code?: string | number;
  solution?: string;
  details?: any;
}

const UpscalerArcanoV3: React.FC = () => {
  const navigate = useNavigate();
  const { goBack } = useSmartBackNavigation({ fallback: '/ferramentas-ia' });

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
  const [jobId, setJobId] = useState<string | null>(null);
  const [queuePosition, setQueuePosition] = useState(0);
  const [isWaitingInQueue, setIsWaitingInQueue] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const sessionIdRef = useRef<string>('');
  const realtimeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Initialize session ID
  useEffect(() => {
    const savedId = localStorage.getItem('upscaler_v3_session_id');
    if (savedId) {
      sessionIdRef.current = savedId;
    } else {
      const newId = crypto.randomUUID();
      sessionIdRef.current = newId;
      localStorage.setItem('upscaler_v3_session_id', newId);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
      }
    };
  }, []);

  // Subscribe to Realtime updates when jobId changes
  useEffect(() => {
    if (!jobId) return;

    console.log('[UpscalerV3] Subscribing to Realtime for job:', jobId);

    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current);
    }

    const channel = supabase
      .channel(`upscaler-v3-job-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'upscaler_jobs',
          filter: `id=eq.${jobId}`
        },
        (payload) => {
          console.log('[UpscalerV3] Realtime update:', payload.new);
          const job = payload.new as any;

          if (job.status === 'completed' && job.output_url) {
            console.log('[UpscalerV3] Job completed! Output:', job.output_url);
            setOutputImage(job.output_url);
            setStatus('completed');
            setProgress(100);
            setIsWaitingInQueue(false);
            setQueuePosition(0);
            toast.success('Imagem processada com sucesso!');
          } else if (job.status === 'failed') {
            console.log('[UpscalerV3] Job failed:', job.error_message);
            setStatus('error');
            setLastError({
              message: job.error_message || 'Processing failed',
              code: 'TASK_FAILED',
              solution: 'Tente novamente com uma imagem diferente ou configurações menores.'
            });
            setIsWaitingInQueue(false);
            toast.error('Erro no processamento. Tente novamente.');
          } else if (job.status === 'running') {
            console.log('[UpscalerV3] Job running');
            setStatus('processing');
            setIsWaitingInQueue(false);
            setQueuePosition(0);
            setProgress(prev => Math.min(prev + 5, 90));
          } else if (job.status === 'queued') {
            console.log('[UpscalerV3] Job queued at position:', job.position);
            setIsWaitingInQueue(true);
            setQueuePosition(job.position || 1);
          }
        }
      )
      .subscribe((status) => {
        console.log('[UpscalerV3] Realtime subscription status:', status);
      });

    realtimeChannelRef.current = channel;

    return () => {
      console.log('[UpscalerV3] Cleaning up Realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [jobId]);

  // Progress animation while processing
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

  // Process image via RunningHub using Realtime (no polling!)
  const processImage = async () => {
    if (!inputImage) {
      toast.error('Selecione uma imagem primeiro');
      return;
    }

    setLastError(null);
    setStatus('uploading');
    setProgress(10);

    try {
      // Step 1: Create job in database
      const { data: job, error: jobError } = await supabase
        .from('upscaler_jobs')
        .insert({
          session_id: sessionIdRef.current,
          status: 'queued',
          detail_denoise: detailDenoise,
          resolution: resolution
        })
        .select()
        .single();

      if (jobError || !job) {
        throw new Error('Erro ao criar job: ' + (jobError?.message || 'Unknown'));
      }

      console.log('[UpscalerV3] Job created:', job.id);
      setJobId(job.id);
      setProgress(20);

      // Step 2: Upload image to storage (direct upload, no Base64 to edge function)
      const base64Data = inputImage.split(',')[1];
      const binaryStr = atob(base64Data);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      
      const ext = inputFileName.split('.').pop()?.toLowerCase() || 'png';
      const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 
                       ext === 'webp' ? 'image/webp' : 'image/png';
      const blob = new Blob([bytes], { type: mimeType });
      const storagePath = `upscaler-v3/${job.id}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('artes-cloudinary')
        .upload(storagePath, blob, { contentType: mimeType, upsert: true });

      if (uploadError) {
        throw new Error('Erro no upload: ' + uploadError.message);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('artes-cloudinary')
        .getPublicUrl(storagePath);

      console.log('[UpscalerV3] Image uploaded to storage:', urlData.publicUrl);
      setProgress(40);

      // Step 3: Start processing - send imageUrl directly (no duplicate upload!)
      setProgress(60);
      setStatus('processing');

      const runResponse = await supabase.functions.invoke('runninghub-upscaler/run', {
        body: {
          jobId: job.id,
          imageUrl: urlData.publicUrl, // Use storage URL directly
          mode,
          resolution,
          creativityDenoise,
          detailDenoise,
          version: 'standard',
          userId: null, // V3 doesn't require credits
          creditCost: 0
        },
      });

      if (runResponse.error) {
        throw new Error(runResponse.error.message || 'Erro ao iniciar processamento');
      }

      if (runResponse.data?.queued) {
        setIsWaitingInQueue(true);
        setQueuePosition(runResponse.data.position || 1);
        toast.info(`Você está na posição ${runResponse.data.position} da fila`);
      }

      // From here, Realtime will handle all updates - no polling needed!

    } catch (error: any) {
      console.error('[UpscalerV3] Process error:', error);
      setStatus('error');
      
      if (!lastError) {
        setLastError({
          message: error.message || 'Erro desconhecido ao processar imagem',
          code: 'PROCESS_ERROR'
        });
      }
      
      toast.error(error.message || 'Erro ao processar imagem');
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
    setJobId(null);
    setIsWaitingInQueue(false);
    setQueuePosition(0);
    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current);
      realtimeChannelRef.current = null;
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
            onClick={goBack}
            className="text-purple-300 hover:text-white hover:bg-purple-500/20"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Upscaler Arcano V3
          </h1>
          <span className="ml-auto text-xs bg-emerald-500/20 text-emerald-300 px-2 py-1 rounded">
            🚀 V3 Realtime
          </span>
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
                        onMouseLeave={handleSliderMouseUp}
                      >
                        {/* After Image (Full) */}
                        <img
                          src={outputImage}
                          alt="After"
                          className="absolute inset-0 w-full h-full object-contain"
                          draggable={false}
                        />
                        
                        {/* Before Image (Clipped) */}
                        <div
                          className="absolute inset-0 overflow-hidden"
                          style={{ width: `${sliderPosition}%` }}
                        >
                          <img
                            src={inputImage}
                            alt="Before"
                            className="absolute inset-0 w-full h-full object-contain"
                            style={{ width: `${100 / (sliderPosition / 100)}%`, maxWidth: 'none' }}
                            draggable={false}
                          />
                        </div>
                        
                        {/* Slider Line */}
                        <div
                          className="absolute top-0 bottom-0 w-1 bg-white shadow-lg"
                          style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
                        >
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg">
                            <div className="flex gap-0.5">
                              <div className="w-0.5 h-4 bg-gray-400 rounded" />
                              <div className="w-0.5 h-4 bg-gray-400 rounded" />
                            </div>
                          </div>
                        </div>

                        {/* Labels */}
                        <div className="absolute bottom-4 left-4 bg-black/60 px-2 py-1 rounded text-xs">
                          Antes
                        </div>
                        <div className="absolute bottom-4 right-4 bg-black/60 px-2 py-1 rounded text-xs">
                          Depois
                        </div>
                      </div>
                    </TransformComponent>
                  </div>
                )}
              </TransformWrapper>
            ) : (
              /* Remove Background Result */
              <div className="relative aspect-video bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAOxAAADsQBlSsOGwAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAAUdEVYdFRpdGxlAENoZWNrZXJib2FyZNy1bPsAAAAYSURBVDiNY/z//z8DKYCJgUIwaAyMGgMAaA4CAbWqIO0AAAAASUVORK5CYII=')] bg-repeat">
                <img
                  src={outputImage}
                  alt="Result"
                  className="absolute inset-0 w-full h-full object-contain"
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="p-4 flex gap-2">
              <Button
                onClick={downloadResult}
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Baixar Resultado
              </Button>
              <Button
                onClick={resetTool}
                variant="outline"
                className="border-purple-500/30 text-purple-300 hover:bg-purple-500/20 hover:text-white"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Nova Imagem
              </Button>
            </div>
          </Card>
        ) : (
          /* Preview and Controls */
          <Card className="bg-[#1A0A2E]/50 border-purple-500/20 overflow-hidden">
            {/* Image Preview */}
            <div className="relative aspect-video bg-black/20">
              <img
                src={inputImage}
                alt="Preview"
                className="absolute inset-0 w-full h-full object-contain"
              />
              
              {/* Processing Overlay */}
              {(status === 'uploading' || status === 'processing' || isWaitingInQueue) && (
                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-4">
                  {isWaitingInQueue ? (
                    <>
                      <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center">
                        <Clock className="w-8 h-8 text-purple-400 animate-pulse" />
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-medium text-white">Na fila de processamento</p>
                        <p className="text-sm text-purple-300/70">Posição: {queuePosition}</p>
                        <p className="text-xs text-purple-300/50 mt-2">Aguardando automaticamente...</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <Loader2 className="w-12 h-12 animate-spin text-purple-400" />
                      <div className="text-center">
                        <p className="text-sm text-white/80">
                          {status === 'uploading' ? 'Enviando imagem...' : 'Processando com IA...'}
                        </p>
                        <div className="w-48 h-2 bg-purple-900/50 rounded-full mt-2 overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <p className="text-xs text-purple-300/50 mt-2">{progress}%</p>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Error State */}
              {status === 'error' && lastError && (
                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-4 p-4">
                  <AlertCircle className="w-12 h-12 text-red-400" />
                  <div className="text-center max-w-md">
                    <p className="text-lg font-medium text-red-400">{lastError.message}</p>
                    {lastError.solution && (
                      <p className="text-sm text-red-300/70 mt-2">{lastError.solution}</p>
                    )}
                    <Button
                      onClick={() => { setStatus('idle'); setLastError(null); }}
                      variant="outline"
                      className="mt-4 border-red-500/50 text-red-300 hover:bg-red-500/20"
                    >
                      Tentar Novamente
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Settings (only when idle) */}
            {status === 'idle' && (
              <div className="p-4 space-y-4">
                {mode === 'upscale' && (
                  <>
                    {/* Resolution */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-purple-200">Resolução</label>
                        <span className="text-sm text-purple-300/70">{resolution}px</span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant={resolution === 2048 ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setResolution(2048)}
                          className={resolution === 2048 
                            ? 'bg-purple-600 hover:bg-purple-700' 
                            : 'text-purple-300 hover:text-white hover:bg-purple-500/20'}
                        >
                          2K
                        </Button>
                        <Button
                          variant={resolution === 4096 ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setResolution(4096)}
                          className={resolution === 4096 
                            ? 'bg-purple-600 hover:bg-purple-700' 
                            : 'text-purple-300 hover:text-white hover:bg-purple-500/20'}
                        >
                          4K
                        </Button>
                      </div>
                    </div>

                    {/* Detail Denoise */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-purple-200 flex items-center gap-1">
                          Nível de Detalhe
                          <Info className="w-3 h-3 text-purple-400" />
                        </label>
                        <span className="text-sm text-purple-300/70">{detailDenoise.toFixed(2)}</span>
                      </div>
                      <Slider
                        value={[detailDenoise]}
                        onValueChange={([v]) => setDetailDenoise(v)}
                        min={0}
                        max={1}
                        step={0.01}
                        className="w-full"
                      />
                    </div>
                  </>
                )}

                {/* Process Button */}
                <Button
                  onClick={processImage}
                  disabled={status !== 'idle'}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  {mode === 'upscale' ? 'Aumentar Qualidade' : 'Remover Fundo'}
                </Button>

                <Button
                  onClick={resetTool}
                  variant="outline"
                  className="w-full border-purple-500/30 text-purple-300 hover:bg-purple-500/20 hover:text-white"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Escolher Outra Imagem
                </Button>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
};

export default UpscalerArcanoV3;
