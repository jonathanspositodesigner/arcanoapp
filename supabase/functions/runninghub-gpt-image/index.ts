import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { normalizeAIError } from "../_shared/error-normalizer.ts";

/**
 * RUNNINGHUB GPT IMAGE - EDGE FUNCTION
 * 
 * Gera imagens via RunningHub GPT Image workflow
 * Usa polling interno (mesmo padrão do Flux2 Klein)
 * 
 * Workflow: 2047032440589393921
 * Nodes:
 * - Node 11: image (ref 1)
 * - Node 12: image (ref 2)
 * - Node 23: image (ref 3)
 * - Node 24: image (ref 4)
 * - Node 3: text (prompt)
 * - Node 26: size (auto, 1024x1024, 1536x1024, 1024x1536)
 */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const TABLE_NAME = 'image_generator_jobs';
const WEBAPP_ID_GPT_IMAGE = '2047032440589393921';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Aspect ratio → RunningHub size value for node 26
const SIZE_MAP: Record<string, string> = {
  '1:1':  '1024x1024',
  '3:4':  '1024x1536',
  '16:9': '1536x1024',
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
    console.log(`[GPTImage] Job ${jobId}: ${step}`, details || '');
  } catch (e) {
    console.error(`[GPTImage] logStep error:`, e);
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
        console.warn(`[GPTImage] ${context} got ${response.status}, retrying in ${delay}ms (${attempt + 1}/${maxRetries})`);
        await new Promise(r => setTimeout(r, delay));
      } else {
        throw new Error(`${context} failed after ${maxRetries} retries (${response.status})`);
      }
    } catch (err) {
      if (attempt < maxRetries - 1) {
        const delay = delays[attempt] || 2000;
        console.warn(`[GPTImage] ${context} exception, retrying in ${delay}ms: ${err}`);
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
    } else if (path === 'poll') {
      return await handlePoll(req);
    } else {
      return new Response(JSON.stringify({ error: 'Invalid endpoint' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[GPTImage] Unhandled error:', error);
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
  if (creditCost !== 0 && (typeof creditCost !== 'number' || creditCost < 1 || creditCost > 500)) {
    return new Response(JSON.stringify({ error: 'Invalid credit cost', code: 'INVALID_CREDIT_COST' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Resolve size from aspect ratio
  const rhSize = SIZE_MAP[aspectRatio] || 'auto';

  // Validate image URLs (max 4 for GPT Image)
  const imageUrls: string[] = Array.isArray(referenceImageUrls) ? referenceImageUrls.slice(0, 4) : [];

  await logStep(jobId, 'validating', { aspectRatio, rhSize, imageCount: imageUrls.length });

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
        console.log(`[GPTImage] Ref image ${i + 1} uploaded: ${uploadData.data.fileName}`);
      }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Image transfer failed';
      console.error('[GPTImage] Image transfer error:', error);
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

  // ========== CONSUME CREDITS ==========
  if (creditCost === 0) {
    console.log(`[GPTImage] Unlimited user — skipping credit consumption for user ${verifiedUserId}`);
    await logStep(jobId, 'unlimited_skip_credits');
  } else {
    await logStep(jobId, 'consuming_credits', { amount: creditCost });

    const { data: creditResult, error: creditError } = await supabase.rpc(
      'consume_credits_for_job',
      {
        _user_id: verifiedUserId,
        _amount: creditCost,
        _description: 'GPT Image 2',
        _job_table: 'image_generator_jobs',
        _job_id: jobId,
      }
    );

    if (creditError) {
      console.error('[GPTImage] Credit error:', creditError);
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
      console.log(`[GPTImage] Job ${jobId} already charged — idempotent skip`);
      await logStep(jobId, 'credits_already_charged_idempotent');
    } else {
      console.log(`[GPTImage] Credits consumed. New balance: ${creditResult[0].remaining_balance}`);
    }
  }

  // Save job payload
  await supabase.from(TABLE_NAME).update({
    job_payload: {
      prompt: prompt.trim(),
      aspectRatio,
      rhSize,
      engine: 'gpt_image_2',
      referenceFileNames: uploadedFileNames,
    },
    input_urls: imageUrls.length > 0 ? imageUrls : null,
  }).eq('id', jobId);

  // ========== SUBMIT TO RUNNINGHUB ==========
  await logStep(jobId, 'submitting_to_runninghub');

  // Build nodeInfoList — 4 image nodes + prompt + size
  const IMAGE_NODE_IDS = ["11", "12", "23", "24"];

  const nodeInfoList: any[] = [];

  // Fill image nodes: uploaded files for populated slots, "None" for empty
  for (let i = 0; i < IMAGE_NODE_IDS.length; i++) {
    nodeInfoList.push({
      nodeId: IMAGE_NODE_IDS[i],
      fieldName: "image",
      fieldValue: uploadedFileNames[i] || "None",
      description: "image",
    });
  }

  // Prompt node
  nodeInfoList.push({
    nodeId: "3",
    fieldName: "text",
    fieldValue: prompt.trim(),
    description: "text",
  });

  // Size node
  nodeInfoList.push({
    nodeId: "26",
    fieldName: "size",
    fieldData: JSON.stringify([["auto", "1024x1024", "1536x1024", "1024x1536"], { "default": "auto" }]),
    fieldValue: rhSize,
    description: "size",
  });

  const submitBody = { nodeInfoList, instanceType: "default", usePersonalQueue: "false" };

  let taskId: string;
  try {
    const submitResponse = await fetchWithRetry(
      `https://www.runninghub.ai/openapi/v2/run/ai-app/${WEBAPP_ID_GPT_IMAGE}`,
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
    console.log('[GPTImage] Submit response:', JSON.stringify(submitData));

    if (!submitResponse.ok || !submitData.taskId) {
      const errMsg = submitData.errorMessage || submitData.msg || `Submit failed (${submitResponse.status})`;
      // Refund credits since generation didn't start
      if (creditCost > 0) {
        await supabase.rpc('refund_upscaler_credits', {
          _user_id: verifiedUserId,
          _amount: creditCost,
          _description: `GPT_IMAGE_SUBMIT_REFUND: ${errMsg.slice(0, 100)}`,
        });
      }
      await supabase.from(TABLE_NAME).update({
        status: 'failed',
        error_message: errMsg,
        credits_refunded: creditCost > 0,
        completed_at: new Date().toISOString(),
      }).eq('id', jobId);
      await logStep(jobId, 'submit_failed', { error: errMsg });
      return new Response(JSON.stringify({ error: errMsg, code: 'RUNNINGHUB_SUBMIT_FAILED', refunded: creditCost > 0 }), {
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

    // Return immediately — client will poll
    return new Response(JSON.stringify({ success: true, taskId, jobId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Submit exception';
    if (creditCost > 0) {
      await supabase.rpc('refund_upscaler_credits', {
        _user_id: verifiedUserId,
        _amount: creditCost,
        _description: `GPT_IMAGE_SUBMIT_EXCEPTION_REFUND: ${errMsg.slice(0, 100)}`,
      });
    }
    await supabase.from(TABLE_NAME).update({
      status: 'failed',
      error_message: errMsg,
      credits_refunded: creditCost > 0,
      completed_at: new Date().toISOString(),
    }).eq('id', jobId);
    await logStep(jobId, 'submit_exception', { error: errMsg });
    return new Response(JSON.stringify({ error: errMsg, code: 'RUNNINGHUB_SUBMIT_FAILED', refunded: creditCost > 0 }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// ========== /reconcile ==========

async function handleReconcile(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing auth' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Invalid token' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { jobId } = await req.json();
  if (!jobId) {
    return new Response(JSON.stringify({ error: 'jobId required' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: job } = await supabase
    .from(TABLE_NAME)
    .select('id, status, output_url, error_message, task_id, user_id')
    .eq('id', jobId)
    .maybeSingle();

  if (!job || job.user_id !== user.id) {
    return new Response(JSON.stringify({ error: 'Job not found' }), {
      status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (job.status === 'completed') {
    return new Response(JSON.stringify({ status: 'completed', outputUrl: job.output_url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (job.status === 'failed') {
    return new Response(JSON.stringify({ status: 'failed', error: job.error_message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Query RunningHub if we have a task_id
  if (job.task_id) {
    const RUNNINGHUB_API_KEY = (Deno.env.get('RUNNINGHUB_API_KEY') || '').trim();
    if (RUNNINGHUB_API_KEY) {
      try {
        const queryResponse = await fetchWithRetry(
          'https://www.runninghub.ai/openapi/v2/query',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${RUNNINGHUB_API_KEY}`,
            },
            body: JSON.stringify({ taskId: job.task_id }),
          },
          'Reconcile query'
        );
        const queryData = await queryResponse.json();
        if (queryData.status === 'SUCCESS' && queryData.results?.length > 0) {
          const imageResult = queryData.results.find((r: any) => ['png', 'jpg', 'jpeg', 'webp'].includes(r.outputType));
          const outputUrl = imageResult?.url || queryData.results[0]?.url;
          await supabase.from(TABLE_NAME).update({
            status: 'completed',
            output_url: outputUrl,
            completed_at: new Date().toISOString(),
          }).eq('id', jobId);
          return new Response(JSON.stringify({ status: 'completed', outputUrl }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      } catch (e) {
        console.warn('[GPTImage] Reconcile query error:', e);
      }
    }
  }

  return new Response(JSON.stringify({ status: job.status }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// ========== /poll ==========

async function handlePoll(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing auth' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Invalid token' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { jobId } = await req.json();
  if (!jobId) {
    return new Response(JSON.stringify({ error: 'jobId required' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Get job from DB
  const { data: job } = await supabase
    .from(TABLE_NAME)
    .select('id, status, output_url, error_message, task_id, user_id, user_credit_cost, credits_refunded')
    .eq('id', jobId)
    .maybeSingle();

  if (!job || job.user_id !== user.id) {
    return new Response(JSON.stringify({ error: 'Job not found' }), {
      status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Already terminal
  if (job.status === 'completed') {
    return new Response(JSON.stringify({ status: 'completed', outputUrl: job.output_url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  if (job.status === 'failed') {
    return new Response(JSON.stringify({ status: 'failed', error: job.error_message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Query RunningHub
  if (!job.task_id) {
    return new Response(JSON.stringify({ status: 'running', progress: 10 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const RUNNINGHUB_API_KEY = (Deno.env.get('RUNNINGHUB_API_KEY') || '').trim();
  if (!RUNNINGHUB_API_KEY) {
    return new Response(JSON.stringify({ status: 'running', progress: 20 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const queryResponse = await fetchWithRetry(
      'https://www.runninghub.ai/openapi/v2/query',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RUNNINGHUB_API_KEY}`,
        },
        body: JSON.stringify({ taskId: job.task_id }),
      },
      'Poll query'
    );

    const queryData = await queryResponse.json();
    const rhStatus = queryData.status;
    console.log(`[GPTImage] Poll job=${jobId} rhStatus=${rhStatus}`);

    if (rhStatus === 'SUCCESS' && queryData.results?.length > 0) {
      const imageResult = queryData.results.find((r: any) => ['png', 'jpg', 'jpeg', 'webp'].includes(r.outputType));
      const outputUrl = imageResult?.url || queryData.results[0]?.url;
      const rhCost = queryData.usage?.consumeCoins ? parseFloat(queryData.usage.consumeCoins) : null;

      await supabase.from(TABLE_NAME).update({
        status: 'completed',
        output_url: outputUrl,
        completed_at: new Date().toISOString(),
        raw_api_response: queryData,
        rh_cost: rhCost,
      }).eq('id', jobId);

      return new Response(JSON.stringify({ status: 'completed', outputUrl }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (rhStatus === 'FAILED') {
      const errMsg = queryData.errorMessage || queryData.failedReason?.error || 'Generation failed';
      const normalizedErr = normalizeAIError(errMsg);
      const creditCost = job.user_credit_cost || 0;

      if (creditCost > 0 && !job.credits_refunded) {
        await supabase.rpc('refund_upscaler_credits', {
          _user_id: user.id,
          _amount: creditCost,
          _description: `GPT_IMAGE_FAILED_REFUND: ${errMsg.slice(0, 100)}`,
        });
      }

      await supabase.from(TABLE_NAME).update({
        status: 'failed',
        error_message: normalizedErr.message,
        credits_refunded: creditCost > 0,
        completed_at: new Date().toISOString(),
        raw_api_response: queryData,
      }).eq('id', jobId);

      return new Response(JSON.stringify({ status: 'failed', error: normalizedErr.message, refunded: creditCost > 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Still running
    return new Response(JSON.stringify({ status: 'running', rhStatus, progress: 50 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (pollErr) {
    console.warn('[GPTImage] Poll error:', pollErr);
    return new Response(JSON.stringify({ status: 'running', progress: 30 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}