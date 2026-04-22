import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * RUNNINGHUB FLUX2 KLEIN - EDGE FUNCTION
 * 
 * Gera imagens via RunningHub Flux2 Klein engine
 * Usa polling interno (não depende do queue manager)
 * 
 * Nodes do Workflow:
 * - Node 129: Prompt (text)
 * - Node 177: Width (width) / Height (height)
 */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const TABLE_NAME = 'image_generator_jobs';
const WEBAPP_ID_FLUX2_KLEIN = '2042246288288260097';
const DEFAULT_REF_IMAGE_URL = 'https://jooojbaljrshgpaxdlou.supabase.co/storage/v1/object/public/artes-cloudinary/defaults/default-reference.png';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Aspect ratio to Full HD dimensions mapping (node 177: width + height)
const ASPECT_DIMENSIONS: Record<string, { width: number; height: number }> = {
  '1:1':  { width: 1080, height: 1080 },
  '3:4':  { width: 1080, height: 1440 },
  '16:9': { width: 1920, height: 1080 },
  '9:16': { width: 1080, height: 1920 },
};

// ========== OBSERVABILITY ==========

async function logStep(jobId: string, step: string, details?: Record<string, any>): Promise<void> {
  try {
    const timestamp = new Date().toISOString();
    const entry = { step, timestamp, ...details };
    const { data: job } = await supabase.from(TABLE_NAME).select('step_history').eq('id', jobId).maybeSingle();
    const currentHistory = (job?.step_history as any[]) || [];
    await supabase.from(TABLE_NAME).update({
      current_step: step,
      step_history: [...currentHistory, entry],
    }).eq('id', jobId);
    console.log(`[Flux2Klein] Job ${jobId}: ${step}`, details || '');
  } catch (e) {
    console.error(`[Flux2Klein] logStep error:`, e);
  }
}

// ========== FETCH WITH RETRY ==========

async function fetchWithRetry(url: string, options: RequestInit, context: string, maxRetries = 4): Promise<Response> {
  const retryableStatuses = [429, 500, 502, 503, 504, 520, 521, 522, 523, 524, 525];
  const delays = [2000, 5000, 10000, 15000];

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (!retryableStatuses.includes(response.status)) return response;
      await response.text();
      if (attempt < maxRetries - 1) {
        const delay = delays[attempt] || 2000;
        console.warn(`[Flux2Klein] ${context} got ${response.status}, retrying in ${delay}ms (${attempt + 1}/${maxRetries})`);
        await new Promise(r => setTimeout(r, delay));
      } else {
        throw new Error(`${context} failed after ${maxRetries} retries (${response.status})`);
      }
    } catch (err) {
      if (attempt < maxRetries - 1) {
        const delay = delays[attempt] || 2000;
        console.warn(`[Flux2Klein] ${context} exception, retrying in ${delay}ms: ${err}`);
        await new Promise(r => setTimeout(r, delay));
      } else {
        throw err;
      }
    }
  }
  throw new Error(`${context} failed - unexpected retry loop exit`);
}

