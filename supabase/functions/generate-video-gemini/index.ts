import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * GENERATE VIDEO GEMINI - Queue Processor
 * 
 * Processes jobs from video_generation_queue using Google Gemini API (Veo 3.1 Lite).
 * Called via pg_cron every 2 minutes or manually via HTTP.
 * 
 * Endpoints:
 * - POST / (no body) — Process next queued job (FIFO)
 * - POST /enqueue — Enqueue a new job (authenticated)
 * - POST /status — Check job status (authenticated)
 */

const GEMINI_API_KEY = Deno.env.get('GOOGLE_GEMINI_API_KEY') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const MODEL = 'veo-3.1-lite-generate-preview';
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const TABLE = 'video_generation_queue';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// ========== AUTH HELPER ==========
async function getAuthUserId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;
  try {
    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: { user }, error } = await anonClient.auth.getUser(authHeader.replace('Bearer ', ''));
    if (error || !user) return null;
    return user.id;
  } catch {
    return null;
  }
}

// ========== CREDIT HELPERS ==========
const CREDIT_COSTS: Record<string, number> = {
  'video-generator': 800,
  'movie-led-maker': 800,
};

async function chargeCredits(supabase: ReturnType<typeof createClient>, userId: string, amount: number, context: string): Promise<boolean> {
  try {
    const description = context === 'movie-led-maker' ? 'Movie LED Maker - Veo 3.1 Lite' : 'Gerar Vídeo - Veo 3.1 Lite';
    const { data, error } = await supabase.rpc('consume_upscaler_credits', {
      _user_id: userId,
      _amount: amount,
      _description: description,
    });
    if (error) {
      console.error('[GeminiQueue] Credit deduction error:', error.message);
      return false;
    }
    const result = data?.[0];
    return result?.success === true;
  } catch (e) {
    console.error('[GeminiQueue] Credit charge exception:', e);
    return false;
  }
}

async function refundCredits(supabase: ReturnType<typeof createClient>, userId: string, amount: number, context: string): Promise<void> {
  try {
    const description = context === 'movie-led-maker' ? 'Estorno - Movie LED Maker' : 'Estorno - Gerar Vídeo';
    await supabase.rpc('refund_upscaler_credits', {
      _user_id: userId,
      _amount: amount,
      _description: description,
    });
    console.log(`[GeminiQueue] Refunded ${amount} credits to ${userId}`);
  } catch (e) {
    console.error('[GeminiQueue] Refund error:', e);
  }
}

// ========== ENQUEUE ENDPOINT ==========
async function handleEnqueue(req: Request): Promise<Response> {
  const userId = await getAuthUserId(req);
  if (!userId) return jsonResponse({ error: 'Não autorizado' }, 401);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Body inválido' }, 400);
  }

  const { prompt, aspect_ratio, duration, quality, context } = body;
  if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 3) {
    return jsonResponse({ error: 'Prompt inválido (mínimo 3 caracteres)' }, 400);
  }

  // Validate context
  const validContexts = ['video-generator', 'movie-led-maker'];
  if (context && !validContexts.includes(context)) {
    return jsonResponse({ error: 'Contexto inválido' }, 400);
  }

  // Check credits
  const creditCost = CREDIT_COSTS[context || 'video-generator'] || 800;
  
  // Check user balance
  const { data: balance } = await supabase.rpc('get_upscaler_credits', { _user_id: userId });
  if ((balance ?? 0) < creditCost) {
    return jsonResponse({ error: 'Créditos insuficientes', code: 'INSUFFICIENT_CREDITS' }, 402);
  }

  // Check for existing active job
  const { data: activeJobs } = await supabase
    .from(TABLE)
    .select('id')
    .eq('user_id', userId)
    .in('status', ['queued', 'processing'])
    .limit(1);

  if (activeJobs && activeJobs.length > 0) {
    return jsonResponse({ error: 'Você já tem uma geração na fila. Aguarde finalizar.', code: 'USER_HAS_ACTIVE_JOB' }, 409);
  }

  // Deduct credits
  const charged = await chargeCredits(supabase, userId, creditCost, context || 'video-generator');
  if (!charged) {
    return jsonResponse({ error: 'Falha ao debitar créditos', code: 'INSUFFICIENT_CREDITS' }, 402);
  }

  // Insert into queue
  const { data: job, error } = await supabase
    .from(TABLE)
    .insert({
      user_id: userId,
      provider: 'gemini',
      status: 'queued',
      prompt: prompt.trim(),
      aspect_ratio: aspect_ratio || '16:9',
      duration: duration || 8,
      quality: quality || '720p',
      context: context || 'video-generator',
    })
    .select()
    .single();

  if (error) {
    // Refund on insert failure
    await refundCredits(supabase, userId, creditCost, context || 'video-generator');
    console.error('[GeminiQueue] Insert error:', error);
    return jsonResponse({ error: 'Erro ao enfileirar job' }, 500);
  }

  console.log(`[GeminiQueue] Job ${job.id} enqueued for user ${userId}, context: ${context}`);
  return jsonResponse({ job_id: job.id, status: 'queued', message: 'Adicionado à fila' });
}

