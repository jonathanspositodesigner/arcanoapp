import { useState, useEffect, memo } from 'react';
import { getSignedMediaUrl, parseStorageUrl } from '@/hooks/useSignedUrl';
import { Skeleton } from '@/components/ui/skeleton';

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

  useEffect(() => {
    let isMounted = true;
    let retryCount = 0;
    const maxRetries = 2;
    
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

      const attemptLoad = async (): Promise<void> => {
        try {
          const url = await getSignedMediaUrl(src, isPremium);
          if (isMounted) {
            signedUrlCache.set(cacheKey, url);
            setSignedUrl(url);
            setIsLoading(false);
          }
        } catch (err) {
          console.error('Failed to get signed URL:', err);
          if (retryCount < maxRetries && isMounted) {
            retryCount++;
            await new Promise(resolve => setTimeout(resolve, 500 * retryCount));
            return attemptLoad();
          }
          if (isMounted) {
            setError(true);
            setIsLoading(false);
          }
        }
      };

      await attemptLoad();
    };

    loadImage();
    
    return () => {
      isMounted = false;
    };
  }, [src, isPremium]);

  if (isLoading) {
    return <Skeleton className={`${className} bg-muted`} />;
  }

  if (error || !signedUrl) {
    return (
      <div className={`${className} bg-muted flex items-center justify-center`}>
        <span className="text-muted-foreground text-xs">Erro ao carregar</span>
      </div>
    );
  }

  return (
    <img
      src={signedUrl}
      alt={alt}
      className={className}
      loading={loading}
      onClick={onClick}
      onError={() => setError(true)}
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

  useEffect(() => {
    let isMounted = true;
    let retryCount = 0;
    const maxRetries = 2;
    
    const loadVideo = async () => {
      // Check if URL needs signing
      const parsed = parseStorageUrl(src);
      
      if (!parsed) {
        setSignedUrl(src);
        setIsLoading(false);
        return;
      }

      // Check cache
      const cacheKey = src;
      if (signedUrlCache.has(cacheKey)) {
        if (isMounted) {
          setSignedUrl(signedUrlCache.get(cacheKey)!);
          setIsLoading(false);
        }
        return;
      }

      const attemptLoad = async (): Promise<void> => {
        try {
          const url = await getSignedMediaUrl(src, isPremium);
          if (isMounted) {
            signedUrlCache.set(cacheKey, url);
            setSignedUrl(url);
            setIsLoading(false);
          }
        } catch (err) {
          console.error('Failed to get signed URL:', err);
          if (retryCount < maxRetries && isMounted) {
            retryCount++;
            await new Promise(resolve => setTimeout(resolve, 500 * retryCount));
            return attemptLoad();
          }
          if (isMounted) {
            setError(true);
            setIsLoading(false);
          }
        }
      };

      await attemptLoad();
    };

    loadVideo();
    
    return () => {
      isMounted = false;
    };
  }, [src, isPremium]);

  if (isLoading) {
    return <Skeleton className={`${className} bg-muted`} />;
  }

  if (error || !signedUrl) {
    return (
      <div className={`${className} bg-muted flex items-center justify-center`}>
        <span className="text-muted-foreground text-xs">Erro ao carregar</span>
      </div>
    );
  }

  return (
    <video
      src={signedUrl}
      className={className}
      autoPlay={autoPlay}
      muted={muted}
      loop={loop}
      playsInline={playsInline}
      controls={controls}
      onClick={onClick}
      onError={() => setError(true)}
    />
  );
});

SecureVideo.displayName = 'SecureVideo';

// Helper function to get signed URL for downloads
export const getSecureDownloadUrl = async (
  url: string, 
  isPremium: boolean = false
): Promise<string> => {
  return getSignedMediaUrl(url, isPremium);
};