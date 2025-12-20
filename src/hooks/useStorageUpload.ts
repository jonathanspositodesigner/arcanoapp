import { supabase } from "@/integrations/supabase/client";

export interface StorageUploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export const uploadToStorage = async (
  file: File,
  folder: string
): Promise<StorageUploadResult> => {
  try {
    // Convert file to base64
    const base64 = await fileToBase64(file);
    
    // Get content type
    const contentType = file.type;
    
    // Generate filename with timestamp
    const timestamp = Date.now();
    const extension = file.name.split('.').pop() || 'webp';
    const filename = `${timestamp}-${Math.random().toString(36).substring(7)}.${extension}`;

    const { data, error } = await supabase.functions.invoke('upload-to-storage', {
      body: {
        file: base64,
        folder,
        filename,
        contentType,
      },
    });

    if (error) {
      console.error('Storage upload error:', error);
      return { success: false, error: error.message };
    }

    if (!data.success) {
      return { success: false, error: data.error || 'Upload failed' };
    }

    return {
      success: true,
      url: data.url,
    };
  } catch (err) {
    console.error('Error uploading to Storage:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const useStorageUpload = () => {
  return { uploadToStorage };
};
