import { uploadToStorage } from '@/hooks/useStorageUpload';

const THUMBNAIL_TIMEOUT_MS = 15000; // 15 seconds timeout

/**
 * Generates a lightweight WebP thumbnail from video's first frame
 * With timeout protection to prevent infinite hanging
 * 
 * @param videoSource - Either a File object or a URL string
 * @param targetWidth - Target width for thumbnail (default 512)
 * @returns Blob of the generated thumbnail
 */
export async function generateVideoThumbnail(
  videoSource: File | string,
  targetWidth: number = 512
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;
    video.preload = 'metadata';
    
    let timeoutId: NodeJS.Timeout | null = null;
    let isResolved = false;
    
    // Handle cleanup
    const cleanup = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      video.pause();
      video.src = '';
      video.load();
      if (typeof videoSource !== 'string') {
        URL.revokeObjectURL(video.src);
      }
    };

    const handleError = (message: string) => {
      if (isResolved) return;
      isResolved = true;
      cleanup();
      reject(new Error(message));
    };

    // Setup timeout to prevent infinite hanging
    timeoutId = setTimeout(() => {
      handleError(`Timeout: vídeo não carregou em ${THUMBNAIL_TIMEOUT_MS / 1000}s`);
    }, THUMBNAIL_TIMEOUT_MS);

    video.onerror = () => {
      handleError('Falha ao carregar vídeo para gerar thumbnail');
    };

    video.onstalled = () => {
      // Video stalled - might recover, but log it
      console.warn('Video loading stalled, waiting...');
    };

    video.onabort = () => {
      handleError('Carregamento do vídeo foi abortado');
    };

    video.onloadeddata = () => {
      // Seek to 0.1s for a better frame (not black screen)
      video.currentTime = 0.1;
    };

    video.onseeked = () => {
      if (isResolved) return;
      
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          handleError('Falha ao obter contexto do canvas');
          return;
        }

        // Calculate dimensions maintaining aspect ratio
        const aspectRatio = video.videoWidth / video.videoHeight;
        const width = targetWidth;
        const height = Math.round(width / aspectRatio);

        canvas.width = width;
        canvas.height = height;

        // Draw the video frame
        ctx.drawImage(video, 0, 0, width, height);

        // Convert to WebP blob (quality 0.8 for good balance)
        canvas.toBlob(
          (blob) => {
            if (isResolved) return;
            isResolved = true;
            cleanup();
            
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Falha ao gerar blob da thumbnail'));
            }
          },
          'image/webp',
          0.8
        );
      } catch (err) {
        handleError(err instanceof Error ? err.message : 'Erro desconhecido');
      }
    };

    // Set source
    if (typeof videoSource === 'string') {
      video.src = videoSource;
    } else {
      video.src = URL.createObjectURL(videoSource);
    }

    video.load();
  });
}

/**
 * Generates and uploads a video thumbnail to storage
 * 
 * @param videoFile - The video File object
 * @param bucket - Storage bucket name (default 'prompts-cloudinary')
 * @returns The public URL of the uploaded thumbnail, or null on failure
 */
export async function generateAndUploadThumbnail(
  videoFile: File,
  bucket: string = 'prompts-cloudinary'
): Promise<string | null> {
  try {
    // Generate thumbnail blob from video
    const thumbnailBlob = await generateVideoThumbnail(videoFile);
    
    // Create a File object from the blob
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const thumbnailFile = new File(
      [thumbnailBlob], 
      `thumb_${timestamp}_${randomId}.webp`,
      { type: 'image/webp' }
    );

    // Upload to storage - use 'thumbnails' folder directly, bucket handles the rest
    const uploadResult = await uploadToStorage(thumbnailFile, 'thumbnails');
    
    if (uploadResult.success && uploadResult.url) {
      return uploadResult.url;
    }
    
    console.error('Thumbnail upload failed:', uploadResult.error);
    return null;
  } catch (error) {
    console.error('Error generating/uploading thumbnail:', error);
    return null;
  }
}

/**
 * Generates thumbnail from an existing video URL (for backfill)
 * 
 * @param videoUrl - URL of the existing video
 * @param bucket - Storage bucket name
 * @returns The public URL of the uploaded thumbnail, or null on failure
 */
export async function generateThumbnailFromUrl(
  videoUrl: string,
  bucket: string = 'prompts-cloudinary'
): Promise<string | null> {
  try {
    // Generate thumbnail blob from video URL
    const thumbnailBlob = await generateVideoThumbnail(videoUrl);
    
    // Create a File object from the blob
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const thumbnailFile = new File(
      [thumbnailBlob], 
      `thumb_${timestamp}_${randomId}.webp`,
      { type: 'image/webp' }
    );

    // Upload to storage - use 'thumbnails' folder directly
    const uploadResult = await uploadToStorage(thumbnailFile, 'thumbnails');
    
    if (uploadResult.success && uploadResult.url) {
      return uploadResult.url;
    }
    
    console.error('Thumbnail upload failed:', uploadResult.error);
    return null;
  } catch (error) {
    console.error('Error generating thumbnail from URL:', error);
    return null;
  }
}

/**
 * Optimizes an image from URL and uploads as thumbnail (512px, WebP, ~30KB)
 * Used to convert large reference images into lightweight thumbnails
 * 
 * @param imageUrl - URL of the source image
 * @param targetWidth - Target width for thumbnail (default 512)
 * @returns The public URL of the optimized thumbnail, or null on failure
 */
export async function optimizeAndUploadThumbnail(
  imageUrl: string,
  targetWidth: number = 512
): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    const timeoutId = setTimeout(() => {
      console.error('Timeout loading image for optimization');
      resolve(null);
    }, 15000);

    img.onload = async () => {
      clearTimeout(timeoutId);
      
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          console.error('Failed to get canvas context');
          resolve(null);
          return;
        }

        // Calculate dimensions maintaining aspect ratio
        const aspectRatio = img.width / img.height;
        const width = targetWidth;
        const height = Math.round(width / aspectRatio);

        canvas.width = width;
        canvas.height = height;

        // Draw the image
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to WebP blob (quality 0.8 for good balance ~30KB)
        canvas.toBlob(
          async (blob) => {
            if (!blob) {
              console.error('Failed to create blob from canvas');
              resolve(null);
              return;
            }

            // Create a File object from the blob
            const timestamp = Date.now();
            const randomId = Math.random().toString(36).substring(2, 8);
            const thumbnailFile = new File(
              [blob], 
              `thumb_${timestamp}_${randomId}.webp`,
              { type: 'image/webp' }
            );

            // Upload to storage
            const uploadResult = await uploadToStorage(thumbnailFile, 'thumbnails');
            
            if (uploadResult.success && uploadResult.url) {
              resolve(uploadResult.url);
            } else {
              console.error('Thumbnail upload failed:', uploadResult.error);
              resolve(null);
            }
          },
          'image/webp',
          0.8
        );
      } catch (error) {
        console.error('Error optimizing image:', error);
        resolve(null);
      }
    };

    img.onerror = () => {
      clearTimeout(timeoutId);
      console.error('Failed to load image for optimization');
      resolve(null);
    };

    img.src = imageUrl;
  });
}

// Helper to check if a URL is a video
export function isVideoUrl(url: string): boolean {
  const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.m4v'];
  return videoExtensions.some(ext => url.toLowerCase().includes(ext));
}
