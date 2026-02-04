import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// API Configuration
const RUNNINGHUB_API_KEY = (
  Deno.env.get('RUNNINGHUB_API_KEY') ||
  Deno.env.get('RUNNINGHUB_APIKEY') ||
  ''
).trim();

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// WebApp IDs for the upscaler workflows
const WEBAPP_ID_PRO = '2015865378030755841';
const WEBAPP_ID_STANDARD = '2017030861371219969';
const WEBAPP_ID_LONGE = '2017343414227963905';
const MAX_CONCURRENT_JOBS = 3;

// Rate limit configuration
const RATE_LIMIT_UPLOAD = { maxRequests: 10, windowSeconds: 60 };
const RATE_LIMIT_RUN = { maxRequests: 5, windowSeconds: 60 };

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

if (!RUNNINGHUB_API_KEY) {
  console.error('[RunningHub] CRITICAL: Missing RUNNINGHUB_API_KEY secret');
}

console.log('[RunningHub] Config loaded - PRO:', WEBAPP_ID_PRO, 'STANDARD:', WEBAPP_ID_STANDARD);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ========== SAFE JSON PARSING HELPERS ==========

// Read response safely - handles HTML errors from RunningHub/Cloudflare
async function safeParseResponse(response: Response, context: string): Promise<any> {
  const contentType = response.headers.get('content-type') || '';
  const status = response.status;
  
  // Always read as text first to avoid stream issues
  const text = await response.text();
  
  console.log(`[RunningHub] ${context} - Status: ${status}, ContentType: ${contentType}, BodyLength: ${text.length}`);
  
  // If not OK, log snippet and throw useful error
  if (!response.ok) {
    const snippet = text.slice(0, 300);
    console.error(`[RunningHub] ${context} FAILED - Status: ${status}, Body: ${snippet}`);
    throw new Error(`${context} failed (${status}): ${snippet.slice(0, 100)}`);
  }
  
  // Check if response looks like JSON
  if (!contentType.includes('application/json') && !text.trim().startsWith('{') && !text.trim().startsWith('[')) {
    const snippet = text.slice(0, 300);
    console.error(`[RunningHub] ${context} returned non-JSON - ContentType: ${contentType}, Body: ${snippet}`);
    throw new Error(`${context} returned HTML/error (${status}): ${snippet.slice(0, 100)}`);
  }
  
  // Try to parse JSON
  try {
    return JSON.parse(text);
  } catch (e) {
    const snippet = text.slice(0, 300);
    console.error(`[RunningHub] ${context} JSON parse failed - Body: ${snippet}`);
    throw new Error(`${context} invalid JSON (${status}): ${snippet.slice(0, 100)}`);
  }
}

