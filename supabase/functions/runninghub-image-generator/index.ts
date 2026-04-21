import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * RUNNINGHUB IMAGE GENERATOR - EDGE FUNCTION
 * 
 * Gera imagens via RunningHub workflow (WebApp ID 2036803905421582337)
 * 
 * Nodes do Workflow:
 * - Node 151: Aspect Ratio (aspectRatio)
 * - Node 135: Prompt (text)
 * - Node 58:  Referência 1 (image)
 * - Node 147: Referência 2 (image)
 * - Node 148: Referência 3 (image)
 * - Node 149: Referência 4 (image)
 * - Node 62:  Referência 5 (image)
 * - Node 150: Referência 6 (image)
 * 
 * Endpoints:
 * - /run - Inicia processamento
 * - /queue-status - Consulta status do job
 * - /reconcile - Recuperação manual de jobs travados
 */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const TABLE_NAME = 'image_generator_jobs';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Rate limit configuration
const RATE_LIMIT_RUN = { maxRequests: 5, windowSeconds: 60 };

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
      .update({
        current_step: step,
        step_history: newHistory,
      })
      .eq('id', jobId);
    
    console.log(`[ImageGenerator] Job ${jobId}: ${step}`, details || '');
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
    
    if (rawResponse) {
      updateData.raw_api_response = rawResponse;
    }
    
    await supabase.from(TABLE_NAME).update(updateData).eq('id', jobId);
    
    console.log(`[ImageGenerator] Job ${jobId}: FAILED at ${failedAtStep}:`, errorMessage);
  } catch (e) {
    console.error(`[logStepFailure] Error:`, e);
  }
}

// ========== SAFE JSON PARSING ==========

