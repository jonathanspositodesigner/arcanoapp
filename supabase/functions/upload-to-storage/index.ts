import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { file, folder = 'uploads', filename, contentType } = await req.json();

    if (!file) {
      throw new Error('No file provided');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Determine bucket based on folder/type
    let bucket = 'artes-cloudinary'; // default bucket
    if (folder.includes('prompt')) {
      bucket = 'prompts-cloudinary';
    }

    // Determine file extension and content type
    const isVideo = contentType?.startsWith('video/') || /\.(mp4|webm|mov|avi|mkv|m4v)$/i.test(filename || '');
    const extension = isVideo ? 'mp4' : 'webp';
    const mimeType = contentType || (isVideo ? 'video/mp4' : 'image/webp');

    // Create unique path
    const timestamp = Date.now();
    const safeName = (filename || 'upload')
      .replace(/[^a-zA-Z0-9.-]/g, '-')
      .replace(/\.[^.]+$/, ''); // Remove original extension
    const storagePath = `${folder}/${safeName}-${timestamp}.${extension}`;

    console.log(`Uploading to Lovable Cloud Storage: ${bucket}/${storagePath}`);

    // Decode base64 file if needed
    let fileData: Uint8Array | Blob;
    if (typeof file === 'string') {
      // Assume base64
      const base64Data = file.replace(/^data:[^;]+;base64,/, '');
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      fileData = bytes;
    } else {
      fileData = file;
    }

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(storagePath, fileData, {
        contentType: mimeType,
        upsert: true
      });

    if (error) {
      console.error('Storage upload error:', error);
      throw new Error(`Storage upload failed: ${error.message}`);
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(storagePath);

    console.log(`Upload successful: ${publicUrlData.publicUrl}`);

    return new Response(
      JSON.stringify({
        success: true,
        url: publicUrlData.publicUrl,
        path: storagePath,
        bucket: bucket,
        size: fileData instanceof Uint8Array ? fileData.length : undefined,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in upload-to-storage:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