// Fetch with retry for transient errors (429, 502, 503, 504)
async function fetchWithRetry(
  url: string, 
  options: RequestInit, 
  context: string,
  maxRetries: number = 3
): Promise<Response> {
  const retryableStatuses = [429, 502, 503, 504];
  const delays = [500, 1000, 2000];
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch(url, options);
    
    if (!retryableStatuses.includes(response.status)) {
      return response;
    }
    
    // Consume body to prevent leak
    await response.text();
    
    if (attempt < maxRetries - 1) {
      const delay = delays[attempt] || 2000;
      console.warn(`[RunningHub] ${context} got ${response.status}, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
      await new Promise(r => setTimeout(r, delay));
    } else {
      console.error(`[RunningHub] ${context} failed after ${maxRetries} retries with status ${response.status}`);
      throw new Error(`${context} failed after ${maxRetries} retries (${response.status})`);
    }
  }
  
  throw new Error(`${context} failed - unexpected retry loop exit`);
}

// Get client IP from request headers
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

// Check rate limit using database function
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
    
    console.log(`[RunningHub] Endpoint called: ${path}, IP: ${clientIP}`);

    // Apply rate limiting for upload and run endpoints
    if (path === 'upload' || path === 'run') {
      const rateConfig = path === 'upload' ? RATE_LIMIT_UPLOAD : RATE_LIMIT_RUN;
      const rateLimitResult = await checkRateLimit(
        clientIP, 
        `runninghub-upscaler/${path}`,
        rateConfig.maxRequests,
        rateConfig.windowSeconds
      );
      
      if (!rateLimitResult.allowed) {
        console.warn(`[RateLimit] IP ${clientIP} exceeded limit for ${path}: ${rateLimitResult.currentCount} requests`);
        return new Response(JSON.stringify({ 
          error: 'Too many requests. Please wait before trying again.',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: rateLimitResult.resetAt
        }), {
          status: 429,
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Retry-After': '60'
          },
        });
      }
    }

    if (path === 'upload') {
      return await handleUpload(req);
    } else if (path === 'run') {
      return await handleRun(req);
    } else if (path === 'queue-status') {
      return await handleQueueStatus(req);
    } else {
      return new Response(JSON.stringify({ error: 'Invalid endpoint' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[RunningHub] Unhandled error:', error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Upload image to RunningHub
async function handleUpload(req: Request) {
  if (!RUNNINGHUB_API_KEY) {
    console.error('[RunningHub] Upload failed: API key not configured');
    return new Response(JSON.stringify({ 
      error: 'API key not configured. Please add RUNNINGHUB_API_KEY secret.',
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

  console.log('[RunningHub] Uploading image...');

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
    console.log('[RunningHub] Upload response:', JSON.stringify(data));

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
    console.error('[RunningHub] Upload error:', error);
    return new Response(JSON.stringify({ error: errorMessage, code: 'UPLOAD_EXCEPTION' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// Run the workflow with webhook callback
async function handleRun(req: Request) {
  if (!RUNNINGHUB_API_KEY) {
    return new Response(JSON.stringify({ 
      error: 'API key not configured',
      code: 'MISSING_API_KEY',
      solution: 'Add RUNNINGHUB_API_KEY secret in backend settings'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { 
    jobId,
    imageUrl,
    fileName,
    detailDenoise,
    resolution,
    prompt,
    version,
    framingMode,
    userId,
    creditCost
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

  if (!imageUrl && !fileName) {
    return new Response(JSON.stringify({ 
      error: 'imageUrl or fileName is required', 
      code: 'MISSING_PARAMS' 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Validate imageUrl is from expected domain
  if (imageUrl) {
    const allowedDomains = [
      'supabase.co',
      'supabase.in',
      SUPABASE_URL.replace('https://', '')
    ];
    
    try {
      const urlObj = new URL(imageUrl);
      const isAllowed = allowedDomains.some(domain => urlObj.hostname.endsWith(domain));
      
      if (!isAllowed) {
        console.warn(`[RunningHub] Rejected image URL from untrusted domain: ${urlObj.hostname}`);
        return new Response(JSON.stringify({ 
          error: 'Image URL must be from Supabase storage', 
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

  // Validate resolution
  if (resolution !== undefined && (typeof resolution !== 'number' || resolution < 512 || resolution > 8192)) {
    return new Response(JSON.stringify({ 
      error: 'Invalid resolution (must be 512-8192)', 
      code: 'INVALID_RESOLUTION'
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Validate prompt length
  if (prompt !== undefined && (typeof prompt !== 'string' || prompt.length > 2000)) {
    return new Response(JSON.stringify({ 
      error: 'Prompt too long (max 2000 chars)', 
      code: 'INVALID_PROMPT'
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Validate version
  if (version !== undefined && !['standard', 'pro'].includes(version)) {
    return new Response(JSON.stringify({ 
      error: 'Invalid version (must be standard or pro)', 
      code: 'INVALID_VERSION'
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Validate framingMode
  if (framingMode !== undefined && !['longe', 'perto'].includes(framingMode)) {
    return new Response(JSON.stringify({ 
      error: 'Invalid framing mode', 
      code: 'INVALID_FRAMING_MODE'
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Determine which fileName to use for RunningHub
  let rhFileName = fileName;

  // If imageUrl provided, download and upload to RunningHub
  if (imageUrl && !fileName) {
    console.log('[RunningHub] Downloading image from storage:', imageUrl);
    
    try {
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to download image from storage (${imageResponse.status})`);
      }
      
      const imageBlob = await imageResponse.blob();
      const imageName = imageUrl.split('/').pop() || 'image.png';
      
      const formData = new FormData();
      formData.append('apiKey', RUNNINGHUB_API_KEY);
      formData.append('fileType', 'image');
      formData.append('file', imageBlob, imageName);
      
      const uploadResponse = await fetchWithRetry(
        'https://www.runninghub.ai/task/openapi/upload',
        { method: 'POST', body: formData },
        'Image upload to RunningHub'
      );
      
      const uploadData = await safeParseResponse(uploadResponse, 'Upload to RH');
      console.log('[RunningHub] Upload to RH response:', JSON.stringify(uploadData));
      
      if (uploadData.code !== 0) {
        throw new Error('RunningHub upload failed: ' + (uploadData.msg || 'Unknown error'));
      }
      
      rhFileName = uploadData.data.fileName;
      console.log('[RunningHub] Uploaded to RH, fileName:', rhFileName);
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'Image transfer failed';
      console.error('[RunningHub] Image transfer error:', error);
      
      // Mark job as failed
      await supabase
        .from('upscaler_jobs')
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
  }

  // Consume credits
  console.log(`[RunningHub] Consuming ${creditCost} credits for user ${userId}`);
  const { data: creditResult, error: creditError } = await supabase.rpc(
    'consume_upscaler_credits', 
    {
      _user_id: userId,
      _amount: creditCost,
      _description: `Upscaler ${version} - ${resolution}`
    }
  );

  if (creditError) {
    console.error('[RunningHub] Credit consumption error:', creditError);
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
    console.log('[RunningHub] Insufficient credits:', errorMsg);
    return new Response(JSON.stringify({ 
      error: errorMsg,
      code: 'INSUFFICIENT_CREDITS',
      currentBalance: creditResult?.[0]?.new_balance
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  console.log(`[RunningHub] Credits consumed successfully. New balance: ${creditResult[0].new_balance}`);

  // Select WebApp ID based on version and framing mode
  const isLongeMode = framingMode === 'longe';
  const webappId = isLongeMode ? WEBAPP_ID_LONGE : (version === 'pro' ? WEBAPP_ID_PRO : WEBAPP_ID_STANDARD);
  console.log(`[RunningHub] Processing job ${jobId} - version: ${version}, framingMode: ${framingMode}, webappId: ${webappId}, rhFileName: ${rhFileName}`);

  try {
    // Update job with input file name
    await supabase
      .from('upscaler_jobs')
      .update({ input_file_name: rhFileName })
      .eq('id', jobId);

    // ========================================
    // VERIFICAR DISPONIBILIDADE VIA QUEUE MANAGER CENTRALIZADO
    // ========================================
    let slotsAvailable = 0;
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
      console.log(`[RunningHub] Queue Manager check: ${queueData.running}/${queueData.maxConcurrent}, slots: ${slotsAvailable}`);
    } catch (queueError) {
      console.error('[RunningHub] Queue Manager check failed, assuming no slots:', queueError);
    }

    if (slotsAvailable <= 0) {
      // Calcular posição na fila
      const { count: aheadOfMe } = await supabase
        .from('upscaler_jobs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'queued');

      const position = (aheadOfMe || 0) + 1;

      await supabase
        .from('upscaler_jobs')
        .update({ 
          status: 'queued',
          position: position,
          user_credit_cost: creditCost,
          waited_in_queue: true
        })
        .eq('id', jobId);

      console.log(`[RunningHub] Job ${jobId} queued at position ${position}`);

      return new Response(JSON.stringify({ 
        success: true, 
        queued: true, 
        position: position,
        message: 'Job queued, will start when slot available'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Slot available - start processing
    await supabase
      .from('upscaler_jobs')
      .update({ 
        status: 'running', 
        started_at: new Date().toISOString(),
        position: 0,
        user_credit_cost: creditCost,
        waited_in_queue: false
      })
      .eq('id', jobId);

    // Build node info list
    let nodeInfoList: any[];
    
    if (isLongeMode) {
      nodeInfoList = [
        { nodeId: "1", fieldName: "image", fieldValue: rhFileName },
        { nodeId: "7", fieldName: "value", fieldValue: String(resolution || 2048) },
      ];
      console.log(`[RunningHub] Using "De Longe" WebApp with simplified nodeInfoList`);
    } else {
      const resolutionNodeId = version === 'pro' ? "73" : "75";
      
      nodeInfoList = [
        { nodeId: "26", fieldName: "image", fieldValue: rhFileName },
        { nodeId: "25", fieldName: "value", fieldValue: detailDenoise || 0.15 },
        { nodeId: resolutionNodeId, fieldName: "value", fieldValue: String(resolution || 2048) },
      ];

      if (prompt) {
        nodeInfoList.push({ nodeId: "128", fieldName: "text", fieldValue: prompt });
      }
    }

    const webhookUrl = `${SUPABASE_URL}/functions/v1/runninghub-webhook`;

    const requestBody = {
      nodeInfoList: nodeInfoList,
      instanceType: "default",
      usePersonalQueue: false,
      webhookUrl: webhookUrl,
    };

    console.log('[RunningHub] AI App request:', JSON.stringify({ 
      ...requestBody,
      webhookUrl: webhookUrl
    }));

    const response = await fetchWithRetry(
      `https://www.runninghub.ai/openapi/v2/run/ai-app/${webappId}`,
      {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RUNNINGHUB_API_KEY}`
        },
        body: JSON.stringify(requestBody),
      },
      'Run AI App'
    );

    const data = await safeParseResponse(response, 'AI App response');
    console.log('[RunningHub] AI App response:', JSON.stringify(data));

    if (data.taskId) {
      await supabase
        .from('upscaler_jobs')
        .update({ task_id: data.taskId })
        .eq('id', jobId);

      return new Response(JSON.stringify({ 
        success: true, 
        taskId: data.taskId,
        method: 'ai-app-v2'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Failed to start
    await supabase
      .from('upscaler_jobs')
      .update({ 
        status: 'failed', 
        error_message: data.msg || 'Failed to start workflow',
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId);

    return new Response(JSON.stringify({
      error: data.msg || 'Failed to start workflow',
      code: data.code || 'RUN_FAILED',
      details: data
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[RunningHub] Run error:', error);

    await supabase
      .from('upscaler_jobs')
      .update({ 
        status: 'failed', 
        error_message: errorMessage.slice(0, 300),
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId);

    return new Response(JSON.stringify({ 
      error: errorMessage, 
      code: 'RUN_EXCEPTION' 
    }), {
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
      .from('upscaler_jobs')
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
    console.error('[RunningHub] Queue status error:', error);
    return new Response(JSON.stringify({ error: 'Failed to get queue status' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
