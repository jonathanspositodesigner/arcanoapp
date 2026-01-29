import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ArrowLeft, Upload, Sparkles, Download, RotateCcw, Loader2, ZoomIn, ZoomOut, Info, AlertCircle, Clock } from 'lucide-react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Card } from '@/components/ui/card';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { useSmartBackNavigation } from '@/hooks/useSmartBackNavigation';

type Resolution = 2048 | 4096;
type ProcessingStatus = 'idle' | 'uploading' | 'processing' | 'completed' | 'error';

interface ErrorDetails {
  message: string;
  code?: string | number;
  solution?: string;
  details?: any;
}

const MAX_CONCURRENT_JOBS = 3;
const QUEUE_POLLING_INTERVAL = 10000; // 10 seconds

const UpscalerArcanoTool: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('tools');
  const { goBack } = useSmartBackNavigation({ fallback: '/ferramentas-ia' });

  // State
  const [resolution, setResolution] = useState<Resolution>(4096);
  const [detailDenoise, setDetailDenoise] = useState(0.15);
  const [creativityDenoise, setCreativityDenoise] = useState(0.05);
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
  const [queueId, setQueueId] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const queuePollingRef = useRef<NodeJS.Timeout | null>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const beforeTransformRef = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef<string>(crypto.randomUUID());
  const queueEntryCreatedAtRef = useRef<string | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
      if (queuePollingRef.current) {
        clearInterval(queuePollingRef.current);
      }
    };
  }, []);

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

  // Actually process the image (called when it's our turn)
  const actuallyProcessImage = async () => {
    if (!inputImage) return;

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

      // Step 2: Run workflow (only upscale mode now)
      setStatus('processing');
      const runResponse = await supabase.functions.invoke('runninghub-upscaler/run', {
        body: {
          fileName,
          mode: 'upscale',
          resolution,
          creativityDenoise,
          detailDenoise,
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
          details: runResponse.data.details
        });
        throw new Error(runResponse.data.error);
      }

      const { taskId } = runResponse.data;
      
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

      // Step 3: Wait for minimum processing time, then poll for status
      const initialDelay = 150000; // 2 minutes and 30 seconds
      const pollingInterval = 5000; // 5 seconds
      const maxAttempts = 120; // 10 minutes of polling after initial delay
      let attempts = 0;

      const progressPerStep = 10 / 30;
      let progressValue = 40;
      
      const progressTimer = setInterval(() => {
        progressValue = Math.min(progressValue + progressPerStep, 50);
        setProgress(progressValue);
      }, 5000);

      setTimeout(() => {
        clearInterval(progressTimer);
        setProgress(50);
        
        pollingRef.current = setInterval(async () => {
          attempts++;
          
          if (attempts > maxAttempts) {
            clearInterval(pollingRef.current!);
            await markJobCompleted();
            setStatus('error');
            setLastError({
              message: 'Tempo limite excedido',
              code: 'TIMEOUT',
              solution: 'O processamento demorou mais de 12 minutos. Tente com uma imagem menor ou com menos resolução.'
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

            if (statusResponse.data?.error) {
              clearInterval(pollingRef.current!);
              await markJobCompleted();
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
            
            if (!taskStatus) {
              console.warn('Status undefined, continuing polling...');
              return;
            }
            
            console.log('Task status:', taskStatus, 'attempt:', attempts);

            if (taskStatus === 'RUNNING' || taskStatus === 'PENDING') {
              setProgress(Math.min(50 + (attempts * 0.4), 95));
            } else if (taskStatus === 'SUCCESS') {
              clearInterval(pollingRef.current!);
              setProgress(95);

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

              const validOutputs = (outputs || []).filter(
                (url: unknown) => typeof url === 'string' && url.trim().length > 0
              );
              console.log('[Upscaler] Valid outputs:', validOutputs);

              if (validOutputs.length > 0) {
                const finalUrl = validOutputs[validOutputs.length - 1];
                console.log('[Upscaler] Selected finalUrl:', finalUrl);
                
                await markJobCompleted();
                setOutputImage(finalUrl);
                setStatus('completed');
                setProgress(100);
                toast.success(t('upscalerTool.toast.success'));
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
              await markJobCompleted();
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
        }, pollingInterval);
      }, initialDelay);

    } catch (error: any) {
      console.error('Process error:', error);
      await markJobCompleted();
      setStatus('error');
      
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

  // Mark job as completed in queue
  const markJobCompleted = async () => {
    if (queueId) {
      try {
        await supabase
          .from('upscaler_queue')
          .update({ 
            status: 'completed', 
            completed_at: new Date().toISOString() 
          })
          .eq('id', queueId);
      } catch (e) {
        console.error('Error marking job completed:', e);
      }
      setQueueId(null);
    }
  };

  // Start polling for queue turn
  const startPollingForTurn = (myId: string, myCreatedAt: string) => {
    queuePollingRef.current = setInterval(async () => {
      try {
        // Cleanup stale jobs first
        await supabase.rpc('cleanup_stale_upscaler_jobs');

        // Check running count
        const { count: runningCount } = await supabase
          .from('upscaler_queue')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'running');

        // Check position in queue
        const { count: aheadOfMe } = await supabase
          .from('upscaler_queue')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'waiting')
          .lt('created_at', myCreatedAt);

        const newPosition = (aheadOfMe || 0) + 1;
        setQueuePosition(newPosition);

        // Is it my turn?
        if ((runningCount || 0) < MAX_CONCURRENT_JOBS && newPosition === 1) {
          clearInterval(queuePollingRef.current!);
          queuePollingRef.current = null;
          
          // Update to running
          await supabase
            .from('upscaler_queue')
            .update({ status: 'running', started_at: new Date().toISOString() })
            .eq('id', myId);

          setIsWaitingInQueue(false);
          await actuallyProcessImage();
        }
      } catch (error) {
        console.error('Queue polling error:', error);
      }
    }, QUEUE_POLLING_INTERVAL);
  };

  // Cancel queue
  const cancelQueue = async () => {
    if (queuePollingRef.current) {
      clearInterval(queuePollingRef.current);
      queuePollingRef.current = null;
    }
    
    if (queueId) {
      try {
        await supabase
          .from('upscaler_queue')
          .delete()
          .eq('id', queueId);
      } catch (e) {
        console.error('Error deleting queue entry:', e);
      }
    }
    
    setIsWaitingInQueue(false);
    setQueuePosition(0);
    setQueueId(null);
    queueEntryCreatedAtRef.current = null;
  };

  // Process image - check queue first
  const processImage = async () => {
    if (!inputImage) {
      toast.error(t('upscalerTool.errors.selectFirst'));
      return;
    }

    setLastError(null);

    try {
      // Cleanup stale jobs first
      await supabase.rpc('cleanup_stale_upscaler_jobs');

      // Check how many jobs are running
      const { count: runningCount } = await supabase
        .from('upscaler_queue')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'running');

      if ((runningCount || 0) >= MAX_CONCURRENT_JOBS) {
        // Enter queue as waiting
        const { data: queueEntry, error: insertError } = await supabase
          .from('upscaler_queue')
          .insert({ 
            session_id: sessionIdRef.current, 
            status: 'waiting' 
          })
          .select()
          .single();

        if (insertError || !queueEntry) {
          throw new Error('Erro ao entrar na fila');
        }

        setQueueId(queueEntry.id);
        queueEntryCreatedAtRef.current = queueEntry.created_at;
        setIsWaitingInQueue(true);

        // Calculate initial position
        const { count: aheadOfMe } = await supabase
          .from('upscaler_queue')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'waiting')
          .lt('created_at', queueEntry.created_at);

        setQueuePosition((aheadOfMe || 0) + 1);

        // Start polling for turn
        startPollingForTurn(queueEntry.id, queueEntry.created_at);
        
        toast.info('Servidor ocupado. Você entrou na fila de espera.');
        return;
      }

      // Slot available - register as running and process
      const { data: runningEntry, error: runError } = await supabase
        .from('upscaler_queue')
        .insert({ 
          session_id: sessionIdRef.current, 
          status: 'running', 
          started_at: new Date().toISOString() 
        })
        .select()
        .single();

      if (runError || !runningEntry) {
        throw new Error('Erro ao registrar processamento');
      }

      setQueueId(runningEntry.id);
      
      // Process immediately
      await actuallyProcessImage();

    } catch (error: any) {
      console.error('Queue check error:', error);
      setStatus('error');
      setLastError({
        message: error.message || 'Erro ao verificar fila',
        code: 'QUEUE_ERROR'
      });
      toast.error(error.message || 'Erro ao iniciar processamento');
    }
  };

  // Download result - direct fetch without proxy
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
      console.error('Download error:', error);
      window.open(outputImage, '_blank');
      toast.info(t('upscalerTool.toast.openedNewTab'));
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
    setIsWaitingInQueue(false);
    setQueuePosition(0);
    setQueueId(null);
    queueEntryCreatedAtRef.current = null;
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }
    if (queuePollingRef.current) {
      clearInterval(queuePollingRef.current);
    }
  };

  // Slider drag handling with pointer events (works at any zoom level)
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
                  {/* Zoom Controls - Hidden on mobile */}
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
                        {/* AFTER image - inside TransformComponent (zoomable/pannable) */}
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

                        {/* BEFORE image - overlay clipped to left side */}
                        <div 
                          className="absolute inset-0 pointer-events-none"
                          style={{ 
                            clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` 
                          }}
                        >
                          <div 
                            ref={beforeTransformRef}
                            className="w-full h-full"
                            style={{ 
                              transformOrigin: '0% 0%'
                            }}
                          >
                            <img 
                              src={inputImage} 
                              alt="Antes" 
                              className="w-full h-full object-contain"
                              draggable={false}
                            />
                          </div>
                        </div>

                        {/* Slider Line and Handle - OUTSIDE TransformComponent, doesn't scale */}
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

                        {/* Labels ANTES/DEPOIS - Smaller on mobile */}
                        <div className="absolute top-2 sm:top-14 left-2 sm:left-4 px-2 sm:px-4 py-1 sm:py-1.5 rounded-full bg-black/90 border border-white/30 text-white text-xs sm:text-sm font-bold z-20 pointer-events-none shadow-lg">
                          {t('upscalerTool.labels.before')}
                        </div>
                        <div className="absolute top-2 sm:top-14 right-2 sm:right-4 px-2 sm:px-4 py-1 sm:py-1.5 rounded-full bg-purple-600/90 border border-purple-400/50 text-white text-xs sm:text-sm font-bold z-20 pointer-events-none shadow-lg">
                          {t('upscalerTool.labels.after')}
                        </div>
                      </div>
                    </AspectRatio>
                  </div>

                  {/* Zoom Hint - Hidden on mobile */}
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
                      onClick={() => {
                        if (pollingRef.current) clearInterval(pollingRef.current);
                        markJobCompleted();
                        setStatus('idle');
                        setProgress(0);
                      }}
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

        {/* Controls - Only show when idle with image */}
        {inputImage && status === 'idle' && !isWaitingInQueue && (
          <div className="space-y-4">
            {/* Resolution */}
            <Card className="bg-[#1A0A2E]/50 border-purple-500/20 p-4">
              <div className="flex items-center gap-2 mb-3">
                <ZoomIn className="w-4 h-4 text-purple-400" />
                <span className="font-medium">{t('upscalerTool.controls.finalResolution')}</span>
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

            {/* Creativity Denoise */}
            <Card className="bg-[#1A0A2E]/50 border-purple-500/20 p-4">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-pink-400" />
                  <span className="font-medium text-white">{t('upscalerTool.controls.aiCreativity')}</span>
                  <div className="group relative">
                    <Info className="w-4 h-4 text-purple-400/70 cursor-help" />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-black/90 rounded-lg text-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                      {t('upscalerTool.controls.lowValues')}
                    </div>
                  </div>
                </div>
                <span className="text-purple-300 font-mono">{creativityDenoise.toFixed(2)}</span>
              </div>
              <div className="text-xs text-pink-300 mb-3">
                ✨ {t('upscalerTool.controls.creativityRecommended')}
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
                <span>{t('upscalerTool.controls.faithful')}</span>
                <span>{t('upscalerTool.controls.moreCreative')}</span>
              </div>
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
