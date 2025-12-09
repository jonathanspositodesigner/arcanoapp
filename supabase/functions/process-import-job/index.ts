import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ClientPack {
  pack_slug: string;
  access_type: string;
  has_bonus: boolean;
  purchase_date: string;
}

interface ParsedClient {
  email: string;
  name: string;
  phone: string;
  packs: ClientPack[];
}

// Process max 5 batches per invocation to avoid timeout
const MAX_BATCHES_PER_INVOCATION = 5;
const BATCH_SIZE = 10;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { job_id } = await req.json();
    
    if (!job_id) {
      return new Response(
        JSON.stringify({ error: 'job_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch the job
    const { data: job, error: jobError } = await supabase
      .from('import_jobs')
      .select('*')
      .eq('id', job_id)
      .single();

    if (jobError || !job) {
      return new Response(
        JSON.stringify({ error: 'Job not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (job.status === 'completed' || job.status === 'cancelled') {
      return new Response(
        JSON.stringify({ message: 'Job already finished' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process synchronously (not in background) to ensure completion before timeout
    const result = await processJob(supabase, job_id);

    return new Response(
      JSON.stringify({ message: 'Batch processed', job_id, ...result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function processJob(supabase: any, jobId: string): Promise<{ completed: boolean; batchesProcessed: number }> {
  console.log(`Starting processing for job ${jobId}`);
  
  try {
    // Fetch job with CSV data
    const { data: job, error: jobError } = await supabase
      .from('import_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      console.error('Failed to fetch job:', jobError);
      return { completed: false, batchesProcessed: 0 };
    }

    const clients: ParsedClient[] = job.csv_data || [];
    const totalBatches = Math.ceil(clients.length / BATCH_SIZE);
    let currentBatch = job.current_batch || 0;
    
    let totalCreated = job.created_records || 0;
    let totalUpdated = job.updated_records || 0;
    let totalSkipped = job.skipped_records || 0;
    let errorCount = job.error_count || 0;
    let batchesProcessed = 0;

    console.log(`Processing ${clients.length} clients, starting from batch ${currentBatch}/${totalBatches}`);

    // Check if already completed
    if (currentBatch >= totalBatches) {
      console.log('Job already fully processed');
      await supabase
        .from('import_jobs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);
      return { completed: true, batchesProcessed: 0 };
    }

    for (let i = currentBatch; i < totalBatches; i++) {
      // Check job status before each batch
      const { data: currentJob } = await supabase
        .from('import_jobs')
        .select('status')
        .eq('id', jobId)
        .single();

      if (currentJob?.status === 'cancelled') {
        console.log('Job cancelled, stopping...');
        return { completed: false, batchesProcessed };
      }

      if (currentJob?.status === 'paused') {
        console.log('Job paused, stopping...');
        await supabase
          .from('import_jobs')
          .update({ current_batch: i, updated_at: new Date().toISOString() })
          .eq('id', jobId);
        return { completed: false, batchesProcessed };
      }

      const start = i * BATCH_SIZE;
      const end = Math.min(start + BATCH_SIZE, clients.length);
      const batch = clients.slice(start, end);

      console.log(`Processing batch ${i + 1}/${totalBatches} (${batch.length} clients)`);

      for (const client of batch) {
        try {
          const result = await processClient(supabase, client);
          if (result.created) totalCreated++;
          else if (result.updated) totalUpdated++;
          else if (result.skipped) totalSkipped++;
        } catch (err) {
          console.error(`Error processing ${client.email}:`, err);
          errorCount++;
        }
      }

      const processedCount = Math.min(end, clients.length);
      batchesProcessed++;

      // Update progress in database after each batch
      await supabase
        .from('import_jobs')
        .update({
          processed_records: processedCount,
          created_records: totalCreated,
          updated_records: totalUpdated,
          skipped_records: totalSkipped,
          error_count: errorCount,
          current_batch: i + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);

      // Check if we've processed enough batches for this invocation
      if (batchesProcessed >= MAX_BATCHES_PER_INVOCATION && i < totalBatches - 1) {
        console.log(`Batch limit reached (${batchesProcessed}/${MAX_BATCHES_PER_INVOCATION}), yielding for next invocation...`);
        return { completed: false, batchesProcessed };
      }
    }

    // Mark as completed
    await supabase
      .from('import_jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    console.log(`Job ${jobId} completed: ${totalCreated} created, ${totalUpdated} updated, ${totalSkipped} skipped, ${errorCount} errors`);
    return { completed: true, batchesProcessed };

  } catch (error) {
    console.error('Processing error:', error);
    await supabase
      .from('import_jobs')
      .update({
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);
    return { completed: false, batchesProcessed: 0 };
  }
}

async function processClient(supabase: any, client: ParsedClient): Promise<{ created: boolean; updated: boolean; skipped: boolean }> {
  const email = client.email.toLowerCase().trim();
  
  // Check if user exists in profiles
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  let userId: string;

  if (existingProfile) {
    console.log(`User exists (from profile): ${email}`);
    userId = existingProfile.id;
  } else {
    // Create new user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: email,
      email_confirm: true,
    });

    if (authError) {
      if (authError.message?.includes('already been registered')) {
        // Get user ID by creating a profile lookup via email
        // First try to get from auth by creating and catching error
        const { data: users } = await supabase.auth.admin.listUsers({ perPage: 1000 });
        const existingUser = users?.users?.find((u: any) => u.email?.toLowerCase() === email);
        if (existingUser) {
          userId = existingUser.id;
          // Create profile if it doesn't exist
          await supabase
            .from('profiles')
            .upsert({
              id: userId,
              email,
              name: client.name || null,
              phone: client.phone || null,
              password_changed: false,
            }, { onConflict: 'id' });
        } else {
          throw new Error(`User exists but couldn't find ID: ${email}`);
        }
      } else {
        throw authError;
      }
    } else {
      userId = authData.user.id;
      console.log(`Created new user: ${email}`);
      
      // Create profile
      await supabase
        .from('profiles')
        .upsert({
          id: userId,
          email,
          name: client.name || null,
          phone: client.phone || null,
          password_changed: false,
        }, { onConflict: 'id' });
    }
  }

  // Process packs
  let created = false;
  let updated = false;

  for (const pack of client.packs) {
    const expiresAt = calculateExpiresAt(pack.purchase_date, pack.access_type);

    // Check existing pack access
    const { data: existingPack } = await supabase
      .from('user_pack_purchases')
      .select('*')
      .eq('user_id', userId)
      .eq('pack_slug', pack.pack_slug)
      .maybeSingle();

    if (existingPack) {
      // Compare access types and update if better
      const accessPriority: Record<string, number> = { 'vitalicio': 4, '1_ano': 3, '6_meses': 2, '3_meses': 1 };
      const newPriority = accessPriority[pack.access_type] || 0;
      const existingPriority = accessPriority[existingPack.access_type] || 0;

      if (newPriority > existingPriority) {
        await supabase
          .from('user_pack_purchases')
          .update({
            access_type: pack.access_type,
            expires_at: expiresAt,
            has_bonus_access: pack.has_bonus || existingPack.has_bonus_access,
            is_active: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingPack.id);
        updated = true;
      } else if (pack.has_bonus && !existingPack.has_bonus_access) {
        await supabase
          .from('user_pack_purchases')
          .update({
            has_bonus_access: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingPack.id);
        updated = true;
      }
    } else {
      // Create new pack purchase
      await supabase
        .from('user_pack_purchases')
        .insert({
          user_id: userId,
          pack_slug: pack.pack_slug,
          access_type: pack.access_type,
          has_bonus_access: pack.has_bonus,
          expires_at: expiresAt,
          is_active: true,
          purchased_at: pack.purchase_date
        });
      created = true;
    }

    // Log the import
    const importHash = `${email}|${pack.pack_slug}|${pack.purchase_date}`;
    await supabase
      .from('import_log')
      .upsert({
        import_hash: importHash,
        email,
        product_name: pack.pack_slug,
        purchase_date: pack.purchase_date,
        processed_at: new Date().toISOString()
      }, { onConflict: 'import_hash' });
  }

  return { created, updated, skipped: !created && !updated };
}

function calculateExpiresAt(purchaseDate: string, accessType: string): string | null {
  if (accessType === 'vitalicio') return null;
  
  const date = new Date(purchaseDate);
  switch (accessType) {
    case '3_meses':
      date.setMonth(date.getMonth() + 3);
      break;
    case '6_meses':
      date.setMonth(date.getMonth() + 6);
      break;
    case '1_ano':
      date.setFullYear(date.getFullYear() + 1);
      break;
  }
  return date.toISOString();
}
