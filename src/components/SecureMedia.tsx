import { useState, useEffect, memo, useRef } from 'react';
import { Loader2 } from 'lucide-react';

type ImageSize = 'thumbnail' | 'preview' | 'full';

interface SecureImageProps {
  src: string;
  alt: string;
  isPremium?: boolean;
  className?: string;
  loading?: 'lazy' | 'eager';
  onClick?: () => void;
  size?: ImageSize;
}

interface SecureVideoProps {
  src: string;
  isPremium?: boolean;
  className?: string;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  playsInline?: boolean;
  controls?: boolean;
  preload?: 'none' | 'metadata' | 'auto';
  onClick?: () => void;
}

// SIMPLIFIED: All URLs are public now - NO edge function calls = NO COSTS
export const SecureImage = memo(({ 
  src, 
  alt, 
  isPremium = false, 
  className = '', 
  loading = 'lazy',
  onClick,
  size = 'thumbnail'
}: SecureImageProps) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const imgRef = useRef<HTMLImageElement>(null);

  // Reset state when src changes
  useEffect(() => {
    setImageLoaded(false);
    setError(false);
    setRetryCount(0);
  }, [src]);

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  const handleImageError = () => {
    // Only retry once to avoid long waits for missing files
    if (retryCount < 1) {
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
      }, 500);
    } else {
      setError(true);
    }
  };

  if (error) {
    return (
      <div className={`${className} bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center`}>
        <span className="text-muted-foreground text-xs text-center px-2">Arquivo não encontrado</span>
      </div>
    );
  }

  return (
    <div className={`${className} relative overflow-hidden`}>
      {/* Blur placeholder / loading state */}
      {!imageLoaded && (
        <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center z-10">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[shimmer_2s_infinite] -translate-x-full" />
          <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 text-primary animate-spin" />
        </div>
      )}
      
      {/* Actual image - use src directly, no signed URL needed */}
      <img
        ref={imgRef}
        key={`${src}-${retryCount}`}
        src={src}
        alt={alt}
        className={`w-full h-full object-cover transition-all duration-500 ${
          imageLoaded ? 'blur-0 opacity-100' : 'blur-md opacity-0'
        }`}
        loading={loading}
        onClick={onClick}
        onLoad={handleImageLoad}
        onError={handleImageError}
      />
    </div>
  );
});

SecureImage.displayName = 'SecureImage';

export const SecureVideo = memo(({
  src,
  isPremium = false,
  className = '',
  autoPlay = false,
  muted = false,
  loop = false,
  playsInline = false,
  controls = false,
  preload = 'metadata',
  onClick
}: SecureVideoProps) => {
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Reset state when src changes
  useEffect(() => {
    setVideoLoaded(false);
    setError(false);
    setRetryCount(0);
  }, [src]);

  // Check if video is already loaded from cache
  useEffect(() => {
    if (videoRef.current && !videoLoaded) {
      if (videoRef.current.readyState >= 1) {
        setVideoLoaded(true);
      }
    }
  }, [videoLoaded]);

  const handleVideoLoad = () => {
    setVideoLoaded(true);
  };

  const handleVideoError = () => {
    // Only retry once to avoid long waits for missing files
    if (retryCount < 1) {
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
      }, 500);
    } else {
      setError(true);
    }
  };

  if (error) {
    return (
      <div className={`${className} bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center`}>
        <span className="text-muted-foreground text-xs text-center px-2">Arquivo não encontrado</span>
      </div>
    );
  }

  return (
    <div className={`${className} relative overflow-hidden`}>
      {/* Blur placeholder / loading state */}
      {!videoLoaded && (
        <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center z-10">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[shimmer_2s_infinite] -translate-x-full" />
          <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 text-primary animate-spin" />
        </div>
      )}
      
      {/* Actual video - use src directly, no signed URL needed */}
      <video
        ref={videoRef}
        key={`${src}-${retryCount}`}
        src={src}
        className={`w-full h-full object-cover transition-all duration-500 ${
          videoLoaded ? 'blur-0 opacity-100' : 'blur-md opacity-0'
        }`}
        preload={preload}
        autoPlay={autoPlay}
        muted={muted}
        loop={loop}
        playsInline={playsInline}
        controls={controls}
        onClick={onClick}
        onLoadedData={handleVideoLoad}
        onLoadedMetadata={handleVideoLoad}
        onCanPlay={handleVideoLoad}
        onError={handleVideoError}
      />
    </div>
  );
});

SecureVideo.displayName = 'SecureVideo';

// Helper function to get URL for downloads - just return the original URL
export const getSecureDownloadUrl = async (url: string): Promise<string> => {
  return url;
};
