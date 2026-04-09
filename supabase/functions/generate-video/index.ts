import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * GENERATE VIDEO - EDGE FUNCTION
 * 
 * Models:
 * - veo3.1-fast: Veo 3.1 Fast via Evolink API (2500 credits)
 * - veo3.1-pro: Veo 3.1 Pro via Evolink API (5000 credits)
 * - wan2.2: Wan 2.2 via RunningHub (400 credits)
 * 
 * Endpoints:
 * - /run - Inicia processamento
 * - /queue-status - Consulta status do job
 * - /poll-evolink - Polling para jobs Evolink
 */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RUNNINGHUB_API_KEY = (Deno.env.get('RUNNINGHUB_API_KEY') || Deno.env.get('RUNNINGHUB_APIKEY') || '').trim();
const EVOLINK_API_KEY = Deno.env.get('EVOLINK_API_KEY') || '';

const TABLE_NAME = 'video_generator_jobs';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const MODEL_COSTS: Record<string, number> = {
  'veo3.1-fast': 1500,
  'veo3.1-pro': 2800,
  'wan2.2': 400,
};

const MODEL_COSTS_WITH_AUDIO: Record<string, number> = {
  'veo3.1-fast': 2500,
  'veo3.1-pro': 5000,
};

const EVOLINK_MODEL_MAP: Record<string, string> = {
  'veo3.1-fast': 'veo-3.1-fast-generate-preview',
  'veo3.1-pro': 'veo-3.1-generate-preview',
};

function isEvolinkModel(model: string): boolean {
  return model === 'veo3.1-fast' || model === 'veo3.1-pro';
}

