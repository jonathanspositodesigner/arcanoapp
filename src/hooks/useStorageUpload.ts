import { supabase } from "@/integrations/supabase/client";

export interface StorageUploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

// Determine bucket based on folder/type
const getBucketName = (folder: string): string => {
  if (folder.includes('prompt') || folder.includes('thumbnail')) {
    return 'prompts-cloudinary';
  }
  return 'artes-cloudinary';
};

export const uploadToStorage = async (
  file: File,
  folder: string
): Promise<StorageUploadResult> => {
  try {
    // Determine file extension and content type
    const isVideo = file.type.startsWith('video/') || 
      /\.(mp4|webm|mov|avi|mkv|m4v)$/i.test(file.name);
    const extension = isVideo ? 'mp4' : (file.name.split('.').pop() || 'webp');
    
    // Generate unique filename
    const timestamp = Date.now();
    const safeName = file.name
      .replace(/[^a-zA-Z0-9.-]/g, '-')
      .replace(/\.[^.]+$/, '');
    const storagePath = `${folder}/${safeName}-${timestamp}.${extension}`;
    
    // Get bucket name
    const bucket = getBucketName(folder);
    
    console.log(`Uploading to Storage: ${bucket}/${storagePath}`);

    // Upload directly using SDK (FREE - no edge function)
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: true
      });

    if (error) {
      console.error('Storage upload error:', error);
      return { success: false, error: error.message };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(storagePath);

    console.log(`Upload successful: ${urlData.publicUrl}`);

    return {
      success: true,
      url: urlData.publicUrl,
    };
  } catch (err) {
    console.error('Error uploading to Storage:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
};

export const useStorageUpload = () => {
  return { uploadToStorage };
};
