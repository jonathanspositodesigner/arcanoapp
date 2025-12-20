import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MigrationResult {
  success: boolean;
  table: string;
  id: string;
  oldUrl: string;
  newUrl?: string;
  error?: string;
}

interface TableConfig {
  bucket: string;
  imageColumn: string;
  downloadColumn?: string;
  arrayColumn?: string; // For fields like reference_images that are arrays of URLs
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { table, batchSize = 10, dryRun = false } = await req.json();

    console.log(`Starting migration for table: ${table}, batchSize: ${batchSize}, dryRun: ${dryRun}`);

    const results: MigrationResult[] = [];
    let processed = 0;
    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    // Determine bucket and column based on table
    const config: Record<string, TableConfig> = {
      'admin_prompts': { bucket: 'prompts-cloudinary', imageColumn: 'image_url', arrayColumn: 'reference_images' },
      'admin_artes': { bucket: 'artes-cloudinary', imageColumn: 'image_url', downloadColumn: 'download_url' },
      'community_prompts': { bucket: 'prompts-cloudinary', imageColumn: 'image_url' },
      'community_artes': { bucket: 'artes-cloudinary', imageColumn: 'image_url', downloadColumn: 'download_url' },
      'partner_prompts': { bucket: 'prompts-cloudinary', imageColumn: 'image_url', arrayColumn: 'reference_images' },
      'partner_artes': { bucket: 'artes-cloudinary', imageColumn: 'image_url', downloadColumn: 'download_url' },
      'partner_artes_musicos': { bucket: 'artes-cloudinary', imageColumn: 'image_url', downloadColumn: 'download_url' },
      'artes_packs': { bucket: 'artes-cloudinary', imageColumn: 'cover_url' },
      'artes_banners': { bucket: 'artes-cloudinary', imageColumn: 'image_url' },
      'admin_prompts_reference_images': { bucket: 'prompts-cloudinary', imageColumn: 'reference_images', isArrayOnly: true } as any,
    };

