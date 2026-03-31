import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * CHARACTER GENERATOR - EDGE FUNCTION
 * 
 * Ferramenta de IA que gera personagens a partir de 4 fotos.
 * 
 * Endpoints:
 * - /upload - Upload de imagem para RunningHub
 * - /run - Inicia processamento
 * - /refine - Refinamento com troca de imagens selecionadas
 * - /queue-status - Consulta status do job
 * - /reconcile - Reconcilia job travado
 */

const RUNNINGHUB_API_KEY = (
  Deno.env.get('RUNNINGHUB_API_KEY') ||
  Deno.env.get('RUNNINGHUB_APIKEY') ||
  ''
).trim();

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// WebApp IDs
const WEBAPP_ID_CHARACTER_GENERATOR = '2020943778751713282';
const WEBAPP_ID_REFINE = '2021009449481150465';

// Node IDs for the 4 input images (original generation)
const NODE_ID_FRONT = '41';
const NODE_ID_PROFILE = '39';
const NODE_ID_SEMI_PROFILE = '40';
const NODE_ID_LOW_ANGLE = '42';

// Node IDs for refine workflow
const REFINE_NODE_FRONT = '39';
const REFINE_NODE_SEMI_PROFILE = '40';
const REFINE_NODE_PROFILE = '41';
const REFINE_NODE_LOW_ANGLE = '42';
const REFINE_NODE_RESULT = '45';
const REFINE_NODE_TEXT = '47';

const RATE_LIMIT_UPLOAD = { maxRequests: 10, windowSeconds: 60 };
const RATE_LIMIT_RUN = { maxRequests: 5, windowSeconds: 60 };

const TABLE_NAME = 'character_generator_jobs';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

if (!RUNNINGHUB_API_KEY) {
  console.error('[CharacterGenerator] CRITICAL: Missing RUNNINGHUB_API_KEY secret');
}

console.log('[CharacterGenerator] Config loaded - WebApp ID:', WEBAPP_ID_CHARACTER_GENERATOR, 'Refine:', WEBAPP_ID_REFINE);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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
    
    console.log(`[CharacterGenerator] Job ${jobId}: ${step}`, details || '');
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
    
    console.log(`[CharacterGenerator] Job ${jobId}: FAILED at ${failedAtStep}:`, errorMessage);
  } catch (e) {
    console.error(`[logStepFailure] Error:`, e);
  }
}

// ========== SAFE JSON PARSING HELPERS ==========

async function safeParseResponse(response: Response, context: string): Promise<any> {
  const contentType = response.headers.get('content-type') || '';
  const status = response.status;
  const text = await response.text();
  
  console.log(`[CharacterGenerator] ${context} - Status: ${status}, ContentType: ${contentType}, BodyLength: ${text.length}`);
  
  if (!response.ok) {
    const snippet = text.slice(0, 300);
    console.error(`[CharacterGenerator] ${context} FAILED - Status: ${status}, Body: ${snippet}`);
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
  maxRetries: number = 6
): Promise<Response> {
  const retryableStatuses = [429, 500, 502, 503, 504, 520, 521, 522, 523, 524, 525];
  const delays = [2000, 5000, 10000, 20000, 30000, 40000];
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      if (!retryableStatuses.includes(response.status)) {
        return response;
      }
      
      await response.text();
      
      if (attempt < maxRetries - 1) {
        const jitter = Math.random() * 1000;
        const delay = (delays[attempt] || 5000) + jitter;
        console.warn(`[CharacterGenerator] ${context} got ${response.status}, retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(r => setTimeout(r, delay));
      } else {
        throw new Error(`${context} failed after ${maxRetries} retries (${response.status})`);
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const isNetworkError = errMsg.includes('http2') || errMsg.includes('connection') || errMsg.includes('reset') || errMsg.includes('socket') || errMsg.includes('ECONNREFUSED') || errMsg.includes('fetch failed');
      
      if (isNetworkError && attempt < maxRetries - 1) {
        const jitter = Math.random() * 1000;
        const delay = (delays[attempt] || 5000) + jitter;
        console.warn(`[CharacterGenerator] ${context} network error: ${errMsg}, retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(r => setTimeout(r, delay));
      } else {
        throw err;
      }
    }
  }
  
  throw new Error(`${context} failed - unexpected retry loop exit`);
}

