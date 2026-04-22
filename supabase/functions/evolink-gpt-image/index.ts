import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { evolinkGenerateImage, evolinkPoll } from "../_shared/evolink-client.ts";

/**
 * EVOLINK GPT IMAGE - EDGE FUNCTION
 * 
 * Gera imagens via Evolink API usando modelo gpt-image-2-beta
 * Endpoints: /run (submit) e /poll (check status)
 * 
 * Usa o evolink-client.ts compartilhado (mesmo padrão de vídeo)
 */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const TABLE_NAME = 'image_generator_jobs';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Aspect ratio → Evolink size param
const SIZE_MAP: Record<string, string> = {
  '1:1':  '1:1',
  '3:4':  '2:3',
  '16:9': '3:2',
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
    console.log(`[EvolinkGPTImage] Job ${jobId}: ${step}`, details || '');
  } catch (e) {
    console.error(`[EvolinkGPTImage] logStep error:`, e);
  }
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
    } else if (path === 'poll') {
      return await handlePoll(req);
    } else if (path === 'reconcile') {
      return await handleReconcile(req);
    } else {
      return new Response(JSON.stringify({ error: 'Invalid endpoint' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[EvolinkGPTImage] Unhandled error:', error);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ========== /run ==========

async function handleRun(req: Request) {
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

  const evolinkSize = SIZE_MAP[aspectRatio] || 'auto';
  const imageUrls: string[] = Array.isArray(referenceImageUrls) ? referenceImageUrls.slice(0, 4) : [];

  await logStep(jobId, 'validating', { aspectRatio, evolinkSize, imageCount: imageUrls.length });

  const EVOLINK_API_KEY = (Deno.env.get('EVOLINK_API_KEY') || '').trim();
  if (!EVOLINK_API_KEY) {
    return new Response(JSON.stringify({ error: 'EVOLINK_API_KEY not configured', code: 'MISSING_API_KEY' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ========== CONSUME CREDITS ==========
  if (creditCost === 0) {
    console.log(`[EvolinkGPTImage] Unlimited user — skipping credit consumption for user ${verifiedUserId}`);
    await logStep(jobId, 'unlimited_skip_credits');
  } else {
    await logStep(jobId, 'consuming_credits', { amount: creditCost });

    const { data: creditResult, error: creditError } = await supabase.rpc(
      'consume_credits_for_job',
      {
        _user_id: verifiedUserId,
        _amount: creditCost,
        _description: 'GPT Image Evolink',
        _job_table: 'image_generator_jobs',
        _job_id: jobId,
      }
    );

    if (creditError) {
      console.error('[EvolinkGPTImage] Credit error:', creditError);
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
      console.log(`[EvolinkGPTImage] Job ${jobId} already charged — idempotent skip`);
      await logStep(jobId, 'credits_already_charged_idempotent');
    } else {
      console.log(`[EvolinkGPTImage] Credits consumed. New balance: ${creditResult[0].remaining_balance}`);
    }
  }

  // Save job payload
  await supabase.from(TABLE_NAME).update({
    job_payload: {
      prompt: prompt.trim(),
      aspectRatio,
      evolinkSize,
      engine: 'gpt_image_evolink',
      referenceImageUrls: imageUrls,
    },
    input_urls: imageUrls.length > 0 ? imageUrls : null,
  }).eq('id', jobId);

  // ========== SUBMIT TO EVOLINK ==========
  await logStep(jobId, 'submitting_to_evolink');

  const result = await evolinkGenerateImage(EVOLINK_API_KEY, {
    model: 'gpt-image-2-beta',
    prompt: prompt.trim(),
    size: evolinkSize,
    imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
  });

  if (!result.success) {
    const errMsg = result.error;
    console.error('[EvolinkGPTImage] Submit failed:', errMsg);
    // Refund credits
    if (creditCost > 0) {
      await supabase.rpc('refund_upscaler_credits', {
        _user_id: verifiedUserId,
        _amount: creditCost,
        _description: `EVOLINK_GPT_IMAGE_SUBMIT_REFUND: ${errMsg.slice(0, 100)}`,
      });
    }
    await supabase.from(TABLE_NAME).update({
      status: 'failed',
      error_message: errMsg,
      credits_refunded: creditCost > 0,
      completed_at: new Date().toISOString(),
    }).eq('id', jobId);
    await logStep(jobId, 'submit_failed', { error: errMsg });
    return new Response(JSON.stringify({ error: errMsg, code: 'EVOLINK_SUBMIT_FAILED', refunded: creditCost > 0 }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const taskId = result.taskId;
  await supabase.from(TABLE_NAME).update({
    task_id: taskId,
    status: 'running',
    started_at: new Date().toISOString(),
    api_account: 'evolink',
  }).eq('id', jobId);
  await logStep(jobId, 'task_submitted', { taskId });

  return new Response(JSON.stringify({ success: true, taskId, jobId }), {
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

  const { data: job } = await supabase
    .from(TABLE_NAME)
    .select('id, status, output_url, error_message, task_id, user_id, user_credit_cost')
    .eq('id', jobId)
    .maybeSingle();

  if (!job || job.user_id !== user.id) {
    return new Response(JSON.stringify({ error: 'Job not found' }), {
      status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Already finalized
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

  // Poll Evolink
  if (!job.task_id) {
    return new Response(JSON.stringify({ status: 'processing', progress: 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const EVOLINK_API_KEY = (Deno.env.get('EVOLINK_API_KEY') || '').trim();
  if (!EVOLINK_API_KEY) {
    return new Response(JSON.stringify({ status: 'processing', progress: 0, error: 'API key not configured' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const pollResult = await evolinkPoll(EVOLINK_API_KEY, job.task_id);

  if (pollResult.status === 'completed' && pollResult.outputUrl) {
    await supabase.from(TABLE_NAME).update({
      status: 'completed',
      output_url: pollResult.outputUrl,
      completed_at: new Date().toISOString(),
    }).eq('id', jobId);

    // Trigger thumbnail generation
    try {
      await fetch(`${SUPABASE_URL}/functions/v1/generate-thumbnail`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          jobId,
          tableName: TABLE_NAME,
          outputUrl: pollResult.outputUrl,
          storagePath: `image-generator/${job.user_id}`,
        }),
      });
    } catch (e) {
      console.warn('[EvolinkGPTImage] Thumbnail generation failed:', e);
    }

    return new Response(JSON.stringify({ status: 'completed', outputUrl: pollResult.outputUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (pollResult.status === 'failed') {
    const errMsg = pollResult.error || 'Evolink generation failed';
    // Auto-refund
    const creditCost = job.user_credit_cost || 0;
    if (creditCost > 0) {
      await supabase.rpc('refund_upscaler_credits', {
        _user_id: job.user_id,
        _amount: creditCost,
        _description: `EVOLINK_GPT_IMAGE_FAILED_REFUND: ${errMsg.slice(0, 100)}`,
      });
    }
    await supabase.from(TABLE_NAME).update({
      status: 'failed',
      error_message: errMsg,
      credits_refunded: creditCost > 0,
      completed_at: new Date().toISOString(),
    }).eq('id', jobId);

    return new Response(JSON.stringify({ status: 'failed', error: errMsg }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Still processing
  return new Response(JSON.stringify({
    status: 'processing',
    progress: pollResult.progress || 0,
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
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
    .select('id, status, output_url, error_message, task_id, user_id, user_credit_cost')
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

  // Try polling Evolink one more time
  if (job.task_id) {
    const EVOLINK_API_KEY = (Deno.env.get('EVOLINK_API_KEY') || '').trim();
    if (EVOLINK_API_KEY) {
      const pollResult = await evolinkPoll(EVOLINK_API_KEY, job.task_id);

      if (pollResult.status === 'completed' && pollResult.outputUrl) {
        await supabase.from(TABLE_NAME).update({
          status: 'completed',
          output_url: pollResult.outputUrl,
          completed_at: new Date().toISOString(),
        }).eq('id', jobId);

        try {
          await fetch(`${SUPABASE_URL}/functions/v1/generate-thumbnail`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({
              jobId,
              tableName: TABLE_NAME,
              outputUrl: pollResult.outputUrl,
              storagePath: `image-generator/${job.user_id}`,
            }),
          });
        } catch (e) {
          console.warn('[EvolinkGPTImage] Thumbnail generation failed:', e);
        }

        return new Response(JSON.stringify({ status: 'completed', outputUrl: pollResult.outputUrl }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (pollResult.status === 'failed') {
        const errMsg = pollResult.error || 'Failed';
        const creditCost = job.user_credit_cost || 0;
        if (creditCost > 0) {
          await supabase.rpc('refund_upscaler_credits', {
            _user_id: job.user_id,
            _amount: creditCost,
            _description: `EVOLINK_GPT_IMAGE_RECONCILE_REFUND: ${errMsg.slice(0, 100)}`,
          });
        }
        await supabase.from(TABLE_NAME).update({
          status: 'failed',
          error_message: errMsg,
          credits_refunded: creditCost > 0,
          completed_at: new Date().toISOString(),
        }).eq('id', jobId);

        return new Response(JSON.stringify({ status: 'failed', error: errMsg }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }
  }

  return new Response(JSON.stringify({ status: 'processing' }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}