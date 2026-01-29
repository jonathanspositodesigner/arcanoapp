import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ArrowLeft, Upload, Sparkles, Download, RotateCcw, Loader2, ZoomIn, ZoomOut, Info, AlertCircle, Clock, MessageSquare } from 'lucide-react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Card } from '@/components/ui/card';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { useSmartBackNavigation } from '@/hooks/useSmartBackNavigation';

type ProcessingStatus = 'idle' | 'uploading' | 'processing' | 'completed' | 'error';

interface ErrorDetails {
  message: string;
  code?: string | number;
  solution?: string;
  details?: any;
}

const DEFAULT_PROMPT = "high quality realistic photography with extremely detailed skin texture and pores visible, realistic lighting, detailed eyes, professional photo";

const UpscalerArcanoTool: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('tools');
  const { goBack } = useSmartBackNavigation({ fallback: '/ferramentas-ia' });

  // State
  const [detailDenoise, setDetailDenoise] = useState(0.15);
  const [useCustomPrompt, setUseCustomPrompt] = useState(false);
  const [customPrompt, setCustomPrompt] = useState(DEFAULT_PROMPT);
  const [inputImage, setInputImage] = useState<string | null>(null);
  const [inputFileName, setInputFileName] = useState<string>('');
  const [outputImage, setOutputImage] = useState<string | null>(null);
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [lastError, setLastError] = useState<ErrorDetails | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  
  // Queue state
  const [isWaitingInQueue, setIsWaitingInQueue] = useState(false);
  const [queuePosition, setQueuePosition] = useState(0);
  const [jobId, setJobId] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const beforeTransformRef = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef<string>('');
  const realtimeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Initialize session ID from localStorage
  useEffect(() => {
    const savedId = localStorage.getItem('upscaler_session_id');
    if (savedId) {
      sessionIdRef.current = savedId;
    } else {
      const newId = crypto.randomUUID();
      sessionIdRef.current = newId;
      localStorage.setItem('upscaler_session_id', newId);
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

  // Warning before closing page during processing
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (status === 'processing' || status === 'uploading' || isWaitingInQueue) {
        e.preventDefault();
        e.returnValue = 'Seu upscale está em andamento. Tem certeza que deseja sair?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [status, isWaitingInQueue]);

  // Recover pending jobs on mount
  useEffect(() => {
    const checkPendingJob = async () => {
      const savedSessionId = localStorage.getItem('upscaler_session_id');
      if (!savedSessionId) return;

      // Check for pending job
      const { data: pendingJob } = await supabase
        .from('upscaler_jobs')
        .select('*')
        .eq('session_id', savedSessionId)
        .in('status', ['queued', 'running'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (pendingJob) {
        console.log('[Upscaler] Found pending job:', pendingJob.id);
        setJobId(pendingJob.id);
        setStatus('processing');
        setIsWaitingInQueue(pendingJob.status === 'queued');
        setQueuePosition(pendingJob.position || 0);
        toast.info(t('upscalerTool.warnings.recovering'));
        return;
      }

      // Check for recent completed job (last 5 min)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: completedJob } = await supabase
        .from('upscaler_jobs')
        .select('*')
        .eq('session_id', savedSessionId)
        .eq('status', 'completed')
        .gte('completed_at', fiveMinutesAgo)
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (completedJob && completedJob.output_url) {
        console.log('[Upscaler] Found recent completed job:', completedJob.id);
        setOutputImage(completedJob.output_url);
        setStatus('completed');
        toast.success(t('upscalerTool.warnings.recovered'));
      }
    };

    // Small delay to ensure session ID is loaded
    const timer = setTimeout(checkPendingJob, 100);
    return () => clearTimeout(timer);
  }, [t]);

  // Subscribe to Realtime updates when jobId changes
  useEffect(() => {
    if (!jobId) return;

    console.log('[Upscaler] Subscribing to Realtime for job:', jobId);

    // Remove previous channel if exists
    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current);
    }

    const channel = supabase
      .channel(`upscaler-job-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'upscaler_jobs',
          filter: `id=eq.${jobId}`
        },
        (payload) => {
          console.log('[Upscaler] Realtime update:', payload.new);
          const job = payload.new as any;

          if (job.status === 'completed' && job.output_url) {
            console.log('[Upscaler] Job completed! Output:', job.output_url);
            setOutputImage(job.output_url);
            setStatus('completed');
            setProgress(100);
            setIsWaitingInQueue(false);
            setQueuePosition(0);
            toast.success(t('upscalerTool.toast.success'));
          } else if (job.status === 'failed') {
            console.log('[Upscaler] Job failed:', job.error_message);
            setStatus('error');
            setLastError({
              message: job.error_message || 'Processing failed',
              code: 'TASK_FAILED',
              solution: 'Tente novamente com uma imagem diferente ou configurações menores.'
            });
            setIsWaitingInQueue(false);
            toast.error('Erro no processamento. Tente novamente.');
          } else if (job.status === 'running') {
            console.log('[Upscaler] Job running');
            setStatus('processing');
            setIsWaitingInQueue(false);
            setQueuePosition(0);
            // Start progress animation
            setProgress(prev => Math.min(prev + 5, 90));
          } else if (job.status === 'queued') {
            console.log('[Upscaler] Job queued at position:', job.position);
            setIsWaitingInQueue(true);
            setQueuePosition(job.position || 1);
          }
        }
      )
      .subscribe((status) => {
        console.log('[Upscaler] Realtime subscription status:', status);
      });

    realtimeChannelRef.current = channel;

    return () => {
      console.log('[Upscaler] Cleaning up Realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [jobId, t]);

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
      toast.error(t('upscalerTool.errors.selectImage'));
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error(t('upscalerTool.errors.maxSize'));
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
  }, [t]);

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
      toast.error(t('upscalerTool.errors.selectFirst'));
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
          prompt: useCustomPrompt ? customPrompt : null
        })
        .select()
        .single();

      if (jobError || !job) {
        throw new Error('Erro ao criar job: ' + (jobError?.message || 'Unknown'));
      }

      console.log('[Upscaler] Job created:', job.id);
      setJobId(job.id);
      setProgress(20);

      // Step 2: Upload image
      const base64Data = inputImage.split(',')[1];
      
      const uploadResponse = await supabase.functions.invoke('runninghub-upscaler/upload', {
        body: {
          imageBase64: base64Data,
          fileName: inputFileName || 'image.png',
        },
      });

      if (uploadResponse.error) {
        throw new Error(uploadResponse.error.message || 'Erro ao fazer upload');
      }

      if (uploadResponse.data?.error) {
        setLastError({
          message: uploadResponse.data.error,
          code: uploadResponse.data.code,
          solution: uploadResponse.data.solution,
        });
        throw new Error(uploadResponse.data.error);
      }

      const { fileName } = uploadResponse.data;
      if (!fileName) {
        throw new Error('Upload não retornou nome do arquivo');
      }
      
      console.log('[Upscaler] Upload successful, fileName:', fileName);
      setProgress(35);
      setStatus('processing');

      // Step 3: Start processing (with webhook callback)
      const runResponse = await supabase.functions.invoke('runninghub-upscaler/run', {
        body: {
          jobId: job.id,
          fileName,
          detailDenoise,
          prompt: useCustomPrompt ? customPrompt : null,
        },
      });

      if (runResponse.error) {
        throw new Error(runResponse.error.message || 'Erro ao iniciar processamento');
      }

      if (runResponse.data?.error) {
        setLastError({
          message: runResponse.data.error,
          code: runResponse.data.code,
          solution: runResponse.data.solution,
        });
        throw new Error(runResponse.data.error);
      }

      console.log('[Upscaler] Run response:', runResponse.data);
      setProgress(50);

      // Check if queued or running
      if (runResponse.data?.queued) {
        setIsWaitingInQueue(true);
        setQueuePosition(runResponse.data.position || 1);
        toast.info('Servidor ocupado. Você entrou na fila de espera.');
      } else {
        // Processing started immediately - Realtime will notify when done
        console.log('[Upscaler] Processing started, waiting for Realtime notification...');
      }

    } catch (error: any) {
      console.error('[Upscaler] Process error:', error);
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

  // Cancel queue
  const cancelQueue = async () => {
    if (jobId) {
      try {
        await supabase
          .from('upscaler_jobs')
          .delete()
          .eq('id', jobId);
      } catch (e) {
        console.error('[Upscaler] Error deleting job:', e);
      }
    }
    
    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current);
      realtimeChannelRef.current = null;
    }
    
    setIsWaitingInQueue(false);
    setQueuePosition(0);
    setJobId(null);
    setStatus('idle');
    setProgress(0);
  };

  // Download result
  const downloadResult = async () => {
    if (!outputImage) return;

    try {
      const response = await fetch(outputImage);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const blob = await response.blob();
      
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

      if (isIOS) {
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
        toast.success(t('upscalerTool.toast.imageOpened'));
        setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'upscaled.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success(t('upscalerTool.toast.downloadStarted'));
      }
    } catch (error) {
      console.error('[Upscaler] Download error:', error);
      window.open(outputImage, '_blank');
      toast.info(t('upscalerTool.toast.openedNewTab'));
    }
  };

  // Reset
  const resetTool = () => {
    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current);
      realtimeChannelRef.current = null;
    }
    
    setInputImage(null);
    setInputFileName('');
    setOutputImage(null);
    setStatus('idle');
    setProgress(0);
    setLastError(null);
    setIsWaitingInQueue(false);
    setQueuePosition(0);
    setJobId(null);
  };

  // Slider drag handling
  const updateSliderPositionFromClientX = useCallback((clientX: number) => {
    if (sliderRef.current) {
      const rect = sliderRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setSliderPosition(percentage);
    }
  }, []);

  const handleSliderPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isDraggingRef.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    updateSliderPositionFromClientX(e.clientX);
  }, [updateSliderPositionFromClientX]);

  const handleSliderPointerMove = useCallback((e: React.PointerEvent) => {
    if (isDraggingRef.current) {
      e.preventDefault();
      e.stopPropagation();
      updateSliderPositionFromClientX(e.clientX);
    }
  }, [updateSliderPositionFromClientX]);

  const handleSliderPointerUp = useCallback((e: React.PointerEvent) => {
    isDraggingRef.current = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
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
            {t('upscalerTool.title')}
          </h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Warning Banner - Don't close page */}
        {(status === 'processing' || status === 'uploading' || isWaitingInQueue) && (
          <div className="bg-amber-500/20 border border-amber-500/50 rounded-lg p-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <p className="text-sm text-amber-200">
              {t('upscalerTool.warnings.dontClose')}
            </p>
          </div>
        )}

        {/* Queue Waiting UI */}
        {isWaitingInQueue && (
          <Card className="bg-[#1A0A2E]/50 border-yellow-500/30 p-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center animate-pulse">
                <Clock className="w-8 h-8 text-yellow-400" />
              </div>
              <div>
                <p className="text-xl font-bold text-yellow-300">
                  Servidor ocupado
                </p>
                <p className="text-4xl font-bold text-white mt-2">
                  {queuePosition}º na fila
                </p>
                <p className="text-sm text-purple-300/70 mt-2">
                  Seu processamento iniciará automaticamente
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={cancelQueue}
                className="text-red-300 hover:text-red-100 hover:bg-red-500/20"
              >
                Sair da fila
              </Button>
            </div>
          </Card>
        )}

        {/* Image Upload */}
        {!inputImage && !isWaitingInQueue ? (
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
                <p className="text-lg font-medium text-white">{t('upscalerTool.upload.dragHere')}</p>
                <p className="text-sm text-purple-300/70">{t('upscalerTool.upload.orClick')}</p>
                <p className="text-xs text-purple-300/50 mt-2">{t('upscalerTool.upload.formats')}</p>
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
          /* Result View - Before/After Slider with Zoom */
          <Card className="bg-[#1A0A2E]/50 border-purple-500/20 overflow-hidden">
            <TransformWrapper
              initialScale={1}
              minScale={1}
              maxScale={100}
              onInit={(ref) => {
                setZoomLevel(ref.state.scale);
                if (beforeTransformRef.current) {
                  beforeTransformRef.current.style.transform = `translate(${ref.state.positionX}px, ${ref.state.positionY}px) scale(${ref.state.scale})`;
                  beforeTransformRef.current.style.transformOrigin = '0% 0%';
                }
              }}
              onTransformed={(_, state) => {
                setZoomLevel(state.scale);
                if (beforeTransformRef.current) {
                  beforeTransformRef.current.style.transform = `translate(${state.positionX}px, ${state.positionY}px) scale(${state.scale})`;
                }
              }}
              wheel={{ step: 0.2 }}
              pinch={{ step: 5 }}
              doubleClick={{ mode: 'toggle', step: 2 }}
              panning={{ disabled: zoomLevel <= 1 }}
            >
              {({ zoomIn, zoomOut, resetTransform }) => (
                <div className="relative">
                  {/* Zoom Controls */}
                  <div className="hidden sm:flex absolute top-4 left-1/2 -translate-x-1/2 z-30 items-center gap-1 bg-black/80 rounded-full px-2 py-1">
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

                  {/* Container with ref for slider calculations */}
                  <div ref={sliderRef} className="relative w-full mx-auto overflow-hidden">
                    <AspectRatio ratio={16 / 9}>
                      <div className="relative w-full h-full bg-black overflow-hidden">
                        {/* AFTER image */}
                        <TransformComponent 
                          wrapperStyle={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }} 
                          contentStyle={{ width: '100%', height: '100%' }}
                        >
                          <img 
                            src={outputImage} 
                            alt="Depois" 
                            className="w-full h-full object-contain"
                            draggable={false}
                          />
                        </TransformComponent>

                        {/* BEFORE image - overlay clipped */}
                        <div 
                          className="absolute inset-0 pointer-events-none"
                          style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
                        >
                          <div 
                            ref={beforeTransformRef}
                            className="w-full h-full"
                            style={{ transformOrigin: '0% 0%' }}
                          >
                            <img 
                              src={inputImage} 
                              alt="Antes" 
                              className="w-full h-full object-contain"
                              draggable={false}
                            />
                          </div>
                        </div>

                        {/* Slider Line and Handle */}
                        <div 
                          className="absolute top-0 bottom-0 w-1 bg-white shadow-lg z-20"
                          style={{ 
                            left: `${sliderPosition}%`, 
                            transform: 'translateX(-50%)', 
                            cursor: 'ew-resize',
                            touchAction: 'none'
                          }}
                          onPointerDown={handleSliderPointerDown}
                          onPointerMove={handleSliderPointerMove}
                          onPointerUp={handleSliderPointerUp}
                          onPointerCancel={handleSliderPointerUp}
                        >
                          <div 
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center cursor-ew-resize"
                            style={{ touchAction: 'none' }}
                          >
                            <div className="flex gap-0.5">
                              <div className="w-0.5 h-4 bg-gray-400 rounded-full" />
                              <div className="w-0.5 h-4 bg-gray-400 rounded-full" />
                            </div>
                          </div>
                        </div>

                        {/* Labels */}
                        <div className="absolute top-2 sm:top-14 left-2 sm:left-4 px-2 sm:px-4 py-1 sm:py-1.5 rounded-full bg-black/90 border border-white/30 text-white text-xs sm:text-sm font-bold z-20 pointer-events-none shadow-lg">
                          {t('upscalerTool.labels.before')}
                        </div>
                        <div className="absolute top-2 sm:top-14 right-2 sm:right-4 px-2 sm:px-4 py-1 sm:py-1.5 rounded-full bg-purple-600/90 border border-purple-400/50 text-white text-xs sm:text-sm font-bold z-20 pointer-events-none shadow-lg">
                          {t('upscalerTool.labels.after')}
                        </div>
                      </div>
                    </AspectRatio>
                  </div>

                  {/* Zoom Hint */}
                  <div className="hidden sm:block absolute bottom-3 left-1/2 -translate-x-1/2 text-xs text-white/90 bg-black/80 px-4 py-1.5 rounded-full z-20 border border-white/20 shadow-lg">
                    🔍 {t('upscalerTool.zoomHint')}
                  </div>
                </div>
              )}
            </TransformWrapper>
          </Card>
        ) : inputImage && !isWaitingInQueue ? (
          /* Input Preview */
          <Card className="bg-[#1A0A2E]/50 border-purple-500/20 overflow-hidden">
            <AspectRatio ratio={16 / 9}>
              <div className="relative w-full h-full bg-black/50">
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
                        {status === 'uploading' ? t('upscalerTool.status.uploading') : t('upscalerTool.status.processing')}
                      </p>
                      <p className="text-sm text-purple-300/70">
                        {t('upscalerTool.status.mayTake2Min')}
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
                      onClick={cancelQueue}
                      className="text-purple-300 hover:text-white hover:bg-purple-500/20 mt-2"
                    >
                      {t('upscalerTool.buttons.cancel')}
                    </Button>
                  </div>
                )}
              </div>
            </AspectRatio>
          </Card>
        ) : null}

        {/* Controls */}
        {inputImage && status === 'idle' && !isWaitingInQueue && (
          <div className="space-y-4">
            {/* Detail Denoise */}
            <Card className="bg-[#1A0A2E]/50 border-purple-500/20 p-4">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span className="font-medium text-white">{t('upscalerTool.controls.detailLevel')}</span>
                  <div className="group relative">
                    <Info className="w-4 h-4 text-purple-400/70 cursor-help" />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-black/90 rounded-lg text-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                      {t('upscalerTool.controls.controlsDetails')}
                    </div>
                  </div>
                </div>
                <span className="text-purple-300 font-mono">{detailDenoise.toFixed(2)}</span>
              </div>
              <div className="text-xs text-purple-300 mb-3">
                ✨ {t('upscalerTool.controls.detailRecommended')}
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
                <span>{t('upscalerTool.controls.lessDetail')}</span>
                <span>{t('upscalerTool.controls.moreDetail')}</span>
              </div>
            </Card>

            {/* Custom Prompt */}
            <Card className="bg-[#1A0A2E]/50 border-purple-500/20 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-pink-400" />
                  <span className="font-medium text-white">{t('upscalerTool.controls.usePrompt')}</span>
                </div>
                <Switch
                  checked={useCustomPrompt}
                  onCheckedChange={setUseCustomPrompt}
                />
              </div>
              
              {useCustomPrompt && (
                <>
                  <p className="text-xs text-pink-300/70 mb-3">
                    {t('upscalerTool.controls.promptHint')}
                  </p>
                  <Textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder={t('upscalerTool.controls.promptPlaceholder')}
                    className="min-h-[100px] bg-[#0D0221]/50 border-purple-500/30 text-white placeholder:text-purple-300/50"
                  />
                </>
              )}
            </Card>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          {status === 'idle' && inputImage && !isWaitingInQueue && (
            <Button
              className="w-full py-6 text-lg font-semibold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg shadow-purple-500/25"
              onClick={processImage}
            >
              <Sparkles className="w-5 h-5 mr-2" />
              {t('upscalerTool.buttons.increaseQuality')}
            </Button>
          )}

          {status === 'completed' && (
            <>
              <Button
                className="w-full py-6 text-lg font-semibold bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg shadow-green-500/25"
                onClick={downloadResult}
              >
                <Download className="w-5 h-5 mr-2" />
                {t('upscalerTool.buttons.downloadHD')}
              </Button>
              <Button
                variant="outline"
                className="w-full py-6 text-lg border-purple-500/30 text-purple-300 hover:bg-purple-500/20"
                onClick={resetTool}
              >
                <RotateCcw className="w-5 h-5 mr-2" />
                {t('upscalerTool.buttons.processNew')}
              </Button>
            </>
          )}

          {status === 'error' && (
            <>
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
                          {t('upscalerTool.errors.code')}: {lastError.code}
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
                {t('upscalerTool.buttons.tryAgain')}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default UpscalerArcanoTool;