// ========== STATUS ENDPOINT ==========
async function handleStatus(req: Request): Promise<Response> {
  const userId = await getAuthUserId(req);
  if (!userId) return jsonResponse({ error: 'Não autorizado' }, 401);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  let body: any;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Body inválido' }, 400);
  }

  const { job_id } = body;
  if (!job_id) {
    return jsonResponse({ error: 'job_id obrigatório' }, 400);
  }

  const { data: job, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', job_id)
    .eq('user_id', userId)
    .single();

  if (error || !job) {
    return jsonResponse({ error: 'Job não encontrado' }, 404);
  }

  return jsonResponse(job);
}

// ========== PROCESS QUEUE (CRON/MANUAL) ==========
async function processQueue(): Promise<Response> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  if (!GEMINI_API_KEY) {
    console.error('[GeminiQueue] GOOGLE_GEMINI_API_KEY not configured');
    return jsonResponse({ message: 'API key not configured' }, 500);
  }

  // Get next FIFO job
  const { data: job, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('status', 'queued')
    .eq('provider', 'gemini')
    .order('created_at', { ascending: true })
    .limit(1)
    .single();

  if (error || !job) {
    return jsonResponse({ message: 'No queued jobs' });
  }

  console.log(`[GeminiQueue] Processing job ${job.id} for user ${job.user_id}`);

  // Mark as processing
  await supabase
    .from(TABLE)
    .update({ status: 'processing', updated_at: new Date().toISOString() })
    .eq('id', job.id);

  try {
    // Start generation
    const startRes = await fetch(
      `${BASE_URL}/models/${MODEL}:predictLongRunning`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY,
        },
        body: JSON.stringify({
          instances: [{ prompt: job.prompt }],
          parameters: {
            aspectRatio: job.aspect_ratio,
          },
        }),
      }
    );

    // Rate limited — requeue
    if (startRes.status === 429) {
      console.warn(`[GeminiQueue] Rate limited for job ${job.id}, requeuing`);
      await supabase
        .from(TABLE)
        .update({
          status: 'queued',
          retry_count: (job.retry_count || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.id);
      return jsonResponse({ message: 'Rate limited, requeued' });
    }

    if (!startRes.ok) {
      const errorText = await startRes.text();
      throw new Error(`Gemini API error ${startRes.status}: ${errorText}`);
    }

    const operation = await startRes.json();
    const operationName = operation.name;

    if (!operationName) {
      throw new Error('No operation name returned from Gemini API');
    }

    console.log(`[GeminiQueue] Job ${job.id} started, operation: ${operationName}`);

    await supabase
      .from(TABLE)
      .update({ operation_name: operationName, updated_at: new Date().toISOString() })
      .eq('id', job.id);

    // Poll until complete (max 10 minutes, every 10s)
    let videoUrl: string | null = null;
    for (let i = 0; i < 60; i++) {
      await new Promise(r => setTimeout(r, 10000));

      const pollRes = await fetch(
        `${BASE_URL}/${operationName}`,
        { headers: { 'x-goog-api-key': GEMINI_API_KEY } }
      );

      if (!pollRes.ok) {
        console.warn(`[GeminiQueue] Poll error for job ${job.id}: HTTP ${pollRes.status}`);
        continue;
      }

      const pollData = await pollRes.json();

      if (pollData.done) {
        videoUrl = pollData.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri ?? null;
        console.log(`[GeminiQueue] Job ${job.id} completed, videoUrl: ${videoUrl ? 'yes' : 'no'}`);
        break;
      }
    }

    if (videoUrl) {
      await supabase
        .from(TABLE)
        .update({
          status: 'completed',
          video_url: videoUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.id);
      console.log(`[GeminiQueue] Job ${job.id} marked as completed`);
    } else {
      throw new Error('Timeout: vídeo não ficou pronto em 10 minutos');
    }
  } catch (e: any) {
    const retryCount = (job.retry_count || 0) + 1;
    const shouldFail = retryCount >= 3;

    console.error(`[GeminiQueue] Job ${job.id} error (retry ${retryCount}):`, e.message);

    await supabase
      .from(TABLE)
      .update({
        status: shouldFail ? 'failed' : 'queued',
        error_message: String(e.message || e),
        retry_count: retryCount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', job.id);

    // Refund credits on permanent failure
    if (shouldFail && job.user_id) {
      const creditCost = CREDIT_COSTS[job.context || 'video-generator'] || 800;
      await refundCredits(supabase, job.user_id, creditCost, job.context || 'video-generator');
    }
  }

  return jsonResponse({ message: 'Done' });
}

// ========== MAIN HANDLER ==========
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.split('/').pop() || '';

  try {
    switch (path) {
      case 'enqueue':
        return await handleEnqueue(req);
      case 'status':
        return await handleStatus(req);
      case 'process':
      case 'generate-video-gemini':
      default:
        return await processQueue();
    }
  } catch (e: any) {
    console.error('[GeminiQueue] Unhandled error:', e);
    return jsonResponse({ error: 'Erro interno' }, 500);
  }
});
