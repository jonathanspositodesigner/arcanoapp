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

export const SecureImage = memo(({ 
  src, 
  alt, 
  isPremium = false, 
  className = '', 
  loading = 'lazy',
  onClick 
}: SecureImageProps) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let isMounted = true;
    
    const loadImage = async () => {
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

  if (isLoading) {
    return (
      <div className={`${className} bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center relative overflow-hidden`}>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[shimmer_2s_infinite] -translate-x-full" 
             style={{ animation: 'shimmer 2s infinite' }} />
        <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 text-primary animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className} bg-muted flex items-center justify-center`}>
        <span className="text-muted-foreground text-xs">Erro ao carregar</span>
      </div>
    );
  }

  return (
    <img
      src={signedUrl || src}
      alt={alt}
      className={className}
      loading={loading}
      onClick={onClick}
      onError={handleImageError}
    />
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
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let isMounted = true;
    
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

  if (isLoading) {
    return (
      <div className={`${className} bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center relative overflow-hidden`}>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[shimmer_2s_infinite] -translate-x-full" 
             style={{ animation: 'shimmer 2s infinite' }} />
        <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 text-primary animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className} bg-muted flex items-center justify-center`}>
        <span className="text-muted-foreground text-xs">Erro ao carregar</span>
      </div>
    );
  }

  return (
    <video
      src={signedUrl || src}
      className={className}
      autoPlay={autoPlay}
      muted={muted}
      loop={loop}
      playsInline={playsInline}
      controls={controls}
      onClick={onClick}
      onError={handleVideoError}
    />
  );
});

SecureVideo.displayName = 'SecureVideo';

// Helper function to get signed URL for downloads
export const getSecureDownloadUrl = async (url: string): Promise<string> => {
  return getSignedMediaUrl(url);
};