// ========== MAIN ==========

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();

    if (path === 'run') {
      return await handleRun(req);
    } else if (path === 'reconcile') {
      return await handleReconcile(req);
    } else {
      return new Response(JSON.stringify({ error: 'Invalid endpoint' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Flux2Klein] Unhandled error:', error);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ========== /run ==========

async function handleRun(req: Request) {
  // Auth
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing Authorization', code: 'UNAUTHORIZED' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Invalid token', code: 'UNAUTHORIZED' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const verifiedUserId = user.id;

  const { jobId, prompt, aspectRatio, creditCost, referenceImageUrls } = await req.json();

  // Validate
  if (!jobId || typeof jobId !== 'string') {
    return new Response(JSON.stringify({ error: 'jobId required', code: 'INVALID_INPUT' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    return new Response(JSON.stringify({ error: 'Prompt required', code: 'MISSING_PROMPT' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  // Allow creditCost=0 for Unlimited users
  if (creditCost !== 0 && (typeof creditCost !== 'number' || creditCost < 1 || creditCost > 500)) {
    return new Response(JSON.stringify({ error: 'Invalid credit cost', code: 'INVALID_CREDIT_COST' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Resolve dimensions from aspect ratio
  const dims = ASPECT_DIMENSIONS[aspectRatio] || ASPECT_DIMENSIONS['4:3'];

  // Validate image URLs
  const imageUrls: string[] = Array.isArray(referenceImageUrls) ? referenceImageUrls.slice(0, 5) : [];

  await logStep(jobId, 'validating', { aspectRatio, width: dims.width, height: dims.height, imageCount: imageUrls.length });

  // Load API credentials
  const RUNNINGHUB_API_KEY = (Deno.env.get('RUNNINGHUB_API_KEY') || '').trim();

  if (!RUNNINGHUB_API_KEY) {
    return new Response(JSON.stringify({ error: 'API key not configured', code: 'MISSING_API_KEY' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ========== UPLOAD REFERENCE IMAGES TO RUNNINGHUB ==========
  const uploadedFileNames: string[] = [];
  if (imageUrls.length > 0) {
    try {
      for (let i = 0; i < imageUrls.length; i++) {
        await logStep(jobId, `downloading_ref_image_${i + 1}`);
        const imgResponse = await fetch(imageUrls[i]);
        if (!imgResponse.ok) throw new Error(`Failed to download ref image ${i + 1} (${imgResponse.status})`);
        const imgBlob = await imgResponse.blob();
        const imgName = imageUrls[i].split('/').pop() || `ref_${i + 1}.png`;
        const formData = new FormData();
        formData.append('apiKey', RUNNINGHUB_API_KEY);
        formData.append('fileType', 'image');
        formData.append('file', imgBlob, imgName);
        await logStep(jobId, `uploading_ref_image_${i + 1}`);
        const uploadResponse = await fetchWithRetry(
          'https://www.runninghub.ai/task/openapi/upload',
          { method: 'POST', body: formData },
          `Ref image ${i + 1} upload`
        );
        const uploadText = await uploadResponse.text();
        let uploadData: any;
        try { uploadData = JSON.parse(uploadText); } catch { throw new Error(`Ref upload ${i+1} invalid response`); }
        if (uploadData.code !== 0) throw new Error(`Ref image ${i + 1} upload failed: ${uploadData.msg || 'Unknown'}`);
        uploadedFileNames.push(uploadData.data.fileName);
        console.log(`[Flux2Klein] Ref image ${i + 1} uploaded: ${uploadData.data.fileName}`);
      }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Image transfer failed';
      console.error('[Flux2Klein] Image transfer error:', error);
      await logStep(jobId, 'image_transfer_failed', { error: errMsg });
      await supabase.from(TABLE_NAME).update({
        status: 'failed', error_message: `IMAGE_TRANSFER_ERROR: ${errMsg.slice(0, 200)}`,
        completed_at: new Date().toISOString(),
      }).eq('id', jobId);
      return new Response(JSON.stringify({ error: errMsg, code: 'IMAGE_TRANSFER_ERROR' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  // ========== CONSUME CREDITS (skip for Unlimited with cost=0) ==========
  if (creditCost === 0) {
    console.log(`[Flux2Klein] Unlimited user — skipping credit consumption for user ${verifiedUserId}`);
    await logStep(jobId, 'unlimited_skip_credits');
  } else {
    await logStep(jobId, 'consuming_credits', { amount: creditCost });

    const { data: creditResult, error: creditError } = await supabase.rpc(
      'consume_credits_for_job',
      {
        _user_id: verifiedUserId,
        _amount: creditCost,
        _description: 'Gerar Imagem',
        _job_table: 'image_generator_jobs',
        _job_id: jobId,
      }
    );

    if (creditError) {
      console.error('[Flux2Klein] Credit error:', creditError);
      await logStep(jobId, 'credit_error', { error: creditError.message });
      return new Response(JSON.stringify({ error: 'Erro ao processar créditos', code: 'CREDIT_ERROR' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!creditResult || creditResult.length === 0 || !creditResult[0].success) {
      const errorMsg = creditResult?.[0]?.error_message || 'Saldo insuficiente';
      await logStep(jobId, 'insufficient_credits', { balance: creditResult?.[0]?.remaining_balance });
      return new Response(JSON.stringify({ error: errorMsg, code: 'INSUFFICIENT_CREDITS', currentBalance: creditResult?.[0]?.remaining_balance }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (creditResult[0].already_charged) {
      console.log(`[Flux2Klein] Job ${jobId} already charged — idempotent skip`);
      await logStep(jobId, 'credits_already_charged_idempotent');
    } else {
      console.log(`[Flux2Klein] Credits consumed. New balance: ${creditResult[0].remaining_balance}`);
    }
  }

  // Save job payload (credits_charged is set atomically inside consume_credits_for_job)
  await supabase.from(TABLE_NAME).update({
    job_payload: {
      prompt: prompt.trim(),
      aspectRatio,
      width: dims.width,
      height: dims.height,
      engine: 'flux2_klein',
      referenceFileNames: uploadedFileNames,
    },
    input_urls: imageUrls.length > 0 ? imageUrls : null,
  }).eq('id', jobId);

  // ========== SUBMIT TO RUNNINGHUB ==========
  await logStep(jobId, 'submitting_to_runninghub');

  // Build nodeInfoList — image reference nodes: 186, 187, 122, 123, 129
  const IMAGE_NODE_IDS = ["186", "187", "122", "123", "129"];

  // Upload default image to RunningHub for empty slots
  let defaultFileName: string | null = null;
  const emptySlotCount = IMAGE_NODE_IDS.length - uploadedFileNames.length;
  if (emptySlotCount > 0) {
    try {
      await logStep(jobId, 'uploading_default_ref_image');
      const defaultImgRes = await fetch(DEFAULT_REF_IMAGE_URL);
      if (!defaultImgRes.ok) throw new Error(`Failed to download default ref image (${defaultImgRes.status})`);
      const defaultBlob = await defaultImgRes.blob();
      const formData = new FormData();
      formData.append('apiKey', RUNNINGHUB_API_KEY);
      formData.append('fileType', 'image');
      formData.append('file', defaultBlob, 'default-reference.png');
      const uploadRes = await fetchWithRetry(
        'https://www.runninghub.ai/task/openapi/upload',
        { method: 'POST', body: formData },
        'Default ref image upload'
      );
      const uploadText = await uploadRes.text();
      let uploadData: any;
      try { uploadData = JSON.parse(uploadText); } catch { throw new Error('Default ref upload invalid response'); }
      if (uploadData.code !== 0) throw new Error(`Default ref upload failed: ${uploadData.msg || 'Unknown'}`);
      defaultFileName = uploadData.data.fileName;
      console.log(`[Flux2Klein] Default ref image uploaded: ${defaultFileName}`);
    } catch (err) {
      console.warn('[Flux2Klein] Default ref upload failed, falling back to example.png:', err);
      defaultFileName = 'example.png';
    }
  }

  const paddedFileNames = [...uploadedFileNames];
  while (paddedFileNames.length < IMAGE_NODE_IDS.length) {
    paddedFileNames.push(defaultFileName || 'example.png');
  }
  const nodeInfoList: any[] = [];
  for (let i = 0; i < IMAGE_NODE_IDS.length; i++) {
    nodeInfoList.push({ nodeId: IMAGE_NODE_IDS[i], fieldName: "image", fieldValue: paddedFileNames[i], description: "image" });
  }
  nodeInfoList.push({ nodeId: "128", fieldName: "text", fieldValue: prompt.trim(), description: "PROMPT" });
  nodeInfoList.push({ nodeId: "177", fieldName: "width", fieldValue: String(dims.width), description: "LARGURA" });
  nodeInfoList.push({ nodeId: "177", fieldName: "height", fieldValue: String(dims.height), description: "ALTURA" });

  const submitBody = { nodeInfoList, instanceType: "default", usePersonalQueue: "false" };

  let taskId: string;
  try {
    const submitResponse = await fetchWithRetry(
      `https://www.runninghub.ai/openapi/v2/run/ai-app/${WEBAPP_ID_FLUX2_KLEIN}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RUNNINGHUB_API_KEY}`,
        },
        body: JSON.stringify(submitBody),
      },
      'RunningHub submit'
    );

    const submitData = await submitResponse.json();
    console.log('[Flux2Klein] Submit response:', JSON.stringify(submitData));

    if (!submitResponse.ok || !submitData.taskId) {
      const errMsg = submitData.errorMessage || submitData.msg || `Submit failed (${submitResponse.status})`;
      // Refund credits since generation didn't start
      await supabase.rpc('refund_upscaler_credits', {
        _user_id: verifiedUserId,
        _amount: creditCost,
        _description: `FLUX2_SUBMIT_REFUND: ${errMsg.slice(0, 100)}`,
      });
      await supabase.from(TABLE_NAME).update({
        status: 'failed',
        error_message: errMsg,
        credits_refunded: true,
        completed_at: new Date().toISOString(),
      }).eq('id', jobId);
      await logStep(jobId, 'submit_failed', { error: errMsg });
      return new Response(JSON.stringify({ error: errMsg, code: 'RUNNINGHUB_SUBMIT_FAILED', refunded: true }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    taskId = submitData.taskId;
    await supabase.from(TABLE_NAME).update({
      task_id: taskId,
      runninghub_task_id: taskId,
      status: 'running',
      started_at: new Date().toISOString(),
      api_account: 'primary',
    }).eq('id', jobId);
    await logStep(jobId, 'task_submitted', { taskId });

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Submit exception';
    // Refund on submit failure
    await supabase.rpc('refund_upscaler_credits', {
      _user_id: verifiedUserId,
      _amount: creditCost,
      _description: `FLUX2_SUBMIT_EXCEPTION_REFUND: ${errMsg.slice(0, 100)}`,
    });
    await supabase.from(TABLE_NAME).update({
      status: 'failed',
      error_message: errMsg,
      credits_refunded: true,
      completed_at: new Date().toISOString(),
    }).eq('id', jobId);
    await logStep(jobId, 'submit_exception', { error: errMsg });
    return new Response(JSON.stringify({ error: errMsg, code: 'RUNNINGHUB_SUBMIT_FAILED', refunded: true }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ========== POLL FOR RESULT ==========
  await logStep(jobId, 'polling_started');

  const MAX_POLLS = 30;
  const BASE_DELAY = 4000;
  let outputUrl: string | null = null;

  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise(r => setTimeout(r, i < 5 ? BASE_DELAY : BASE_DELAY + (i - 5) * 1000));

    try {
      const queryResponse = await fetchWithRetry(
        'https://www.runninghub.ai/openapi/v2/query',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RUNNINGHUB_API_KEY}`,
          },
          body: JSON.stringify({ taskId }),
        },
        `Poll ${i + 1}`
      );

      const queryData = await queryResponse.json();
      const rhStatus = queryData.status;
      console.log(`[Flux2Klein] Poll ${i + 1}/${MAX_POLLS}: status=${rhStatus}`);

      if (rhStatus === 'SUCCESS' && queryData.results?.length > 0) {
        const imageResult = queryData.results.find((r: any) => ['png', 'jpg', 'jpeg', 'webp'].includes(r.outputType));
        outputUrl = imageResult?.url || queryData.results[0]?.url;

        // Extract RH cost
        const rhCost = queryData.usage?.consumeCoins ? parseFloat(queryData.usage.consumeCoins) : null;

        await supabase.from(TABLE_NAME).update({
          status: 'completed',
          output_url: outputUrl,
          completed_at: new Date().toISOString(),
          raw_api_response: queryData,
          rh_cost: rhCost,
        }).eq('id', jobId);
        await logStep(jobId, 'completed', { outputUrl, rhCost, polls: i + 1 });

        return new Response(JSON.stringify({ success: true, outputUrl, jobId }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (rhStatus === 'FAILED') {
        const rawFailReason = queryData.errorMessage || queryData.failedReason?.exception_message || 'Generation failed on RunningHub';
        const { message: failReason } = (await import("../_shared/error-normalizer.ts")).normalizeAIError(rawFailReason);
        // Refund on generation failure
        await supabase.rpc('refund_upscaler_credits', {
          _user_id: verifiedUserId,
          _amount: creditCost,
          _description: `FLUX2_GENERATION_REFUND: ${failReason.slice(0, 100)}`,
        });
        await supabase.from(TABLE_NAME).update({
          status: 'failed',
          error_message: failReason,
          credits_refunded: true,
          completed_at: new Date().toISOString(),
          raw_api_response: queryData,
        }).eq('id', jobId);
        await logStep(jobId, 'generation_failed', { error: failReason });

        return new Response(JSON.stringify({ error: failReason, code: 'RUNNINGHUB_GENERATION_FAILED', refunded: true }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // QUEUED or RUNNING — continue polling
    } catch (pollError) {
      console.warn(`[Flux2Klein] Poll ${i + 1} error:`, pollError);
      // Continue polling on transient errors
    }
  }

  // Timeout — refund
  const timeoutMsg = 'Tempo limite excedido (120s). Tente novamente.';
  await supabase.rpc('refund_upscaler_credits', {
    _user_id: verifiedUserId,
    _amount: creditCost,
    _description: 'FLUX2_TIMEOUT_REFUND',
  });
  await supabase.from(TABLE_NAME).update({
    status: 'failed',
    error_message: timeoutMsg,
    credits_refunded: true,
    completed_at: new Date().toISOString(),
  }).eq('id', jobId);
  await logStep(jobId, 'timeout', { polls: MAX_POLLS });

  return new Response(JSON.stringify({ error: timeoutMsg, code: 'RUNNINGHUB_TIMEOUT', refunded: true }), {
    status: 408, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// ========== /reconcile ==========

async function handleReconcile(req: Request) {
  const { jobId } = await req.json();
  if (!jobId) {
    return new Response(JSON.stringify({ error: 'jobId required' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { data: job, error } = await supabase
      .from(TABLE_NAME)
      .select('id, task_id, runninghub_task_id, status, output_url, user_id, user_credit_cost')
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

    const rhTaskId = job.runninghub_task_id || job.task_id;
    if (!rhTaskId) {
      return new Response(JSON.stringify({ error: 'No task_id yet' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const RUNNINGHUB_API_KEY = (Deno.env.get('RUNNINGHUB_API_KEY') || '').trim();

    const queryResponse = await fetch('https://www.runninghub.ai/openapi/v2/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RUNNINGHUB_API_KEY}` },
      body: JSON.stringify({ taskId: rhTaskId }),
    });

    const queryData = await queryResponse.json();

    if (queryData.status === 'SUCCESS' && queryData.results?.length > 0) {
      const imageResult = queryData.results.find((r: any) => ['png', 'jpg', 'jpeg', 'webp'].includes(r.outputType));
      const outputUrl = imageResult?.url || queryData.results[0]?.url;
      const rhCost = queryData.usage?.consumeCoins ? parseFloat(queryData.usage.consumeCoins) : null;

      await supabase.from(TABLE_NAME).update({
        status: 'completed',
        output_url: outputUrl,
        completed_at: new Date().toISOString(),
        rh_cost: rhCost,
      }).eq('id', jobId);

      return new Response(JSON.stringify({ success: true, reconciled: true, status: 'completed', outputUrl }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (queryData.status === 'FAILED') {
      const errMsg = queryData.errorMessage || 'Failed on RunningHub';
      await supabase.rpc('refund_upscaler_credits', {
        _user_id: job.user_id,
        _amount: job.user_credit_cost || 0,
        _description: `FLUX2_RECONCILE_REFUND: ${errMsg.slice(0, 100)}`,
      });
      await supabase.from(TABLE_NAME).update({
        status: 'failed',
        error_message: errMsg,
        credits_refunded: true,
        completed_at: new Date().toISOString(),
      }).eq('id', jobId);

      return new Response(JSON.stringify({ success: true, reconciled: true, status: 'failed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, reconciled: false, currentStatus: queryData.status, message: 'Still processing' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
