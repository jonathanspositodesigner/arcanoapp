import { useState, useEffect, useRef, useCallback } from 'react';
import { ImageIcon, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { compressToMaxDimension } from '@/hooks/useImageOptimizer';

interface ResilientImageProps {
  src: string;
  originalSrc?: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  timeout?: number;
  maxRetries?: number;
  compressOnFailure?: boolean;
  showDownloadOnFail?: boolean;
  downloadFileName?: string;
  onLoadSuccess?: () => void;
  onDownloadClick?: () => void;
  locale?: 'pt' | 'es';
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
}

/**
 * ResilientImage - Auto-recovery image component for mobile compatibility
 * 
 * Strategy:
 * 1. Try loading original URL
 * 2. Try cache buster (?_t=timestamp)
 * 3. Fetch as blob → compress to 2000px webp → display
 * 4. Show friendly fallback with download button
 */
export const ResilientImage = ({
  src,
  originalSrc,
  alt,
  className,
  style,
  timeout = 8000,
  maxRetries = 3,
  compressOnFailure = true,
  showDownloadOnFail = false,
  downloadFileName,
  onLoadSuccess,
  onDownloadClick,
  locale = 'pt',
  objectFit = 'cover'
}: ResilientImageProps) => {
  const [attempt, setAttempt] = useState(1);
  const [currentSrc, setCurrentSrc] = useState(src);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isFailed, setIsFailed] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const objectUrlRef = useRef<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup ObjectURLs on unmount
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Reset when src changes
  useEffect(() => {
    // Clear previous ObjectURL if exists
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    
    setAttempt(1);
    setCurrentSrc(src);
    setIsLoaded(false);
    setIsFailed(false);
    setIsCompressing(false);
  }, [src]);

  // Timeout handler
  useEffect(() => {
    if (isLoaded || isFailed || isCompressing) return;

    timeoutRef.current = setTimeout(() => {
      if (!isLoaded && !isFailed) {
        console.debug(`[ResilientImage] Timeout on attempt ${attempt} for: ${src.substring(0, 50)}...`);
        handleRetry();
      }
    }, timeout);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [attempt, isLoaded, isFailed, isCompressing, timeout, src]);

  const handleRetry = useCallback(async () => {
    if (attempt >= maxRetries) {
      console.debug('[ResilientImage] All attempts exhausted, showing fallback');
      setIsFailed(true);
      return;
    }

    const nextAttempt = attempt + 1;
    setAttempt(nextAttempt);

    if (nextAttempt === 2) {
      // Cache buster
      const buster = `${src}${src.includes('?') ? '&' : '?'}_t=${Date.now()}`;
      console.debug('[ResilientImage] Attempt 2: cache buster');
      setCurrentSrc(buster);
    } else if (nextAttempt === 3 && compressOnFailure) {
      // Fetch + compress
      console.debug('[ResilientImage] Attempt 3: fetch + compress to 2000px webp');
      setIsCompressing(true);
      
      try {
        abortControllerRef.current = new AbortController();
        
        const response = await fetch(src, { 
          mode: 'cors',
          signal: abortControllerRef.current.signal
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const blob = await response.blob();
        const file = new File([blob], 'temp.webp', { type: blob.type });
        
        // Compress to 2000px max dimension
        const { file: compressed } = await compressToMaxDimension(file, 2000);
        
        // Clean up previous ObjectURL
        if (objectUrlRef.current) {
          URL.revokeObjectURL(objectUrlRef.current);
        }
        
        const compressedUrl = URL.createObjectURL(compressed);
        objectUrlRef.current = compressedUrl;
        setCurrentSrc(compressedUrl);
        console.debug('[ResilientImage] Compressed image created successfully');
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          console.debug('[ResilientImage] Fetch aborted');
          return;
        }
        console.error('[ResilientImage] Error in fetch/compress:', err);
        setIsFailed(true);
      } finally {
        setIsCompressing(false);
      }
    }
  }, [attempt, maxRetries, src, compressOnFailure]);

  const handleDownload = useCallback(() => {
    if (onDownloadClick) {
      onDownloadClick();
    } else {
      // Default download if no custom callback
      const link = document.createElement('a');
      link.href = originalSrc || src;
      link.download = downloadFileName || `image-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [onDownloadClick, originalSrc, src, downloadFileName]);

  const handleLoad = useCallback(() => {
    console.debug('[ResilientImage] Image loaded successfully on attempt', attempt);
    setIsLoaded(true);
    onLoadSuccess?.();
  }, [attempt, onLoadSuccess]);

  const handleError = useCallback(() => {
    if (!isLoaded && !isFailed) {
      console.debug('[ResilientImage] Load error, triggering retry');
      handleRetry();
    }
  }, [isLoaded, isFailed, handleRetry]);

  // Fallback UI when all attempts fail
  if (isFailed && showDownloadOnFail) {
    return (
      <div className={cn("relative w-full h-full", className)} style={style}>
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg">
          <div className="text-center p-6 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-white/10 flex items-center justify-center">
              <ImageIcon className="w-8 h-8 text-white/60" />
            </div>
            <div className="space-y-1">
              <p className="text-white font-medium">
                {locale === 'es' ? 'Vista previa no disponible' : 'Visualização indisponível'}
              </p>
              <p className="text-white/60 text-sm">
                {locale === 'es' ? '¡Tu imagen está lista!' : 'Sua imagem está pronta!'}
              </p>
            </div>
            <Button
              onClick={handleDownload}
              size="sm"
              className="bg-gradient-to-r from-fuchsia-500 to-purple-600 hover:from-fuchsia-600 hover:to-purple-700"
            >
              <Download className="w-4 h-4 mr-2" />
              {locale === 'es' ? 'Descargar HD' : 'Baixar em HD'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Simple fallback (no download button)
  if (isFailed) {
    return (
      <div className={cn("relative w-full h-full", className)} style={style}>
        <img
          src="/placeholder.svg"
          alt={alt}
          className="w-full h-full object-cover"
          draggable={false}
        />
      </div>
    );
  }

  return (
    <div className={cn("relative w-full h-full overflow-hidden", className)} style={style}>
      {/* Loading indicator during compression */}
      {isCompressing && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-10 rounded-lg">
          <div className="text-center space-y-2">
            <div className="w-8 h-8 mx-auto border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <p className="text-white/80 text-xs">
              {locale === 'es' ? 'Optimizando...' : 'Otimizando...'}
            </p>
          </div>
        </div>
      )}
      
      {/* Loading skeleton while image loads */}
      {!isLoaded && !isCompressing && (
        <div className="absolute inset-0 bg-gray-800/50 animate-pulse rounded-lg" />
      )}
      
      <img
        src={currentSrc}
        alt={alt}
        className="w-full h-full object-cover"
        style={{
          objectFit,
          opacity: isLoaded ? 1 : 0,
          transition: 'opacity 0.3s ease-in-out',
          display: 'block'
        }}
        onLoad={handleLoad}
        onError={handleError}
        draggable={false}
      />
    </div>
  );
};

export default ResilientImage;
