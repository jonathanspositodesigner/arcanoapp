import { supabase } from "@/integrations/supabase/client";

export interface CloudinaryUploadResult {
  success: boolean;
  url?: string;
  publicId?: string;
  error?: string;
}

export const uploadToCloudinary = async (
  file: File,
  folder: string
): Promise<CloudinaryUploadResult> => {
  try {
    // Convert file to base64
    const base64 = await fileToBase64(file);
    
    // Determine resource type based on file type
    const resourceType = file.type.startsWith('video/') ? 'video' : 'image';

    const { data, error } = await supabase.functions.invoke('upload-to-cloudinary', {
      body: {
        file: base64,
        folder,
        resourceType,
      },
    });

    if (error) {
      console.error('Cloudinary upload error:', error);
      return { success: false, error: error.message };
    }

    if (!data.success) {
      return { success: false, error: data.error || 'Upload failed' };
    }

    return {
      success: true,
      url: data.url,
      publicId: data.publicId,
    };
  } catch (err) {
    console.error('Error uploading to Cloudinary:', err);
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

export const useCloudinaryUpload = () => {
  return { uploadToCloudinary };
};
