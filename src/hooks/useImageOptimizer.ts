import imageCompression from 'browser-image-compression';

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

export const useImageOptimizer = () => {
  return { optimizeImage, isImageFile, formatBytes };
};
