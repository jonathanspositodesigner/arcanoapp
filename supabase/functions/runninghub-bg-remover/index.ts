import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const RUNNINGHUB_API_KEY = (
  Deno.env.get('RUNNINGHUB_API_KEY') ||
  Deno.env.get('RUNNINGHUB_APIKEY') ||
  ''
).trim();

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// WebApp ID for BG Remover
const WEBAPP_ID_BG_REMOVER = '2031815099811368962';

const RATE_LIMIT_UPLOAD = { maxRequests: 10, windowSeconds: 60 };
const RATE_LIMIT_RUN = { maxRequests: 5, windowSeconds: 60 };

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

if (!RUNNINGHUB_API_KEY) {
  console.error('[BgRemover] CRITICAL: Missing RUNNINGHUB_API_KEY secret');
}

console.log('[BgRemover] Config loaded - WebApp ID:', WEBAPP_ID_BG_REMOVER);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ========== HELPERS ==========

async function logStep(jobId: string, step: string, details?: Record<string, any>): Promise<void> {
  const timestamp = new Date().toISOString();
  const entry = { step, timestamp, ...details };
  try {
    const { data: job } = await supabase.from('bg_remover_jobs').select('step_history').eq('id', jobId).maybeSingle();
    const currentHistory = (job?.step_history as any[]) || [];
    await supabase.from('bg_remover_jobs').update({ current_step: step, step_history: [...currentHistory, entry] }).eq('id', jobId);
    console.log(`[BgRemover] Job ${jobId}: ${step}`, details || '');
  } catch (e) {
    console.error(`[logStep] Error:`, e);
  }
}

async function safeParseResponse(response: Response, context: string): Promise<any> {
  const text = await response.text();
  const status = response.status;
  console.log(`[BgRemover] ${context} - Status: ${status}, BodyLength: ${text.length}`);
  if (!response.ok) {
    const snippet = text.slice(0, 300);
    throw new Error(`${context} failed (${status}): ${snippet.slice(0, 100)}`);
  }
  if (!text.trim().startsWith('{') && !text.trim().startsWith('[')) {
    throw new Error(`${context} returned non-JSON (${status}): ${text.slice(0, 100)}`);
  }
  try { return JSON.parse(text); } catch (e) {
    throw new Error(`${context} invalid JSON (${status}): ${text.slice(0, 100)}`);
  }
}