    const tableConfig = config[table];
    if (!tableConfig) {
      return new Response(
        JSON.stringify({ error: `Unknown table: ${table}. Valid tables: ${Object.keys(config).join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Special handling for reference_images migration
    const isReferenceImagesMigration = table === 'admin_prompts_reference_images';
    const actualTable = isReferenceImagesMigration ? 'admin_prompts' : table;

    // Build select columns
    let selectColumns = tableConfig.downloadColumn 
      ? `id, ${tableConfig.imageColumn}, ${tableConfig.downloadColumn}`
      : `id, ${tableConfig.imageColumn}`;
    
    if (tableConfig.arrayColumn) {
      selectColumns += `, ${tableConfig.arrayColumn}`;
    }

    // Fetch items - for reference_images we need a different approach
    let items: any[] = [];
    let fetchError: any = null;

    if (isReferenceImagesMigration) {
      // Fetch all items with reference_images that contain cloudinary URLs
      const { data, error } = await supabase
        .from(actualTable)
        .select('id, reference_images')
        .not('reference_images', 'is', null)
        .limit(100);
      
      fetchError = error;
      // Filter items that have at least one cloudinary URL in the array
      items = (data || []).filter((item: any) => {
        if (!item.reference_images || !Array.isArray(item.reference_images)) return false;
        return item.reference_images.some((url: string) => url && url.includes('res.cloudinary.com'));
      }).slice(0, batchSize);
    } else {
      // Build filter for Cloudinary URLs - usar domínio específico para não pegar URLs do Supabase Storage
      const filterCondition = tableConfig.downloadColumn
        ? `${tableConfig.imageColumn}.ilike.%res.cloudinary.com%,${tableConfig.downloadColumn}.ilike.%res.cloudinary.com%`
        : `${tableConfig.imageColumn}.ilike.%res.cloudinary.com%`;

      // Fetch items with Cloudinary URLs
      const { data, error } = await supabase
        .from(actualTable)
        .select(selectColumns)
        .or(filterCondition)
        .limit(batchSize);
      
      items = data || [];
      fetchError = error;
    }

    if (fetchError) {
      console.error('Fetch error:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch items', details: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${items?.length || 0} items with Cloudinary URLs`);

    if (!items || items.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'No items with Cloudinary URLs found',
          processed: 0,
          migrated: 0,
          skipped: 0,
          errors: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    for (const item of items as any[]) {
      processed++;
      const updates: Record<string, any> = {};
      const itemId = item.id as string;

      // Handle reference_images migration (array of URLs)
      if (isReferenceImagesMigration) {
        const referenceImages = item.reference_images as string[] | undefined;
        if (referenceImages && Array.isArray(referenceImages)) {
          const newReferenceImages: string[] = [];
          let hasChanges = false;

          for (let i = 0; i < referenceImages.length; i++) {
            const url = referenceImages[i];
            if (url && url.includes('res.cloudinary.com')) {
              try {
                if (dryRun) {
                  console.log(`[DRY RUN] Would migrate reference image: ${url}`);
                  newReferenceImages.push(url);
                } else {
                  const newUrl = await migrateImage(supabase, url, tableConfig.bucket, `admin_prompts/${itemId}-ref-${i}`);
                  if (newUrl) {
                    newReferenceImages.push(newUrl);
                    hasChanges = true;
                    results.push({ success: true, table: 'admin_prompts', id: itemId, oldUrl: url, newUrl });
                  } else {
                    newReferenceImages.push(url);
                  }
                }
              } catch (err) {
                console.error(`Error migrating reference image ${i} for ${itemId}:`, err);
                newReferenceImages.push(url); // Keep original on error
                errors++;
              }
            } else {
              newReferenceImages.push(url);
            }
          }

          if (hasChanges && !dryRun) {
            updates['reference_images'] = newReferenceImages;
          }
        }
      } else {
        // Process image_url (original logic)
        const imageUrl = item[tableConfig.imageColumn] as string | undefined;
        if (imageUrl && imageUrl.includes('cloudinary.com')) {
          try {
            if (dryRun) {
              console.log(`[DRY RUN] Would migrate image: ${imageUrl}`);
              results.push({ success: true, table, id: itemId, oldUrl: imageUrl, newUrl: '[DRY RUN]' });
            } else {
              const newUrl = await migrateImage(supabase, imageUrl, tableConfig.bucket, `${actualTable}/${itemId}`);
              if (newUrl) {
                updates[tableConfig.imageColumn] = newUrl;
                results.push({ success: true, table, id: itemId, oldUrl: imageUrl, newUrl });
              }
            }
          } catch (err) {
            console.error(`Error migrating image for ${itemId}:`, err);
            results.push({ success: false, table, id: itemId, oldUrl: imageUrl, error: String(err) });
            errors++;
          }
        }

        // Process download_url if exists
        if (tableConfig.downloadColumn) {
          const downloadUrl = item[tableConfig.downloadColumn] as string | undefined;
          if (downloadUrl && downloadUrl.includes('cloudinary.com')) {
            try {
              if (dryRun) {
                console.log(`[DRY RUN] Would migrate download: ${downloadUrl}`);
              } else {
                const newUrl = await migrateImage(supabase, downloadUrl, tableConfig.bucket, `${actualTable}/${itemId}-download`);
                if (newUrl) {
                  updates[tableConfig.downloadColumn] = newUrl;
                }
              }
            } catch (err) {
              console.error(`Error migrating download for ${itemId}:`, err);
              errors++;
            }
          }
        }
      }

      // Update database if we have changes
      if (!dryRun && Object.keys(updates).length > 0) {
        const { error: updateError } = await supabase
          .from(actualTable)
          .update(updates)
          .eq('id', itemId);

        if (updateError) {
          console.error(`Error updating ${itemId}:`, updateError);
          errors++;
        } else {
          migrated++;
          console.log(`Migrated ${itemId}`);
        }
      } else if (dryRun) {
        migrated++;
      } else {
        skipped++;
      }

      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const response = {
      message: dryRun ? 'Dry run completed' : 'Migration batch completed',
      table,
      processed,
      migrated,
      skipped,
      errors,
      hasMore: items.length === batchSize,
      results: results.slice(0, 20) // Limit results in response
    };

    console.log('Migration result:', response);

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Migration error:', error);
    return new Response(
      JSON.stringify({ error: 'Migration failed', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function migrateImage(
  supabase: any,
  cloudinaryUrl: string,
  bucket: string,
  pathPrefix: string
): Promise<string | null> {
  try {
    // Extract filename from URL
    const urlParts = cloudinaryUrl.split('/');
    let filename = urlParts[urlParts.length - 1];
    
    // Remove query params
    filename = filename.split('?')[0];
    
    // Determine extension
    const isVideo = /\.(mp4|webm|mov|avi|mkv|m4v)$/i.test(filename);
    const extension = isVideo ? 'mp4' : 'webp';
    
    // Create unique path
    const storagePath = `${pathPrefix}-${Date.now()}.${extension}`;

    console.log(`Downloading from Cloudinary: ${cloudinaryUrl}`);
    
    // Download from Cloudinary (already optimized)
    const response = await fetch(cloudinaryUrl);
    if (!response.ok) {
      throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
    }

    const blob = await response.blob();
    console.log(`Downloaded ${blob.size} bytes`);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(storagePath, blob, {
        contentType: blob.type || (isVideo ? 'video/mp4' : 'image/webp'),
        upsert: true
      });

    if (error) {
      throw new Error(`Storage upload failed: ${error.message}`);
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(storagePath);

    console.log(`Uploaded to: ${publicUrlData.publicUrl}`);
    
    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('migrateImage error:', error);
    throw error;
  }
}
