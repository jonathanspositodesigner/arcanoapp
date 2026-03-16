import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// RunningHub Video Upscaler Configuration
const VIDEO_UPSCALER_WEBAPP_ID = "2018810750139109378";
const RUNNINGHUB_API_BASE = "https://www.runninghub.ai/openapi/v2";
const MAX_CONCURRENT_JOBS = 3;
const CREDIT_COST = 150;

// Node mapping for Video Upscaler
const VIDEO_NODE_ID = "3";
const VIDEO_FIELD_NAME = "video";

// Rate limiting: 5 requests per minute per user
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 5;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(userId);
  
  if (!userLimit || now > userLimit.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (userLimit.count >= RATE_LIMIT_MAX) {
    return false;
  }
  
  userLimit.count++;
  return true;
}

// ========== OBSERVABILITY HELPER ==========

async function logStep(
  supabase: any,
  jobId: string,
  step: string,
  details?: Record<string, any>
): Promise<void> {
  const timestamp = new Date().toISOString();
  const entry = { step, timestamp, ...details };
  
  try {
    const { data: job } = await supabase
      .from('video_upscaler_jobs')
      .select('step_history')
      .eq('id', jobId)
      .maybeSingle();
    
    const currentHistory = (job?.step_history as any[]) || [];
    const newHistory = [...currentHistory, entry];
    
    await supabase
      .from('video_upscaler_jobs')
      .update({
        current_step: step,
        step_history: newHistory,
      })
      .eq('id', jobId);
    
    console.log(`[VideoUpscaler] Job ${jobId}: ${step}`, details || '');
  } catch (e) {
    console.error(`[logStep] Error:`, e);
  }
}

async function logStepFailure(
  supabase: any,
  jobId: string,
  failedAtStep: string,
  errorMessage: string,
  rawResponse?: Record<string, any>
): Promise<void> {
  const timestamp = new Date().toISOString();
  const entry = { step: 'failed', timestamp, at_step: failedAtStep, error: errorMessage };
  
  try {
    const { data: job } = await supabase
      .from('video_upscaler_jobs')
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
    
    await supabase.from('video_upscaler_jobs').update(updateData).eq('id', jobId);
    
    console.log(`[VideoUpscaler] Job ${jobId}: FAILED at ${failedAtStep}:`, errorMessage);
  } catch (e) {
    console.error(`[logStepFailure] Error:`, e);
  }
}

