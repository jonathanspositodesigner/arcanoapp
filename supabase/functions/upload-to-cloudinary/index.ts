import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { file, folder, resourceType = 'auto' } = await req.json();

    if (!file) {
      throw new Error('No file provided');
    }

    const cloudName = Deno.env.get('CLOUDINARY_CLOUD_NAME');
    const apiKey = Deno.env.get('CLOUDINARY_API_KEY');
    const apiSecret = Deno.env.get('CLOUDINARY_API_SECRET');

    if (!cloudName || !apiKey || !apiSecret) {
      console.error('Missing Cloudinary credentials');
      throw new Error('Cloudinary credentials not configured');
    }

    // Generate timestamp and signature for secure upload
    const timestamp = Math.round(Date.now() / 1000);
    
    // Build params for signature (sorted alphabetically)
    const params: Record<string, string> = {
      folder: folder || 'arcanoapp',
      timestamp: timestamp.toString(),
    };

    // Optimize images ONCE at upload time (avoid dynamic transformations on view)
    // - q_auto,f_auto reduces bytes via automatic quality + next-gen format
    // - c_limit,w_1600 prevents gigantic uploads from exploding bandwidth
    if (resourceType === 'image' || resourceType === 'auto') {
      params.transformation = 'q_auto,f_auto,c_limit,w_1600';
    }

    // Create signature string
    const sortedKeys = Object.keys(params).sort();
    const signatureString = sortedKeys.map(key => `${key}=${params[key]}`).join('&') + apiSecret;
    
    // Generate SHA-1 signature
    const encoder = new TextEncoder();
    const data = encoder.encode(signatureString);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Prepare form data for upload
    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', apiKey);
    formData.append('timestamp', timestamp.toString());
    formData.append('signature', signature);
    formData.append('folder', params.folder);
    
    if (params.transformation) {
      formData.append('transformation', params.transformation);
    }

    // Upload to Cloudinary
    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;
    
    console.log(`Uploading to Cloudinary folder: ${params.folder}`);

    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('Cloudinary upload error:', errorText);
      throw new Error(`Cloudinary upload failed: ${errorText}`);
    }

    const result = await uploadResponse.json();
    
    console.log(`Upload successful: ${result.secure_url}`);

    return new Response(
      JSON.stringify({
        success: true,
        url: result.secure_url,
        publicId: result.public_id,
        format: result.format,
        width: result.width,
        height: result.height,
        bytes: result.bytes,
        resourceType: result.resource_type,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in upload-to-cloudinary:', error);
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
