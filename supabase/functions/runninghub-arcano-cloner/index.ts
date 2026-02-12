import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * ARCANO CLONER - EDGE FUNCTION
 * 
 * Ferramenta de IA que clona poses e cenários.
 * Usa o workflow WebApp ID 2019877042115842050
 * 
 * Nodes do Workflow:
 * - Node 58: Foto do usuário (image)
 * - Node 62: Foto de referência (image)  
 * - Node 69: Prompt fixo (text)
 * - Node 85: Aspect ratio (aspectRatio)
 * 
 * Endpoints:
 * - /upload - Upload de imagem para RunningHub
 * - /run - Inicia processamento
 * - /queue-status - Consulta status do job
 */

const RUNNINGHUB_API_KEY = (
  Deno.env.get('RUNNINGHUB_API_KEY') ||
  Deno.env.get('RUNNINGHUB_APIKEY') ||
  ''
).trim();

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// WebApp ID for Arcano Cloner
const WEBAPP_ID_CLONER = '2019877042115842050';

// Rate limit configuration
const RATE_LIMIT_UPLOAD = { maxRequests: 10, windowSeconds: 60 };
const RATE_LIMIT_RUN = { maxRequests: 5, windowSeconds: 60 };

// Fixed prompt for the workflow
const FIXED_PROMPT = 'faça o homem da imagem 1 com a mesma pose, composição de cenário fundo e roupas da imagem 2. SEM RUÍDO NA FOTO';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

if (!RUNNINGHUB_API_KEY) {
  console.error('[ArcanoCloner] CRITICAL: Missing RUNNINGHUB_API_KEY secret');
}

console.log('[ArcanoCloner] Config loaded - WebApp ID:', WEBAPP_ID_CLONER);

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
      .from('arcano_cloner_jobs')
      .select('step_history')
      .eq('id', jobId)
      .maybeSingle();
    
    const currentHistory = (job?.step_history as any[]) || [];
    const newHistory = [...currentHistory, entry];
    
    await supabase
      .from('arcano_cloner_jobs')
      .update({
        current_step: step,
        step_history: newHistory,
      })
      .eq('id', jobId);
    
    console.log(`[ArcanoCloner] Job ${jobId}: ${step}`, details || '');
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
      .from('arcano_cloner_jobs')
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
    
    await supabase.from('arcano_cloner_jobs').update(updateData).eq('id', jobId);
    
    console.log(`[ArcanoCloner] Job ${jobId}: FAILED at ${failedAtStep}:`, errorMessage);
  } catch (e) {
    console.error(`[logStepFailure] Error:`, e);
  }
}

// ========== SAFE JSON PARSING HELPERS ==========