// Verificar disponibilidade via Queue Manager centralizado (MULTI-API)
async function checkQueueAvailability(supabase: any): Promise<{ 
  available: boolean; 
  slotsAvailable: number; 
  running: number;
  accountName: string | null;
  accountApiKey: string | null;
}> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    
    const response = await fetch(`${supabaseUrl}/functions/v1/runninghub-queue-manager/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
    });
    
    const data = await response.json();
    console.log(`[VideoUpscaler] Queue Manager check: ${data.running}/${data.maxConcurrent}, slots: ${data.slotsAvailable}, account: ${data.accountName}`);
    return {
      available: data.available || false,
      slotsAvailable: data.slotsAvailable || 0,
      running: data.running || 0,
      accountName: data.accountName || 'primary',
      accountApiKey: data.accountApiKey || null,
    };
  } catch (e) {
    console.error('[VideoUpscaler] Queue Manager check failed:', e);
    return { available: false, slotsAvailable: 0, running: 0, accountName: 'primary', accountApiKey: null };
  }
}

// NOTE: getNextQueuedJob and updateQueuePositions were REMOVED
// Queue management is now 100% delegated to runninghub-queue-manager
// This prevents duplicate logic and ensures global FIFO ordering

// Consume credits from user balance
async function consumeCredits(supabase: any, userId: string, amount: number): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('consume_upscaler_credits', {
      _user_id: userId,
      _amount: amount,
      _description: 'Video Upscaler usage'
    });

    if (error) {
      console.error('[VideoUpscaler] Credit consumption error:', error);
      return { success: false, error: error.message };
    }

    if (!data || data.length === 0 || !data[0].success) {
      return { success: false, error: data?.[0]?.error_message || 'Insufficient credits' };
    }

    return { success: true };
  } catch (e: any) {
    console.error('[VideoUpscaler] Credit consumption exception:', e);
    return { success: false, error: e.message };
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.split('/').pop();

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Route: /run - Start video upscaling
    if (path === "run" && req.method === "POST") {
      const body = await req.json();
      const { jobId, videoUrl, creditCost } = body;

      // ========== JWT AUTH VERIFICATION ==========
      const authHeader = req.headers.get('Authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return new Response(
          JSON.stringify({ success: false, error: 'Unauthorized', code: 'AUTH_REQUIRED' }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const anonClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? ""
      );
      const jwtToken = authHeader.replace('Bearer ', '');
      const { data: { user: authUser }, error: authError } = await anonClient.auth.getUser(jwtToken);
      if (authError || !authUser) {
        return new Response(
          JSON.stringify({ success: false, error: 'Unauthorized', code: 'INVALID_TOKEN' }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const userId = authUser.id;
      console.log(`[VideoUpscaler] JWT verified - userId: ${userId}`);

      if (!jobId || !videoUrl) {
        return new Response(
          JSON.stringify({ success: false, error: "Missing required parameters" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check rate limit
      if (!checkRateLimit(userId)) {
        return new Response(
          JSON.stringify({ success: false, code: "RATE_LIMIT_EXCEEDED", error: "Too many requests. Wait 1 minute." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // NOTE: No early status update - job stays 'pending' until queue manager decides
      await logStep(supabase, jobId, 'validating', { userId });

      // Consume credits first
      const creditResult = await consumeCredits(supabase, userId, creditCost || CREDIT_COST);
      if (!creditResult.success) {
        await supabase.from('video_upscaler_jobs').update({ status: 'failed', error_message: 'Insufficient credits' }).eq('id', jobId);
        return new Response(JSON.stringify({ success: false, code: "INSUFFICIENT_CREDITS", error: creditResult.error }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Mark credits as charged + save job_payload
      await supabase.from('video_upscaler_jobs').update({ 
        credits_charged: true, user_credit_cost: creditCost || CREDIT_COST, user_id: userId,
        job_payload: { videoUrl: videoUrl }
      }).eq('id', jobId);

      // ========== DELEGATE TO QUEUE MANAGER ==========
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
        const qmResponse = await fetch(`${supabaseUrl}/functions/v1/runninghub-queue-manager/run-or-queue`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${serviceRoleKey}` },
          body: JSON.stringify({ table: 'video_upscaler_jobs', jobId }),
        });
        const qmResult = await qmResponse.json();

        if (qmResult.queued) {
          return new Response(JSON.stringify({ success: true, queued: true, position: qmResult.position }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        if (qmResult.taskId) {
          return new Response(JSON.stringify({ success: true, jobId, taskId: qmResult.taskId }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        return new Response(JSON.stringify({ success: false, error: qmResult.error || 'Failed', refunded: true }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (qmError: any) {
        console.error('[VideoUpscaler] Queue Manager call failed:', qmError);
        try {
          const { data } = await supabase.rpc('refund_upscaler_credits', { _user_id: userId, _amount: creditCost || CREDIT_COST, _description: `QM_EXCEPTION: ${qmError.message?.slice(0, 100)}` });
          await supabase.from('video_upscaler_jobs').update({ status: 'failed', error_message: `QM_EXCEPTION_REFUNDED: ${qmError.message?.slice(0, 200)}`, credits_refunded: true, completed_at: new Date().toISOString() }).eq('id', jobId);
        } catch { await supabase.from('video_upscaler_jobs').update({ status: 'failed', error_message: `QM_EXCEPTION: ${qmError.message?.slice(0, 200)}`, completed_at: new Date().toISOString() }).eq('id', jobId); }
        return new Response(JSON.stringify({ success: false, error: qmError.message, refunded: true }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // NOTE: Legacy routes /queue-status and /process-queue were REMOVED
    // Queue management is now 100% delegated to runninghub-queue-manager
    // Use /check, /enqueue, /process-next, and /finish endpoints there

    return new Response(
      JSON.stringify({ error: "Not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[VideoUpscaler] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
