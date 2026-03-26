import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * GENERATE VIDEO - EDGE FUNCTION
 * 
 * Gera vídeos via RunningHub workflow
 * 
 * Models:
 * - veo3.1 (WebApp ID 2037253069662068738): Veo 3.1 Fast
 *   Nodes: 15=FIRST FRAME, 5=LAST FRAME, 3=aspect_ratio+prompt
 * - wan2.2 (WebApp ID TBD): Wan 2.2 (a ser configurado)
 * 
 * Endpoints:
 * - /run - Inicia processamento
 * - /queue-status - Consulta status do job
 */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const TABLE_NAME = 'video_generator_jobs';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const MODEL_COSTS: Record<string, number> = {
  'veo3.1': 750,
  'wan2.2': 400,
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
    
    console.log(`[VideoGenerator] Job ${jobId}: ${step}`, details || '');
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
    console.log(`[VideoGenerator] Job ${jobId}: FAILED at ${failedAtStep}:`, errorMessage);
  } catch (e) {
    console.error(`[logStepFailure] Error:`, e);
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
    
    console.log(`[VideoGenerator] Endpoint called: ${path}`);

    if (path === 'run') {
      return await handleRun(req);
    } else if (path === 'queue-status') {
      return await handleQueueStatus(req);
    } else {
      // Default to run for backward compat
      return await handleRun(req);
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[VideoGenerator] Unhandled error:', error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ========== /run ==========

async function handleRun(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing Authorization header', code: 'UNAUTHORIZED' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Authenticate user
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const userClient = createClient(SUPABASE_URL, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: userError } = await userClient.auth.getUser();
  
  if (userError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized', code: 'UNAUTHORIZED' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const verifiedUserId = user.id;

  const body = await req.json();
  const { prompt, aspect_ratio, duration_seconds, model, start_frame, end_frame } = body;

  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    return new Response(JSON.stringify({ error: 'Prompt é obrigatório' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const selectedModel = model && MODEL_COSTS[model] ? model : 'veo3.1';
  const validDurations = [4, 6, 8];
  const duration = validDurations.includes(duration_seconds) ? duration_seconds : 8;
  const validRatios = ['16:9', '9:16', 'auto'];
  const ratio = validRatios.includes(aspect_ratio) ? aspect_ratio : '16:9';

  // Check user active job (prevent duplicates)
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
    console.error('[VideoGenerator] Check user active error:', e);
  }

  // Get credit cost from settings or use model default
  const { data: settingsData } = await supabase
    .from('ai_tool_settings')
    .select('credit_cost')
    .eq('tool_name', 'gerar_video')
    .single();

  let creditCost = MODEL_COSTS[selectedModel];

  // Check if user is IA Unlimited
  const { data: premiumData } = await supabase
    .from('premium_users')
    .select('plan_type, expires_at')
    .eq('user_id', verifiedUserId)
    .eq('is_active', true)
    .maybeSingle();

  const isUnlimited = premiumData?.plan_type === 'arcano_unlimited'
    && (!premiumData?.expires_at || new Date(premiumData.expires_at) > new Date());

  // Use settings cost for the base model if unlimited
  if (isUnlimited && settingsData?.credit_cost) {
    // For unlimited, use the configured cost but adjusted per model
    creditCost = selectedModel === 'wan2.2' 
      ? Math.round((settingsData.credit_cost / 750) * 400) 
      : settingsData.credit_cost;
  }

  // Create job in pending state
  const sessionId = crypto.randomUUID();
  const { data: jobData, error: jobError } = await supabase
    .from(TABLE_NAME)
    .insert({
      user_id: verifiedUserId,
      prompt: prompt.trim(),
      aspect_ratio: ratio,
      duration_seconds: duration,
      model: selectedModel,
      session_id: sessionId,
      status: 'pending',
      current_step: 'pending',
      api_account: 'primary',
    })
    .select('id')
    .single();

  if (jobError || !jobData) {
    console.error('[VideoGenerator] Job insert error:', jobError);
    return new Response(JSON.stringify({ error: 'Erro ao criar job' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const jobId = jobData.id;
  await logStep(jobId, 'created', { model: selectedModel, creditCost });

  // Consume credits
  await logStep(jobId, 'consuming_credits', { amount: creditCost });

  const { data: creditResult, error: creditError } = await supabase.rpc(
    'consume_upscaler_credits',
    { _user_id: verifiedUserId, _amount: creditCost, _description: `Gerar Vídeo (${selectedModel === 'veo3.1' ? 'Veo 3.1' : 'Wan 2.2'})` }
  );

  if (creditError) {
    console.error('[VideoGenerator] Credit consumption error:', creditError);
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

  console.log(`[VideoGenerator] Credits consumed. New balance: ${creditResult[0].new_balance}`);

  // Save job payload for queue processing
  const jobPayload: any = {
    prompt: prompt.trim(),
    aspectRatio: ratio,
    duration,
    model: selectedModel,
  };

  if (start_frame?.base64 && start_frame?.mimeType) {
    jobPayload.startFrame = { base64: start_frame.base64, mimeType: start_frame.mimeType };
  }
  if (end_frame?.base64 && end_frame?.mimeType) {
    jobPayload.endFrame = { base64: end_frame.base64, mimeType: end_frame.mimeType };
  }

  await supabase.from(TABLE_NAME).update({
    credits_charged: true,
    user_credit_cost: creditCost,
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
    console.error('[VideoGenerator] Queue Manager call failed:', errorMessage);
    
    try {
      await supabase.rpc('refund_upscaler_credits', { _user_id: verifiedUserId, _amount: creditCost, _description: `QM_EXCEPTION_REFUNDED: ${errorMessage.slice(0, 100)}` });
      await supabase.from(TABLE_NAME).update({ status: 'failed', error_message: `QM_EXCEPTION_REFUNDED: ${errorMessage.slice(0, 200)}`, credits_refunded: true, completed_at: new Date().toISOString() }).eq('id', jobId);
    } catch {
      await supabase.from(TABLE_NAME).update({ status: 'failed', error_message: `QM_EXCEPTION: ${errorMessage.slice(0, 200)}`, completed_at: new Date().toISOString() }).eq('id', jobId);
    }
    
    return new Response(JSON.stringify({ error: errorMessage, code: 'RUN_EXCEPTION', refunded: true }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// ========== /queue-status ==========

async function handleQueueStatus(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const userClient = createClient(SUPABASE_URL, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: userError } = await userClient.auth.getUser();
  
  if (userError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { job_id } = await req.json();
  if (!job_id) {
    return new Response(JSON.stringify({ error: 'job_id is required' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: job, error: jobError } = await supabase
    .from(TABLE_NAME)
    .select('id, status, position, output_url, error_message, current_step')
    .eq('id', job_id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (jobError || !job) {
    return new Response(JSON.stringify({ error: 'Job not found' }), {
      status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({
    status: job.status,
    position: job.position,
    output_url: job.output_url,
    error_message: job.error_message,
    current_step: job.current_step,
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