async function safeParseResponse(response: Response, context: string): Promise<any> {
  const contentType = response.headers.get('content-type') || '';
  const status = response.status;
  
  const text = await response.text();
  
  console.log(`[ArcanoCloner] ${context} - Status: ${status}, ContentType: ${contentType}, BodyLength: ${text.length}`);
  
  if (!response.ok) {
    const snippet = text.slice(0, 300);
    console.error(`[ArcanoCloner] ${context} FAILED - Status: ${status}, Body: ${snippet}`);
    throw new Error(`${context} failed (${status}): ${snippet.slice(0, 100)}`);
  }
  
  if (!contentType.includes('application/json') && !text.trim().startsWith('{') && !text.trim().startsWith('[')) {
    const snippet = text.slice(0, 300);
    console.error(`[ArcanoCloner] ${context} returned non-JSON - ContentType: ${contentType}, Body: ${snippet}`);
    throw new Error(`${context} returned HTML/error (${status}): ${snippet.slice(0, 100)}`);
  }
  
  try {
    return JSON.parse(text);
  } catch (e) {
    const snippet = text.slice(0, 300);
    console.error(`[ArcanoCloner] ${context} JSON parse failed - Body: ${snippet}`);
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
      console.warn(`[ArcanoCloner] ${context} got ${response.status}, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
      await new Promise(r => setTimeout(r, delay));
    } else {
      console.error(`[ArcanoCloner] ${context} failed after ${maxRetries} retries with status ${response.status}`);
      throw new Error(`${context} failed after ${maxRetries} retries (${response.status})`);
    }
  }
  
  throw new Error(`${context} failed - unexpected retry loop exit`);
}

function getClientIP(req: Request): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  const realIP = req.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  return 'unknown';
}

async function checkRateLimit(
  ip: string, 
  endpoint: string, 
  maxRequests: number, 
  windowSeconds: number
): Promise<{ allowed: boolean; currentCount: number; resetAt: string }> {
  try {
    const { data, error } = await supabase.rpc('check_rate_limit', {
      _ip_address: ip,
      _endpoint: endpoint,
      _max_requests: maxRequests,
      _window_seconds: windowSeconds
    });
    
    if (error) {
      console.error('[RateLimit] Error checking rate limit:', error);
      return { allowed: true, currentCount: 0, resetAt: '' };
    }
    
    const result = data?.[0] || { allowed: true, current_count: 0, reset_at: null };
    return { 
      allowed: result.allowed, 
      currentCount: result.current_count,
      resetAt: result.reset_at || ''
    };
  } catch (err) {
    console.error('[RateLimit] Exception:', err);
    return { allowed: true, currentCount: 0, resetAt: '' };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();
    const clientIP = getClientIP(req);
    
    console.log(`[ArcanoCloner] Endpoint called: ${path}, IP: ${clientIP}`);

    if (path === 'upload' || path === 'run') {
      const rateConfig = path === 'upload' ? RATE_LIMIT_UPLOAD : RATE_LIMIT_RUN;
      const rateLimitResult = await checkRateLimit(
        clientIP, 
        `runninghub-arcano-cloner/${path}`,
        rateConfig.maxRequests,
        rateConfig.windowSeconds
      );
      
      if (!rateLimitResult.allowed) {
        console.warn(`[RateLimit] IP ${clientIP} exceeded limit for ${path}`);
        return new Response(JSON.stringify({ 
          error: 'Too many requests. Please wait before trying again.',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: rateLimitResult.resetAt
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' },
        });
      }
    }

    if (path === 'upload') {
      return await handleUpload(req);
    } else if (path === 'run') {
      return await handleRun(req);
    } else if (path === 'queue-status') {
      return await handleQueueStatus(req);
    } else if (path === 'reconcile') {
      return await handleReconcile(req);
    } else {
      return new Response(JSON.stringify({ error: 'Invalid endpoint' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ArcanoCloner] Unhandled error:', error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Upload image to RunningHub
async function handleUpload(req: Request) {
  if (!RUNNINGHUB_API_KEY) {
    return new Response(JSON.stringify({ 
      error: 'API key not configured',
      code: 'MISSING_API_KEY'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { imageBase64, fileName } = await req.json();
  
  if (!imageBase64) {
    return new Response(JSON.stringify({ error: 'imageBase64 is required', code: 'MISSING_IMAGE' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  console.log('[ArcanoCloner] Uploading image...');

  try {
    const binaryString = atob(imageBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const ext = (fileName || 'image.png').split('.').pop()?.toLowerCase() || 'png';
    const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 
                     ext === 'webp' ? 'image/webp' : 'image/png';

    const formData = new FormData();
    formData.append('apiKey', RUNNINGHUB_API_KEY);
    formData.append('fileType', 'image');
    formData.append('file', new Blob([bytes], { type: mimeType }), fileName || 'upload.png');

    const response = await fetchWithRetry(
      'https://www.runninghub.ai/task/openapi/upload',
      { method: 'POST', body: formData },
      'Upload to RunningHub'
    );

    const data = await safeParseResponse(response, 'Upload response');
    console.log('[ArcanoCloner] Upload response:', JSON.stringify(data));

    if (data.code !== 0) {
      return new Response(JSON.stringify({ 
        error: data.msg || 'Upload failed',
        code: data.code,
        details: data
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      fileName: data.data.fileName 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown upload error';
    console.error('[ArcanoCloner] Upload error:', error);
    return new Response(JSON.stringify({ error: errorMessage, code: 'UPLOAD_EXCEPTION' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// Run the Arcano Cloner workflow
async function handleRun(req: Request) {
  if (!RUNNINGHUB_API_KEY) {
    return new Response(JSON.stringify({ 
      error: 'API key not configured',
      code: 'MISSING_API_KEY'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { 
    jobId,
    userImageUrl,
    referenceImageUrl,
    aspectRatio,
    userId,
    creditCost,
    creativity,
    customPrompt
  } = await req.json();
  
  // ========== INPUT VALIDATION ==========
  if (!jobId || typeof jobId !== 'string' || jobId.length > 100) {
    return new Response(JSON.stringify({ 
      error: 'Valid jobId is required', 
      code: 'INVALID_JOB_ID' 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!userImageUrl || !referenceImageUrl) {
    return new Response(JSON.stringify({ 
      error: 'Both userImageUrl and referenceImageUrl are required', 
      code: 'MISSING_PARAMS' 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Validate aspect ratio
  const validAspectRatios = ['1:1', '3:4', '9:16', '16:9'];
  const finalAspectRatio = validAspectRatios.includes(aspectRatio) ? aspectRatio : '1:1';

  // Validate URLs are from Supabase storage
  const allowedDomains = ['supabase.co', 'supabase.in', SUPABASE_URL.replace('https://', '')];
  
  for (const imageUrl of [userImageUrl, referenceImageUrl]) {
    try {
      const urlObj = new URL(imageUrl);
      const isAllowed = allowedDomains.some(domain => urlObj.hostname.endsWith(domain));
      
      if (!isAllowed) {
        console.warn(`[ArcanoCloner] Rejected image URL: ${urlObj.hostname}`);
        return new Response(JSON.stringify({ 
          error: 'Image URLs must be from Supabase storage', 
          code: 'INVALID_IMAGE_SOURCE' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } catch (e) {
      return new Response(JSON.stringify({ 
        error: 'Invalid image URL format', 
        code: 'INVALID_IMAGE_URL' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  // Validate creditCost
  if (typeof creditCost !== 'number' || creditCost < 1 || creditCost > 500) {
    return new Response(JSON.stringify({ 
      error: 'Invalid credit cost (must be 1-500)', 
      code: 'INVALID_CREDIT_COST'
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Validate userId
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!userId || typeof userId !== 'string' || !uuidRegex.test(userId)) {
    return new Response(JSON.stringify({ 
      error: 'Valid userId is required', 
      code: 'INVALID_USER_ID'
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Log step: starting
  await logStep(jobId, 'starting', { aspectRatio: finalAspectRatio });

  // Download and upload both images to RunningHub
  let userFileName: string;
  let referenceFileName: string;

  try {
    // Upload user image
    console.log('[ArcanoCloner] Downloading user image from storage...');
    await logStep(jobId, 'downloading_user_image');
    
    const userResponse = await fetch(userImageUrl);
    if (!userResponse.ok) throw new Error(`Failed to download user image (${userResponse.status})`);
    
    const userBlob = await userResponse.blob();
    const userName = userImageUrl.split('/').pop() || 'user.png';
    
    const userFormData = new FormData();
    userFormData.append('apiKey', RUNNINGHUB_API_KEY);
    userFormData.append('fileType', 'image');
    userFormData.append('file', userBlob, userName);
    
    await logStep(jobId, 'uploading_user_image');
    
    const userUploadResponse = await fetchWithRetry(
      'https://www.runninghub.ai/task/openapi/upload',
      { method: 'POST', body: userFormData },
      'User image upload'
    );
    
    const userData = await safeParseResponse(userUploadResponse, 'User upload');
    if (userData.code !== 0) throw new Error('User image upload failed: ' + (userData.msg || 'Unknown'));
    userFileName = userData.data.fileName;
    console.log('[ArcanoCloner] User image uploaded:', userFileName);

    // Upload reference image
    console.log('[ArcanoCloner] Downloading reference image from storage...');
    await logStep(jobId, 'downloading_reference_image');
    
    const refResponse = await fetch(referenceImageUrl);
    if (!refResponse.ok) throw new Error(`Failed to download reference image (${refResponse.status})`);
    
    const refBlob = await refResponse.blob();
    const refName = referenceImageUrl.split('/').pop() || 'reference.png';
    
    const refFormData = new FormData();
    refFormData.append('apiKey', RUNNINGHUB_API_KEY);
    refFormData.append('fileType', 'image');
    refFormData.append('file', refBlob, refName);
    
    await logStep(jobId, 'uploading_reference_image');
    
    const refUploadResponse = await fetchWithRetry(
      'https://www.runninghub.ai/task/openapi/upload',
      { method: 'POST', body: refFormData },
      'Reference image upload'
    );
    
    const refData = await safeParseResponse(refUploadResponse, 'Reference upload');
    if (refData.code !== 0) throw new Error('Reference image upload failed: ' + (refData.msg || 'Unknown'));
    referenceFileName = refData.data.fileName;
    console.log('[ArcanoCloner] Reference image uploaded:', referenceFileName);

  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Image transfer failed';
    console.error('[ArcanoCloner] Image transfer error:', error);
    
    await logStepFailure(jobId, 'image_transfer', errorMsg);
    
    await supabase
      .from('arcano_cloner_jobs')
      .update({ 
        status: 'failed', 
        error_message: `IMAGE_TRANSFER_ERROR: ${errorMsg.slice(0, 200)}`,
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId);
    
    return new Response(JSON.stringify({ 
      error: errorMsg, 
      code: 'IMAGE_TRANSFER_ERROR' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Consume credits
  await logStep(jobId, 'consuming_credits', { amount: creditCost });
  console.log(`[ArcanoCloner] Consuming ${creditCost} credits for user ${userId}`);
  
  const { data: creditResult, error: creditError } = await supabase.rpc(
    'consume_upscaler_credits', 
    {
      _user_id: userId,
      _amount: creditCost,
      _description: 'Arcano Cloner'
    }
  );

  if (creditError) {
    console.error('[ArcanoCloner] Credit consumption error:', creditError);
    await logStepFailure(jobId, 'consume_credits', creditError.message);
    return new Response(JSON.stringify({ 
      error: 'Erro ao processar créditos',
      code: 'CREDIT_ERROR',
      details: creditError.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!creditResult || creditResult.length === 0 || !creditResult[0].success) {
    const errorMsg = creditResult?.[0]?.error_message || 'Saldo insuficiente';
    console.log('[ArcanoCloner] Insufficient credits:', errorMsg);
    await logStepFailure(jobId, 'consume_credits', errorMsg);
    return new Response(JSON.stringify({ 
      error: errorMsg,
      code: 'INSUFFICIENT_CREDITS',
      currentBalance: creditResult?.[0]?.new_balance
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  console.log(`[ArcanoCloner] Credits consumed. New balance: ${creditResult[0].new_balance}`);

  // CRITICAL: Mark credits as charged for idempotent refund on failure
  await supabase
    .from('arcano_cloner_jobs')
    .update({ 
      credits_charged: true,
      user_credit_cost: creditCost,
      user_file_name: userFileName,
      reference_file_name: referenceFileName,
      aspect_ratio: finalAspectRatio,
    })
    .eq('id', jobId);
  console.log(`[ArcanoCloner] Job ${jobId} marked as credits_charged=true`);

  try {
    // Check queue availability via Queue Manager
    await logStep(jobId, 'checking_queue');
    
    let slotsAvailable = 0;
    let accountName: string | null = null;
    let accountApiKey: string | null = null;
    
    try {
      const queueCheckUrl = `${SUPABASE_URL}/functions/v1/runninghub-queue-manager/check`;
      const queueResponse = await fetch(queueCheckUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
      });
      const queueData = await queueResponse.json();
      slotsAvailable = queueData.slotsAvailable || 0;
      accountName = queueData.accountName || 'primary';
      accountApiKey = queueData.accountApiKey || RUNNINGHUB_API_KEY;
      console.log(`[ArcanoCloner] Queue Manager check: ${queueData.running}/${queueData.maxConcurrent}, slots: ${slotsAvailable}, account: ${accountName}`);
    } catch (queueError) {
      console.error('[ArcanoCloner] Queue Manager check failed, using primary account:', queueError);
      accountName = 'primary';
      accountApiKey = RUNNINGHUB_API_KEY;
    }

    if (slotsAvailable <= 0) {
      // Queue the job
      await logStep(jobId, 'queuing');
      
      try {
        const enqueueUrl = `${SUPABASE_URL}/functions/v1/runninghub-queue-manager/enqueue`;
        const enqueueResponse = await fetch(enqueueUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            table: 'arcano_cloner_jobs',
            jobId,
            creditCost,
          }),
        });
        const enqueueData = await enqueueResponse.json();
        
        console.log(`[ArcanoCloner] Job ${jobId} queued at GLOBAL position ${enqueueData.position}`);
        
        return new Response(JSON.stringify({ 
          success: true, 
          queued: true, 
          position: enqueueData.position,
          message: 'Job queued, will start when slot available'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (enqueueError) {
        console.error('[ArcanoCloner] Enqueue failed:', enqueueError);
        await supabase
          .from('arcano_cloner_jobs')
          .update({ 
            status: 'queued',
            position: 999,
            user_credit_cost: creditCost,
            waited_in_queue: true
          })
          .eq('id', jobId);
        
        return new Response(JSON.stringify({ 
          success: true, 
          queued: true, 
          position: 999,
          message: 'Job queued'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Slot available - start processing with assigned account
    await logStep(jobId, 'running', { account: accountName });
    
    const apiKeyToUse = accountApiKey || RUNNINGHUB_API_KEY;
    const accountToUse = accountName || 'primary';
    
    await supabase
      .from('arcano_cloner_jobs')
      .update({ 
        user_credit_cost: creditCost,
        waited_in_queue: false,
        status: 'running', 
        started_at: new Date().toISOString(),
        position: 0,
        api_account: accountToUse
      })
      .eq('id', jobId);

    // Build node info list for Arcano Cloner API
    // Node 58 = User photo, Node 62 = Reference photo, Node 69 = Prompt, Node 85 = Aspect Ratio
    const finalCreativity = String(Math.min(6, Math.max(1, Number(creativity) || 4)));
    const finalCustomPrompt = customPrompt || '';

    const nodeInfoList = [
      { nodeId: "58", fieldName: "image", fieldValue: userFileName },
      { nodeId: "62", fieldName: "image", fieldValue: referenceFileName },
      { nodeId: "69", fieldName: "text", fieldValue: FIXED_PROMPT },
      { nodeId: "85", fieldName: "aspectRatio", fieldValue: finalAspectRatio },
      { nodeId: "133", fieldName: "value", fieldValue: finalCreativity },
      { nodeId: "135", fieldName: "text", fieldValue: finalCustomPrompt }
    ];

    const webhookUrl = `${SUPABASE_URL}/functions/v1/runninghub-webhook`;

    const requestBody = {
      nodeInfoList: nodeInfoList,
      instanceType: "default",
      usePersonalQueue: false,
      webhookUrl: webhookUrl,
    };

    console.log('[ArcanoCloner] AI App request:', JSON.stringify(requestBody));
    console.log(`[ArcanoCloner] Using API account: ${accountToUse}`);
    
    const response = await fetchWithRetry(
      `https://www.runninghub.ai/openapi/v2/run/ai-app/${WEBAPP_ID_CLONER}`,
      {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKeyToUse}`
        },
        body: JSON.stringify(requestBody),
      },
      'Run AI App'
    );

    const data = await safeParseResponse(response, 'AI App response');
    console.log('[ArcanoCloner] AI App response:', JSON.stringify(data));

    if (data.taskId) {
      await supabase
        .from('arcano_cloner_jobs')
        .update({ 
          task_id: data.taskId,
          raw_api_response: data 
        })
        .eq('id', jobId);
      
      await logStep(jobId, 'task_started', { taskId: data.taskId });

      return new Response(JSON.stringify({
        success: true, 
        taskId: data.taskId,
        method: 'ai-app-v2'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ========== START FAILED - NO TASK_ID - REFUND IMMEDIATELY ==========
    const startErrorMsg = data.msg || data.message || 'Failed to start workflow';
    console.error(`[ArcanoCloner] START FAILED (no taskId) - Refunding credits for job ${jobId}`);
    
    await logStepFailure(jobId, 'run_workflow', `START_FAILED_REFUNDED: ${startErrorMsg}`, data);
    
    try {
      await supabase.rpc('refund_upscaler_credits', {
        _user_id: userId,
        _amount: creditCost,
        _description: `START_FAILED_REFUNDED: ${startErrorMsg.slice(0, 100)}`
      });
      
      await supabase
        .from('arcano_cloner_jobs')
        .update({ 
          status: 'failed', 
          error_message: `START_FAILED_REFUNDED: ${startErrorMsg}`,
          credits_refunded: true,
          completed_at: new Date().toISOString(),
          raw_api_response: data
        })
        .eq('id', jobId);
      
      console.log(`[ArcanoCloner] Job ${jobId} refunded ${creditCost} credits (start failed)`);
    } catch (refundError) {
      console.error(`[ArcanoCloner] Refund failed for job ${jobId}:`, refundError);
      await supabase
        .from('arcano_cloner_jobs')
        .update({ 
          status: 'failed', 
          error_message: `START_FAILED (refund error): ${startErrorMsg}`,
          completed_at: new Date().toISOString(),
          raw_api_response: data
        })
        .eq('id', jobId);
    }

    return new Response(JSON.stringify({
      error: startErrorMsg,
      code: data.code || 'RUN_FAILED',
      details: data,
      refunded: true
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ArcanoCloner] Run error:', error);
    
    // ========== EXCEPTION DURING START - REFUND IMMEDIATELY ==========
    console.error(`[ArcanoCloner] EXCEPTION during start - Refunding credits for job ${jobId}`);
    
    await logStepFailure(jobId, 'run_exception', `START_EXCEPTION_REFUNDED: ${errorMessage}`);
    
    try {
      await supabase.rpc('refund_upscaler_credits', {
        _user_id: userId,
        _amount: creditCost,
        _description: `START_EXCEPTION_REFUNDED: ${errorMessage.slice(0, 100)}`
      });
      
      await supabase
        .from('arcano_cloner_jobs')
        .update({ 
          status: 'failed', 
          error_message: `START_EXCEPTION_REFUNDED: ${errorMessage.slice(0, 200)}`,
          credits_refunded: true,
          completed_at: new Date().toISOString()
        })
        .eq('id', jobId);
      
      console.log(`[ArcanoCloner] Job ${jobId} refunded ${creditCost} credits (exception)`);
    } catch (refundError) {
      console.error(`[ArcanoCloner] Refund failed for job ${jobId}:`, refundError);
      await supabase
        .from('arcano_cloner_jobs')
        .update({ 
          status: 'failed', 
          error_message: `START_EXCEPTION (refund error): ${errorMessage.slice(0, 200)}`,
          completed_at: new Date().toISOString()
        })
        .eq('id', jobId);
    }

    return new Response(JSON.stringify({ 
      error: errorMessage, 
      code: 'RUN_EXCEPTION',
      refunded: true
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// Reconcile a stuck job by querying RunningHub directly
async function handleReconcile(req: Request) {
  const { jobId } = await req.json();

  if (!jobId) {
    return new Response(JSON.stringify({ error: 'jobId is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { data: job, error } = await supabase
      .from('arcano_cloner_jobs')
      .select('id, task_id, status, api_account, output_url, raw_webhook_payload, user_id, user_credit_cost')
      .eq('id', jobId)
      .maybeSingle();

    if (error || !job) {
      return new Response(JSON.stringify({ error: 'Job not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Already terminal
    if (['completed', 'failed', 'cancelled'].includes(job.status)) {
      return new Response(JSON.stringify({ 
        success: true, 
        alreadyFinalized: true, 
        status: job.status,
        outputUrl: job.output_url 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!job.task_id) {
      return new Response(JSON.stringify({ error: 'Job has no task_id yet' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get the correct API key for the account used
    let apiKey = RUNNINGHUB_API_KEY;
    if (job.api_account && job.api_account !== 'primary') {
      const suffix = job.api_account.replace('primary', '').replace('account_', '_');
      const envKey = Deno.env.get(`RUNNINGHUB_API_KEY${suffix}`) || Deno.env.get(`RUNNINGHUB_APIKEY${suffix}`);
      if (envKey) apiKey = envKey.trim();
    }

    // Query RunningHub for current status
    console.log(`[ArcanoCloner] Reconcile: querying RunningHub for task ${job.task_id}`);
    const queryResponse = await fetch('https://www.runninghub.ai/openapi/v2/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ taskId: job.task_id }),
    });

    const queryData = await queryResponse.json();
    console.log(`[ArcanoCloner] Reconcile query result:`, JSON.stringify(queryData));

    const rhStatus = queryData.status;

    if (rhStatus === 'SUCCESS' && queryData.results?.length > 0) {
      const imageResult = queryData.results.find((r: any) =>
        ['png', 'jpg', 'jpeg', 'webp'].includes(r.outputType)
      );
      const outputUrl = imageResult?.url || queryData.results[0]?.url;

      // Finalize via queue manager
      const finishUrl = `${SUPABASE_URL}/functions/v1/runninghub-queue-manager/finish`;
      await fetch(finishUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          table: 'arcano_cloner_jobs',
          jobId: job.id,
          status: 'completed',
          outputUrl,
          taskId: job.task_id,
          rhCost: 0,
          webhookPayload: { reconciled: true, rhQuery: queryData },
        }),
      });

      await logStep(jobId, 'reconciled_completed', { outputUrl });

      return new Response(JSON.stringify({ 
        success: true, 
        reconciled: true, 
        status: 'completed', 
        outputUrl 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (rhStatus === 'FAILED') {
      const finishUrl = `${SUPABASE_URL}/functions/v1/runninghub-queue-manager/finish`;
      await fetch(finishUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          table: 'arcano_cloner_jobs',
          jobId: job.id,
          status: 'failed',
          errorMessage: queryData.errorMessage || 'Failed on RunningHub',
          taskId: job.task_id,
          rhCost: 0,
          webhookPayload: { reconciled: true, rhQuery: queryData },
        }),
      });

      await logStep(jobId, 'reconciled_failed', { error: queryData.errorMessage });

      return new Response(JSON.stringify({ 
        success: true, 
        reconciled: true, 
        status: 'failed' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Still running
    return new Response(JSON.stringify({ 
      success: true, 
      reconciled: false, 
      currentStatus: rhStatus,
      message: 'Job still processing on RunningHub' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ArcanoCloner] Reconcile error:', error);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// Get queue status
async function handleQueueStatus(req: Request) {
  const { jobId } = await req.json();

  if (!jobId) {
    return new Response(JSON.stringify({ error: 'jobId is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { data: job, error } = await supabase
      .from('arcano_cloner_jobs')
      .select('status, position, output_url, error_message')
      .eq('id', jobId)
      .single();

    if (error || !job) {
      return new Response(JSON.stringify({ error: 'Job not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ 
      success: true,
      status: job.status,
      position: job.position,
      outputUrl: job.output_url,
      errorMessage: job.error_message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[ArcanoCloner] Queue status error:', error);
    return new Response(JSON.stringify({ error: 'Failed to get queue status' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
