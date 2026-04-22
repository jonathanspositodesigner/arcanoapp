import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { evolinkGenerate, evolinkPoll } from "../_shared/evolink-client.ts";

/**
 * MOVIELED MAKER - EDGE FUNCTION v4
 * 
 * Gera movies para telão de LED:
 * - Wan 2.2: via RunningHub workflow (500 créditos, 15s, 720p)
 * - Veo 3.1: via Evolink API centralizada (1500 créditos, 6s, 1080p, sem áudio)
 */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RUNNINGHUB_API_KEY = (Deno.env.get('RUNNINGHUB_API_KEY') || Deno.env.get('RUNNINGHUB_APIKEY') || '').trim();
const EVOLINK_API_KEY = Deno.env.get('EVOLINK_API_KEY') || '';

const TABLE_NAME = 'movieled_maker_jobs';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const ENGINE_COSTS: Record<string, number> = {
  'veo3.1': 1500,
  'wan2.2': 500,
  'kling2.5': 900,
};

// ========== RESILIENT FETCH (for RunningHub only) ==========

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

// ========== DOWNLOAD IMAGE WITH FALLBACK ==========

async function downloadImageWithFallback(
  primaryUrl: string,
  fallbackUrl: string | null,
  label: string
): Promise<Blob> {
  const urls = [primaryUrl];
  if (fallbackUrl && fallbackUrl !== primaryUrl) {
    urls.push(fallbackUrl);
  }

  let lastError = '';
  for (const url of urls) {
    try {
      console.log(`[MovieLedMaker] Trying to download ${label} from: ${url.slice(0, 120)}`);
      const response = await fetchWithRetry(url, { method: 'GET' }, `Download ${label}`);
      if (response.ok) {
        const blob = await response.blob();
        if (blob.size > 0) {
          console.log(`[MovieLedMaker] Downloaded ${label}: ${blob.size} bytes from ${url.slice(0, 80)}`);
          return blob;
        }
        lastError = `Empty response from ${url.slice(0, 80)}`;
      } else {
        lastError = `HTTP ${response.status} from ${url.slice(0, 80)}`;
        console.warn(`[MovieLedMaker] ${label} download failed: ${lastError}`);
      }
    } catch (e: any) {
      lastError = e.message || 'Unknown download error';
      console.warn(`[MovieLedMaker] ${label} download exception from ${url.slice(0, 80)}: ${lastError}`);
    }
  }

  throw new Error(`All URLs failed for ${label}: ${lastError}`);
}

// ========== UPLOAD IMAGE TO RUNNINGHUB ==========