async function safeParseResponse(response: Response, context: string): Promise<any> {
  const contentType = response.headers.get('content-type') || '';
  const status = response.status;
  const text = await response.text();
  
  console.log(`[ImageGenerator] ${context} - Status: ${status}, ContentType: ${contentType}, BodyLength: ${text.length}`);
  
  if (!response.ok) {
    const snippet = text.slice(0, 300);
    console.error(`[ImageGenerator] ${context} FAILED - Status: ${status}, Body: ${snippet}`);
    throw new Error(`${context} failed (${status}): ${snippet.slice(0, 100)}`);
  }
  
  if (!contentType.includes('application/json') && !text.trim().startsWith('{') && !text.trim().startsWith('[')) {
    const snippet = text.slice(0, 300);
    throw new Error(`${context} returned HTML/error (${status}): ${snippet.slice(0, 100)}`);
  }
  
  try {
    return JSON.parse(text);
  } catch (e) {
    const snippet = text.slice(0, 300);
    throw new Error(`${context} invalid JSON (${status}): ${snippet.slice(0, 100)}`);
  }
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  context: string,
  maxRetries: number = 4
): Promise<Response> {
  const retryableStatuses = [429, 502, 503, 504];
  const delays = [2000, 5000, 10000, 15000];
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch(url, options);
    
    if (!retryableStatuses.includes(response.status)) {
      return response;
    }
    
    await response.text();
    
    if (attempt < maxRetries - 1) {
      const delay = delays[attempt] || 2000;
      console.warn(`[ImageGenerator] ${context} got ${response.status}, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
      await new Promise(r => setTimeout(r, delay));
    } else {
      throw new Error(`${context} failed after ${maxRetries} retries (${response.status})`);
    }
  }
  
  throw new Error(`${context} failed - unexpected retry loop exit`);
}

// Resilient image download with retries (handles 502/504/520/Cloudflare/timeout/network)
async function fetchImageWithRetry(
  url: string,
  context: string,
  maxRetries: number = 3
): Promise<Response> {
  const retryableStatuses = [408, 425, 429, 500, 502, 503, 504, 520, 521, 522, 523, 524];
  const delays = [2000, 5000, 10000];

  let lastError: unknown = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 25000);
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (response.ok) return response;

      if (retryableStatuses.includes(response.status) && attempt < maxRetries - 1) {
        await response.text(); // consume body
        const delay = delays[attempt] || 2000;
        console.warn(`[ImageGenerator] ${context} got ${response.status}, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }

      // Non-retryable or final attempt
      return response;
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      if (attempt < maxRetries - 1) {
        const delay = delays[attempt] || 2000;
        console.warn(`[ImageGenerator] ${context} network error (${msg}), retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`${context} failed after ${maxRetries} retries`);
}

function getClientIP(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') || 'unknown';
}

async function checkRateLimit(
  ip: string,
  endpoint: string,
  maxRequests: number,
  windowSeconds: number
): Promise<{ allowed: boolean }> {
  try {
    const { data, error } = await supabase.rpc('check_rate_limit', {
      _ip_address: ip,
      _endpoint: endpoint,
      _max_requests: maxRequests,
      _window_seconds: windowSeconds
    });
    if (error) return { allowed: true };
    const result = data?.[0] || { allowed: true };
    return { allowed: result.allowed };
  } catch {
    return { allowed: true };
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
    const clientIP = getClientIP(req);
    
    console.log(`[ImageGenerator] Endpoint called: ${path}, IP: ${clientIP}`);

    if (path === 'run') {
      const rateLimitResult = await checkRateLimit(clientIP, 'runninghub-image-generator/run', RATE_LIMIT_RUN.maxRequests, RATE_LIMIT_RUN.windowSeconds);
      if (!rateLimitResult.allowed) {
        return new Response(JSON.stringify({ error: 'Too many requests.', code: 'RATE_LIMIT_EXCEEDED' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' },
        });
      }
      return await handleRun(req);
    } else if (path === 'queue-status') {
      return await handleQueueStatus(req);
    } else if (path === 'reconcile') {
      return await handleReconcile(req);
    } else {
      return new Response(JSON.stringify({ error: 'Invalid endpoint' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ImageGenerator] Unhandled error:', error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ========== /run ==========

async function handleRun(req: Request) {
  // Authenticate user
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing Authorization header', code: 'UNAUTHORIZED' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Check if this is a service-role call (for BYOK proxy)
  const isServiceRole = authHeader.replace('Bearer ', '') === SUPABASE_SERVICE_ROLE_KEY;

  let verifiedUserId: string;
  if (isServiceRole) {
    // Will use byokUserId from body below
    verifiedUserId = ''; // placeholder, set after parsing body
  } else {
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token', code: 'UNAUTHORIZED' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    verifiedUserId = user.id;
  }

  const {
    jobId,
    referenceImageUrls,
    aspectRatio,
    creditCost,
    prompt,
    source,
    byok,
    byokUserId,
  } = await req.json();

  // BYOK: resolve userId from body when called via service role
  const isByok = byok === true && isServiceRole;
  if (isServiceRole && byokUserId) {
    verifiedUserId = byokUserId;
  }
  if (!verifiedUserId) {
    return new Response(JSON.stringify({ error: 'User ID could not be resolved', code: 'UNAUTHORIZED' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ========== INPUT VALIDATION ==========
  if (!jobId || typeof jobId !== 'string' || jobId.length > 100) {
    return new Response(JSON.stringify({ error: 'Valid jobId is required', code: 'INVALID_JOB_ID' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    return new Response(JSON.stringify({ error: 'Prompt is required', code: 'MISSING_PROMPT' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const validAspectRatios = ['auto', '1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'];
  const finalAspectRatio = validAspectRatios.includes(aspectRatio) ? aspectRatio : '4:3';

  // ========== SERVER-SIDE CREDIT COST ENFORCEMENT ==========
  // Minimum costs per source — client cannot send less than these values
  const MIN_COSTS: Record<string, number> = {
    'arcano_cloner_refine': 100,
    'flyer_maker_refine': 50,
    'cinema_studio_photo': 100,
    'legacy_proxy': 100,
    'standard': 100,
  };
  const minCost = MIN_COSTS[source] ?? 100;

  // Enforce: if client sent less than minimum (and not BYOK/Unlimited), override to minimum
  let enforcedCreditCost = creditCost;
  if (!isByok && creditCost !== 0) {
    if (typeof creditCost !== 'number' || creditCost < 1 || creditCost > 500) {
      return new Response(JSON.stringify({ error: 'Invalid credit cost', code: 'INVALID_CREDIT_COST' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (creditCost < minCost) {
      console.warn(`[ImageGenerator] Client sent creditCost=${creditCost}, enforcing minimum=${minCost} for source=${source}`);
      enforcedCreditCost = minCost;
    }
  }

  // Validate image URLs are from Supabase storage
  const allowedDomains = ['supabase.co', 'supabase.in', SUPABASE_URL.replace('https://', ''), 'rh-images-1252422369.cos.ap-beijing.myqcloud.com'];
  const imageUrls: string[] = Array.isArray(referenceImageUrls) ? referenceImageUrls : [];

  for (const imageUrl of imageUrls) {
    try {
      const urlObj = new URL(imageUrl);
      const isAllowed = allowedDomains.some(domain => urlObj.hostname.endsWith(domain));
      if (!isAllowed) {
        return new Response(JSON.stringify({ error: 'Image URLs must be from storage', code: 'INVALID_IMAGE_SOURCE' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid image URL', code: 'INVALID_IMAGE_URL' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  await logStep(jobId, 'validating', { aspectRatio: finalAspectRatio, imageCount: imageUrls.length });

  // ========== UPLOAD REFERENCE IMAGES TO RUNNINGHUB ==========
  const RUNNINGHUB_API_KEY = (Deno.env.get('RUNNINGHUB_API_KEY') || '').trim();
  if (!RUNNINGHUB_API_KEY) {
    return new Response(JSON.stringify({ error: 'API key not configured', code: 'MISSING_API_KEY' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const uploadedFileNames: string[] = [];

  // Helper: process a single ref image (download + upload to RunningHub).
  // Returns the RunningHub fileName on success; throws on failure.
  async function processOneRefImage(imgUrl: string, idx: number): Promise<string> {
    await logStep(jobId, `downloading_ref_image_${idx + 1}`);
    const imgResponse = await fetchImageWithRetry(imgUrl, `Download ref image ${idx + 1}`);
    if (!imgResponse.ok) {
      // After internal retries, still failing
      throw new Error(`download_failed_${imgResponse.status}`);
    }

    const imgBlob = await imgResponse.blob();
    const imgName = imgUrl.split('/').pop() || `ref_${idx + 1}.png`;

    const formData = new FormData();
    formData.append('apiKey', RUNNINGHUB_API_KEY);
    formData.append('fileType', 'image');
    formData.append('file', imgBlob, imgName);

    await logStep(jobId, `uploading_ref_image_${idx + 1}`);
    const uploadResponse = await fetchWithRetry(
      'https://www.runninghub.ai/task/openapi/upload',
      { method: 'POST', body: formData },
      `Ref image ${idx + 1} upload`
    );

    const uploadData = await safeParseResponse(uploadResponse, `Ref upload ${idx + 1}`);
    if (uploadData.code !== 0) {
      throw new Error(`upload_rejected: ${uploadData.msg || 'Unknown'}`);
    }
    return uploadData.data.fileName;
  }

  try {
    for (let i = 0; i < imageUrls.length; i++) {
      const imgUrl = imageUrls[i];

      // Outer retry loop: full download+upload cycle, in case RunningHub
      // intermittently returns 500 on upload OR Storage returns 5xx on download.
      const MAX_CYCLE_RETRIES = 2;
      let lastErr: unknown = null;
      let fileName: string | null = null;

      for (let cycle = 0; cycle <= MAX_CYCLE_RETRIES; cycle++) {
        try {
          fileName = await processOneRefImage(imgUrl, i);
          break;
        } catch (err) {
          lastErr = err;
          const msg = err instanceof Error ? err.message : String(err);
          console.warn(`[ImageGenerator] Cycle ${cycle + 1}/${MAX_CYCLE_RETRIES + 1} failed for ref ${i + 1}: ${msg}`);
          if (cycle < MAX_CYCLE_RETRIES) {
            await new Promise(r => setTimeout(r, 3000 + cycle * 3000));
          }
        }
      }

      if (!fileName) {
        const technical = lastErr instanceof Error ? lastErr.message : 'unknown';
        // User-friendly error message (PT-BR), technical details in step_history/logs
        const friendly = `Falha temporária ao processar a imagem de referência ${i + 1}. Por favor, tente novamente em alguns segundos. (${technical})`;
        throw new Error(friendly);
      }

      uploadedFileNames.push(fileName);
      console.log(`[ImageGenerator] Ref image ${i + 1} uploaded: ${fileName}`);
    }
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Falha ao transferir imagens de referência';
    console.error('[ImageGenerator] Image transfer error:', error);
    await logStepFailure(jobId, 'image_transfer', errorMsg);

    await supabase.from(TABLE_NAME).update({
      status: 'failed',
      error_message: `IMAGE_TRANSFER_ERROR: ${errorMsg.slice(0, 250)}`,
      completed_at: new Date().toISOString()
    }).eq('id', jobId);

    return new Response(JSON.stringify({ error: errorMsg, code: 'IMAGE_TRANSFER_ERROR' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ========== CONSUME CREDITS (skip for BYOK and Unlimited with cost=0) ==========
  if (isByok) {
    console.log(`[ImageGenerator] BYOK mode — skipping platform credit consumption for user ${verifiedUserId}`);
    await logStep(jobId, 'byok_skip_credits');
  } else if (enforcedCreditCost === 0) {
    console.log(`[ImageGenerator] Unlimited user — skipping credit consumption for user ${verifiedUserId}`);
    await logStep(jobId, 'unlimited_skip_credits');
  } else {
    await logStep(jobId, 'consuming_credits', { amount: enforcedCreditCost });
    
    // Determine credit description based on source
    let creditDescription = 'Gerar Imagem';
    if (source === 'arcano_cloner_refine') creditDescription = 'Refinamento Arcano Cloner';
    else if (source === 'flyer_maker_refine') creditDescription = 'Refinamento Flyer Maker';

    const { data: creditResult, error: creditError } = await supabase.rpc(
      'consume_upscaler_credits',
      { _user_id: verifiedUserId, _amount: enforcedCreditCost, _description: creditDescription }
    );

    if (creditError) {
      console.error('[ImageGenerator] Credit consumption error:', creditError);
      await logStepFailure(jobId, 'consume_credits', creditError.message);
      return new Response(JSON.stringify({ error: 'Erro ao processar créditos', code: 'CREDIT_ERROR' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!creditResult || creditResult.length === 0 || !creditResult[0].success) {
      const errorMsg = creditResult?.[0]?.error_message || 'Saldo insuficiente';
      await logStepFailure(jobId, 'consume_credits', errorMsg);
      return new Response(JSON.stringify({ error: errorMsg, code: 'INSUFFICIENT_CREDITS', currentBalance: creditResult?.[0]?.new_balance }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[ImageGenerator] Credits consumed. New balance: ${creditResult[0].new_balance}`);
  }

  // ========== SAVE JOB PAYLOAD ==========
  // Cinema Studio uses 10 image slots; standard uses 6
  const isCinemaStudio = source === 'cinema_studio_photo';
  const totalSlots = isCinemaStudio ? 10 : 6;
  const paddedFileNames = [...uploadedFileNames];
  while (paddedFileNames.length < totalSlots) {
    paddedFileNames.push('example.png');
  }

  await supabase.from(TABLE_NAME).update({
    credits_charged: true,
    user_credit_cost: enforcedCreditCost,
    input_urls: imageUrls,
    job_payload: {
      prompt: prompt.trim(),
      aspectRatio: finalAspectRatio,
      referenceFileNames: paddedFileNames,
      source: source || 'standard',
    },
  }).eq('id', jobId);

  // ========== DELEGATE TO QUEUE MANAGER ==========
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
      return new Response(JSON.stringify({ success: true, queued: true, position: qmResult.position }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    if (qmResult.taskId) {
      return new Response(JSON.stringify({ success: true, taskId: qmResult.taskId, method: 'ai-app-v2' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: qmResult.error || 'Failed to start job', code: 'RUN_FAILED', refunded: true }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ImageGenerator] Queue Manager call failed:', errorMessage);
    
    try {
      if (!isByok) {
        await supabase.rpc('refund_upscaler_credits', { _user_id: verifiedUserId, _amount: enforcedCreditCost, _description: `QM_EXCEPTION_REFUNDED: ${errorMessage.slice(0, 100)}` });
      }
      await supabase.from(TABLE_NAME).update({ status: 'failed', error_message: `QM_EXCEPTION_REFUNDED: ${errorMessage.slice(0, 200)}`, credits_refunded: !isByok, completed_at: new Date().toISOString() }).eq('id', jobId);
    } catch {
      await supabase.from(TABLE_NAME).update({ status: 'failed', error_message: `QM_EXCEPTION: ${errorMessage.slice(0, 200)}`, completed_at: new Date().toISOString() }).eq('id', jobId);
    }
    
    return new Response(JSON.stringify({ error: errorMessage, code: 'RUN_EXCEPTION', refunded: true }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// ========== /reconcile ==========

async function handleReconcile(req: Request) {
  const { jobId } = await req.json();
  if (!jobId) {
    return new Response(JSON.stringify({ error: 'jobId is required' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { data: job, error } = await supabase
      .from(TABLE_NAME)
      .select('id, task_id, status, api_account, output_url, user_id, user_credit_cost')
      .eq('id', jobId)
      .maybeSingle();

    if (error || !job) {
      return new Response(JSON.stringify({ error: 'Job not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (['completed', 'failed', 'cancelled'].includes(job.status)) {
      return new Response(JSON.stringify({ success: true, alreadyFinalized: true, status: job.status, outputUrl: job.output_url }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!job.task_id) {
      return new Response(JSON.stringify({ error: 'Job has no task_id yet' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const RUNNINGHUB_API_KEY = (Deno.env.get('RUNNINGHUB_API_KEY') || '').trim();
    let apiKey = RUNNINGHUB_API_KEY;
    if (job.api_account && job.api_account !== 'primary') {
      const suffix = job.api_account.replace('primary', '').replace('account_', '_');
      const envKey = Deno.env.get(`RUNNINGHUB_API_KEY${suffix}`);
      if (envKey) apiKey = envKey.trim();
    }

    const queryResponse = await fetch('https://www.runninghub.ai/openapi/v2/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ taskId: job.task_id }),
    });

    const queryData = await queryResponse.json();
    const rhStatus = queryData.status;

    if (rhStatus === 'SUCCESS' && queryData.results?.length > 0) {
      const imageResult = queryData.results.find((r: any) => ['png', 'jpg', 'jpeg', 'webp'].includes(r.outputType));
      const outputUrl = imageResult?.url || queryData.results[0]?.url;

      await fetch(`${SUPABASE_URL}/functions/v1/runninghub-queue-manager/finish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
        body: JSON.stringify({ table: TABLE_NAME, jobId: job.id, status: 'completed', outputUrl, taskId: job.task_id, rhCost: 0, webhookPayload: { reconciled: true } }),
      });

      return new Response(JSON.stringify({ success: true, reconciled: true, status: 'completed', outputUrl }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (rhStatus === 'FAILED') {
      await fetch(`${SUPABASE_URL}/functions/v1/runninghub-queue-manager/finish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
        body: JSON.stringify({ table: TABLE_NAME, jobId: job.id, status: 'failed', errorMessage: queryData.errorMessage || 'Failed on RunningHub', taskId: job.task_id, rhCost: 0 }),
      });

      return new Response(JSON.stringify({ success: true, reconciled: true, status: 'failed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, reconciled: false, currentStatus: rhStatus, message: 'Still processing' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// ========== /queue-status ==========

async function handleQueueStatus(req: Request) {
  const { jobId } = await req.json();
  if (!jobId) {
    return new Response(JSON.stringify({ error: 'jobId is required' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { data: job, error } = await supabase
      .from(TABLE_NAME)
      .select('status, position, output_url, error_message')
      .eq('id', jobId)
      .single();

    if (error || !job) {
      return new Response(JSON.stringify({ error: 'Job not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      status: job.status,
      position: job.position,
      outputUrl: job.output_url,
      errorMessage: job.error_message,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to get queue status' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
