import { memo } from 'react';
import { Play } from 'lucide-react';

interface VideoThumbnailProps {
  src: string;
  alt: string;
  className?: string;
  onClick?: () => void;
}

/**
 * VideoThumbnail - Ultra-lightweight static placeholder for videos
 * 
 * Shows a gradient with play icon. Video only loads when clicked (in modal).
 * Zero network requests, zero states, zero loading animations.
 */
export const VideoThumbnail = memo(({
  src,
  alt,
  className = '',
  onClick
}: VideoThumbnailProps) => {
  return (
    <div 
      className={`${className} relative overflow-hidden cursor-pointer group`}
      onClick={onClick}
    >
      {/* Static gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-secondary/20 to-primary/20" />
      
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
