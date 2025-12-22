import { memo, useState } from 'react';
import { Play, Video } from 'lucide-react';
import { SecureImage } from '@/components/SecureMedia';

interface VideoThumbnailProps {
  src: string;
  alt: string;
  thumbnailUrl?: string;
  className?: string;
  onClick?: () => void;
}

/**
 * VideoThumbnail - Lightweight video placeholder for grids
 * 
 * If thumbnailUrl is provided, shows the real thumbnail (first frame).
 * Otherwise shows a static gradient placeholder.
 * Video only loads when clicked (in modal).
 */
export const VideoThumbnail = memo(({
  src,
  alt,
  thumbnailUrl,
  className = '',
  onClick
}: VideoThumbnailProps) => {
  const [thumbnailError, setThumbnailError] = useState(false);

  // If thumbnail failed to load, show video placeholder instead of error
  const showPlaceholder = !thumbnailUrl || thumbnailError;

  return (
    <div 
      className={`${className} relative overflow-hidden cursor-pointer group`}
      onClick={onClick}
    >
      {showPlaceholder ? (
        // Static gradient fallback with video icon
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-secondary/20 to-primary/20 flex items-center justify-center">
          <Video className="h-10 w-10 text-primary/40" />
        </div>
      ) : (
        // Real thumbnail - with error handling
        <div className="w-full h-full" onError={() => setThumbnailError(true)}>
          <SecureImage
            src={thumbnailUrl}
            alt={alt}
            isPremium={false}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        </div>
      )}
      
      {/* Centered play button */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-black/60 rounded-full p-4 group-hover:bg-black/80 group-hover:scale-110 transition-all duration-300 shadow-lg">
          <Play className="h-8 w-8 text-white" fill="white" />
        </div>
      </div>
      
      {/* Video badge */}
      <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
        <Play className="h-3 w-3" />
        Vídeo
      </div>
    </div>
  );
});

VideoThumbnail.displayName = 'VideoThumbnail';

export default VideoThumbnail;
