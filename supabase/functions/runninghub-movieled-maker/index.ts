import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * MOVIELED MAKER - EDGE FUNCTION
 * 
 * Gera movies para telão de LED via RunningHub workflow
 * 
 * Models:
 * - veo3.1: Veo 3.1 (8s, 1080p, 850 créditos)
 * - wan2.2: Wan 2.2 (15s, 720p, 500 créditos)
 * 
 * Inputs:
 * - imageUrl: URL da imagem de referência (do storage ou da biblioteca)
 * - inputText: Nome para substituir no telão
 * - engine: 'veo3.1' | 'wan2.2'
 * 
 * Endpoints:
 * - /run - Inicia processamento
 */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RUNNINGHUB_API_KEY = (Deno.env.get('RUNNINGHUB_API_KEY') || Deno.env.get('RUNNINGHUB_APIKEY') || '').trim();

const TABLE_NAME = 'movieled_maker_jobs';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const ENGINE_COSTS: Record<string, number> = {
  'veo3.1': 850,
  'wan2.2': 500,
};

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
        console.warn(`[MovieLedMaker] ${label}: HTTP ${response.status}, retry ${attempt + 1}/${maxRetries} in ${Math.round(delay)}ms`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      return response;
    } catch (error: any) {
      if (attempt < maxRetries - 1) {
        const delay = RETRY_DELAYS[attempt] + Math.random() * 2000;
        console.warn(`[MovieLedMaker] ${label}: ${error.message}, retry ${attempt + 1}/${maxRetries}`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw error;
    }
  }
  throw new Error(`${label}: All retries exhausted`);
}

// ========== UPLOAD IMAGE TO RUNNINGHUB ==========

