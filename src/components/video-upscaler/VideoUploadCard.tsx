import React, { useCallback, useRef, useEffect, useState } from 'react';
import { Upload, X, Video, Clock, Maximize } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import VideoTrimModal from './VideoTrimModal';

interface VideoMetadata {
  width: number;
  height: number;
  duration: number;
}

interface VideoUploadCardProps {
  title: string;
  videoUrl: string | null;
  videoFile: File | null;
  onVideoChange: (url: string | null, file?: File, metadata?: VideoMetadata) => void;
  className?: string;
  disabled?: boolean;
}

const MAX_DIMENSION = 1280;
const MAX_DURATION = 10;

const VideoUploadCard: React.FC<VideoUploadCardProps> = ({
  title,
  videoUrl,
  videoFile,
  onVideoChange,
  className,
  disabled = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  
  // Trim modal state
  const [showTrimModal, setShowTrimModal] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  // Validate video dimensions and duration
  const validateVideo = useCallback((file: File): Promise<{ 
    valid: boolean; 
    error?: string; 
    metadata?: VideoMetadata;
    needsTrim?: boolean;
  }> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';

      video.onloadedmetadata = () => {
        const width = video.videoWidth;
        const height = video.videoHeight;
        const duration = video.duration;

        const maxDimension = Math.max(width, height);

        if (maxDimension > MAX_DIMENSION) {
          resolve({
            valid: false,
            error: `Resolução muito alta (${width}x${height}). Dimensão máxima: ${MAX_DIMENSION}px`,
          });
        } else if (duration > MAX_DURATION) {
          // Instead of rejecting, signal that trim is needed
          resolve({
            valid: true,
            needsTrim: true,
            metadata: { width, height, duration },
          });
        } else {
          resolve({
            valid: true,
            metadata: { width, height, duration },
          });
        }

        URL.revokeObjectURL(video.src);
      };

      video.onerror = () => {
        resolve({ valid: false, error: 'Formato de vídeo não suportado' });
        URL.revokeObjectURL(video.src);
      };

      video.src = URL.createObjectURL(file);
    });
  }, []);

  // Generate thumbnail from video
  const generateThumbnail = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;

      video.onloadeddata = () => {
        video.currentTime = 0.1;
      };

      video.onseeked = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0);
          const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.8);
          resolve(thumbnailUrl);
        } else {
          reject(new Error('Failed to get canvas context'));
        }
        URL.revokeObjectURL(video.src);
      };

      video.onerror = () => {
        reject(new Error('Failed to load video'));
        URL.revokeObjectURL(video.src);
      };

      video.src = URL.createObjectURL(file);
    });
  }, []);

  const handleFileSelect = useCallback(async (file: File) => {
    // Check file type
    const validTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v'];
    if (!validTypes.includes(file.type)) {
      toast.error('Formato não suportado. Use MP4, WebM ou MOV.');
      return;
    }

    // Check file size (max 100MB)
    if (file.size > 100 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo: 100MB');
      return;
    }

    // Validate video dimensions and duration
    const validation = await validateVideo(file);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    // If video needs trimming, open the trim modal
    if (validation.needsTrim) {
      setPendingFile(file);
      setShowTrimModal(true);
      return;
    }

    // Generate thumbnail
    try {
      const thumb = await generateThumbnail(file);
      setThumbnailUrl(thumb);
    } catch (error) {
      console.error('Failed to generate thumbnail:', error);
    }

    // Create object URL for preview
    const url = URL.createObjectURL(file);
    setMetadata(validation.metadata!);
    onVideoChange(url, file, validation.metadata);
  }, [validateVideo, generateThumbnail, onVideoChange]);

  // Handle trim save callback
  const handleTrimSave = useCallback(async (trimmedFile: File, trimmedMetadata: VideoMetadata) => {
    // Generate thumbnail for the trimmed video
    try {
      const thumb = await generateThumbnail(trimmedFile);
      setThumbnailUrl(thumb);
    } catch (error) {
      console.error('Failed to generate thumbnail:', error);
    }

    // Create object URL for preview
    const url = URL.createObjectURL(trimmedFile);
    setMetadata(trimmedMetadata);
    onVideoChange(url, trimmedFile, trimmedMetadata);
    setShowTrimModal(false);
    setPendingFile(null);
  }, [generateThumbnail, onVideoChange]);

  // Handle trim modal close
  const handleTrimClose = useCallback(() => {
    setShowTrimModal(false);
    setPendingFile(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (disabled) return;
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect, disabled]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleClick = useCallback(() => {
    if (disabled) return;
    fileInputRef.current?.click();
  }, [disabled]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
    // Reset input value to allow re-selecting the same file
    e.target.value = '';
  }, [handleFileSelect]);

  const handleRemove = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }
    if (thumbnailUrl && thumbnailUrl.startsWith('blob:')) {
      URL.revokeObjectURL(thumbnailUrl);
    }
    setMetadata(null);
    setThumbnailUrl(null);
    onVideoChange(null);
  }, [videoUrl, thumbnailUrl, onVideoChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (videoUrl && videoUrl.startsWith('blob:')) {
        URL.revokeObjectURL(videoUrl);
      }
      if (thumbnailUrl && thumbnailUrl.startsWith('blob:')) {
        URL.revokeObjectURL(thumbnailUrl);
      }
    };
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
  };

  return (
    <Card className={cn(
      "relative overflow-hidden bg-purple-900/20 border-purple-500/30",
      disabled && "opacity-50 cursor-not-allowed",
      className
    )}>
      {/* Header */}
      <div className="px-2 py-1 border-b border-purple-500/20">
        <h3 className="text-[10px] font-semibold text-white flex items-center gap-1">
          <Video className="w-3 h-3 text-purple-400" />
          {title}
        </h3>
      </div>

      {/* Upload Area */}
      <div
        className={cn(
          "relative h-32 lg:h-auto lg:aspect-video flex flex-col items-center justify-center cursor-pointer transition-all",
          !videoUrl && "hover:bg-purple-500/10",
          disabled && "cursor-not-allowed"
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={!videoUrl ? handleClick : undefined}
      >
        {videoUrl ? (
          <>
            <div className="w-full h-full flex items-center justify-center p-2 relative">
              {/* Video preview with thumbnail */}
              <video
                ref={videoRef}
                src={videoUrl}
                className="max-w-full max-h-full object-contain rounded"
                muted
                playsInline
                poster={thumbnailUrl || undefined}
                controls
              />
              
              {/* Metadata overlay */}
              {metadata && (
                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-2 text-[9px]">
                  <div className="flex items-center gap-2 bg-black/60 rounded px-2 py-1">
                    <span className="flex items-center gap-1 text-purple-300">
                      <Maximize className="w-3 h-3" />
                      {metadata.width}x{metadata.height}
                    </span>
                    <span className="flex items-center gap-1 text-purple-300">
                      <Clock className="w-3 h-3" />
                      {formatDuration(metadata.duration)}
                    </span>
                  </div>
                </div>
              )}
            </div>
            
            {/* Remove button */}
            <button
              onClick={handleRemove}
              disabled={disabled}
              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500/80 hover:bg-red-500 flex items-center justify-center transition-colors"
            >
              <X className="w-3 h-3 text-white" />
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 p-4">
            <div className="w-12 h-12 rounded-lg bg-purple-500/20 border border-dashed border-purple-500/40 flex items-center justify-center">
              <Upload className="w-6 h-6 text-purple-400" />
            </div>
            <div className="text-center">
              <p className="text-xs text-purple-200 font-medium">Arraste ou clique</p>
              <p className="text-[10px] text-purple-400 mt-1">
                MP4, WebM ou MOV
              </p>
              <p className="text-[9px] text-purple-500 mt-0.5">
                Máx: {MAX_DIMENSION}px • {MAX_DURATION}s
              </p>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/webm,video/quicktime,video/x-m4v"
          className="hidden"
          onChange={handleInputChange}
          disabled={disabled}
        />
      </div>

      {/* Trim Modal */}
      {pendingFile && (
        <VideoTrimModal
          isOpen={showTrimModal}
          onClose={handleTrimClose}
          videoFile={pendingFile}
          onSave={handleTrimSave}
        />
      )}
    </Card>
  );
};

export default VideoUploadCard;
