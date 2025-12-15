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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const cloudName = Deno.env.get('CLOUDINARY_CLOUD_NAME')!;
    const apiKey = Deno.env.get('CLOUDINARY_API_KEY')!;
    const apiSecret = Deno.env.get('CLOUDINARY_API_SECRET')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { table, column, limit = 10, offset = 0 }: MigrationRequest = await req.json();

    console.log(`Starting migration for ${table}.${column}, limit: ${limit}, offset: ${offset}`);

    // Fetch records with Supabase URLs - use raw query to avoid type issues
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

        // Download file from Supabase
        console.log(`Downloading: ${oldUrl}`);
        const response = await fetch(oldUrl);
        if (!response.ok) {
          throw new Error(`Failed to download: ${response.status}`);
        }

        const blob = await response.blob();
        const base64 = await blobToBase64(blob);
        
        // Determine resource type
        const contentType = response.headers.get('content-type') || '';
        const resourceType = contentType.startsWith('video/') ? 'video' : 'image';
        
        // Generate folder based on table
        const folder = `arcanoapp/${table}`;
        
        // Upload to Cloudinary
        const timestamp = Math.round(Date.now() / 1000);
        const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;
        const signature = await generateSignature(paramsToSign, apiSecret);

        const formData = new FormData();
        formData.append('file', base64);
        formData.append('api_key', apiKey);
        formData.append('timestamp', timestamp.toString());
        formData.append('signature', signature);
        formData.append('folder', folder);

        const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;
        const uploadResponse = await fetch(uploadUrl, {
          method: 'POST',
          body: formData,
        });

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          throw new Error(`Cloudinary upload failed: ${errorText}`);
        }

        const uploadResult = await uploadResponse.json();
        const newUrl = uploadResult.secure_url;

        console.log(`Uploaded to Cloudinary: ${newUrl}`);

        // Update database with new URL
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

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  const mimeType = blob.type || 'application/octet-stream';
  return `data:${mimeType};base64,${base64}`;
}

async function generateSignature(paramsToSign: string, apiSecret: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(paramsToSign + apiSecret);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
