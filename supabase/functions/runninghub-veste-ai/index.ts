// Edge Functions must use Deno.serve() for Supabase runtime compatibility
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// API Configuration
const RUNNINGHUB_API_KEY = (
  Deno.env.get('RUNNINGHUB_API_KEY') ||
  Deno.env.get('RUNNINGHUB_APIKEY') ||
  ''
).trim();

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// =====================================================
// VESTE AI CONFIGURATION - Virtual Try-On
// =====================================================
// WebApp ID from RunningHub AI App documentation
const WEBAPP_ID_VESTE_AI = '2018755100210106369';

// Node IDs from the API documentation:
// - nodeId 41: Person image (SUA FOTO)
// - nodeId 43: Clothing reference image (IMAGEM DA ROUPA REFERENCIA)
const NODE_ID_PERSON = '41';
const NODE_ID_CLOTHING = '43';
// =====================================================

const MAX_CONCURRENT_JOBS = 3;

// Rate limit configuration
const RATE_LIMIT_UPLOAD = { maxRequests: 10, windowSeconds: 60 };
const RATE_LIMIT_RUN = { maxRequests: 5, windowSeconds: 60 };

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

if (!RUNNINGHUB_API_KEY) {
  console.error('[VesteAI] CRITICAL: Missing RUNNINGHUB_API_KEY secret');
}

