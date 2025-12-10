import { useState, useEffect, memo } from 'react';
import { getSignedMediaUrl, parseStorageUrl } from '@/hooks/useSignedUrl';
import { Loader2 } from 'lucide-react';

interface SecureImageProps {
  src: string;
  alt: string;
  isPremium?: boolean;
  className?: string;
  loading?: 'lazy' | 'eager';
  onClick?: () => void;
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
  onClick?: () => void;
}

// Cache for signed URLs at component level
const signedUrlCache = new Map<string, string>();
const lqipCache = new Map<string, string>();

// Generate LQIP URL by adding transform params for tiny image
const generateLQIPUrl = (signedUrl: string): string => {
  try {
    const url = new URL(signedUrl);
    // Add Supabase image transform for tiny placeholder (20px width)
    url.searchParams.set('width', '20');
    url.searchParams.set('quality', '20');
    return url.toString();
  } catch {
    return signedUrl;
  }
};

export const SecureImage = memo(({ 
  src, 
  alt, 
  isPremium = false, 
  className = '', 
  loading = 'lazy',
  onClick 
}: SecureImageProps) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [lqipUrl, setLqipUrl] = useState<string | null>(null);
  const [lqipLoaded, setLqipLoaded] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let isMounted = true;
    setImageLoaded(false);
    setLqipLoaded(false);
    
    const loadImage = async () => {
      const parsed = parseStorageUrl(src);
      
      if (!parsed) {
        setSignedUrl(src);
        setLqipUrl(src);
        return;
      }

      // Check cache first
      const cacheKey = src;
      if (signedUrlCache.has(cacheKey)) {
        if (isMounted) {
          const cached = signedUrlCache.get(cacheKey)!;
          setSignedUrl(cached);
          setLqipUrl(lqipCache.get(cacheKey) || generateLQIPUrl(cached));
        }
        return;
      }

      try {
        const url = await getSignedMediaUrl(src);
        if (isMounted) {
          const lqip = generateLQIPUrl(url);
          signedUrlCache.set(cacheKey, url);
          lqipCache.set(cacheKey, lqip);
          setSignedUrl(url);
          setLqipUrl(lqip);
        }
      } catch (err) {
        console.error('Failed to get signed URL:', err);
        if (isMounted) {
          setSignedUrl(src);
          setLqipUrl(src);
        }
      }
    };

    loadImage();
    
    return () => {
      isMounted = false;
    };
  }, [src, retryCount]);

  const handleLqipLoad = () => {
    setLqipLoaded(true);
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  const handleImageError = () => {
    if (retryCount < 2) {
      signedUrlCache.delete(src);
      lqipCache.delete(src);
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
      {/* Loading spinner - only show if LQIP hasn't loaded */}
      {!lqipLoaded && (
        <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center z-20">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[shimmer_2s_infinite] -translate-x-full" />
          <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 text-primary animate-spin" />
        </div>
      )}
      
      {/* LQIP - Low Quality Image Placeholder (blurred tiny image) */}
      {lqipUrl && !imageLoaded && (
        <img
          src={lqipUrl}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover blur-lg scale-110 z-10"
          onLoad={handleLqipLoad}
        />
      )}
      
      {/* Full quality image */}
      {signedUrl && (
        <img
          src={signedUrl}
          alt={alt}
          className={`w-full h-full object-cover transition-opacity duration-500 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
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