function getClientIP(req: Request): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0].trim();
  const realIP = req.headers.get('x-real-ip');
  if (realIP) return realIP;
  return 'unknown';
}

async function checkRateLimit(
  ip: string, endpoint: string, maxRequests: number, windowSeconds: number
): Promise<{ allowed: boolean; currentCount: number; resetAt: string }> {
  try {
    const { data, error } = await supabase.rpc('check_rate_limit', {
      _ip_address: ip, _endpoint: endpoint, _max_requests: maxRequests, _window_seconds: windowSeconds
    });
    if (error) return { allowed: true, currentCount: 0, resetAt: '' };
    const result = data?.[0] || { allowed: true, current_count: 0, reset_at: null };
    return { allowed: result.allowed, currentCount: result.current_count, resetAt: result.reset_at || '' };
  } catch (err) {
    return { allowed: true, currentCount: 0, resetAt: '' };
  }
}

// ========== HELPER: Download image and upload to RunningHub ==========

async function downloadAndUploadToRH(imageUrl: string, label: string, jobId: string, apiKey: string): Promise<string> {
  await logStep(jobId, `downloading_${label}_image`);
  const imgResponse = await fetch(imageUrl);
  if (!imgResponse.ok) throw new Error(`Failed to download ${label} image (${imgResponse.status})`);
  
  const imgBlob = await imgResponse.blob();
  const imgName = imageUrl.split('/').pop() || `${label}.png`;
  
  const imgFormData = new FormData();
  imgFormData.append('apiKey', apiKey);
  imgFormData.append('fileType', 'image');
  imgFormData.append('file', imgBlob, imgName);
  
  await logStep(jobId, `uploading_${label}_image`);
  
  const uploadResponse = await fetchWithRetry(
    'https://www.runninghub.ai/task/openapi/upload',
    { method: 'POST', body: imgFormData },
    `${label} image upload`
  );
  
  const uploadData = await safeParseResponse(uploadResponse, `${label} upload`);
  if (uploadData.code !== 0) throw new Error(`${label} image upload failed: ${uploadData.msg || 'Unknown'}`);
  console.log(`[CharacterGenerator] ${label} image uploaded:`, uploadData.data.fileName);
  return uploadData.data.fileName;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();
    const clientIP = getClientIP(req);
    
    console.log(`[CharacterGenerator] Endpoint called: ${path}, IP: ${clientIP}`);

    if (path === 'upload' || path === 'run' || path === 'refine') {
      const rateConfig = path === 'upload' ? RATE_LIMIT_UPLOAD : RATE_LIMIT_RUN;
      const rateLimitResult = await checkRateLimit(clientIP, `runninghub-character-generator/${path}`, rateConfig.maxRequests, rateConfig.windowSeconds);
      
      if (!rateLimitResult.allowed) {
        return new Response(JSON.stringify({ error: 'Too many requests.', code: 'RATE_LIMIT_EXCEEDED', retryAfter: rateLimitResult.resetAt }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' },
        });
      }
    }

    if (path === 'upload') return await handleUpload(req);
    else if (path === 'run') return await handleRun(req);
    else if (path === 'refine') return await handleRefine(req);
    else if (path === 'queue-status') return await handleQueueStatus(req);
    else if (path === 'reconcile') return await handleReconcile(req);
    else {
      return new Response(JSON.stringify({ error: 'Invalid endpoint' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[CharacterGenerator] Unhandled error:', error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Upload image to RunningHub
async function handleUpload(req: Request) {
  if (!RUNNINGHUB_API_KEY) {
    return new Response(JSON.stringify({ error: 'API key not configured', code: 'MISSING_API_KEY' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { imageBase64, fileName } = await req.json();
  
  if (!imageBase64) {
    return new Response(JSON.stringify({ error: 'imageBase64 is required', code: 'MISSING_IMAGE' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const binaryString = atob(imageBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const ext = (fileName || 'image.png').split('.').pop()?.toLowerCase() || 'png';
    const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'webp' ? 'image/webp' : 'image/png';

    const formData = new FormData();
    formData.append('apiKey', RUNNINGHUB_API_KEY);
    formData.append('fileType', 'image');
    formData.append('file', new Blob([bytes], { type: mimeType }), fileName || 'upload.png');

    const response = await fetchWithRetry('https://www.runninghub.ai/task/openapi/upload', { method: 'POST', body: formData }, 'Upload to RunningHub');
    const data = await safeParseResponse(response, 'Upload response');

    if (data.code !== 0) {
      return new Response(JSON.stringify({ error: data.msg || 'Upload failed', code: data.code, details: data }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, fileName: data.data.fileName }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown upload error';
    return new Response(JSON.stringify({ error: errorMessage, code: 'UPLOAD_EXCEPTION' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// Run the Character Generator workflow
async function handleRun(req: Request) {
  if (!RUNNINGHUB_API_KEY) {
    return new Response(JSON.stringify({ error: 'API key not configured', code: 'MISSING_API_KEY' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const body = await req.json();
  const { jobId, frontImageUrl, profileImageUrl, semiProfileImageUrl, lowAngleImageUrl, creditCost } = body;

  // ========== JWT AUTH VERIFICATION ==========
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const anonClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!);
  const jwtToken = authHeader.replace('Bearer ', '');
  const { data: { user: authUser }, error: authError } = await anonClient.auth.getUser(jwtToken);
  if (authError || !authUser) {
    return new Response(JSON.stringify({ error: 'Unauthorized', code: 'INVALID_TOKEN' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const userId = authUser.id;
  console.log(`[CharacterGenerator] JWT verified - userId: ${userId}`);

  // ========== INPUT VALIDATION ==========
  if (!jobId || typeof jobId !== 'string' || jobId.length > 100) {
    return new Response(JSON.stringify({ error: 'Valid jobId is required', code: 'INVALID_JOB_ID' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!frontImageUrl || !profileImageUrl || !semiProfileImageUrl || !lowAngleImageUrl) {
    return new Response(JSON.stringify({ error: 'All 4 image URLs are required', code: 'MISSING_PARAMS' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (typeof creditCost !== 'number' || creditCost < 1 || creditCost > 500) {
    return new Response(JSON.stringify({ error: 'Invalid credit cost', code: 'INVALID_CREDIT_COST' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Validate URLs are from Supabase storage
  const allowedDomains = ['supabase.co', 'supabase.in', SUPABASE_URL.replace('https://', '')];
  for (const imageUrl of [frontImageUrl, profileImageUrl, semiProfileImageUrl, lowAngleImageUrl]) {
    try {
      const urlObj = new URL(imageUrl);
      const isAllowed = allowedDomains.some(domain => urlObj.hostname.endsWith(domain));
      if (!isAllowed) {
        return new Response(JSON.stringify({ error: 'Image URLs must be from storage', code: 'INVALID_IMAGE_SOURCE' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid image URL format', code: 'INVALID_IMAGE_URL' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  // NOTE: No early status update - job stays 'pending' until queue manager decides

  await logStep(jobId, 'starting');

  // Download and upload all 4 images to RunningHub
  let frontFileName: string;
  let profileFileName: string;
  let semiProfileFileName: string;
  let lowAngleFileName: string;

  try {
    const imageConfigs = [
      { url: frontImageUrl, label: 'front' },
      { url: profileImageUrl, label: 'profile' },
      { url: semiProfileImageUrl, label: 'semi_profile' },
      { url: lowAngleImageUrl, label: 'low_angle' },
    ];

    const fileNames: string[] = [];

    for (const config of imageConfigs) {
      const fileName = await downloadAndUploadToRH(config.url, config.label, jobId, RUNNINGHUB_API_KEY);
      fileNames.push(fileName);
    }

    frontFileName = fileNames[0];
    profileFileName = fileNames[1];
    semiProfileFileName = fileNames[2];
    lowAngleFileName = fileNames[3];

  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Image transfer failed';
    await logStepFailure(jobId, 'image_transfer', errorMsg);
    
    await supabase
      .from(TABLE_NAME)
      .update({ status: 'failed', error_message: `IMAGE_TRANSFER_ERROR: ${errorMsg.slice(0, 200)}`, completed_at: new Date().toISOString() })
      .eq('id', jobId);
    
    return new Response(JSON.stringify({ error: errorMsg, code: 'IMAGE_TRANSFER_ERROR' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Consume credits
  await logStep(jobId, 'consuming_credits', { amount: creditCost });
  
  const { data: creditResult, error: creditError } = await supabase.rpc('consume_upscaler_credits', {
    _user_id: userId, _amount: creditCost, _description: 'Gerador de Personagem'
  });

  if (creditError) {
    await logStepFailure(jobId, 'consume_credits', creditError.message);
    return new Response(JSON.stringify({ error: 'Erro ao processar créditos', code: 'CREDIT_ERROR' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!creditResult || creditResult.length === 0 || !creditResult[0].success) {
    const errorMsg = creditResult?.[0]?.error_message || 'Saldo insuficiente';
    await logStepFailure(jobId, 'consume_credits', errorMsg);
    return new Response(JSON.stringify({ error: errorMsg, code: 'INSUFFICIENT_CREDITS' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Mark credits as charged
  await supabase
    .from(TABLE_NAME)
    .update({
      credits_charged: true,
      user_credit_cost: creditCost,
      front_file_name: frontFileName,
      profile_file_name: profileFileName,
      semi_profile_file_name: semiProfileFileName,
      low_angle_file_name: lowAngleFileName,
    })
    .eq('id', jobId);

  // Save job_payload for queue manager
  await supabase.from(TABLE_NAME).update({
    job_payload: { frontFileName, profileFileName, semiProfileFileName, lowAngleFileName }
  }).eq('id', jobId);

  // ========== DELEGATE TO QUEUE MANAGER ==========
  try {
    await logStep(jobId, 'delegating_to_queue');
    const qmResponse = await fetch(`${SUPABASE_URL}/functions/v1/runninghub-queue-manager/run-or-queue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
      body: JSON.stringify({ table: TABLE_NAME, jobId }),
    });
    const qmResult = await qmResponse.json();

    if (qmResult.queued) {
      return new Response(JSON.stringify({ success: true, queued: true, position: qmResult.position }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (qmResult.taskId) {
      return new Response(JSON.stringify({ success: true, taskId: qmResult.taskId }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify({ error: qmResult.error || 'Failed', code: 'RUN_FAILED', refunded: true }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    try {
      await supabase.rpc('refund_upscaler_credits', { _user_id: userId, _amount: creditCost, _description: `QM_EXCEPTION_REFUNDED: ${errorMessage.slice(0, 100)}` });
      await supabase.from(TABLE_NAME).update({ status: 'failed', error_message: `QM_EXCEPTION_REFUNDED: ${errorMessage.slice(0, 200)}`, credits_refunded: true, completed_at: new Date().toISOString() }).eq('id', jobId);
    } catch { await supabase.from(TABLE_NAME).update({ status: 'failed', error_message: `QM_EXCEPTION: ${errorMessage.slice(0, 200)}`, completed_at: new Date().toISOString() }).eq('id', jobId); }
    return new Response(JSON.stringify({ error: errorMessage, code: 'RUN_EXCEPTION', refunded: true }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
}

// ========== REFINE HANDLER ==========

async function handleRefine(req: Request) {
  if (!RUNNINGHUB_API_KEY) {
    return new Response(JSON.stringify({ error: 'API key not configured', code: 'MISSING_API_KEY' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const body = await req.json();
  const { jobId, frontImageUrl, profileImageUrl, semiProfileImageUrl, lowAngleImageUrl, resultImageUrl, selectedNumbers, creditCost } = body;

  // ========== JWT AUTH VERIFICATION ==========
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const anonClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!);
  const jwtToken = authHeader.replace('Bearer ', '');
  const { data: { user: authUser }, error: authError } = await anonClient.auth.getUser(jwtToken);
  if (authError || !authUser) {
    return new Response(JSON.stringify({ error: 'Unauthorized', code: 'INVALID_TOKEN' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const userId = authUser.id;
  console.log(`[CharacterGenerator] Refine JWT verified - userId: ${userId}`);

  // Validate inputs
  if (!jobId || typeof jobId !== 'string') {
    return new Response(JSON.stringify({ error: 'Valid jobId is required', code: 'INVALID_JOB_ID' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!frontImageUrl || !profileImageUrl || !semiProfileImageUrl || !lowAngleImageUrl || !resultImageUrl) {
    return new Response(JSON.stringify({ error: 'All 5 image URLs are required (4 originals + result)', code: 'MISSING_PARAMS' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!selectedNumbers || typeof selectedNumbers !== 'string') {
    return new Response(JSON.stringify({ error: 'selectedNumbers is required', code: 'MISSING_SELECTED_NUMBERS' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (typeof creditCost !== 'number' || creditCost < 1 || creditCost > 500) {
    return new Response(JSON.stringify({ error: 'Invalid credit cost', code: 'INVALID_CREDIT_COST' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  await logStep(jobId, 'refine_starting', { selectedNumbers });

  // Download and upload all 5 images to RunningHub
  let frontFileName: string;
  let profileFileName: string;
  let semiProfileFileName: string;
  let lowAngleFileName: string;
  let resultFileName: string;

  try {
    frontFileName = await downloadAndUploadToRH(frontImageUrl, 'refine_front', jobId, RUNNINGHUB_API_KEY);
    profileFileName = await downloadAndUploadToRH(profileImageUrl, 'refine_profile', jobId, RUNNINGHUB_API_KEY);
    semiProfileFileName = await downloadAndUploadToRH(semiProfileImageUrl, 'refine_semi_profile', jobId, RUNNINGHUB_API_KEY);
    lowAngleFileName = await downloadAndUploadToRH(lowAngleImageUrl, 'refine_low_angle', jobId, RUNNINGHUB_API_KEY);
    resultFileName = await downloadAndUploadToRH(resultImageUrl, 'refine_result', jobId, RUNNINGHUB_API_KEY);
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Image transfer failed';
    await logStepFailure(jobId, 'refine_image_transfer', errorMsg);
    
    await supabase
      .from(TABLE_NAME)
      .update({ status: 'failed', error_message: `REFINE_IMAGE_TRANSFER_ERROR: ${errorMsg.slice(0, 200)}`, completed_at: new Date().toISOString() })
      .eq('id', jobId);
    
    return new Response(JSON.stringify({ error: errorMsg, code: 'IMAGE_TRANSFER_ERROR' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Consume credits
  await logStep(jobId, 'refine_consuming_credits', { amount: creditCost });
  
  const { data: creditResult, error: creditError } = await supabase.rpc('consume_upscaler_credits', {
    _user_id: userId, _amount: creditCost, _description: 'Refinar Avatar'
  });

  if (creditError) {
    await logStepFailure(jobId, 'refine_consume_credits', creditError.message);
    return new Response(JSON.stringify({ error: 'Erro ao processar créditos', code: 'CREDIT_ERROR' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!creditResult || creditResult.length === 0 || !creditResult[0].success) {
    const errorMsg = creditResult?.[0]?.error_message || 'Saldo insuficiente';
    await logStepFailure(jobId, 'refine_consume_credits', errorMsg);
    return new Response(JSON.stringify({ error: errorMsg, code: 'INSUFFICIENT_CREDITS' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Mark credits as charged
  await supabase
    .from(TABLE_NAME)
    .update({ credits_charged: true, user_credit_cost: creditCost })
    .eq('id', jobId);

  // Save refine job_payload for queue manager
  await supabase.from(TABLE_NAME).update({
    job_payload: { isRefine: true, frontFileName, profileFileName, semiProfileFileName, lowAngleFileName, resultFileName, selectedNumbers }
  }).eq('id', jobId);

  // ========== DELEGATE TO QUEUE MANAGER ==========
  try {
    await logStep(jobId, 'refine_delegating_to_queue');
    const qmResponse = await fetch(`${SUPABASE_URL}/functions/v1/runninghub-queue-manager/run-or-queue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
      body: JSON.stringify({ table: TABLE_NAME, jobId }),
    });
    const qmResult = await qmResponse.json();

    if (qmResult.queued) {
      return new Response(JSON.stringify({ success: true, queued: true, position: qmResult.position }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (qmResult.taskId) {
      return new Response(JSON.stringify({ success: true, taskId: qmResult.taskId }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify({ error: qmResult.error || 'Failed', code: 'RUN_FAILED', refunded: true }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    try {
      await supabase.rpc('refund_upscaler_credits', { _user_id: userId, _amount: creditCost, _description: `REFINE_QM_EXCEPTION: ${errorMessage.slice(0, 100)}` });
      await supabase.from(TABLE_NAME).update({ status: 'failed', error_message: `REFINE_QM_EXCEPTION_REFUNDED: ${errorMessage.slice(0, 200)}`, credits_refunded: true, completed_at: new Date().toISOString() }).eq('id', jobId);
    } catch { await supabase.from(TABLE_NAME).update({ status: 'failed', error_message: `REFINE_QM_EXCEPTION: ${errorMessage.slice(0, 200)}`, completed_at: new Date().toISOString() }).eq('id', jobId); }
    return new Response(JSON.stringify({ error: errorMessage, code: 'RUN_EXCEPTION', refunded: true }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
}

// Reconcile a stuck job
async function handleReconcile(req: Request) {
  const { jobId } = await req.json();
  if (!jobId) {
    return new Response(JSON.stringify({ error: 'jobId is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  try {
    const { data: job, error } = await supabase
      .from(TABLE_NAME)
      .select('id, task_id, status, api_account, output_url, user_id, user_credit_cost')
      .eq('id', jobId)
      .maybeSingle();

    if (error || !job) {
      return new Response(JSON.stringify({ error: 'Job not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (['completed', 'failed', 'cancelled'].includes(job.status)) {
      return new Response(JSON.stringify({ success: true, alreadyFinalized: true, status: job.status, outputUrl: job.output_url }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!job.task_id) {
      return new Response(JSON.stringify({ error: 'Job has no task_id yet' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let apiKey = RUNNINGHUB_API_KEY;
    if (job.api_account && job.api_account !== 'primary') {
      const suffix = job.api_account.replace('primary', '').replace('account_', '_');
      const envKey = Deno.env.get(`RUNNINGHUB_API_KEY${suffix}`) || Deno.env.get(`RUNNINGHUB_APIKEY${suffix}`);
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
        body: JSON.stringify({ table: TABLE_NAME, jobId: job.id, status: 'completed', outputUrl, taskId: job.task_id, rhCost: 0, webhookPayload: { reconciled: true, rhQuery: queryData } }),
      });

      return new Response(JSON.stringify({ success: true, reconciled: true, status: 'completed', outputUrl }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (rhStatus === 'FAILED') {
      await fetch(`${SUPABASE_URL}/functions/v1/runninghub-queue-manager/finish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
        body: JSON.stringify({ table: TABLE_NAME, jobId: job.id, status: 'failed', errorMessage: queryData.errorMessage || 'Failed on RunningHub', taskId: job.task_id, rhCost: 0, webhookPayload: { reconciled: true, rhQuery: queryData } }),
      });

      return new Response(JSON.stringify({ success: true, reconciled: true, status: 'failed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, reconciled: false, currentStatus: rhStatus, message: 'Job still processing' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
}

// Get queue status
async function handleQueueStatus(req: Request) {
  const { jobId } = await req.json();
  if (!jobId) {
    return new Response(JSON.stringify({ error: 'jobId is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  try {
    const { data: job, error } = await supabase
      .from(TABLE_NAME)
      .select('status, position, output_url, error_message')
      .eq('id', jobId)
      .single();

    if (error || !job) {
      return new Response(JSON.stringify({ error: 'Job not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ success: true, status: job.status, position: job.position, outputUrl: job.output_url, errorMessage: job.error_message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to get queue status' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
}