async function fetchWithRetry(url: string, options: RequestInit, context: string, maxRetries = 4): Promise<Response> {
  const retryableStatuses = [429, 502, 503, 504];
  const delays = [2000, 5000, 10000, 15000];
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch(url, options);
    if (!retryableStatuses.includes(response.status)) return response;
    await response.text();
    if (attempt < maxRetries - 1) {
      const delay = delays[attempt] || 2000;
      console.warn(`[BgRemover] ${context} got ${response.status}, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
      await new Promise(r => setTimeout(r, delay));
    } else {
      throw new Error(`${context} failed after ${maxRetries} retries (${response.status})`);
    }
  }
  throw new Error(`${context} failed - unexpected retry loop exit`);
}

function getClientIP(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
}

async function checkRateLimit(ip: string, endpoint: string, maxRequests: number, windowSeconds: number) {
  try {
    const { data } = await supabase.rpc('check_rate_limit', { _ip_address: ip, _endpoint: endpoint, _max_requests: maxRequests, _window_seconds: windowSeconds });
    const result = data?.[0] || { allowed: true, current_count: 0, reset_at: null };
    return { allowed: result.allowed, resetAt: result.reset_at || '' };
  } catch { return { allowed: true, resetAt: '' }; }
}

/** Upload base64 image bytes to RunningHub and return the fileName */
async function uploadBase64ToRunningHub(imageBase64: string, fileName: string): Promise<string> {
  const binaryString = atob(imageBase64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  const ext = (fileName || 'image.png').split('.').pop()?.toLowerCase() || 'png';
  const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'webp' ? 'image/webp' : 'image/png';
  const formData = new FormData();
  formData.append('apiKey', RUNNINGHUB_API_KEY);
  formData.append('fileType', 'image');
  formData.append('file', new Blob([bytes], { type: mimeType }), fileName || 'upload.png');
  const response = await fetchWithRetry('https://www.runninghub.ai/task/openapi/upload', { method: 'POST', body: formData }, 'Upload to RunningHub');
  const data = await safeParseResponse(response, 'Upload response');
  if (data.code !== 0) throw new Error(data.msg || 'Upload failed');
  return data.data.fileName;
}

/** Background: save base64 image to Supabase Storage for history/costs page */
async function saveToStorageBackground(imageBase64: string, userId: string, jobId: string, originalFileName: string): Promise<void> {
  try {
    const binaryString = atob(imageBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
    const ext = (originalFileName || 'input.png').split('.').pop()?.toLowerCase() || 'png';
    const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'webp' ? 'image/webp' : 'image/png';
    const filePath = `bg-remover/${userId}/input-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('artes-cloudinary').upload(filePath, bytes, { contentType: mimeType, upsert: true });
    if (error) { console.error('[BgRemover] Background storage upload error:', error); return; }
    const { data: urlData } = supabase.storage.from('artes-cloudinary').getPublicUrl(filePath);
    await supabase.from('bg_remover_jobs').update({ input_url: urlData.publicUrl }).eq('id', jobId);
    console.log(`[BgRemover] Background storage saved for job ${jobId}`);
  } catch (e) {
    console.error('[BgRemover] Background storage error:', e);
  }
}

// quickQueueCheck REMOVED - all queue logic delegated to runninghub-queue-manager

// ========== MAIN ==========

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();
    const clientIP = getClientIP(req);
    console.log(`[BgRemover] Endpoint: ${path}, IP: ${clientIP}`);

    if (path === 'upload' || path === 'run') {
      const rateConfig = path === 'upload' ? RATE_LIMIT_UPLOAD : RATE_LIMIT_RUN;
      const rl = await checkRateLimit(clientIP, `runninghub-bg-remover/${path}`, rateConfig.maxRequests, rateConfig.windowSeconds);
      if (!rl.allowed) {
        return new Response(JSON.stringify({ error: 'Too many requests', code: 'RATE_LIMIT_EXCEEDED', retryAfter: rl.resetAt }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' },
        });
      }
    }

    if (path === 'upload') return await handleUpload(req);
    if (path === 'run') return await handleRun(req);
    return new Response(JSON.stringify({ error: 'Invalid endpoint' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[BgRemover] Unhandled error:', error);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

async function handleUpload(req: Request) {
  if (!RUNNINGHUB_API_KEY) {
    return new Response(JSON.stringify({ error: 'API key not configured', code: 'MISSING_API_KEY' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  const { imageBase64, fileName } = await req.json();
  if (!imageBase64) {
    return new Response(JSON.stringify({ error: 'imageBase64 is required', code: 'MISSING_IMAGE' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  try {
    const rhFileName = await uploadBase64ToRunningHub(imageBase64, fileName);
    return new Response(JSON.stringify({ success: true, fileName: rhFileName }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown upload error';
    console.error('[BgRemover] Upload error:', error);
    return new Response(JSON.stringify({ error: msg, code: 'UPLOAD_EXCEPTION' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
}

async function handleRun(req: Request) {
  if (!RUNNINGHUB_API_KEY) {
    return new Response(JSON.stringify({ error: 'API key not configured', code: 'MISSING_API_KEY' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  const body = await req.json();
  const { jobId, creditCost, imageBase64, fileName, inputImageUrl } = body;

  // ========== JWT AUTH VERIFICATION ==========
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  const anonClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!);
  const jwtToken = authHeader.replace('Bearer ', '');
  const { data: { user: authUser }, error: authError } = await anonClient.auth.getUser(jwtToken);
  if (authError || !authUser) {
    return new Response(JSON.stringify({ error: 'Unauthorized', code: 'INVALID_TOKEN' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  const userId = authUser.id;
  console.log(`[BgRemover] JWT verified - userId: ${userId}`);

  // Validation
  if (!jobId || typeof jobId !== 'string') return new Response(JSON.stringify({ error: 'Valid jobId is required', code: 'INVALID_JOB_ID' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  if (!imageBase64 && !inputImageUrl) return new Response(JSON.stringify({ error: 'imageBase64 or inputImageUrl is required', code: 'MISSING_PARAMS' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  if (typeof creditCost !== 'number' || creditCost < 1 || creditCost > 500) return new Response(JSON.stringify({ error: 'Invalid credit cost', code: 'INVALID_CREDIT_COST' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  // If using URL, validate it's from Supabase storage
  if (inputImageUrl && !imageBase64) {
    const allowedDomains = ['supabase.co', 'supabase.in', SUPABASE_URL.replace('https://', '')];
    try {
      const urlObj = new URL(inputImageUrl);
      if (!allowedDomains.some(d => urlObj.hostname.endsWith(d))) {
        return new Response(JSON.stringify({ error: 'Image URL must be from storage', code: 'INVALID_IMAGE_SOURCE' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    } catch { return new Response(JSON.stringify({ error: 'Invalid image URL', code: 'INVALID_IMAGE_URL' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }
  }

  // EARLY STATUS UPDATE: Mark as 'starting' to prevent orphan cleanup
  await supabase.from('bg_remover_jobs').update({ 
    status: 'starting', current_step: 'starting', started_at: new Date().toISOString()
  }).eq('id', jobId).eq('status', 'pending');

  // Upload image to RunningHub + check queue in PARALLEL
  let inputFileName: string;
  let queueResult: { slotsAvailable: number; accountName: string | null; accountApiKey: string | null };
  
  try {
    const uploadPromise = imageBase64
      ? uploadBase64ToRunningHub(imageBase64, fileName || 'input.png')
      : (async () => {
          console.log('[BgRemover] Downloading image from storage...');
          const imgResponse = await fetch(inputImageUrl);
          if (!imgResponse.ok) throw new Error(`Failed to download image (${imgResponse.status})`);
          const imgBlob = await imgResponse.blob();
          const imgName = inputImageUrl.split('/').pop() || 'input.png';
          const formData = new FormData();
          formData.append('apiKey', RUNNINGHUB_API_KEY);
          formData.append('fileType', 'image');
          formData.append('file', imgBlob, imgName);
          const uploadResponse = await fetchWithRetry('https://www.runninghub.ai/task/openapi/upload', { method: 'POST', body: formData }, 'Image upload');
          const uploadData = await safeParseResponse(uploadResponse, 'Image upload');
          if (uploadData.code !== 0) throw new Error('Image upload failed: ' + (uploadData.msg || 'Unknown'));
          return uploadData.data.fileName;
        })();

    const queueCheckPromise = quickQueueCheck();

    // Run upload + queue check in parallel
    [inputFileName, queueResult] = await Promise.all([uploadPromise, queueCheckPromise]);
    console.log('[BgRemover] Image uploaded:', inputFileName);
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Image transfer failed';
    console.error('[BgRemover] Image transfer error:', error);
    await supabase.from('bg_remover_jobs').update({ status: 'failed', error_message: `IMAGE_TRANSFER_ERROR: ${errorMsg.slice(0, 200)}`, completed_at: new Date().toISOString() }).eq('id', jobId);
    return new Response(JSON.stringify({ error: errorMsg, code: 'IMAGE_TRANSFER_ERROR' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  // Background: save to Supabase Storage for history (non-blocking)
  if (imageBase64) {
    // Fire-and-forget: await before response since Deno doesn't support waitUntil
    // We do this AFTER upload to RunningHub but BEFORE starting the AI app
    saveToStorageBackground(imageBase64, userId, jobId, fileName || 'input.png').catch(e => console.error('[BgRemover] Storage bg error:', e));
  }

  // Consume credits
  console.log(`[BgRemover] Consuming ${creditCost} credits for user ${userId}`);
  const { data: creditResult, error: creditError } = await supabase.rpc('consume_upscaler_credits', { _user_id: userId, _amount: creditCost, _description: 'Remover Fundo' });
  if (creditError) {
    console.error('[BgRemover] Credit error:', creditError);
    return new Response(JSON.stringify({ error: 'Erro ao processar créditos', code: 'CREDIT_ERROR' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  if (!creditResult || creditResult.length === 0 || !creditResult[0].success) {
    return new Response(JSON.stringify({ error: creditResult?.[0]?.error_message || 'Saldo insuficiente', code: 'INSUFFICIENT_CREDITS' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  console.log(`[BgRemover] Credits consumed. New balance: ${creditResult[0].new_balance}`);

  // Mark credits charged
  await supabase.from('bg_remover_jobs').update({ credits_charged: true, user_credit_cost: creditCost, input_file_name: inputFileName }).eq('id', jobId);

  try {
    const { slotsAvailable, accountName, accountApiKey } = queueResult;

    if (slotsAvailable <= 0) {
      // Enqueue
      try {
        const enqueueResponse = await fetch(`${SUPABASE_URL}/functions/v1/runninghub-queue-manager/enqueue`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
          body: JSON.stringify({ table: 'bg_remover_jobs', jobId, creditCost }),
        });
        const enqueueData = await enqueueResponse.json();
        return new Response(JSON.stringify({ success: true, queued: true, position: enqueueData.position }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      } catch (enqueueError) {
        await supabase.from('bg_remover_jobs').update({ status: 'queued', position: 999, user_credit_cost: creditCost, waited_in_queue: true }).eq('id', jobId);
        return new Response(JSON.stringify({ success: true, queued: true, position: 999 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    // Start processing
    const apiKeyToUse = accountApiKey || RUNNINGHUB_API_KEY;
    const accountToUse = accountName || 'primary';
    await supabase.from('bg_remover_jobs').update({ user_credit_cost: creditCost, waited_in_queue: false, status: 'running', started_at: new Date().toISOString(), position: 0, api_account: accountToUse }).eq('id', jobId);

    const nodeInfoList = [
      { nodeId: "1", fieldName: "image", fieldValue: inputFileName }
    ];

    const webhookUrl = `${SUPABASE_URL}/functions/v1/runninghub-webhook`;
    const requestBody = { nodeInfoList, instanceType: "default", usePersonalQueue: false, webhookUrl };
    console.log('[BgRemover] AI App request:', JSON.stringify(requestBody));

    const response = await fetchWithRetry(`https://www.runninghub.ai/openapi/v2/run/ai-app/${WEBAPP_ID_BG_REMOVER}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKeyToUse}` },
      body: JSON.stringify(requestBody),
    }, 'Run AI App');

    const data = await safeParseResponse(response, 'AI App response');
    console.log('[BgRemover] AI App response:', JSON.stringify(data));

    if (data.taskId) {
      await supabase.from('bg_remover_jobs').update({ task_id: data.taskId }).eq('id', jobId);
      return new Response(JSON.stringify({ success: true, taskId: data.taskId }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Start failed - refund
    const startErrorMsg = data.msg || data.message || 'Failed to start workflow';
    console.error(`[BgRemover] START FAILED - Refunding for job ${jobId}`);
    try {
      await supabase.rpc('refund_upscaler_credits', { _user_id: userId, _amount: creditCost, _description: `START_FAILED_REFUNDED: ${startErrorMsg.slice(0, 100)}` });
      await supabase.from('bg_remover_jobs').update({ status: 'failed', error_message: `START_FAILED_REFUNDED: ${startErrorMsg}`, credits_refunded: true, completed_at: new Date().toISOString() }).eq('id', jobId);
    } catch (refundError) {
      await supabase.from('bg_remover_jobs').update({ status: 'failed', error_message: `START_FAILED (refund error): ${startErrorMsg}`, completed_at: new Date().toISOString() }).eq('id', jobId);
    }
    return new Response(JSON.stringify({ error: startErrorMsg, code: data.code || 'RUN_FAILED', refunded: true }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[BgRemover] Run error:', error);
    try {
      await supabase.rpc('refund_upscaler_credits', { _user_id: userId, _amount: creditCost, _description: `START_EXCEPTION_REFUNDED: ${errorMessage.slice(0, 100)}` });
      await supabase.from('bg_remover_jobs').update({ status: 'failed', error_message: `START_EXCEPTION_REFUNDED: ${errorMessage.slice(0, 200)}`, credits_refunded: true, completed_at: new Date().toISOString() }).eq('id', jobId);
    } catch {
      await supabase.from('bg_remover_jobs').update({ status: 'failed', error_message: `START_EXCEPTION: ${errorMessage.slice(0, 200)}`, completed_at: new Date().toISOString() }).eq('id', jobId);
    }
    return new Response(JSON.stringify({ error: errorMessage, code: 'RUN_EXCEPTION', refunded: true }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
}