// ========== RESILIENT FETCH ==========

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  label: string,
  maxRetries = 4
): Promise<Response> {
  const RETRYABLE_STATUSES = [429, 500, 502, 503, 504, 520, 521, 522, 523, 524, 525];
  const RETRY_DELAYS = [3000, 6000, 12000, 20000];

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeout);

      if (RETRYABLE_STATUSES.includes(response.status) && attempt < maxRetries - 1) {
        await response.text();
        const delay = RETRY_DELAYS[attempt] + Math.random() * 2000;
        console.warn(`[VideoGenerator] ${label}: HTTP ${response.status}, retry ${attempt + 1}/${maxRetries} in ${Math.round(delay)}ms`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      return response;
    } catch (error: any) {
      if (attempt < maxRetries - 1) {
        const delay = RETRY_DELAYS[attempt] + Math.random() * 2000;
        console.warn(`[VideoGenerator] ${label}: ${error.message}, retry ${attempt + 1}/${maxRetries}`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw error;
    }
  }
  throw new Error(`${label}: All retries exhausted`);
}

// ========== UPLOAD FRAME TO RUNNINGHUB ==========

async function uploadFrameToRunningHub(
  base64Data: string,
  mimeType: string,
  label: string
): Promise<string> {
  const bytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
  const ext = mimeType.includes('jpeg') || mimeType.includes('jpg') ? 'jpg' 
    : mimeType.includes('webp') ? 'webp' : 'png';
  const fileName = `video_frame_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const formData = new FormData();
  formData.append('apiKey', RUNNINGHUB_API_KEY);
  formData.append('fileType', 'image');
  formData.append('file', new Blob([bytes], { type: mimeType }), fileName);

  const response = await fetchWithRetry(
    'https://www.runninghub.ai/task/openapi/upload',
    { method: 'POST', body: formData },
    `Upload ${label}`
  );

  const data = await response.json();
  console.log(`[VideoGenerator] Upload ${label} response:`, JSON.stringify(data));

  if (data.code !== 0 || !data.data?.fileName) {
    throw new Error(`${label} upload failed: ${data.msg || data.message || 'Unknown error'}`);
  }

  return data.data.fileName;
}

// ========== UPLOAD FRAME TO SUPABASE STORAGE (for Evolink) ==========

async function uploadFrameToStorage(
  base64Data: string,
  mimeType: string,
  userId: string,
  label: string
): Promise<string> {
  const bytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
  const ext = mimeType.includes('jpeg') || mimeType.includes('jpg') ? 'jpg' 
    : mimeType.includes('webp') ? 'webp' : 'png';
  const fileName = `${userId}/video_frame_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { data, error } = await supabase.storage
    .from('artes-cloudinary')
    .upload(fileName, bytes, {
      contentType: mimeType,
      upsert: false,
    });

  if (error) {
    throw new Error(`${label} storage upload failed: ${error.message}`);
  }

  const { data: urlData } = supabase.storage
    .from('artes-cloudinary')
    .getPublicUrl(fileName);

  return urlData.publicUrl;
}

// ========== OBSERVABILITY HELPER ==========

async function logStep(
  jobId: string,
  step: string,
  details?: Record<string, any>
): Promise<void> {
  const timestamp = new Date().toISOString();
  const entry = { step, timestamp, ...details };
  
  try {
    const { data: job } = await supabase
      .from(TABLE_NAME)
      .select('step_history')
      .eq('id', jobId)
      .maybeSingle();
    
    const currentHistory = (job?.step_history as any[]) || [];
    const newHistory = [...currentHistory, entry];
    
    await supabase
      .from(TABLE_NAME)
      .update({ current_step: step, step_history: newHistory })
      .eq('id', jobId);
    
    console.log(`[VideoGenerator] Job ${jobId}: ${step}`, details || '');
  } catch (e) {
    console.error(`[logStep] Error:`, e);
  }
}

async function logStepFailure(
  jobId: string,
  failedAtStep: string,
  errorMessage: string,
  rawResponse?: Record<string, any>
): Promise<void> {
  const timestamp = new Date().toISOString();
  const entry = { step: 'failed', timestamp, at_step: failedAtStep, error: errorMessage };
  
  try {
    const { data: job } = await supabase
      .from(TABLE_NAME)
      .select('step_history')
      .eq('id', jobId)
      .maybeSingle();
    
    const currentHistory = (job?.step_history as any[]) || [];
    const newHistory = [...currentHistory, entry];
    
    const updateData: Record<string, any> = {
      current_step: 'failed',
      failed_at_step: failedAtStep,
      step_history: newHistory,
    };
    if (rawResponse) updateData.raw_api_response = rawResponse;
    
    await supabase.from(TABLE_NAME).update(updateData).eq('id', jobId);
    console.log(`[VideoGenerator] Job ${jobId}: FAILED at ${failedAtStep}:`, errorMessage);
  } catch (e) {
    console.error(`[logStepFailure] Error:`, e);
  }
}

// ========== EVOLINK VIDEO GENERATION ==========

async function callEvolinkGenerate(
  jobId: string,
  model: string,
  prompt: string,
  aspectRatio: string,
  generateAudio: boolean,
  imageUrls: string[],
  generationType: string
): Promise<{ taskId: string } | { error: string }> {
  if (!EVOLINK_API_KEY) {
    return { error: 'EVOLINK_API_KEY not configured' };
  }

  const evolinkModel = EVOLINK_MODEL_MAP[model];
  if (!evolinkModel) {
    return { error: `Unknown Evolink model: ${model}` };
  }

  const payload: Record<string, unknown> = {
    model: evolinkModel,
    prompt,
    duration: 8,
    quality: '1080p',
    aspect_ratio: aspectRatio || '16:9',
    generate_audio: generateAudio,
    generation_type: generationType,
  };

  if (imageUrls.length > 0) {
    payload.image_urls = imageUrls;
  }

  console.log(`[VideoGenerator] Calling Evolink:`, JSON.stringify({ model: evolinkModel, generationType, duration: 8, quality: '1080p', aspectRatio, generateAudio, imageCount: imageUrls.length }));

  try {
    const response = await fetchWithRetry(
      'https://api.evolink.ai/v1/videos/generations',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${EVOLINK_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      },
      'Evolink Generate'
    );

    const data = await response.json();
    console.log(`[VideoGenerator] Evolink response:`, JSON.stringify(data));

    if (!response.ok || !data.id) {
      const errMsg = data.error?.message || data.error?.code || `Evolink API error: ${response.status}`;
      return { error: errMsg };
    }

    return { taskId: data.id };
  } catch (error: any) {
    return { error: error.message || 'Evolink API call failed' };
  }
}

// ========== EVOLINK POLL ==========

async function handlePollEvolink(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const userClient = createClient(SUPABASE_URL, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { job_id } = await req.json();
  if (!job_id) {
    return new Response(JSON.stringify({ error: 'job_id is required' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Get the job
  const { data: job, error: jobError } = await supabase
    .from(TABLE_NAME)
    .select('id, status, task_id, user_id, model, credits_charged, user_credit_cost')
    .eq('id', job_id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (jobError || !job) {
    return new Response(JSON.stringify({ error: 'Job not found' }), {
      status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (job.status === 'completed' || job.status === 'failed') {
    return new Response(JSON.stringify({ status: job.status }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!job.task_id) {
    return new Response(JSON.stringify({ status: 'pending', progress: 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Poll Evolink
  try {
    const pollResponse = await fetch(`https://api.evolink.ai/v1/tasks/${job.task_id}`, {
      headers: { 'Authorization': `Bearer ${EVOLINK_API_KEY}` },
    });

    const pollData = await pollResponse.json();
    console.log(`[VideoGenerator] Evolink poll ${job.task_id}: status=${pollData.status}, progress=${pollData.progress}`);

    if (pollData.status === 'completed') {
      const outputUrl = pollData.results?.[0] || null;

      await supabase.from(TABLE_NAME).update({
        status: 'completed',
        output_url: outputUrl,
        completed_at: new Date().toISOString(),
        current_step: 'completed',
      }).eq('id', job_id);

      return new Response(JSON.stringify({
        status: 'completed',
        output_url: outputUrl,
        progress: 100,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (pollData.status === 'failed') {
      const errMsg = pollData.error?.message || 'Generation failed';

      // Refund credits if charged
      if (job.credits_charged && job.user_credit_cost && job.user_credit_cost > 0) {
        try {
          await supabase.rpc('refund_upscaler_credits', {
            _user_id: job.user_id,
            _amount: job.user_credit_cost,
            _description: `EVOLINK_FAILED_REFUND: ${errMsg.slice(0, 100)}`,
          });
          await supabase.from(TABLE_NAME).update({ credits_refunded: true }).eq('id', job_id);
        } catch (e) {
          console.error('[VideoGenerator] Refund error:', e);
        }
      }

      await supabase.from(TABLE_NAME).update({
        status: 'failed',
        error_message: errMsg,
        current_step: 'failed',
        failed_at_step: 'evolink_generation',
        completed_at: new Date().toISOString(),
      }).eq('id', job_id);

      return new Response(JSON.stringify({
        status: 'failed',
        error: errMsg,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Still processing
    return new Response(JSON.stringify({
      status: pollData.status || 'processing',
      progress: pollData.progress || 0,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[VideoGenerator] Evolink poll error:', error);
    return new Response(JSON.stringify({ status: 'processing', progress: 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// ========== MAIN HANDLER ==========

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();
    
    console.log(`[VideoGenerator] Endpoint called: ${path}`);

    if (path === 'run') {
      return await handleRun(req);
    } else if (path === 'queue-status') {
      return await handleQueueStatus(req);
    } else if (path === 'poll-evolink') {
      return await handlePollEvolink(req);
    } else {
      return await handleRun(req);
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[VideoGenerator] Unhandled error:', error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ========== /run ==========

async function handleRun(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing Authorization header', code: 'UNAUTHORIZED' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const userClient = createClient(SUPABASE_URL, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: userError } = await userClient.auth.getUser();
  
  if (userError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized', code: 'UNAUTHORIZED' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const verifiedUserId = user.id;

  const body = await req.json();
  const { prompt, aspect_ratio, model, start_frame, end_frame, generate_audio: requestAudio } = body;

  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    return new Response(JSON.stringify({ error: 'Prompt é obrigatório' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const selectedModel = model && MODEL_COSTS[model] ? model : 'veo3.1-fast';
  const validRatios = ['16:9', '9:16'];
  const ratio = validRatios.includes(aspect_ratio) ? aspect_ratio : '16:9';
  const duration = selectedModel === 'wan2.2' ? 5 : 8;

  // Check user active job (prevent duplicates)
  try {
    const checkResponse = await fetch(`${SUPABASE_URL}/functions/v1/runninghub-queue-manager/check-user-active`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
      body: JSON.stringify({ userId: verifiedUserId }),
    });
    const checkResult = await checkResponse.json();
    if (checkResult.hasActiveJob) {
      return new Response(JSON.stringify({
        error: `Você já tem um processamento ativo (${checkResult.activeTool}). Aguarde finalizar.`,
        code: 'USER_HAS_ACTIVE_JOB',
        activeTool: checkResult.activeTool,
      }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (e) {
    console.error('[VideoGenerator] Check user active error:', e);
  }

  // Determine if user wants audio (only for Evolink models)
  const wantsAudio = isEvolinkModel(selectedModel) && requestAudio === true;
  let creditCost = wantsAudio && MODEL_COSTS_WITH_AUDIO[selectedModel]
    ? MODEL_COSTS_WITH_AUDIO[selectedModel]
    : MODEL_COSTS[selectedModel];

  // Check if user is IA Unlimited (Planos2)
  const { data: isUnlimitedResult } = await supabase.rpc('is_unlimited_subscriber', { _user_id: verifiedUserId });
  const isPlanos2Unlimited = !!isUnlimitedResult;

  let skipCredits = false;
  let forceNoAudio = false;

  if (isPlanos2Unlimited) {
    if (selectedModel === 'wan2.2') {
      // Wan 2.2 is unlimited — no credit charge
      skipCredits = true;
      creditCost = 0;
      console.log(`[VideoGenerator] Unlimited user ${verifiedUserId}: Wan 2.2 is FREE`);
    } else if (isEvolinkModel(selectedModel)) {
      // Check Veo 3.1 trial period (7 days from subscription)
      const { data: trialData } = await supabase.rpc('check_veo3_unlimited_trial', { _user_id: verifiedUserId });
      if (trialData?.in_trial) {
        // Trial: only veo3.1-fast, no audio, 0 credits
        skipCredits = true;
        creditCost = 0;
        forceNoAudio = true;
        console.log(`[VideoGenerator] Unlimited user ${verifiedUserId}: Veo 3.1 Fast FREE (trial, ${trialData.days_remaining} days left)`);
      } else {
        // After trial: charge credits normally
        console.log(`[VideoGenerator] Unlimited user ${verifiedUserId}: Veo 3.1 charges ${creditCost} credits (trial expired)`);
      }
    }
  }

  // Create job in pending state
  const sessionId = crypto.randomUUID();
  const { data: jobData, error: jobError } = await supabase
    .from(TABLE_NAME)
    .insert({
      user_id: verifiedUserId,
      prompt: prompt.trim(),
      aspect_ratio: ratio,
      duration_seconds: duration,
      model: selectedModel,
      session_id: sessionId,
      status: 'pending',
      current_step: 'pending',
      api_account: isEvolinkModel(selectedModel) ? 'evolink' : 'primary',
    })
    .select('id')
    .single();

  if (jobError || !jobData) {
    console.error('[VideoGenerator] Job insert error:', jobError);
    return new Response(JSON.stringify({ error: 'Erro ao criar job' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const jobId = jobData.id;
  await logStep(jobId, 'created', { model: selectedModel, creditCost, skipCredits, isEvolink: isEvolinkModel(selectedModel) });

  if (skipCredits) {
    console.log(`[VideoGenerator] Job ${jobId}: credits SKIPPED (unlimited tool)`);
    await supabase.from(TABLE_NAME).update({
      credits_charged: false,
      user_credit_cost: 0,
    }).eq('id', jobId);
  } else {
    // Consume credits
    await logStep(jobId, 'consuming_credits', { amount: creditCost });

    const modelLabel = selectedModel === 'veo3.1-fast' ? 'Veo 3.1 Fast' : selectedModel === 'veo3.1-pro' ? 'Veo 3.1 Pro' : 'Wan 2.2';
    const { data: creditResult, error: creditError } = await supabase.rpc(
      'consume_upscaler_credits',
      { _user_id: verifiedUserId, _amount: creditCost, _description: `Gerar Vídeo (${modelLabel})` }
    );

    if (creditError) {
      console.error('[VideoGenerator] Credit consumption error:', creditError);
      await logStepFailure(jobId, 'consume_credits', creditError.message);
      await supabase.from(TABLE_NAME).update({ status: 'failed', error_message: 'Erro ao processar créditos' }).eq('id', jobId);
      return new Response(JSON.stringify({ error: 'Erro ao processar créditos', code: 'CREDIT_ERROR' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!creditResult || creditResult.length === 0 || !creditResult[0].success) {
      const errorMsg = creditResult?.[0]?.error_message || 'Saldo insuficiente';
      await logStepFailure(jobId, 'consume_credits', errorMsg);
      await supabase.from(TABLE_NAME).update({ status: 'failed', error_message: errorMsg }).eq('id', jobId);
      return new Response(JSON.stringify({ error: errorMsg, code: 'INSUFFICIENT_CREDITS' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[VideoGenerator] Credits consumed. New balance: ${creditResult[0].new_balance}`);
    await supabase.from(TABLE_NAME).update({
      credits_charged: true,
      user_credit_cost: creditCost,
    }).eq('id', jobId);
    console.log(`[VideoGenerator] Job ${jobId} marked as credits_charged=true (cost=${creditCost})`);
  }

  // ========== EVOLINK PATH (Veo 3.1) ==========
  if (isEvolinkModel(selectedModel)) {
    const hasStartFrame = start_frame?.base64 && start_frame?.mimeType;
    const hasEndFrame = end_frame?.base64 && end_frame?.mimeType;
    const imageUrls: string[] = [];

    // Upload frames to storage to get public URLs for Evolink
    if (hasStartFrame || hasEndFrame) {
      await logStep(jobId, 'uploading_frames');
      try {
        if (hasStartFrame) {
          const url = await uploadFrameToStorage(start_frame.base64, start_frame.mimeType, verifiedUserId, 'start_frame');
          imageUrls.push(url);
          console.log(`[VideoGenerator] Start frame uploaded to storage`);
        }
        if (hasEndFrame) {
          const url = await uploadFrameToStorage(end_frame.base64, end_frame.mimeType, verifiedUserId, 'end_frame');
          imageUrls.push(url);
          console.log(`[VideoGenerator] End frame uploaded to storage`);
        }
        await logStep(jobId, 'frames_uploaded', { count: imageUrls.length });
      } catch (error: any) {
        const errorMsg = error.message || 'Frame upload failed';
        console.error('[VideoGenerator] Frame upload error:', errorMsg);
        if (!skipCredits && creditCost > 0) {
          try {
            await supabase.rpc('refund_upscaler_credits', { _user_id: verifiedUserId, _amount: creditCost, _description: `FRAME_UPLOAD_REFUNDED: ${errorMsg.slice(0, 100)}` });
            await supabase.from(TABLE_NAME).update({ status: 'failed', error_message: `IMAGE_TRANSFER_ERROR: ${errorMsg.slice(0, 200)}`, credits_refunded: true, completed_at: new Date().toISOString() }).eq('id', jobId);
          } catch { /* ignore */ }
        } else {
          await supabase.from(TABLE_NAME).update({ status: 'failed', error_message: `IMAGE_TRANSFER_ERROR: ${errorMsg.slice(0, 200)}`, completed_at: new Date().toISOString() }).eq('id', jobId);
        }
        return new Response(JSON.stringify({ error: errorMsg, code: 'IMAGE_TRANSFER_ERROR', refunded: !skipCredits }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Determine generation_type
    let generationType = 'TEXT';
    if (imageUrls.length > 0) {
      generationType = imageUrls.length <= 2 ? 'FIRST&LAST' : 'REFERENCE';
    }

    // Determine audio: trial users get no audio
    const generateAudio = forceNoAudio ? false : true;

    await logStep(jobId, 'calling_evolink', { model: selectedModel, generationType, generateAudio });

    const result = await callEvolinkGenerate(
      jobId,
      selectedModel,
      prompt.trim(),
      ratio,
      generateAudio,
      imageUrls,
      generationType,
    );

    if ('error' in result) {
      if (!skipCredits && creditCost > 0) {
        try {
          await supabase.rpc('refund_upscaler_credits', { _user_id: verifiedUserId, _amount: creditCost, _description: `EVOLINK_ERROR_REFUND: ${result.error.slice(0, 100)}` });
          await supabase.from(TABLE_NAME).update({ credits_refunded: true }).eq('id', jobId);
        } catch { /* ignore */ }
      }
      await logStepFailure(jobId, 'evolink_generate', result.error);
      await supabase.from(TABLE_NAME).update({
        status: 'failed',
        error_message: result.error,
        completed_at: new Date().toISOString(),
      }).eq('id', jobId);
      return new Response(JSON.stringify({ error: result.error, code: 'EVOLINK_ERROR', refunded: !skipCredits }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Success - save task_id and mark as running
    await supabase.from(TABLE_NAME).update({
      task_id: result.taskId,
      status: 'running',
      current_step: 'evolink_processing',
      started_at: new Date().toISOString(),
      job_payload: { prompt: prompt.trim(), aspectRatio: ratio, duration, model: selectedModel, generationType, generateAudio, imageUrls },
    }).eq('id', jobId);

    await logStep(jobId, 'evolink_submitted', { taskId: result.taskId });

    return new Response(JSON.stringify({
      success: true,
      job_id: jobId,
      taskId: result.taskId,
      engine: 'evolink',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ========== RUNNINGHUB PATH (Wan 2.2) ==========
  const jobPayload: any = {
    prompt: prompt.trim(),
    aspectRatio: ratio,
    duration,
    model: selectedModel,
  };

  const hasStartFrame = start_frame?.base64 && start_frame?.mimeType;
  const hasEndFrame = end_frame?.base64 && end_frame?.mimeType;

  if (hasStartFrame || hasEndFrame) {
    await logStep(jobId, 'uploading_frames');
    
    try {
      if (hasStartFrame) {
        const startFileName = await uploadFrameToRunningHub(start_frame.base64, start_frame.mimeType, 'start_frame');
        jobPayload.startFrameFileName = startFileName;
        console.log(`[VideoGenerator] Start frame uploaded: ${startFileName}`);
      }

      if (hasEndFrame) {
        const endFileName = await uploadFrameToRunningHub(end_frame.base64, end_frame.mimeType, 'end_frame');
        jobPayload.endFrameFileName = endFileName;
        console.log(`[VideoGenerator] End frame uploaded: ${endFileName}`);
      }

      await logStep(jobId, 'frames_uploaded', { startFrame: !!jobPayload.startFrameFileName, endFrame: !!jobPayload.endFrameFileName });
    } catch (error: any) {
      const errorMsg = error.message || 'Frame upload failed';
      console.error('[VideoGenerator] Frame upload error:', errorMsg);
      
      if (!skipCredits && creditCost > 0) {
        try {
          await supabase.rpc('refund_upscaler_credits', { _user_id: verifiedUserId, _amount: creditCost, _description: `FRAME_UPLOAD_REFUNDED: ${errorMsg.slice(0, 100)}` });
          await logStepFailure(jobId, 'upload_frames', errorMsg);
          await supabase.from(TABLE_NAME).update({ status: 'failed', error_message: `IMAGE_TRANSFER_ERROR: ${errorMsg.slice(0, 200)}`, credits_refunded: true, completed_at: new Date().toISOString() }).eq('id', jobId);
        } catch {
          await supabase.from(TABLE_NAME).update({ status: 'failed', error_message: `IMAGE_TRANSFER_ERROR: ${errorMsg.slice(0, 200)}`, completed_at: new Date().toISOString() }).eq('id', jobId);
        }
      } else {
        await supabase.from(TABLE_NAME).update({ status: 'failed', error_message: `IMAGE_TRANSFER_ERROR: ${errorMsg.slice(0, 200)}`, completed_at: new Date().toISOString() }).eq('id', jobId);
      }
      
      return new Response(JSON.stringify({ error: errorMsg, code: 'IMAGE_TRANSFER_ERROR', refunded: !skipCredits }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  // Save job_payload
  await supabase.from(TABLE_NAME).update({ job_payload: jobPayload }).eq('id', jobId);

  // Delegate to queue manager
  try {
    await logStep(jobId, 'delegating_to_queue');
    
    const qmUrl = `${SUPABASE_URL}/functions/v1/runninghub-queue-manager/run-or-queue`;
    const qmResponse = await fetch(qmUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
      body: JSON.stringify({ table: TABLE_NAME, jobId }),
    });
    const qmResult = await qmResponse.json();

    if (qmResult.queued) {
      return new Response(JSON.stringify({ success: true, queued: true, position: qmResult.position, job_id: jobId }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    if (qmResult.taskId) {
      return new Response(JSON.stringify({ success: true, job_id: jobId, taskId: qmResult.taskId }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: qmResult.error || 'Failed to start job', code: 'RUN_FAILED', refunded: true }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[VideoGenerator] Queue Manager call failed:', errorMessage);
    
    try {
      if (!skipCredits && creditCost > 0) {
        await supabase.rpc('refund_upscaler_credits', { _user_id: verifiedUserId, _amount: creditCost, _description: `QM_EXCEPTION_REFUNDED: ${errorMessage.slice(0, 100)}` });
        await supabase.from(TABLE_NAME).update({ status: 'failed', error_message: `QM_EXCEPTION_REFUNDED: ${errorMessage.slice(0, 200)}`, credits_refunded: true, completed_at: new Date().toISOString() }).eq('id', jobId);
      } else {
        await supabase.from(TABLE_NAME).update({ status: 'failed', error_message: `QM_EXCEPTION: ${errorMessage.slice(0, 200)}`, completed_at: new Date().toISOString() }).eq('id', jobId);
      }
    } catch {
      await supabase.from(TABLE_NAME).update({ status: 'failed', error_message: `QM_EXCEPTION: ${errorMessage.slice(0, 200)}`, completed_at: new Date().toISOString() }).eq('id', jobId);
    }
    
    return new Response(JSON.stringify({ error: errorMessage, code: 'RUN_EXCEPTION', refunded: !skipCredits }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// ========== /queue-status ==========

async function handleQueueStatus(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const userClient = createClient(SUPABASE_URL, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: userError } = await userClient.auth.getUser();
  
  if (userError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { job_id } = await req.json();
  if (!job_id) {
    return new Response(JSON.stringify({ error: 'job_id is required' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: job, error: jobError } = await supabase
    .from(TABLE_NAME)
    .select('id, status, position, output_url, error_message, current_step')
    .eq('id', job_id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (jobError || !job) {
    return new Response(JSON.stringify({ error: 'Job not found' }), {
      status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({
    status: job.status,
    position: job.position,
    output_url: job.output_url,
    error_message: job.error_message,
    current_step: job.current_step,
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
