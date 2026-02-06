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
 * Validate image dimensions for AI tools
 * Blocks images larger than MAX_AI_DIMENSION (2000px) in width or height
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
          error: `Imagem muito grande (${img.width}x${img.height}). O limite máximo é ${MAX_AI_DIMENSION}x${MAX_AI_DIMENSION} pixels. Por favor, redimensione a imagem antes de enviar.`,
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
  return { optimizeImage, optimizeForAI, isImageFile, formatBytes, validateImageDimensions };
};
