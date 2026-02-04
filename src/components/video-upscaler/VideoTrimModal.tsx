import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Scissors, Play, Pause, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface VideoMetadata {
  width: number;
  height: number;
  duration: number;
}

interface VideoTrimModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoFile: File;
  onSave: (trimmedFile: File, metadata: VideoMetadata) => void;
}

const MAX_TRIM_DURATION = 10;

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms}`;
};

const VideoTrimModal: React.FC<VideoTrimModalProps> = ({
  isOpen,
  onClose,
  videoFile,
  onSave,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [videoWidth, setVideoWidth] = useState(0);
  const [videoHeight, setVideoHeight] = useState(0);
  const [trimRange, setTrimRange] = useState<[number, number]>([0, MAX_TRIM_DURATION]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isTrimming, setIsTrimming] = useState(false);

  // Load video when modal opens
  useEffect(() => {
    if (isOpen && videoFile) {
      const url = URL.createObjectURL(videoFile);
      setVideoUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [isOpen, videoFile]);

  // Handle video metadata loaded
  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      const dur = videoRef.current.duration;
      setDuration(dur);
      setVideoWidth(videoRef.current.videoWidth);
      setVideoHeight(videoRef.current.videoHeight);
      // Default: first 10 seconds or full duration
      const endTime = Math.min(MAX_TRIM_DURATION, dur);
      setTrimRange([0, endTime]);
      setCurrentTime(0);
    }
  }, []);

  // Handle time update during playback
  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      const time = videoRef.current.currentTime;
      setCurrentTime(time);
      
      // Loop within trim range
      if (time >= trimRange[1]) {
        videoRef.current.currentTime = trimRange[0];
        setCurrentTime(trimRange[0]);
      }
    }
  }, [trimRange]);

  // Handle slider change
  const handleSliderChange = useCallback((values: number[]) => {
    if (values.length !== 2) return;
    
    let [start, end] = values;
    
    // Enforce max 10 second range
    if (end - start > MAX_TRIM_DURATION) {
      // Determine which handle was moved
      if (start !== trimRange[0]) {
        // Start was moved, adjust end
        end = start + MAX_TRIM_DURATION;
      } else {
        // End was moved, adjust start
        start = end - MAX_TRIM_DURATION;
      }
    }
    
    // Clamp values
    start = Math.max(0, start);
    end = Math.min(duration, end);
    
    setTrimRange([start, end]);
    
    // Seek video to start of selection
    if (videoRef.current) {
      videoRef.current.currentTime = start;
      setCurrentTime(start);
    }
  }, [duration, trimRange]);

  // Toggle play/pause
  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      // Start from beginning of trim if at end
      if (videoRef.current.currentTime >= trimRange[1] || videoRef.current.currentTime < trimRange[0]) {
        videoRef.current.currentTime = trimRange[0];
      }
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying, trimRange]);

  // Trim video using MediaRecorder
  const handleTrim = useCallback(async () => {
    if (!videoFile) return;
    
    setIsTrimming(true);
    
    try {
      const trimmedFile = await trimVideoFile(videoFile, trimRange[0], trimRange[1]);
      const trimmedDuration = trimRange[1] - trimRange[0];
      
      onSave(trimmedFile, {
        width: videoWidth,
        height: videoHeight,
        duration: trimmedDuration,
      });
      
      toast.success('Vídeo cortado com sucesso!');
    } catch (error) {
      console.error('Trim error:', error);
      toast.error('Erro ao cortar vídeo. Tente novamente.');
    } finally {
      setIsTrimming(false);
    }
  }, [videoFile, trimRange, videoWidth, videoHeight, onSave]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setIsPlaying(false);
      setCurrentTime(0);
      setTrimRange([0, MAX_TRIM_DURATION]);
    }
  }, [isOpen]);

  const trimDuration = trimRange[1] - trimRange[0];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl bg-background/95 backdrop-blur-sm border-purple-500/30">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Scissors className="w-5 h-5 text-purple-400" />
            Cortar Vídeo
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Video Player */}
          <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
            {videoUrl && (
              <video
                ref={videoRef}
                src={videoUrl}
                className="w-full h-full object-contain"
                onLoadedMetadata={handleLoadedMetadata}
                onTimeUpdate={handleTimeUpdate}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                muted
                playsInline
              />
            )}
            
            {/* Play/Pause overlay */}
            <button
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity"
            >
              <div className="w-16 h-16 rounded-full bg-purple-600/80 flex items-center justify-center">
                {isPlaying ? (
                  <Pause className="w-8 h-8 text-white" />
                ) : (
                  <Play className="w-8 h-8 text-white ml-1" />
                )}
              </div>
            </button>

            {/* Current time display */}
            <div className="absolute bottom-2 left-2 bg-black/70 rounded px-2 py-1 text-xs text-white font-mono">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>

          {/* Trim Slider */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Selecione até {MAX_TRIM_DURATION} segundos do vídeo:
            </p>
            
            <div className="px-2">
              <Slider
                value={trimRange}
                min={0}
                max={duration || 100}
                step={0.1}
                onValueChange={handleSliderChange}
                className="[&_[role=slider]]:bg-purple-500 [&_[role=slider]]:border-purple-400"
              />
            </div>

            {/* Time labels */}
            <div className="flex justify-between text-xs text-muted-foreground font-mono px-2">
              <span>0s</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Selected range info */}
          <div className="bg-purple-500/10 rounded-lg p-3 border border-purple-500/20">
            <div className="flex items-center justify-between">
              <span className="text-sm text-purple-200">Trecho selecionado:</span>
              <span className="font-mono text-purple-300">
                {formatTime(trimRange[0])} → {formatTime(trimRange[1])}
              </span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-sm text-purple-200">Duração:</span>
              <span className={`font-mono ${trimDuration > MAX_TRIM_DURATION ? 'text-red-400' : 'text-green-400'}`}>
                {trimDuration.toFixed(1)}s
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isTrimming}>
            Cancelar
          </Button>
          <Button 
            onClick={handleTrim} 
            disabled={isTrimming || trimDuration > MAX_TRIM_DURATION}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isTrimming ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Cortando...
              </>
            ) : (
              <>
                <Scissors className="w-4 h-4 mr-2" />
                Salvar Vídeo
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Helper function to trim video using MediaRecorder with frame-by-frame capture
async function trimVideoFile(file: File, startTime: number, endTime: number): Promise<File> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.src = URL.createObjectURL(file);
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';

    video.onloadedmetadata = async () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          throw new Error('Failed to get canvas context');
        }

        // Check MediaRecorder support
        const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') 
          ? 'video/webm;codecs=vp9'
          : MediaRecorder.isTypeSupported('video/webm') 
            ? 'video/webm'
            : 'video/mp4';

        const stream = canvas.captureStream(30);
        const recorder = new MediaRecorder(stream, { 
          mimeType,
          videoBitsPerSecond: 5000000, // 5 Mbps
        });
        const chunks: Blob[] = [];

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunks.push(e.data);
          }
        };

        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: mimeType.split(';')[0] });
          const extension = mimeType.includes('webm') ? 'webm' : 'mp4';
          const trimmedFile = new File(
            [blob], 
            `trimmed-${Date.now()}.${extension}`, 
            { type: blob.type }
          );
          URL.revokeObjectURL(video.src);
          resolve(trimmedFile);
        };

        recorder.onerror = (e) => {
          URL.revokeObjectURL(video.src);
          reject(e);
        };

        // Frame-by-frame capture configuration
        const fps = 30;
        const targetDuration = endTime - startTime;
        const totalFrames = Math.ceil(targetDuration * fps);
        let frameCount = 0;
        let isCapturing = true;

        // Start recording
        recorder.start(100);

        // Function to capture next frame
        const captureNextFrame = () => {
          if (!isCapturing || frameCount >= totalFrames) {
            isCapturing = false;
            recorder.stop();
            return;
          }

          // Calculate exact time for this frame
          const frameTime = startTime + (frameCount / fps);
          video.currentTime = frameTime;
        };

        // Handle seeked event - draw frame and continue
        video.onseeked = () => {
          if (!isCapturing) return;
          
          // Draw current frame to canvas
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          frameCount++;
          
          // Small delay to ensure frame is captured by MediaRecorder
          setTimeout(() => {
            captureNextFrame();
          }, 1000 / fps);
        };

        // Start frame-by-frame capture
        captureNextFrame();

      } catch (error) {
        URL.revokeObjectURL(video.src);
        reject(error);
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error('Failed to load video'));
    };
  });
}

export default VideoTrimModal;