async function uploadImageToRunningHub(imageUrl: string, label: string): Promise<string> {
  // Download image from URL
  const imgResponse = await fetchWithRetry(imageUrl, { method: 'GET' }, `Download ${label}`);
  if (!imgResponse.ok) throw new Error(`Failed to download ${label}: HTTP ${imgResponse.status}`);
  
  const blob = await imgResponse.blob();
  const ext = imageUrl.includes('.webp') ? 'webp' : imageUrl.includes('.png') ? 'png' : 'jpg';
  const fileName = `movieled_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const formData = new FormData();
  formData.append('apiKey', RUNNINGHUB_API_KEY);
  formData.append('fileType', 'image');
  formData.append('file', blob, fileName);

  const response = await fetchWithRetry(
    'https://www.runninghub.ai/task/openapi/upload',
    { method: 'POST', body: formData },
    `Upload ${label}`
  );

  const data = await response.json();
  console.log(`[MovieLedMaker] Upload ${label} response:`, JSON.stringify(data));

  if (data.code !== 0 || !data.data?.fileName) {
    throw new Error(`${label} upload failed: ${data.msg || data.message || 'Unknown error'}`);
  }

  return data.data.fileName;
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
    
    console.log(`[MovieLedMaker] Job ${jobId}: ${step}`, details || '');
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
    console.log(`[MovieLedMaker] Job ${jobId}: FAILED at ${failedAtStep}:`, errorMessage);
  } catch (e) {
    console.error(`[logStepFailure] Error:`, e);
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
    
    console.log(`[MovieLedMaker] Endpoint called: ${path}`);

    if (path === 'run') {
      return await handleRun(req);
    } else {
      return await handleRun(req);
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[MovieLedMaker] Unhandled error:', error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ========== /run ==========

async function handleRun(req: Request) {
  // Auth validation
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
  const { imageUrl, inputText, engine, referencePromptId } = body;

  if (!imageUrl || typeof imageUrl !== 'string') {
    return new Response(JSON.stringify({ error: 'Imagem de referência é obrigatória' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!inputText || typeof inputText !== 'string' || inputText.trim().length === 0) {
    return new Response(JSON.stringify({ error: 'Nome para o telão é obrigatório' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const selectedEngine = engine && ENGINE_COSTS[engine] ? engine : 'veo3.1';
  const creditCost = ENGINE_COSTS[selectedEngine];

  // Check user active job
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
    console.error('[MovieLedMaker] Check user active error:', e);
  }

  // Create job
  const sessionId = crypto.randomUUID();
  const { data: jobData, error: jobError } = await supabase
    .from(TABLE_NAME)
    .insert({
      user_id: verifiedUserId,
      session_id: sessionId,
      status: 'pending',
      engine: selectedEngine,
      input_image_url: imageUrl,
      input_text: inputText.trim(),
      reference_prompt_id: referencePromptId || null,
      current_step: 'pending',
      api_account: 'primary',
    })
    .select('id')
    .single();

  if (jobError || !jobData) {
    console.error('[MovieLedMaker] Job insert error:', jobError);
    return new Response(JSON.stringify({ error: 'Erro ao criar job' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const jobId = jobData.id;
  await logStep(jobId, 'created', { engine: selectedEngine, creditCost });

  // Consume credits
  await logStep(jobId, 'consuming_credits', { amount: creditCost });

  const { data: creditResult, error: creditError } = await supabase.rpc(
    'consume_upscaler_credits',
    { _user_id: verifiedUserId, _amount: creditCost, _description: `MovieLed Maker (${selectedEngine === 'veo3.1' ? 'Veo 3.1' : 'Wan 2.2'})` }
  );

  if (creditError) {
    console.error('[MovieLedMaker] Credit consumption error:', creditError);
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

  // CRITICAL: Mark credits_charged=true
  await supabase.from(TABLE_NAME).update({
    credits_charged: true,
    user_credit_cost: creditCost,
  }).eq('id', jobId);
  console.log(`[MovieLedMaker] Job ${jobId} marked as credits_charged=true (cost=${creditCost})`);

  // Upload reference image to RunningHub
  let rhFileName: string;
  try {
    await logStep(jobId, 'uploading_image');
    rhFileName = await uploadImageToRunningHub(imageUrl, 'reference_image');
    await logStep(jobId, 'image_uploaded', { rhFileName });
  } catch (error: any) {
    const errorMsg = error.message || 'Image upload failed';
    console.error('[MovieLedMaker] Image upload error:', errorMsg);
    
    try {
      await supabase.rpc('refund_upscaler_credits', {
        _user_id: verifiedUserId, _amount: creditCost,
        _description: `MOVIELED_UPLOAD_REFUNDED: ${errorMsg.slice(0, 100)}`
      });
      await logStepFailure(jobId, 'upload_image', errorMsg);
      await supabase.from(TABLE_NAME).update({
        status: 'failed',
        error_message: `IMAGE_TRANSFER_ERROR: ${errorMsg.slice(0, 200)}`,
        credits_refunded: true,
        completed_at: new Date().toISOString()
      }).eq('id', jobId);
    } catch {
      await supabase.from(TABLE_NAME).update({
        status: 'failed',
        error_message: `IMAGE_TRANSFER_ERROR: ${errorMsg.slice(0, 200)}`,
        completed_at: new Date().toISOString()
      }).eq('id', jobId);
    }
    
    return new Response(JSON.stringify({ error: errorMsg, code: 'IMAGE_TRANSFER_ERROR', refunded: true }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Save job_payload
  const jobPayload = {
    engine: selectedEngine,
    inputText: inputText.trim(),
    rhFileName,
    imageUrl,
    referencePromptId: referencePromptId || null,
  };

  await supabase.from(TABLE_NAME).update({
    job_payload: jobPayload,
  }).eq('id', jobId);

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
    console.error('[MovieLedMaker] Queue Manager call failed:', errorMessage);
    
    try {
      await supabase.rpc('refund_upscaler_credits', {
        _user_id: verifiedUserId, _amount: creditCost,
        _description: `QM_EXCEPTION_REFUNDED: ${errorMessage.slice(0, 100)}`
      });
      await supabase.from(TABLE_NAME).update({
        status: 'failed',
        error_message: `QM_EXCEPTION_REFUNDED: ${errorMessage.slice(0, 200)}`,
        credits_refunded: true,
        completed_at: new Date().toISOString()
      }).eq('id', jobId);
    } catch {
      await supabase.from(TABLE_NAME).update({
        status: 'failed',
        error_message: `QM_EXCEPTION: ${errorMessage.slice(0, 200)}`,
        completed_at: new Date().toISOString()
      }).eq('id', jobId);
    }
    
    return new Response(JSON.stringify({ error: errorMessage, code: 'RUN_EXCEPTION', refunded: true }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
