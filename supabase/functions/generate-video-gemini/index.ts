import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * GENERATE VIDEO GEMINI - Queue Processor
 * 
 * Processes jobs from video_generation_queue using Google Gemini API (Veo 3.1 Lite).
 * For movie-led-maker context: RunningHub preprocessing → Gemini video generation.
 * Called via pg_cron every 2 minutes or manually via HTTP.
 */

const GEMINI_API_KEY = Deno.env.get('GOOGLE_GEMINI_API_KEY') || '';
const RUNNINGHUB_API_KEY = Deno.env.get('RUNNINGHUB_API_KEY') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const MODEL = 'veo-3.1-lite-generate-preview';
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const TABLE = 'video_generation_queue';

const RH_BASE_URL = 'https://www.runninghub.ai/openapi/v2';
const RH_UPLOAD_URL = 'https://www.runninghub.ai/task/openapi/upload';
const RH_MOVIELED_APP_ID = '2021398746331881473';
const RH_IMAGE_NODE = '68';
const RH_TEXT_NODE = '72';

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

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
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

// ========== RUNNINGHUB HELPERS ==========
async function rhFetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  const retryableStatuses = [429, 500, 502, 503, 504, 520, 521, 522, 523, 524, 525];
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, options);
      if (retryableStatuses.includes(res.status) && attempt < maxRetries) {
        const delay = Math.min(5000 * (attempt + 1), 30000) + Math.random() * 2000;
        console.warn(`[GeminiQueue/RH] HTTP ${res.status}, retry ${attempt + 1}/${maxRetries} in ${(delay / 1000).toFixed(1)}s`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      return res;
    } catch (e: any) {
      if (attempt < maxRetries) {
        const delay = Math.min(5000 * (attempt + 1), 30000) + Math.random() * 2000;
        console.warn(`[GeminiQueue/RH] Network error: ${e.message}, retry ${attempt + 1}/${maxRetries}`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw e;
    }
  }
  throw new Error('RunningHub: max retries exceeded');
}

/** Upload image to RunningHub and return the fileName path */
async function uploadImageToRunningHub(imageUrl: string, jobId: string): Promise<string> {
  console.log(`[GeminiQueue/RH] Downloading image for upload: ${imageUrl.substring(0, 80)}...`);
  
  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) {
    throw new Error(`Falha ao baixar imagem de referência: HTTP ${imgRes.status}`);
  }
  
  const imgBlob = await imgRes.blob();
  const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
  const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
  const fileName = `movieled-${jobId}.${ext}`;
  
  const formData = new FormData();
  formData.append('apiKey', RUNNINGHUB_API_KEY);
  formData.append('fileType', 'image');
  formData.append('file', imgBlob, fileName);
  
  const uploadRes = await rhFetchWithRetry(RH_UPLOAD_URL, {
    method: 'POST',
    body: formData,
  });
  
  const uploadText = await uploadRes.text();
  let uploadData: any;
  try {
    uploadData = JSON.parse(uploadText);
  } catch {
    throw new Error(`RunningHub upload: resposta inválida - ${uploadText.substring(0, 200)}`);
  }
  
  if (uploadData.code !== 0) {
    throw new Error(`RunningHub upload falhou: ${uploadData.msg || 'Erro desconhecido'}`);
  }
  
  const rhFileName = uploadData.data?.fileName;
  if (!rhFileName) {
    throw new Error('RunningHub upload: nenhum fileName retornado');
  }
  
  console.log(`[GeminiQueue/RH] Image uploaded to RunningHub: ${rhFileName}`);
  return rhFileName;
}

interface RHResult {
  generatedImageUrl: string;
  generatedPrompt: string;
}

