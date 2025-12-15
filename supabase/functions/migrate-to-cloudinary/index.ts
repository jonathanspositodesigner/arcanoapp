import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MigrationRequest {
  table: string;
  column: string;
  limit?: number;
  offset?: number;
}

function parseStorageUrl(url: string): { bucket: string; filePath: string } | null {
  const match = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)/);
  if (match) {
    return {
      bucket: match[1],
      filePath: decodeURIComponent(match[2])
    };
  }
  return null;
}

async function generateSignature(params: Record<string, string>, apiSecret: string): Promise<string> {
  // Sort keys alphabetically (same as upload-to-cloudinary)
  const sortedKeys = Object.keys(params).sort();
  const signatureString = sortedKeys.map(key => `${key}=${params[key]}`).join('&') + apiSecret;
  
  console.log('Signature string:', signatureString);
  
  const encoder = new TextEncoder();
  const data = encoder.encode(signatureString);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  console.log('Generated signature:', signature);
  return signature;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const cloudName = Deno.env.get('CLOUDINARY_CLOUD_NAME')!.trim();
    const apiKey = Deno.env.get('CLOUDINARY_API_KEY')!.trim();
    const apiSecret = Deno.env.get('CLOUDINARY_API_SECRET')!.trim();

    console.log('Cloudinary config:', { cloudName, apiKeyLength: apiKey.length, apiSecretLength: apiSecret.length });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { table, column, limit = 10, offset = 0 }: MigrationRequest = await req.json();

    console.log(`Starting migration for ${table}.${column}, limit: ${limit}, offset: ${offset}`);

    // Fetch records with Supabase URLs
    const { data: records, error: fetchError } = await supabase
      .from(table)
      .select('*')
      .like(column, '%supabase%')
      .range(offset, offset + limit - 1);

    if (fetchError) {
      console.error('Fetch error:', fetchError);
      throw fetchError;
    }

    if (!records || records.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        migrated: 0, 
        message: 'No more records to migrate' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${records.length} records to migrate`);

    const results = {
      migrated: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const record of records) {
      const recordId = (record as Record<string, unknown>).id as string;
      const oldUrl = (record as Record<string, unknown>)[column] as string | null;
      
      try {
        if (!oldUrl || !oldUrl.includes('supabase')) {
          continue;
        }

        const parsed = parseStorageUrl(oldUrl);
        if (!parsed) {
          throw new Error(`Could not parse storage URL: ${oldUrl}`);
        }

        console.log(`Getting signed URL for: ${parsed.bucket}/${parsed.filePath}`);

        const { data: signedUrlData, error: signedUrlError } = await supabase
          .storage
          .from(parsed.bucket)
          .createSignedUrl(parsed.filePath, 60);

        if (signedUrlError || !signedUrlData?.signedUrl) {
          throw new Error(`Failed to create signed URL: ${signedUrlError?.message || 'No URL returned'}`);
        }

        console.log(`Downloading from signed URL...`);
        const response = await fetch(signedUrlData.signedUrl);
        if (!response.ok) {
          throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
        }

        const blob = await response.blob();
        const buffer = await blob.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);
        const mimeType = blob.type || 'application/octet-stream';
        const base64Data = `data:${mimeType};base64,${base64}`;
        
        const contentType = response.headers.get('content-type') || '';
        const resourceType = contentType.startsWith('video/') ? 'video' : 'image';
        
        const folder = `arcanoapp/${table}`;
        const timestamp = Math.round(Date.now() / 1000);
        
        // Use exact same signature logic as upload-to-cloudinary
        const params: Record<string, string> = {
          folder: folder,
          timestamp: timestamp.toString(),
        };
        
        const signature = await generateSignature(params, apiSecret);

        const formData = new FormData();
        formData.append('file', base64Data);
        formData.append('api_key', apiKey);
        formData.append('timestamp', timestamp.toString());
        formData.append('signature', signature);
        formData.append('folder', folder);

        const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;
        console.log(`Uploading to Cloudinary: ${uploadUrl}`);
        
        const uploadResponse = await fetch(uploadUrl, {
          method: 'POST',
          body: formData,
        });

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          console.error('Cloudinary upload error:', errorText);
          throw new Error(`Cloudinary upload failed: ${errorText}`);
        }

        const uploadResult = await uploadResponse.json();
        const newUrl = uploadResult.secure_url;

        console.log(`Uploaded to Cloudinary: ${newUrl}`);

        const { error: updateError } = await supabase
          .from(table)
          .update({ [column]: newUrl })
          .eq('id', recordId);

        if (updateError) {
          throw new Error(`Database update failed: ${updateError.message}`);
        }

        results.migrated++;
        console.log(`Migrated record ${recordId}`);

      } catch (err) {
        const error = err as Error;
        results.failed++;
        results.errors.push(`Record ${recordId}: ${error.message}`);
        console.error(`Failed to migrate record ${recordId}:`, error);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      ...results,
      hasMore: records.length === limit,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    const error = err as Error;
    console.error('Migration error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