console.log('[VesteAI] Config loaded - WebApp ID:', WEBAPP_ID_VESTE_AI);

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
  
  console.log(`[VesteAI] ${context} - Status: ${status}, ContentType: ${contentType}, BodyLength: ${text.length}`);
  
  // If not OK, log snippet and throw useful error
  if (!response.ok) {
    const snippet = text.slice(0, 300);
    console.error(`[VesteAI] ${context} FAILED - Status: ${status}, Body: ${snippet}`);
    throw new Error(`${context} failed (${status}): ${snippet.slice(0, 100)}`);
  }
  
  // Check if response looks like JSON
  if (!contentType.includes('application/json') && !text.trim().startsWith('{') && !text.trim().startsWith('[')) {
    const snippet = text.slice(0, 300);
    console.error(`[VesteAI] ${context} returned non-JSON - ContentType: ${contentType}, Body: ${snippet}`);
    throw new Error(`${context} returned HTML/error (${status}): ${snippet.slice(0, 100)}`);
  }
  
  // Try to parse JSON
  try {
    return JSON.parse(text);
  } catch (e) {
    const snippet = text.slice(0, 300);
    console.error(`[VesteAI] ${context} JSON parse failed - Body: ${snippet}`);
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
      console.warn(`[VesteAI] ${context} got ${response.status}, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
      await new Promise(r => setTimeout(r, delay));
    } else {
      console.error(`[VesteAI] ${context} failed after ${maxRetries} retries with status ${response.status}`);
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();
    const clientIP = getClientIP(req);
    
    console.log(`[VesteAI] Endpoint called: ${path}, IP: ${clientIP}`);

    // Tool is properly configured with WebApp ID: 2018755100210106369

    // Apply rate limiting - for /run we need to read body first to get jobId
    if (path === 'upload') {
      const rateLimitResult = await checkRateLimit(
        clientIP, 
        `runninghub-veste-ai/upload`,
        RATE_LIMIT_UPLOAD.maxRequests,
        RATE_LIMIT_UPLOAD.windowSeconds
      );
      
      if (!rateLimitResult.allowed) {
        console.warn(`[RateLimit] IP ${clientIP} exceeded limit for upload`);
        return new Response(JSON.stringify({ 
          error: 'Too many requests. Please wait before trying again.',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: rateLimitResult.resetAt
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' },
        });
      }
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
    console.error('[VesteAI] Unhandled error:', error);
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

  console.log('[VesteAI] Uploading image...');

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
    console.log('[VesteAI] Upload response:', JSON.stringify(data));

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
    console.error('[VesteAI] Upload error:', error);
    return new Response(JSON.stringify({ error: errorMessage, code: 'UPLOAD_EXCEPTION' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// Run the Veste AI workflow
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
    personImageUrl,
    clothingImageUrl,
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

  if (!personImageUrl || !clothingImageUrl) {
    return new Response(JSON.stringify({ 
      error: 'Both personImageUrl and clothingImageUrl are required', 
      code: 'MISSING_PARAMS' 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Validate URLs are from Supabase storage
  const allowedDomains = ['supabase.co', 'supabase.in', SUPABASE_URL.replace('https://', '')];
  
  for (const imageUrl of [personImageUrl, clothingImageUrl]) {
    try {
      const urlObj = new URL(imageUrl);
      const isAllowed = allowedDomains.some(domain => urlObj.hostname.endsWith(domain));
      
      if (!isAllowed) {
        console.warn(`[VesteAI] Rejected image URL: ${urlObj.hostname}`);
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

  // Download and upload both images to RunningHub
  let personFileName: string;
  let clothingFileName: string;

  try {
    // Upload person image
    console.log('[VesteAI] Downloading person image from storage...');
    const personResponse = await fetch(personImageUrl);
    if (!personResponse.ok) throw new Error(`Failed to download person image (${personResponse.status})`);
    
    const personBlob = await personResponse.blob();
    const personName = personImageUrl.split('/').pop() || 'person.png';
    
    const personFormData = new FormData();
    personFormData.append('apiKey', RUNNINGHUB_API_KEY);
    personFormData.append('fileType', 'image');
    personFormData.append('file', personBlob, personName);
    
    const personUploadResponse = await fetchWithRetry(
      'https://www.runninghub.ai/task/openapi/upload',
      { method: 'POST', body: personFormData },
      'Person image upload'
    );
    
    const personData = await safeParseResponse(personUploadResponse, 'Person upload');
    if (personData.code !== 0) throw new Error('Person image upload failed: ' + (personData.msg || 'Unknown'));
    personFileName = personData.data.fileName;
    console.log('[VesteAI] Person image uploaded:', personFileName);

    // Upload clothing image
    console.log('[VesteAI] Downloading clothing image from storage...');
    const clothingResponse = await fetch(clothingImageUrl);
    if (!clothingResponse.ok) throw new Error(`Failed to download clothing image (${clothingResponse.status})`);
    
    const clothingBlob = await clothingResponse.blob();
    const clothingName = clothingImageUrl.split('/').pop() || 'clothing.png';
    
    const clothingFormData = new FormData();
    clothingFormData.append('apiKey', RUNNINGHUB_API_KEY);
    clothingFormData.append('fileType', 'image');
    clothingFormData.append('file', clothingBlob, clothingName);
    
    const clothingUploadResponse = await fetchWithRetry(
      'https://www.runninghub.ai/task/openapi/upload',
      { method: 'POST', body: clothingFormData },
      'Clothing image upload'
    );
    
    const clothingData = await safeParseResponse(clothingUploadResponse, 'Clothing upload');
    if (clothingData.code !== 0) throw new Error('Clothing image upload failed: ' + (clothingData.msg || 'Unknown'));
    clothingFileName = clothingData.data.fileName;
    console.log('[VesteAI] Clothing image uploaded:', clothingFileName);

  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Image transfer failed';
    console.error('[VesteAI] Image transfer error:', error);
    
    // Mark job as failed
    await supabase
      .from('veste_ai_jobs')
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
  console.log(`[VesteAI] Consuming ${creditCost} credits for user ${userId}`);
  const { data: creditResult, error: creditError } = await supabase.rpc(
    'consume_upscaler_credits', 
    {
      _user_id: userId,
      _amount: creditCost,
      _description: 'Veste AI'
    }
  );

  if (creditError) {
    console.error('[VesteAI] Credit consumption error:', creditError);
    // CRITICAL: Mark job as failed to prevent orphan
    await supabase
      .from('veste_ai_jobs')
      .update({ 
        status: 'failed', 
        error_message: `CREDIT_ERROR: ${creditError.message}`,
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId);
    
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
    console.log('[VesteAI] Insufficient credits:', errorMsg);
    // CRITICAL: Mark job as failed to prevent orphan
    await supabase
      .from('veste_ai_jobs')
      .update({ 
        status: 'failed', 
        error_message: `INSUFFICIENT_CREDITS: ${errorMsg}`,
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId);
    
    return new Response(JSON.stringify({ 
      error: errorMsg,
      code: 'INSUFFICIENT_CREDITS',
      currentBalance: creditResult?.[0]?.new_balance
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  console.log(`[VesteAI] Credits consumed. New balance: ${creditResult[0].new_balance}`);

  try {
    // Update job with input file names
    await supabase
      .from('veste_ai_jobs')
      .update({ 
        person_file_name: personFileName,
        clothing_file_name: clothingFileName
      })
      .eq('id', jobId);

    // ========================================
    // VERIFICAR DISPONIBILIDADE VIA QUEUE MANAGER CENTRALIZADO (MULTI-API)
    // ========================================
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
      console.log(`[VesteAI] Queue Manager check: ${queueData.running}/${queueData.maxConcurrent}, slots: ${slotsAvailable}, account: ${accountName}`);
    } catch (queueError) {
      console.error('[VesteAI] Queue Manager check failed, using primary account:', queueError);
      accountName = 'primary';
      accountApiKey = RUNNINGHUB_API_KEY;
    }

    if (slotsAvailable <= 0) {
      // Usar Queue Manager para enfileirar e obter posição GLOBAL
      try {
        const enqueueUrl = `${SUPABASE_URL}/functions/v1/runninghub-queue-manager/enqueue`;
        const enqueueResponse = await fetch(enqueueUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            table: 'veste_ai_jobs',
            jobId,
            creditCost,
          }),
        });
        const enqueueData = await enqueueResponse.json();
        
        console.log(`[VesteAI] Job ${jobId} queued at GLOBAL position ${enqueueData.position}`);
        
        return new Response(JSON.stringify({ 
          success: true, 
          queued: true,
          position: enqueueData.position,
          newBalance: creditResult[0].new_balance
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (enqueueError) {
        console.error('[VesteAI] Enqueue failed:', enqueueError);
        // Fallback: enfileirar localmente
        await supabase
          .from('veste_ai_jobs')
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
          newBalance: creditResult[0].new_balance
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Slot available - start processing with assigned account
    const apiKeyToUse = accountApiKey || RUNNINGHUB_API_KEY;
    const accountToUse = accountName || 'primary';

    await supabase
      .from('veste_ai_jobs')
      .update({ 
        status: 'running', 
        started_at: new Date().toISOString(),
        position: 0,
        user_credit_cost: creditCost,
        api_account: accountToUse
      })
      .eq('id', jobId);

    // Call RunningHub API
    const webhookUrl = `${SUPABASE_URL}/functions/v1/runninghub-webhook`;
    
    // Node configuration for Veste AI
    const nodeInfoList = [
      { nodeId: NODE_ID_PERSON, fieldName: "image", fieldValue: personFileName },
      { nodeId: NODE_ID_CLOTHING, fieldName: "image", fieldValue: clothingFileName }
    ];

    const requestBody = {
      nodeInfoList: nodeInfoList,
      instanceType: "default",
      usePersonalQueue: false,
      webhookUrl: webhookUrl,
    };

    console.log('[VesteAI] Starting job with RunningHub:', JSON.stringify(requestBody));

    console.log(`[VesteAI] Using API account: ${accountToUse}`);
    
    const response = await fetchWithRetry(
      `https://www.runninghub.ai/openapi/v2/run/ai-app/${WEBAPP_ID_VESTE_AI}`,
      {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKeyToUse}`
        },
        body: JSON.stringify(requestBody),
      },
      'RunningHub run'
    );

    const runData = await safeParseResponse(response, 'RunningHub run');
    console.log('[VesteAI] RunningHub response:', JSON.stringify(runData));

    if (runData.taskId) {
      await supabase
        .from('veste_ai_jobs')
        .update({ task_id: runData.taskId })
        .eq('id', jobId);
      
      console.log(`[VesteAI] Job ${jobId} started with taskId: ${runData.taskId}`);
      
      return new Response(JSON.stringify({ 
        success: true, 
        taskId: runData.taskId,
        newBalance: creditResult[0].new_balance
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      const errorMsg = runData.message || runData.error || 'Failed to start job';
      
      await supabase
        .from('veste_ai_jobs')
        .update({ 
          status: 'failed', 
          error_message: errorMsg,
          completed_at: new Date().toISOString()
        })
        .eq('id', jobId);
      
      return new Response(JSON.stringify({ 
        error: errorMsg, 
        code: 'RUN_FAILED' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[VesteAI] Run error:', error);
    
    await supabase
      .from('veste_ai_jobs')
      .update({ 
        status: 'failed', 
        error_message: errorMessage,
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId);
    
    return new Response(JSON.stringify({ error: errorMessage, code: 'RUN_EXCEPTION' }), {
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

  const { data: job, error } = await supabase
    .from('veste_ai_jobs')
    .select('status, position, output_url, error_message')
    .eq('id', jobId)
    .single();

  if (error || !job) {
    return new Response(JSON.stringify({ error: 'Job not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify(job), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
