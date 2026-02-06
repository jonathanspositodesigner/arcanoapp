import imageCompression from 'browser-image-compression';

// Maximum dimension (width or height) allowed for AI tools
export const MAX_AI_DIMENSION = 2000;

export interface ImageDimensionValidation {
  valid: boolean;
  width: number;
  height: number;
  error?: string;
}

export interface OptimizationResult {
  file: File;
  originalSize: number;
  optimizedSize: number;
  savings: number;
  savingsPercent: number;
}

export interface OptimizationOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  useWebWorker?: boolean;
}

const DEFAULT_OPTIONS: OptimizationOptions = {
  maxSizeMB: 1,
  maxWidthOrHeight: 2048,
  useWebWorker: true,
};

// AI Tools optimization config - safe limit for RunningHub VRAM
const AI_OPTIMIZATION_CONFIG = {
  maxSizeMB: 2,
  maxWidthOrHeight: 1536, // Prevents VRAM overflow on RunningHub
  useWebWorker: true,
  fileType: 'image/webp' as const,
  initialQuality: 0.9,
};

export const optimizeImage = async (
  file: File,
  options: OptimizationOptions = {}
): Promise<OptimizationResult> => {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  const originalSize = file.size;

  // Skip optimization for already small files (< 100KB)
  if (originalSize < 100 * 1024) {
    return {
      file,
      originalSize,
      optimizedSize: originalSize,
      savings: 0,
      savingsPercent: 0,
    };
  }

  try {
    const compressedFile = await imageCompression(file, {
      maxSizeMB: mergedOptions.maxSizeMB!,
      maxWidthOrHeight: mergedOptions.maxWidthOrHeight!,
      useWebWorker: mergedOptions.useWebWorker!,
      fileType: 'image/webp',
      initialQuality: 0.85,
    });

    // Create a new file with .webp extension
    const webpFileName = file.name.replace(/\.[^/.]+$/, '.webp');
    const optimizedFile = new File([compressedFile], webpFileName, {
      type: 'image/webp',
    });

    const optimizedSize = optimizedFile.size;
    const savings = originalSize - optimizedSize;
    const savingsPercent = Math.round((savings / originalSize) * 100);

    console.log(
      `Image optimized: ${file.name} (${formatBytes(originalSize)}) → ${webpFileName} (${formatBytes(optimizedSize)}) - ${savingsPercent}% saved`
    );

    return {
      file: optimizedFile,
      originalSize,
      optimizedSize,
      savings,
      savingsPercent,
    };
  } catch (error) {
    console.error('Error optimizing image:', error);
    // Return original file if optimization fails
    return {
      file,
      originalSize,
      optimizedSize: originalSize,
      savings: 0,
      savingsPercent: 0,
    };
  }
};

/**
 * Optimize image specifically for AI tools (Upscaler, Pose Changer, Veste AI)
 * Uses 1536px limit to prevent VRAM overflow on RunningHub
 */
export const optimizeForAI = async (file: File): Promise<OptimizationResult> => {
  const originalSize = file.size;

  try {
    const compressedFile = await imageCompression(file, AI_OPTIMIZATION_CONFIG);

    // Create a new file with .webp extension
    const webpFileName = file.name.replace(/\.[^/.]+$/, '.webp');
    const optimizedFile = new File([compressedFile], webpFileName, {
      type: 'image/webp',
    });

    const optimizedSize = optimizedFile.size;
    const savings = originalSize - optimizedSize;
    const savingsPercent = Math.round((savings / originalSize) * 100);

    console.log(
      `[AI Optimize] ${file.name} (${formatBytes(originalSize)}) → ${webpFileName} (${formatBytes(optimizedSize)}) - ${savingsPercent}% saved`
    );

    return {
      file: optimizedFile,
      originalSize,
      optimizedSize,
      savings,
      savingsPercent,
    };
  } catch (error) {
    console.error('[AI Optimize] Error:', error);
    // Return original file if optimization fails
    return {
      file,
      originalSize,
      optimizedSize: originalSize,
      savings: 0,
      savingsPercent: 0,
    };
  }
};

export const isImageFile = (file: File): boolean => {
  return file.type.startsWith('image/') && !file.type.includes('gif');
};

export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Get image dimensions without validation
 * Returns width and height of the image
 */
export const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.width, height: img.height });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Não foi possível carregar a imagem.'));
    };

    img.src = url;
  });
};

/**
 * Compress image to a maximum dimension (width or height) while maintaining aspect ratio
 * Used for client-side compression before upload
 * @param file - The image file to compress
 * @param maxPx - Maximum dimension in pixels (e.g., 1999)
 * @returns Compressed file with new dimensions
 */
export const compressToMaxDimension = async (
  file: File,
  maxPx: number
): Promise<{ file: File; width: number; height: number }> => {
  const { width, height } = await getImageDimensions(file);

  // If already within limits, just return with dimensions
  if (width <= maxPx && height <= maxPx) {
    return { file, width, height };
  }

  try {
    const compressedFile = await imageCompression(file, {
      maxWidthOrHeight: maxPx,
      useWebWorker: true,
      fileType: 'image/webp',
      initialQuality: 0.9,
    });

    // Get new dimensions after compression
    const newDimensions = await getImageDimensions(compressedFile as File);

    // Create a new file with .webp extension
    const webpFileName = file.name.replace(/\.[^/.]+$/, '.webp');
    const optimizedFile = new File([compressedFile], webpFileName, {
      type: 'image/webp',
    });

    console.log(
      `[compressToMaxDimension] ${file.name} (${width}x${height}) → ${webpFileName} (${newDimensions.width}x${newDimensions.height})`
    );

    return {
      file: optimizedFile,
      width: newDimensions.width,
      height: newDimensions.height,
    };
  } catch (error) {
    console.error('[compressToMaxDimension] Error:', error);
    // Return original file with original dimensions if compression fails
    return { file, width, height };
  }
};

/**
 * Validate image dimensions for AI tools
 * Returns validation result with dimensions - does NOT block, just reports
 */
export const validateImageDimensions = (file: File): Promise<ImageDimensionValidation> => {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      if (img.width > MAX_AI_DIMENSION || img.height > MAX_AI_DIMENSION) {
        resolve({
          valid: false,
          width: img.width,
          height: img.height,
          error: `Imagem muito grande (${img.width}x${img.height}). O limite máximo é ${MAX_AI_DIMENSION}x${MAX_AI_DIMENSION} pixels.`,
        });
      } else {
        resolve({ valid: true, width: img.width, height: img.height });
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ valid: false, width: 0, height: 0, error: 'Não foi possível carregar a imagem.' });
    };

    img.src = url;
  });
};

export const useImageOptimizer = () => {
  return {
    optimizeImage,
    optimizeForAI,
    isImageFile,
    formatBytes,
    validateImageDimensions,
    getImageDimensions,
    compressToMaxDimension,
  };
};
