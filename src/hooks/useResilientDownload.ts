import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';

interface DownloadOptions {
  url: string;
  filename: string;
  mediaType?: 'image' | 'video';
  timeout?: number;
  onSuccess?: () => void;
  onFallback?: () => void;
  locale?: 'pt' | 'es';
}

interface DownloadState {
  isDownloading: boolean;
  progress: number;
}

/**
 * useResilientDownload - Hook global para download resiliente
 * 
 * 5 métodos de fallback silenciosos:
 * 0. Proxy via Edge Function (NOVO - mais confiável para mobile/iOS)
 * 1. Fetch + ReadableStream (progresso real)
 * 2. Fetch + Cache Buster
 * 3. Anchor tag direta
 * 4. Share API (mobile)
 * 
 * Fallback final: Abre em nova aba
 */
export const useResilientDownload = () => {
  const [state, setState] = useState<DownloadState>({
    isDownloading: false,
    progress: 0
  });
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const isCancelledRef = useRef(false);

  // Helper: Timeout wrapper
  const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), ms)
      )
    ]);
  };

  // Helper: Trigger blob download
  const triggerBlobDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Method 0: Proxy via Edge Function (most reliable for mobile/iOS)
  const proxyDownload = async (url: string, filename: string): Promise<boolean> => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    
    if (!supabaseUrl) {
      throw new Error('Supabase URL not configured');
    }

    const proxyUrl = `${supabaseUrl}/functions/v1/download-proxy?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;
    
    console.debug('[ResilientDownload] Using proxy URL:', proxyUrl.substring(0, 100) + '...');
    
    // Use window.location.href for direct download trigger
    // This works better on iOS Safari than creating anchor tags
    window.location.href = proxyUrl;
    
    // Wait for download to initiate
    await new Promise(r => setTimeout(r, 2000));
    return true;
  };

  // Method 1: Fetch with progress tracking
  const fetchWithProgress = async (url: string, filename: string): Promise<boolean> => {
    abortControllerRef.current = new AbortController();
    
    const response = await fetch(url, { 
      mode: 'cors',
      signal: abortControllerRef.current.signal
    });
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const contentLength = response.headers.get('content-length');
    const total = contentLength ? parseInt(contentLength) : 0;
    
    if (!response.body) {
      // Fallback if no body (older browsers)
      const blob = await response.blob();
      triggerBlobDownload(blob, filename);
      return true;
    }
    
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let received = 0;
    
    while (true) {
      if (isCancelledRef.current) throw new Error('Cancelled');
      
      const { done, value } = await reader.read();
      if (done) break;
      
      chunks.push(value);
      received += value.length;
      
      if (total > 0) {
        const progress = Math.round((received / total) * 100);
        setState(s => ({ ...s, progress }));
      } else {
        // No content-length, show indeterminate progress
        setState(s => ({ ...s, progress: Math.min(s.progress + 5, 95) }));
      }
    }
    
    const blob = new Blob(chunks as BlobPart[]);
    triggerBlobDownload(blob, filename);
    return true;
  };

  // Method 2: Fetch with cache buster
  const fetchWithCacheBuster = async (url: string, filename: string): Promise<boolean> => {
    const busterUrl = `${url}${url.includes('?') ? '&' : '?'}_t=${Date.now()}`;
    
    abortControllerRef.current = new AbortController();
    
    const response = await fetch(busterUrl, { 
      mode: 'cors',
      signal: abortControllerRef.current.signal
    });
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const blob = await response.blob();
    triggerBlobDownload(blob, filename);
    return true;
  };

  // Method 3: Anchor tag direct
  const anchorDownload = (url: string, filename: string): boolean => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return true;
  };

  // Method 4: Share API (mobile)
  const shareApiDownload = async (url: string, filename: string): Promise<boolean> => {
    if (!navigator.share || !navigator.canShare) {
      throw new Error('Share API not supported');
    }
    
    abortControllerRef.current = new AbortController();
    
    const response = await fetch(url, { 
      mode: 'cors',
      signal: abortControllerRef.current.signal
    });
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const blob = await response.blob();
    const file = new File([blob], filename, { type: blob.type });
    
    if (!navigator.canShare({ files: [file] })) {
      throw new Error('Cannot share this file type');
    }
    
    await navigator.share({
      files: [file],
      title: filename,
    });
    
    return true;
  };

  // Fallback: Open in new tab
  const openInNewTab = (url: string, locale: 'pt' | 'es' = 'pt') => {
    window.open(url, '_blank');
    toast.info(
      locale === 'es' 
        ? 'Imagen abierta. Mantén presionado para guardar.'
        : 'Imagem aberta. Segure para salvar.',
      { duration: 5000 }
    );
  };

  // Main download function with silent fallbacks
  const download = useCallback(async (options: DownloadOptions) => {
    const { 
      url, 
      filename, 
      timeout = 15000, // Increased timeout for proxy
      onSuccess,
      onFallback,
      locale = 'pt'
    } = options;
    
    isCancelledRef.current = false;
    setState({ isDownloading: true, progress: 0 });
    
    console.debug('[ResilientDownload] Starting download:', filename);
    console.debug('[ResilientDownload] URL:', url.substring(0, 80) + '...');

    // Method 0: Proxy via Edge Function (most reliable for mobile/iOS)
    try {
      setState(s => ({ ...s, progress: 5 }));
      console.debug('[ResilientDownload] Trying Method 0: Proxy Edge Function');
      await proxyDownload(url, filename);
      console.debug('[ResilientDownload] Method 0 succeeded (proxy redirect)');
      setState({ isDownloading: false, progress: 100 });
      onSuccess?.();
      return;
    } catch (err) {
      if (isCancelledRef.current) {
        setState({ isDownloading: false, progress: 0 });
        return;
      }
      console.debug('[ResilientDownload] Method 0 failed:', (err as Error).message);
    }
    
    // Method 1: Fetch with progress (silent)
    try {
      setState(s => ({ ...s, progress: 15 }));
      console.debug('[ResilientDownload] Trying Method 1: Fetch with progress');
      await withTimeout(fetchWithProgress(url, filename), timeout);
      console.debug('[ResilientDownload] Method 1 succeeded');
      setState({ isDownloading: false, progress: 100 });
      onSuccess?.();
      return;
    } catch (err) {
      if (isCancelledRef.current) {
        setState({ isDownloading: false, progress: 0 });
        return;
      }
      console.debug('[ResilientDownload] Method 1 failed:', (err as Error).message);
    }
    
    // Method 2: Cache buster (silent)
    try {
      setState(s => ({ ...s, progress: 35 }));
      console.debug('[ResilientDownload] Trying Method 2: Cache buster');
      await withTimeout(fetchWithCacheBuster(url, filename), timeout);
      console.debug('[ResilientDownload] Method 2 succeeded');
      setState({ isDownloading: false, progress: 100 });
      onSuccess?.();
      return;
    } catch (err) {
      if (isCancelledRef.current) {
        setState({ isDownloading: false, progress: 0 });
        return;
      }
      console.debug('[ResilientDownload] Method 2 failed:', (err as Error).message);
    }
    
    // Method 3: Anchor tag (silent)
    try {
      setState(s => ({ ...s, progress: 55 }));
      console.debug('[ResilientDownload] Trying Method 3: Anchor tag');
      anchorDownload(url, filename);
      console.debug('[ResilientDownload] Method 3 triggered');
      // Give browser time to initiate download
      await new Promise(r => setTimeout(r, 1500));
      setState({ isDownloading: false, progress: 100 });
      onSuccess?.();
      return;
    } catch (err) {
      console.debug('[ResilientDownload] Method 3 failed:', (err as Error).message);
    }
    
    // Method 4: Share API (mobile, silent)
    if (navigator.share) {
      try {
        setState(s => ({ ...s, progress: 75 }));
        console.debug('[ResilientDownload] Trying Method 4: Share API');
        await withTimeout(shareApiDownload(url, filename), timeout);
        console.debug('[ResilientDownload] Method 4 succeeded');
        setState({ isDownloading: false, progress: 100 });
        onSuccess?.();
        return;
      } catch (err) {
        if (isCancelledRef.current) {
          setState({ isDownloading: false, progress: 0 });
          return;
        }
        console.debug('[ResilientDownload] Method 4 failed:', (err as Error).message);
      }
    }
    
    // Fallback final: Open in new tab
    console.debug('[ResilientDownload] All methods failed, opening in new tab');
    setState(s => ({ ...s, progress: 100 }));
    openInNewTab(url, locale);
    onFallback?.();
    
    setState({ isDownloading: false, progress: 0 });
  }, []);

  // Cancel ongoing download
  const cancel = useCallback(() => {
    console.debug('[ResilientDownload] Cancelling download');
    isCancelledRef.current = true;
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    setState({ isDownloading: false, progress: 0 });
  }, []);

  return {
    isDownloading: state.isDownloading,
    progress: state.progress,
    download,
    cancel
  };
};

export default useResilientDownload;
