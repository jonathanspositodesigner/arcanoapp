import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Scissors, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface VideoMetadata {
  width: number;
  height: number;
  duration: number;
}

interface VideoTrimModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoFile: File;
  videoDuration: number;
  onSave: (trimmedFile: File, metadata: VideoMetadata) => void;
}

const MAX_TRIM_DURATION = 10;
const GLOBAL_TIMEOUT_MS = 60000; // 60s timeout máximo

const formatTime = (seconds: number): string => {
  // Guard against invalid values (NaN, Infinity, negative)
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '00:00.0';
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms}`;
};

// Detectar melhor mimeType suportado
const getSupportedMimeType = (): string | null => {
  const types = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ];
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return null;
};

const VideoTrimModal: React.FC<VideoTrimModalProps> = ({
  isOpen,
  onClose,
  videoFile,
  videoDuration,
  onSave,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [range, setRange] = useState<[number, number]>([0, Math.min(MAX_TRIM_DURATION, videoDuration)]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentPreviewTime, setCurrentPreviewTime] = useState(0);
  const abortRef = useRef(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  // Create object URL when modal opens
  useEffect(() => {
    if (isOpen && videoFile) {
      const url = URL.createObjectURL(videoFile);
      setVideoUrl(url);
      setRange([0, Math.min(MAX_TRIM_DURATION, videoDuration)]);
      setCurrentPreviewTime(0);
      setProgress(0);
      abortRef.current = false;
      return () => URL.revokeObjectURL(url);
    }
  }, [isOpen, videoFile, videoDuration]);

  // Sync video time when range changes
  const handleRangeChange = useCallback((newValues: number[]) => {
    const [newStart, newEnd] = newValues as [number, number];
    const currentStart = range[0];
    const currentEnd = range[1];
    
    let adjustedStart = newStart;
    let adjustedEnd = newEnd;
    
    if (newEnd - newStart > MAX_TRIM_DURATION) {
      if (newStart !== currentStart) {
        adjustedEnd = newStart + MAX_TRIM_DURATION;
        if (adjustedEnd > videoDuration) {
          adjustedEnd = videoDuration;
          adjustedStart = adjustedEnd - MAX_TRIM_DURATION;
        }
      } else if (newEnd !== currentEnd) {
        adjustedStart = newEnd - MAX_TRIM_DURATION;
        if (adjustedStart < 0) {
          adjustedStart = 0;
          adjustedEnd = MAX_TRIM_DURATION;
        }
      }
    }
    
    setRange([adjustedStart, adjustedEnd]);
    
    if (videoRef.current) {
      videoRef.current.currentTime = adjustedStart;
      setCurrentPreviewTime(adjustedStart);
    }
  }, [range, videoDuration]);

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      const currentTime = videoRef.current.currentTime;
      setCurrentPreviewTime(currentTime);
      if (currentTime >= range[1]) {
        videoRef.current.currentTime = range[0];
      }
    }
  }, [range]);

  // Método principal: Play + CaptureStream (mais estável)
  const trimVideoPlayback = useCallback(async (): Promise<File> => {
    const mimeType = getSupportedMimeType();
    if (!mimeType) {
      throw new Error('Seu navegador não suporta exportar vídeo. Use Chrome ou Edge.');
    }

    const [startTime, endTime] = range;
    const duration = endTime - startTime;

    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const videoSrc = URL.createObjectURL(videoFile);
      video.src = videoSrc;
      video.muted = false;
      video.playsInline = true;
      video.preload = 'auto';

      let recorder: MediaRecorder | null = null;
      let stream: MediaStream | null = null;
      let animationId: number | null = null;
      let safetyTimeout: ReturnType<typeof setTimeout> | null = null;
      let resolved = false;

      const cleanup = () => {
        if (animationId) cancelAnimationFrame(animationId);
        if (safetyTimeout) clearTimeout(safetyTimeout);
        video.pause();
        if (stream) {
          stream.getTracks().forEach(t => t.stop());
        }
        URL.revokeObjectURL(videoSrc);
      };

      cleanupRef.current = cleanup;

      const finishRecording = (chunks: Blob[]) => {
        if (resolved) return;
        resolved = true;
        cleanup();
        
        const blob = new Blob(chunks, { type: 'video/webm' });
        const trimmedFile = new File(
          [blob],
          `trimmed-${videoFile.name.replace(/\.[^/.]+$/, '')}.webm`,
          { type: 'video/webm' }
        );
        resolve(trimmedFile);
      };

      video.onloadedmetadata = async () => {
        try {
          // Seek to start
          video.currentTime = startTime;
          
          await new Promise<void>((res, rej) => {
            const timeout = setTimeout(() => rej(new Error('Seek timeout')), 5000);
            video.onseeked = () => {
              clearTimeout(timeout);
              res();
            };
          });

          if (abortRef.current) {
            cleanup();
            reject(new Error('Cancelado'));
            return;
          }

          // Capture stream from video element (includes audio!)
          stream = (video as any).captureStream ? (video as any).captureStream() : null;
          if (!stream) {
            throw new Error('captureStream não suportado');
          }

          recorder = new MediaRecorder(stream, { mimeType });
          const chunks: Blob[] = [];

          recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunks.push(e.data);
          };

          recorder.onstop = () => {
            finishRecording(chunks);
          };

          recorder.onerror = (e) => {
            cleanup();
            reject(new Error('Erro no MediaRecorder'));
          };

          recorder.start(100);

          // Play video
          await video.play();

          // Monitor playback and stop at endTime
          const checkTime = () => {
            if (abortRef.current) {
              recorder?.stop();
              return;
            }
            
            const currentTime = video.currentTime;
            const progressPercent = Math.min(100, ((currentTime - startTime) / duration) * 100);
            setProgress(Math.round(progressPercent));

            if (currentTime >= endTime - 0.05) {
              // Reached end
              video.pause();
              recorder?.stop();
            } else {
              animationId = requestAnimationFrame(checkTime);
            }
          };

          animationId = requestAnimationFrame(checkTime);

          // Safety timeout: stop after expected duration + 2s buffer
          safetyTimeout = setTimeout(() => {
            if (!resolved) {
              video.pause();
              recorder?.stop();
            }
          }, (duration + 2) * 1000);

        } catch (error) {
          cleanup();
          reject(error);
        }
      };

      video.onerror = () => {
        cleanup();
        reject(new Error('Erro ao carregar vídeo'));
      };
    });
  }, [videoFile, range]);

  const handleCancel = useCallback(() => {
    abortRef.current = true;
    if (cleanupRef.current) {
      cleanupRef.current();
    }
    setIsProcessing(false);
    setProgress(0);
  }, []);

  const handleSave = async () => {
    const mimeType = getSupportedMimeType();
    if (!mimeType) {
      toast({
        title: "Navegador não suportado",
        description: "Use Chrome, Edge ou Firefox para cortar vídeos.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    abortRef.current = false;

    try {
      // Timeout global de segurança
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Tempo limite excedido')), GLOBAL_TIMEOUT_MS);
      });

      const trimmedFile = await Promise.race([
        trimVideoPlayback(),
        timeoutPromise,
      ]);

      if (abortRef.current) {
        return;
      }

      // Get metadata of trimmed video
      const video = document.createElement('video');
      const tempUrl = URL.createObjectURL(trimmedFile);
      video.src = tempUrl;

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          URL.revokeObjectURL(tempUrl);
          reject(new Error('Timeout ao ler metadata'));
        }, 5000);
        
        video.onloadedmetadata = () => {
          clearTimeout(timeout);
          const metadata: VideoMetadata = {
            width: video.videoWidth,
            height: video.videoHeight,
            duration: video.duration,
          };
          URL.revokeObjectURL(tempUrl);
          onSave(trimmedFile, metadata);
          resolve();
        };
        
        video.onerror = () => {
          clearTimeout(timeout);
          URL.revokeObjectURL(tempUrl);
          reject(new Error('Erro ao ler vídeo cortado'));
        };
      });

      toast({
        title: "Vídeo cortado!",
        description: `Duração: ${(range[1] - range[0]).toFixed(1)}s`,
      });

    } catch (error) {
      console.error('Error trimming video:', error);
      
      if (!abortRef.current) {
        toast({
          title: "Erro ao cortar vídeo",
          description: error instanceof Error ? error.message : "Tente novamente",
          variant: "destructive",
        });
      }
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const selectedDuration = range[1] - range[0];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isProcessing && onClose()}>
      <DialogContent className="sm:max-w-2xl bg-[#1a1625] border-purple-500/30">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Scissors className="w-5 h-5 text-purple-400" />
            Cortar Vídeo
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Video Preview */}
          <div className="relative bg-black/40 rounded-lg overflow-hidden">
            {videoUrl && (
              <video
                ref={videoRef}
                src={videoUrl}
                className="w-full max-h-[300px] object-contain"
                onTimeUpdate={handleTimeUpdate}
                muted
                playsInline
                controls
              />
            )}
            
            <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-1 rounded text-xs text-white">
              {formatTime(currentPreviewTime)} / {formatTime(videoDuration)}
            </div>
          </div>

          {/* Trim Controls */}
          <div className="space-y-3 px-2">
            <p className="text-sm text-purple-200">
              Selecione até {MAX_TRIM_DURATION} segundos do vídeo:
            </p>
            
            <div className="py-4">
              <Slider
                value={range}
                onValueChange={handleRangeChange}
                min={0}
                max={videoDuration}
                step={0.1}
                className="w-full"
              />
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-purple-300">0s</span>
              <div className="flex items-center gap-2 bg-purple-500/20 px-3 py-1.5 rounded-full">
                <span className="text-white font-medium">
                  {formatTime(range[0])} → {formatTime(range[1])}
                </span>
                <span className={cn(
                  "px-2 py-0.5 rounded text-[10px] font-bold",
                  selectedDuration <= MAX_TRIM_DURATION 
                    ? "bg-green-500/30 text-green-300" 
                    : "bg-red-500/30 text-red-300"
                )}>
                  {selectedDuration.toFixed(1)}s
                </span>
              </div>
              <span className="text-purple-300">{formatTime(videoDuration)}</span>
            </div>
          </div>

          {/* Progress bar during processing */}
          {isProcessing && (
            <div className="px-2">
              <div className="w-full bg-purple-900/30 rounded-full h-2">
                <div 
                  className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-center text-xs text-purple-300 mt-1">
                Processando... {progress}%
              </p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex justify-end gap-2 pt-2">
            {isProcessing ? (
              <Button
                onClick={handleCancel}
                variant="outline"
                className="border-red-500/50 text-red-400 hover:bg-red-500/20"
              >
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
            ) : (
              <Button
                onClick={handleSave}
                disabled={selectedDuration > MAX_TRIM_DURATION}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6"
              >
                Salvar Vídeo
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VideoTrimModal;
