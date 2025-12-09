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

    // Start background processing
    (globalThis as any).EdgeRuntime?.waitUntil?.(processJob(supabase, job_id)) || processJob(supabase, job_id);

    return new Response(
      JSON.stringify({ message: 'Import started', job_id }),
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

async function processJob(supabase: any, jobId: string) {
  console.log(`Starting background processing for job ${jobId}`);
  
  try {
    // Fetch job with CSV data
    const { data: job, error: jobError } = await supabase
      .from('import_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      console.error('Failed to fetch job:', jobError);
      return;
    }

    const clients: ParsedClient[] = job.csv_data || [];
    const batchSize = 10;
    const totalBatches = Math.ceil(clients.length / batchSize);
    let currentBatch = job.current_batch || 0;
    
    let totalCreated = job.created_records || 0;
    let totalUpdated = job.updated_records || 0;
    let totalSkipped = job.skipped_records || 0;
    let errorCount = job.error_count || 0;

    console.log(`Processing ${clients.length} clients, starting from batch ${currentBatch}`);

    for (let i = currentBatch; i < totalBatches; i++) {
      // Check job status before each batch
      const { data: currentJob } = await supabase
        .from('import_jobs')
        .select('status')
        .eq('id', jobId)
        .single();

      if (currentJob?.status === 'cancelled') {
        console.log('Job cancelled, stopping...');
        break;
      }

      if (currentJob?.status === 'paused') {
        console.log('Job paused, stopping background process...');
        // Save current batch for resume
        await supabase
          .from('import_jobs')
          .update({ current_batch: i })
          .eq('id', jobId);
        return; // Exit - will be resumed later
      }

      const start = i * batchSize;
      const end = Math.min(start + batchSize, clients.length);
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

      // Update progress in database
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

  } catch (error) {
    console.error('Background processing error:', error);
    await supabase
      .from('import_jobs')
      .update({
        status: 'cancelled',
        completed_at: new Date().toISOString(),
        error_count: (await supabase.from('import_jobs').select('error_count').eq('id', jobId).single()).data?.error_count + 1 || 1
      })
      .eq('id', jobId);
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
        // Get user ID from auth
        const { data: users } = await supabase.auth.admin.listUsers();
        const existingUser = users?.users?.find((u: any) => u.email?.toLowerCase() === email);
        if (existingUser) {
          userId = existingUser.id;
        } else {
          throw new Error(`User exists but couldn't find ID: ${email}`);
        }
      } else {
        throw authError;
      }
    } else {
      userId = authData.user.id;
      console.log(`Created new user: ${email}`);
    }

    // Create/update profile
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
