import { useState, useEffect, memo, useRef } from 'react';
import { getSignedMediaUrl, parseStorageUrl } from '@/hooks/useSignedUrl';
import { preloadCache, getCachedSignedUrl } from '@/hooks/useImagePreloader';
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

// Check if URL is from Cloudinary (doesn't need signed URLs)
const isCloudinaryUrl = (url: string): boolean => {
  return url.includes('cloudinary.com') || url.includes('res.cloudinary.com');
};

// ALL PUBLIC BUCKETS - avoids edge function calls = saves money
// CRITICAL: Must match the list in useSignedUrl.ts!
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

// Cloudinary URLs are already optimized at upload time.
const getOptimizedCloudinaryUrl = (url: string, _size: ImageSize = 'full'): string => {
  return url;
};

// Use shared preload cache
const signedUrlCache = preloadCache;

export const SecureImage = memo(({ 
  src, 
  alt, 
  isPremium = false, 
  className = '', 
  loading = 'lazy',
  onClick,
  size = 'thumbnail'
}: SecureImageProps) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    let isMounted = true;
    setImageLoaded(false);
    
    const loadImage = async () => {
      // Check if URL is from Cloudinary - use directly (no signing needed)
      if (isCloudinaryUrl(src)) {
        setSignedUrl(getOptimizedCloudinaryUrl(src, size));
        setIsLoading(false);
        return;
      }

      // Check if URL is from a public bucket - use directly (no signing needed = no edge function call)
      if (isPublicBucketUrl(src)) {
        setSignedUrl(src);
        setIsLoading(false);
        return;
      }
      
      // Check if URL needs signing (is a Supabase storage URL)
      const parsed = parseStorageUrl(src);
      
      if (!parsed) {
        // Not a Supabase storage URL, use directly
        setSignedUrl(src);
        setIsLoading(false);
        return;
      }

      // Check cache first
      const cacheKey = src;
      if (signedUrlCache.has(cacheKey)) {
        if (isMounted) {
          setSignedUrl(signedUrlCache.get(cacheKey)!);
          setIsLoading(false);
        }
        return;
      }

      try {
        const url = await getSignedMediaUrl(src);
        if (isMounted) {
          signedUrlCache.set(cacheKey, url);
          setSignedUrl(url);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Failed to get signed URL:', err);
        if (isMounted) {
          // Use original URL as fallback
          setSignedUrl(src);
          setIsLoading(false);
        }
      }
    };

    loadImage();
    
    return () => {
      isMounted = false;
    };
  }, [src, retryCount]);

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  const handleImageError = () => {
    if (retryCount < 2) {
      // Clear cache and retry
      signedUrlCache.delete(src);
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
      }, 1000);
    } else {
      setError(true);
    }
  };

  if (error) {
    return (
      <div className={`${className} bg-muted flex items-center justify-center`}>
        <span className="text-muted-foreground text-xs">Erro ao carregar</span>
      </div>
    );
  }

  return (
    <div className={`${className} relative overflow-hidden`}>
      {/* Blur placeholder / loading state */}
      {(!imageLoaded || isLoading) && (
        <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center z-10">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[shimmer_2s_infinite] -translate-x-full" />
          <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 text-primary animate-spin" />
        </div>
      )}
      
      {/* Actual image with blur transition */}
      {signedUrl && (
        <img
          ref={imgRef}
          src={signedUrl}
          alt={alt}
          className={`w-full h-full object-cover transition-all duration-500 ${
            imageLoaded ? 'blur-0 opacity-100' : 'blur-md opacity-0'
          }`}
          loading={loading}
          onClick={onClick}
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      )}
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
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let isMounted = true;
    setVideoLoaded(false);
    
    const loadVideo = async () => {
      // Check if URL is from Cloudinary - use directly (no signing needed)
      if (isCloudinaryUrl(src)) {
        setSignedUrl(getOptimizedCloudinaryUrl(src, 'preview'));
        setIsLoading(false);
        return;
      }

      // Check if URL is from a public bucket - use directly (no signing needed = no edge function call)
      if (isPublicBucketUrl(src)) {
        setSignedUrl(src);
        setIsLoading(false);
        return;
      }
      
      const parsed = parseStorageUrl(src);
      
      if (!parsed) {
        setSignedUrl(src);
        setIsLoading(false);
        return;
      }

      const cacheKey = src;
      if (signedUrlCache.has(cacheKey)) {
        if (isMounted) {
          setSignedUrl(signedUrlCache.get(cacheKey)!);
          setIsLoading(false);
        }
        return;
      }

      try {
        const url = await getSignedMediaUrl(src);
        if (isMounted) {
          signedUrlCache.set(cacheKey, url);
          setSignedUrl(url);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Failed to get signed URL:', err);
        if (isMounted) {
          setSignedUrl(src);
          setIsLoading(false);
        }
      }
    };

    loadVideo();
    
    return () => {
      isMounted = false;
    };
  }, [src, retryCount]);

  const handleVideoLoad = () => {
    setVideoLoaded(true);
  };

  const handleVideoError = () => {
    if (retryCount < 2) {
      signedUrlCache.delete(src);
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
      }, 1000);
    } else {
      setError(true);
    }
  };

  if (error) {
    return (
      <div className={`${className} bg-muted flex items-center justify-center`}>
        <span className="text-muted-foreground text-xs">Erro ao carregar</span>
      </div>
    );
  }

  return (
    <div className={`${className} relative overflow-hidden`}>
      {/* Blur placeholder / loading state */}
      {(!videoLoaded || isLoading) && (
        <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center z-10">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[shimmer_2s_infinite] -translate-x-full" />
          <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 text-primary animate-spin" />
        </div>
      )}
      
      {/* Actual video with blur transition */}
      {signedUrl && (
        <video
          src={signedUrl}
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
          onError={handleVideoError}
        />
      )}
    </div>
  );
});

SecureVideo.displayName = 'SecureVideo';

// Helper function to get signed URL for downloads
export const getSecureDownloadUrl = async (url: string): Promise<string> => {
  return getSignedMediaUrl(url);
};