async function runRunningHubPreprocessing(imageUrl: string, rawText: string, jobId: string): Promise<RHResult> {
  console.log(`[GeminiQueue/RH] Starting preprocessing for job ${jobId}, text: "${rawText}"`);

  // Upload image to RunningHub first (required - RH servers can't access external URLs reliably)
  const rhFileName = await uploadImageToRunningHub(imageUrl, jobId);

  // Submit to RunningHub
  const submitRes = await rhFetchWithRetry(
    `${RH_BASE_URL}/run/ai-app/${RH_MOVIELED_APP_ID}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RUNNINGHUB_API_KEY}`,
      },
      body: JSON.stringify({
        nodeInfoList: [
          {
            nodeId: RH_IMAGE_NODE,
            fieldName: 'image',
            fieldValue: rhFileName,
            description: 'image',
          },
          {
            nodeId: RH_TEXT_NODE,
            fieldName: 'text',
            fieldValue: ` "${rawText}" `,
            description: 'text',
          },
        ],
        instanceType: 'default',
        usePersonalQueue: 'false',
      }),
    }
  );

  if (!submitRes.ok) {
    const errText = await submitRes.text();
    console.error(`[GeminiQueue/RH] Submit error for job ${jobId}: HTTP ${submitRes.status} - ${errText}`);
    throw new Error(`RunningHub: erro ao iniciar pré-processamento (HTTP ${submitRes.status})`);
  }

  const submitData = await submitRes.json();
  const taskId = submitData.taskId;

  if (!taskId) {
    console.error(`[GeminiQueue/RH] No taskId returned for job ${jobId}:`, submitData);
    throw new Error('RunningHub: nenhum taskId retornado');
  }

  console.log(`[GeminiQueue/RH] Job ${jobId} → RH taskId: ${taskId}, status: ${submitData.status}`);

  // Poll until SUCCESS (max 5 minutes, every 10s)
  let results: any[] | null = null;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 10000));

    const pollRes = await rhFetchWithRetry(
      `${RH_BASE_URL}/query`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RUNNINGHUB_API_KEY}`,
        },
        body: JSON.stringify({ taskId }),
      }
    );

    if (!pollRes.ok) {
      console.warn(`[GeminiQueue/RH] Poll error for job ${jobId}: HTTP ${pollRes.status}`);
      continue;
    }

    const pollData = await pollRes.json();
    console.log(`[GeminiQueue/RH] Job ${jobId} poll: status=${pollData.status}`);

    if (pollData.status === 'SUCCESS') {
      results = pollData.results;
      break;
    }

    if (pollData.status === 'FAILED') {
      const reason = pollData.failedReason?.exception_message || pollData.errorMessage || 'Erro desconhecido';
      console.error(`[GeminiQueue/RH] Job ${jobId} FAILED:`, reason);
      throw new Error(`RunningHub: falha no pré-processamento - ${reason}`);
    }
  }

  if (!results || results.length === 0) {
    throw new Error('RunningHub: timeout no pré-processamento (5 minutos)');
  }

  // Extract image and txt from results
  let generatedImageUrl: string | null = null;
  let generatedPrompt: string | null = null;

  for (const result of results) {
    const outputType = (result.outputType || '').toLowerCase();
    if (['png', 'jpg', 'jpeg', 'webp'].includes(outputType) && result.url) {
      generatedImageUrl = result.url;
    } else if (outputType === 'txt') {
      // txt content can come in result.text directly or need to be downloaded from result.url
      if (result.text) {
        generatedPrompt = result.text.trim();
      } else if (result.url) {
        try {
          const txtRes = await fetch(result.url);
          if (txtRes.ok) {
            generatedPrompt = (await txtRes.text()).trim();
          }
        } catch (e: any) {
          console.warn(`[GeminiQueue/RH] Failed to download txt from ${result.url}: ${e.message}`);
        }
      }
    }
  }

  if (!generatedImageUrl) {
    console.error(`[GeminiQueue/RH] No image output found for job ${jobId}. Results:`, JSON.stringify(results));
    throw new Error('RunningHub: nenhuma imagem gerada no pré-processamento');
  }

  if (!generatedPrompt) {
    console.error(`[GeminiQueue/RH] No txt/prompt output found for job ${jobId}. Results:`, JSON.stringify(results));
    throw new Error('RunningHub: nenhum prompt gerado no pré-processamento');
  }

  console.log(`[GeminiQueue/RH] Job ${jobId} preprocessing complete. Image: ${generatedImageUrl.substring(0, 80)}..., Prompt length: ${generatedPrompt.length}`);
  return { generatedImageUrl, generatedPrompt };
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

  const { prompt, aspect_ratio, duration, quality, context, reference_image_url, raw_input_text } = body;
  if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 3) {
    return jsonResponse({ error: 'Prompt inválido (mínimo 3 caracteres)' }, 400);
  }

  const validContexts = ['video-generator', 'movie-led-maker'];
  if (context && !validContexts.includes(context)) {
    return jsonResponse({ error: 'Contexto inválido' }, 400);
  }

  const creditCost = CREDIT_COSTS[context || 'video-generator'] || 800;

  const { data: balance } = await supabase.rpc('get_upscaler_credits', { _user_id: userId });
  if ((balance ?? 0) < creditCost) {
    return jsonResponse({ error: 'Créditos insuficientes', code: 'INSUFFICIENT_CREDITS' }, 402);
  }

  const { data: activeJobs } = await supabase
    .from(TABLE)
    .select('id')
    .eq('user_id', userId)
    .in('status', ['queued', 'processing'])
    .limit(1);

  if (activeJobs && activeJobs.length > 0) {
    return jsonResponse({ error: 'Você já tem uma geração na fila. Aguarde finalizar.', code: 'USER_HAS_ACTIVE_JOB' }, 409);
  }

  const charged = await chargeCredits(supabase, userId, creditCost, context || 'video-generator');
  if (!charged) {
    return jsonResponse({ error: 'Falha ao debitar créditos', code: 'INSUFFICIENT_CREDITS' }, 402);
  }

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
      reference_image_url: reference_image_url || null,
      raw_input_text: raw_input_text || null,
    })
    .select()
    .single();

  if (error) {
    await refundCredits(supabase, userId, creditCost, context || 'video-generator');
    console.error('[GeminiQueue] Insert error:', error);
    return jsonResponse({ error: 'Erro ao enfileirar job' }, 500);
  }

  console.log(`[GeminiQueue] Job ${job.id} enqueued for user ${userId}, context: ${context}, rawText: ${raw_input_text ? 'yes' : 'no'}, referenceImage: ${reference_image_url ? 'yes' : 'no'}`);
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
  if (!job_id) return jsonResponse({ error: 'job_id obrigatório' }, 400);

  const { data: job, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', job_id)
    .eq('user_id', userId)
    .single();

  if (error || !job) return jsonResponse({ error: 'Job não encontrado' }, 404);
  return jsonResponse(job);
}

// ========== PROCESS QUEUE (CRON/MANUAL) ==========
async function processQueue(): Promise<Response> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  if (!GEMINI_API_KEY) {
    console.error('[GeminiQueue] GOOGLE_GEMINI_API_KEY not configured');
    return jsonResponse({ message: 'API key not configured' }, 500);
  }

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

  console.log(`[GeminiQueue] Processing job ${job.id} for user ${job.user_id} (context=${job.context})`);

  await supabase
    .from(TABLE)
    .update({ status: 'processing', updated_at: new Date().toISOString() })
    .eq('id', job.id);

  // Pre-create movieled_maker_jobs entry IMMEDIATELY so it shows in Custos IA dashboard
  // even if the job later times out / gets stuck. The watchdog will reconcile failures.
  if (job.context === 'movie-led-maker' && job.user_id) {
    try {
      const { error: preInsertErr } = await supabase.from('movieled_maker_jobs').insert({
        user_id: job.user_id,
        session_id: job.id,
        status: 'processing',
        current_step: 'gemini_processing',
        engine: 'gemini-lite',
        api_account: 'gemini',
        credits_charged: true,
        user_credit_cost: CREDIT_COSTS['movie-led-maker'] || 800,
        started_at: new Date().toISOString(),
      });
      if (preInsertErr) {
        console.warn(`[GeminiQueue] Pre-insert movieled_maker_jobs failed (non-fatal):`, preInsertErr.message);
      } else {
        console.log(`[GeminiQueue] Pre-created movieled_maker_jobs entry for ${job.id}`);
      }
    } catch (e: any) {
      console.warn(`[GeminiQueue] Pre-insert exception (non-fatal):`, e.message);
    }
  }

  try {
    // Build instances payload
    const instance: Record<string, unknown> = { prompt: job.prompt };

    // ===== MOVIE-LED-MAKER: RunningHub preprocessing =====
    if (job.context === 'movie-led-maker' && job.raw_input_text && job.reference_image_url) {
      console.log(`[GeminiQueue] Movie LED Maker flow — starting RunningHub preprocessing for job ${job.id}`);

      if (!RUNNINGHUB_API_KEY) {
        throw new Error('RUNNINGHUB_API_KEY não configurada');
      }

      const rhResult = await runRunningHubPreprocessing(
        job.reference_image_url,
        job.raw_input_text,
        job.id
      );

      // Use RunningHub outputs for Gemini
      instance.prompt = rhResult.generatedPrompt;

      // Download the RunningHub-generated image and convert to base64
      console.log(`[GeminiQueue] Downloading RunningHub-generated image for job ${job.id}...`);
      const rhImgRes = await fetch(rhResult.generatedImageUrl);
      if (!rhImgRes.ok) {
        throw new Error(`Falha ao baixar imagem do pré-processamento: HTTP ${rhImgRes.status}`);
      }
      const rhImgBuffer = await rhImgRes.arrayBuffer();
      const rhBase64 = arrayBufferToBase64(rhImgBuffer);
      const rhMimeType = rhImgRes.headers.get('content-type') || 'image/png';
      instance.image = { bytesBase64Encoded: rhBase64, mimeType: rhMimeType };
      console.log(`[GeminiQueue] RunningHub image attached (${(rhImgBuffer.byteLength / 1024).toFixed(0)}KB), prompt: "${rhResult.generatedPrompt.substring(0, 100)}..."`);

    } else {
      // ===== Standard flow: use original reference image if available =====
      if (job.reference_image_url) {
        try {
          console.log(`[GeminiQueue] Downloading reference image for job ${job.id}...`);
          const imgRes = await fetch(job.reference_image_url);
          if (imgRes.ok) {
            const imgBuffer = await imgRes.arrayBuffer();
            const base64 = arrayBufferToBase64(imgBuffer);
            const mimeType = imgRes.headers.get('content-type') || 'image/jpeg';
            instance.image = { bytesBase64Encoded: base64, mimeType };
            console.log(`[GeminiQueue] Reference image attached (${(imgBuffer.byteLength / 1024).toFixed(0)}KB)`);
          } else {
            console.warn(`[GeminiQueue] Failed to download reference image: HTTP ${imgRes.status}, proceeding without it`);
          }
        } catch (imgErr: any) {
          console.warn(`[GeminiQueue] Reference image download error: ${imgErr.message}, proceeding without it`);
        }
      }
    }

    // Start Gemini generation
    const startRes = await fetch(
      `${BASE_URL}/models/${MODEL}:predictLongRunning`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY,
        },
        body: JSON.stringify({
          instances: [instance],
          parameters: {
            aspectRatio: job.aspect_ratio,
            sampleCount: 1,
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
      let friendlyError = `Erro na API de geração (código ${startRes.status})`;
      try {
        const parsed = JSON.parse(errorText);
        const msg = parsed?.error?.message || '';
        if (msg.includes('personGeneration')) {
          friendlyError = 'Parâmetro de geração de pessoas não suportado pelo modelo';
        } else if (msg.includes('INVALID_ARGUMENT')) {
          friendlyError = `Parâmetro inválido: ${msg}`;
        } else if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota')) {
          friendlyError = 'Limite de uso da API atingido. Tente novamente em alguns minutos.';
        } else if (msg.includes('PERMISSION_DENIED')) {
          friendlyError = 'Erro de permissão na API de geração';
        } else if (msg) {
          friendlyError = msg;
        }
      } catch {}
      console.error(`[GeminiQueue] API error for job ${job.id}: ${errorText}`);
      throw new Error(friendlyError);
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

    // Poll until complete (max 10 minutes, every 30s)
    let googleVideoUrl: string | null = null;
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 30000));

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
        googleVideoUrl = pollData.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri ?? null;
        console.log(`[GeminiQueue] Job ${job.id} completed, googleVideoUrl: ${googleVideoUrl ? 'yes' : 'no'}`);
        break;
      }
    }

    if (!googleVideoUrl) {
      throw new Error('Timeout: vídeo não ficou pronto em 10 minutos');
    }

    // Download video from Google and upload to Supabase Storage
    console.log(`[GeminiQueue] Downloading video for job ${job.id}...`);
    const videoRes = await fetch(googleVideoUrl, {
      headers: { 'x-goog-api-key': GEMINI_API_KEY },
    });

    if (!videoRes.ok) {
      throw new Error(`Failed to download video from Google: HTTP ${videoRes.status}`);
    }

    const videoBlob = await videoRes.blob();
    const storagePath = `gemini-videos/${job.user_id}/${job.id}.mp4`;

    const { error: uploadError } = await supabase.storage
      .from('artes-cloudinary')
      .upload(storagePath, videoBlob, {
        contentType: 'video/mp4',
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    const { data: publicUrlData } = supabase.storage
      .from('artes-cloudinary')
      .getPublicUrl(storagePath);

    const publicVideoUrl = publicUrlData.publicUrl;
    console.log(`[GeminiQueue] Video uploaded to storage for job ${job.id}`);

    await supabase
      .from(TABLE)
      .update({
        status: 'completed',
        video_url: publicVideoUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', job.id);
    console.log(`[GeminiQueue] Job ${job.id} marked as completed`);

    // Sync to movieled_maker_jobs for "Minhas Criações" feed (UPDATE pre-created row, fallback to INSERT)
    if (job.context === 'movie-led-maker' && job.user_id) {
      try {
        const { data: existing } = await supabase
          .from('movieled_maker_jobs')
          .select('id')
          .eq('session_id', job.id)
          .maybeSingle();

        if (existing?.id) {
          await supabase.from('movieled_maker_jobs').update({
            status: 'completed',
            output_url: publicVideoUrl,
            completed_at: new Date().toISOString(),
            current_step: 'completed',
          }).eq('id', existing.id);
        } else {
          await supabase.from('movieled_maker_jobs').insert({
            user_id: job.user_id,
            session_id: job.id,
            status: 'completed',
            output_url: publicVideoUrl,
            completed_at: new Date().toISOString(),
            current_step: 'completed',
            engine: 'gemini-lite',
            api_account: 'gemini',
            credits_charged: true,
            user_credit_cost: CREDIT_COSTS['movie-led-maker'] || 800,
          });
        }
        console.log(`[GeminiQueue] Synced movieled_maker_jobs entry for job ${job.id}`);
      } catch (syncErr: any) {
        console.error(`[GeminiQueue] Failed to sync movieled_maker_jobs:`, syncErr.message);
      }
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

    // Mirror failure state to movieled_maker_jobs (so Custos IA reflects reality)
    if (shouldFail && job.context === 'movie-led-maker' && job.user_id) {
      try {
        await supabase.from('movieled_maker_jobs')
          .update({
            status: 'failed',
            error_message: String(e.message || e).substring(0, 500),
            completed_at: new Date().toISOString(),
            current_step: 'failed',
          })
          .eq('session_id', job.id);
      } catch {}
    }

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
