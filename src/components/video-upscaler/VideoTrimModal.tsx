import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Scissors, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  videoDuration,
  onSave,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [range, setRange] = useState<[number, number]>([0, Math.min(MAX_TRIM_DURATION, videoDuration)]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentPreviewTime, setCurrentPreviewTime] = useState(0);

  // Create object URL when modal opens
  useEffect(() => {
    if (isOpen && videoFile) {
      const url = URL.createObjectURL(videoFile);
      setVideoUrl(url);
      setRange([0, Math.min(MAX_TRIM_DURATION, videoDuration)]);
      setCurrentPreviewTime(0);
      return () => URL.revokeObjectURL(url);
    }
  }, [isOpen, videoFile, videoDuration]);

  // Sync video time when range changes
  const handleRangeChange = useCallback((newValues: number[]) => {
    const [newStart, newEnd] = newValues as [number, number];
    const currentStart = range[0];
    const currentEnd = range[1];
    
    // Determine which handle moved
    let adjustedStart = newStart;
    let adjustedEnd = newEnd;
    
    // Ensure maximum 10 seconds range
    if (newEnd - newStart > MAX_TRIM_DURATION) {
      // If start moved, adjust end
      if (newStart !== currentStart) {
        adjustedEnd = newStart + MAX_TRIM_DURATION;
        if (adjustedEnd > videoDuration) {
          adjustedEnd = videoDuration;
          adjustedStart = adjustedEnd - MAX_TRIM_DURATION;
        }
      }
      // If end moved, adjust start
      else if (newEnd !== currentEnd) {
        adjustedStart = newEnd - MAX_TRIM_DURATION;
        if (adjustedStart < 0) {
          adjustedStart = 0;
          adjustedEnd = MAX_TRIM_DURATION;
        }
      }
    }
    
    setRange([adjustedStart, adjustedEnd]);
    
    // Seek video to the start of selection when dragging
    if (videoRef.current) {
      videoRef.current.currentTime = adjustedStart;
      setCurrentPreviewTime(adjustedStart);
    }
  }, [range, videoDuration]);

  // Handle video time update
  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      const currentTime = videoRef.current.currentTime;
      setCurrentPreviewTime(currentTime);
      
      // Loop within selected range
      if (currentTime >= range[1]) {
        videoRef.current.currentTime = range[0];
      }
    }
  }, [range]);

  // Trim video using frame-by-frame seeking
  const trimVideo = useCallback(async (): Promise<File> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.src = URL.createObjectURL(videoFile);
      video.muted = false;
      video.volume = 0;

      video.onloadedmetadata = async () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d')!;

          // Capture canvas stream for video
          const canvasStream = canvas.captureStream(30);
          
          // Try to capture audio from video
          try {
            const videoStream = (video as any).captureStream();
            const audioTracks = videoStream.getAudioTracks();
            audioTracks.forEach((track: MediaStreamTrack) => canvasStream.addTrack(track));
          } catch (e) {
            console.warn('Could not capture audio:', e);
          }

          const recorder = new MediaRecorder(canvasStream, { 
            mimeType: 'video/webm;codecs=vp9,opus'
          });
          const chunks: Blob[] = [];

          recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunks.push(e.data);
          };
          
          recorder.onstop = () => {
            const blob = new Blob(chunks, { type: 'video/webm' });
            const trimmedFile = new File(
              [blob], 
              `trimmed-${videoFile.name.replace(/\.[^/.]+$/, '')}.webm`, 
              { type: 'video/webm' }
            );
            URL.revokeObjectURL(video.src);
            resolve(trimmedFile);
          };

          const [startTime, endTime] = range;
          const FPS = 30;
          const frameInterval = 1 / FPS;
          const duration = endTime - startTime;
          const totalFrames = Math.ceil(duration * FPS);
          let frameCount = 0;

          // Seek to start position
          video.currentTime = startTime;
          await new Promise<void>(r => { video.onseeked = () => r(); });

          recorder.start(100); // Collect data every 100ms

          // Process frames manually for exact duration
          const processFrame = async () => {
            if (frameCount >= totalFrames) {
              recorder.stop();
              return;
            }

            // Draw current frame to canvas
            ctx.drawImage(video, 0, 0);
            frameCount++;

            // Seek to next frame
            const nextTime = startTime + (frameCount * frameInterval);
            if (nextTime <= endTime) {
              video.currentTime = nextTime;
              await new Promise<void>(r => { video.onseeked = () => r(); });
            }

            // Use setTimeout for next frame
            setTimeout(processFrame, 1000 / FPS);
          };

          await processFrame();
        } catch (error) {
          URL.revokeObjectURL(video.src);
          reject(error);
        }
      };

      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        reject(new Error('Erro ao carregar vídeo'));
      };
    });
  }, [videoFile, range]);

  const handleSave = async () => {
    setIsProcessing(true);
    try {
      const trimmedFile = await trimVideo();
      
      // Get metadata of trimmed video
      const video = document.createElement('video');
      video.src = URL.createObjectURL(trimmedFile);
      
      await new Promise<void>((resolve) => {
        video.onloadedmetadata = () => {
          const metadata: VideoMetadata = {
            width: video.videoWidth,
            height: video.videoHeight,
            duration: video.duration,
          };
          URL.revokeObjectURL(video.src);
          onSave(trimmedFile, metadata);
          resolve();
        };
      });
    } catch (error) {
      console.error('Error trimming video:', error);
    } finally {
      setIsProcessing(false);
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
            
            {/* Current time overlay */}
            <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-1 rounded text-xs text-white">
              {formatTime(currentPreviewTime)} / {formatTime(videoDuration)}
            </div>
          </div>

          {/* Trim Controls */}
          <div className="space-y-3 px-2">
            <p className="text-sm text-purple-200">
              Selecione até {MAX_TRIM_DURATION} segundos do vídeo:
            </p>
            
            {/* Dual Slider */}
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

            {/* Range Info */}
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

          {/* Save Button */}
          <div className="flex justify-end pt-2">
            <Button
              onClick={handleSave}
              disabled={isProcessing || selectedDuration > MAX_TRIM_DURATION}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                'Salvar Vídeo'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VideoTrimModal;