async function uploadImageToRunningHub(
  primaryUrl: string,
  fallbackUrl: string | null,
  label: string
): Promise<string> {
  const blob = await downloadImageWithFallback(primaryUrl, fallbackUrl, label);
  
  const ext = primaryUrl.includes('.webp') ? 'webp' : primaryUrl.includes('.png') ? 'png' : 'jpg';
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

// ========== AUTH HELPER ==========

async function authenticateRequest(req: Request): Promise<{ userId: string } | Response> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing Authorization header', code: 'UNAUTHORIZED' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const token = authHeader.replace('Bearer ', '');
  const serviceClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  
  const { data: { user }, error: userError } = await serviceClient.auth.getUser(token);
  if (userError || !user) {
    console.error('[MovieLedMaker] getUser failed:', userError);
    return new Response(JSON.stringify({ error: 'Unauthorized', code: 'UNAUTHORIZED' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  
  const verifiedUserId = user.id;

  return { userId: verifiedUserId };
}

// ========== POLL EVOLINK (uses shared client) ==========

async function handlePollEvolink(req: Request) {
  const authResult = await authenticateRequest(req);
  if (authResult instanceof Response) return authResult;

  const { job_id } = await req.json();
  if (!job_id) {
    return new Response(JSON.stringify({ error: 'job_id is required' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Get the job (verify ownership)
  const { data: job, error: jobError } = await supabase
    .from(TABLE_NAME)
    .select('id, status, task_id, user_id, engine, credits_charged, user_credit_cost')
    .eq('id', job_id)
    .eq('user_id', authResult.userId)
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

  // Poll using shared Evolink client
  const pollResult = await evolinkPoll(EVOLINK_API_KEY, job.task_id);

  if (pollResult.status === 'completed') {
    // Re-upload external Evolink URL to Supabase storage for persistence
    let finalUrl = pollResult.outputUrl;
    try {
      if (finalUrl && !finalUrl.includes('supabase.co/storage')) {
        console.log(`[MovieLedMaker] Re-uploading Evolink output to storage for job ${job_id}`);
        const videoRes = await fetch(finalUrl);
        if (videoRes.ok) {
          const videoBlob = await videoRes.blob();
          const storagePath = `movieled/${authResult.userId}/${job_id}.mp4`;
          const { error: uploadErr } = await supabase.storage
            .from('artes-cloudinary')
            .upload(storagePath, videoBlob, { contentType: 'video/mp4', upsert: true });
          if (!uploadErr) {
            const { data: publicData } = supabase.storage
              .from('artes-cloudinary')
              .getPublicUrl(storagePath);
            finalUrl = publicData.publicUrl;
            console.log(`[MovieLedMaker] Re-uploaded to: ${storagePath}`);
          }
        }
      }
    } catch (e) {
      console.error(`[MovieLedMaker] Re-upload failed (keeping original):`, e);
    }

    await supabase.from(TABLE_NAME).update({
      status: 'completed',
      output_url: finalUrl,
      completed_at: new Date().toISOString(),
      current_step: 'completed',
    }).eq('id', job_id);

    return new Response(JSON.stringify({
      status: 'completed',
      output_url: finalUrl,
      progress: 100,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (pollResult.status === 'failed') {
    const errMsg = pollResult.error || 'Generation failed';

    // Refund credits
    if (job.credits_charged && job.user_credit_cost && job.user_credit_cost > 0) {
      try {
        await supabase.rpc('refund_upscaler_credits', {
          _user_id: job.user_id,
          _amount: job.user_credit_cost,
          _description: `MOVIELED_EVOLINK_FAILED_REFUND: ${errMsg.slice(0, 100)}`,
        });
        await supabase.from(TABLE_NAME).update({ credits_refunded: true }).eq('id', job_id);
      } catch (e) {
        console.error('[MovieLedMaker] Refund error:', e);
      }
    }

    await supabase.from(TABLE_NAME).update({
      status: 'failed',
      error_message: errMsg,
      current_step: 'failed',
      failed_at_step: 'evolink_generation',
      completed_at: new Date().toISOString(),
    }).eq('id', job_id);

    return new Response(JSON.stringify({ status: 'failed', error: errMsg }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Still processing
  return new Response(JSON.stringify({
    status: pollResult.status,
    progress: pollResult.progress,
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
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

    if (path === 'poll-evolink') {
      return await handlePollEvolink(req);
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
  const authResult = await authenticateRequest(req);
  if (authResult instanceof Response) return authResult;
  const verifiedUserId = authResult.userId;

  const body = await req.json();
  const { imageUrl, fallbackImageUrl, inputText, engine, referencePromptId } = body;

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
  const isEvolink = selectedEngine === 'veo3.1';

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

  // If referencePromptId provided, try to get image_url from admin_prompts as extra fallback
  let promptFallbackUrl: string | null = fallbackImageUrl || null;
  if (referencePromptId && !promptFallbackUrl) {
    try {
      const { data: prompt } = await supabase
        .from('admin_prompts')
        .select('image_url, reference_images')
        .eq('id', referencePromptId)
        .maybeSingle();
      if (prompt) {
        promptFallbackUrl = prompt.image_url || null;
      }
    } catch (e) {
      console.warn('[MovieLedMaker] Failed to fetch prompt fallback:', e);
    }
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
      api_account: isEvolink ? 'evolink' : 'primary',
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
  await logStep(jobId, 'created', { engine: selectedEngine, creditCost, provider: isEvolink ? 'evolink' : 'runninghub' });

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

  // ========== EVOLINK PATH (Veo 3.1) ==========
  if (isEvolink) {
    await logStep(jobId, 'calling_evolink', { model: 'veo-3.1-fast-generate-preview' });

    const evolinkPrompt = `Create a cinematic LED screen video loop. The video MUST prominently display the text "${inputText.trim()}" as the main title, rendered in large, bold, glowing letters. The text "${inputText.trim()}" must be clearly legible and centered on screen. High energy, colorful, dynamic motion graphics with light effects surrounding the text, suitable for large LED displays.`;

    // Use shared Evolink client
    const result = await evolinkGenerate(EVOLINK_API_KEY, {
      model: 'veo-3.1-fast-generate-preview',
      prompt: evolinkPrompt,
      duration: 6,
      quality: '1080p',
      aspectRatio: '16:9',
      generateAudio: false,
      generationType: 'FIRST&LAST',
      imageUrls: [imageUrl],
    });

    if (!result.success) {
      console.error('[MovieLedMaker] Evolink error:', result.error);
      
      // Refund
      try {
        await supabase.rpc('refund_upscaler_credits', {
          _user_id: verifiedUserId, _amount: creditCost,
          _description: `MOVIELED_EVOLINK_REFUNDED: ${result.error.slice(0, 100)}`
        });
        await supabase.from(TABLE_NAME).update({
          status: 'failed',
          error_message: result.error,
          credits_refunded: true,
          completed_at: new Date().toISOString(),
          failed_at_step: 'evolink_call',
        }).eq('id', jobId);
      } catch {
        await supabase.from(TABLE_NAME).update({
          status: 'failed',
          error_message: result.error,
          completed_at: new Date().toISOString(),
        }).eq('id', jobId);
      }

      return new Response(JSON.stringify({ error: result.error, code: 'EVOLINK_ERROR', refunded: true }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Save task_id and mark as running
    await supabase.from(TABLE_NAME).update({
      status: 'running',
      task_id: result.taskId,
      started_at: new Date().toISOString(),
      current_step: 'evolink_generating',
      job_payload: {
        engine: selectedEngine,
        provider: 'evolink',
        inputText: inputText.trim(),
        imageUrl,
        evolinkTaskId: result.taskId,
      },
    }).eq('id', jobId);

    await logStep(jobId, 'evolink_started', { taskId: result.taskId });

    return new Response(JSON.stringify({
      success: true,
      job_id: jobId,
      provider: 'evolink',
      taskId: result.taskId,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ========== RUNNINGHUB PATH (Wan 2.2) ==========

  // Upload reference image to RunningHub (with fallback URL support)
  let rhFileName: string;
  try {
    await logStep(jobId, 'uploading_image');
    rhFileName = await uploadImageToRunningHub(imageUrl, promptFallbackUrl, 'reference_image');
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
        error_message: `Erro ao processar imagem. Tente novamente ou escolha outra referência.`,
        credits_refunded: true,
        completed_at: new Date().toISOString()
      }).eq('id', jobId);
    } catch {
      await supabase.from(TABLE_NAME).update({
        status: 'failed',
        error_message: `Erro ao processar imagem. Tente novamente.`,
        completed_at: new Date().toISOString()
      }).eq('id', jobId);
    }
    
    return new Response(JSON.stringify({ 
      error: 'Erro ao processar imagem de referência. Tente novamente ou escolha outra.', 
      code: 'IMAGE_TRANSFER_ERROR', 
      refunded: true 
    }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Save job_payload
  const jobPayload = {
    engine: selectedEngine,
    inputText: inputText.trim(),
    rhFileName,
    imageUrl,
    fallbackImageUrl: promptFallbackUrl,
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
