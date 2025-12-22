import { memo, useState } from 'react';
import { Play, Loader2 } from 'lucide-react';
import { getSignedMediaUrl, parseStorageUrl } from '@/hooks/useSignedUrl';

interface VideoThumbnailProps {
  src: string;
  alt: string;
  className?: string;
  onClick?: () => void;
}

// Check if URL is from Cloudinary (doesn't need signed URLs)
const isCloudinaryUrl = (url: string): boolean => {
  return url.includes('cloudinary.com') || url.includes('res.cloudinary.com');
};

// ALL PUBLIC BUCKETS
const PUBLIC_BUCKETS = new Set<string>([
  'prompts-cloudinary',
  'artes-cloudinary',
  'pack-covers',
  'email-assets'
]);

// Check if URL is from a public Supabase bucket
const isPublicBucketUrl = (url: string): boolean => {
  const parsed = parseStorageUrl(url);
  return parsed !== null && PUBLIC_BUCKETS.has(parsed.bucket);
};

// Get video poster URL - for now just shows a gradient placeholder
// In the future, this could be a generated thumbnail image
const getVideoPosterUrl = (videoUrl: string): string | null => {
  // If it's a Cloudinary URL, we could use Cloudinary's video thumbnail feature
  if (isCloudinaryUrl(videoUrl)) {
    // Replace video extension with jpg and add transformation
    return videoUrl.replace(/\.(mp4|webm|mov|avi|mkv|m4v)$/i, '.jpg');
  }
  return null;
};

/**
 * VideoThumbnail - A lightweight placeholder for videos in grids
 * 
 * Instead of loading the actual video with preload="metadata",
 * this shows a gradient placeholder with a play icon.
 * The actual video only loads when clicked (in the modal).
 * 
 * This drastically reduces:
 * - Network requests (no video metadata fetches)
 * - Bandwidth usage
 * - Memory usage
 * - Initial render time
 */
export const VideoThumbnail = memo(({
  src,
  alt,
  className = '',
  onClick
}: VideoThumbnailProps) => {
  const [posterUrl] = useState(() => getVideoPosterUrl(src));
  const [posterLoaded, setPosterLoaded] = useState(false);
  const [posterError, setPosterError] = useState(false);

  return (
    <div 
      className={`${className} relative overflow-hidden cursor-pointer group`}
      onClick={onClick}
    >
      {/* Gradient background placeholder */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-secondary to-primary/10" />
      
      {/* Try to load poster if available */}
      {posterUrl && !posterError && (
        <img
          src={posterUrl}
          alt={alt}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
            posterLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          loading="lazy"
          onLoad={() => setPosterLoaded(true)}
          onError={() => setPosterError(true)}
        />
      )}
      
      {/* Video icon pattern */}
      <div className="absolute inset-0 flex items-center justify-center">
        {/* Pulsing circle background */}
        <div className="absolute w-20 h-20 rounded-full bg-black/20 animate-pulse" />
        
        {/* Play button */}
        <div className="relative bg-black/60 rounded-full p-4 group-hover:bg-black/80 group-hover:scale-110 transition-all duration-300 shadow-lg">
          <Play className="h-8 w-8 text-white" fill="white" />
        </div>
      </div>
      
      {/* Video indicator badge */}
      <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
        <Play className="h-3 w-3" />
        Vídeo
      </div>
    </div>
  );
});

VideoThumbnail.displayName = 'VideoThumbnail';

export default VideoThumbnail;
