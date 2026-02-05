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
      const { jobId, videoUrl, userId, creditCost } = await req.json();

      if (!jobId || !videoUrl || !userId) {
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

      // Check global running count via Queue Manager (MULTI-API)
      const queueStatus = await checkQueueAvailability(supabase);
      const runningCount = queueStatus.running;
      const accountName = (queueStatus as any).accountName || 'primary';
      const accountApiKey = (queueStatus as any).accountApiKey || null;
      console.log(`[VideoUpscaler] Global running jobs: ${runningCount}, account: ${accountName}`);

      if (!queueStatus.available) {
        // Usar Queue Manager para enfileirar e obter posição GLOBAL
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
        
        try {
          const enqueueUrl = `${supabaseUrl}/functions/v1/runninghub-queue-manager/enqueue`;
          const enqueueResponse = await fetch(enqueueUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${serviceRoleKey}`,
            },
            body: JSON.stringify({
              table: 'video_upscaler_jobs',
              jobId,
            }),
          });
          const enqueueData = await enqueueResponse.json();
          
          console.log(`[VideoUpscaler] Job ${jobId} queued at GLOBAL position ${enqueueData.position}`);

          return new Response(
            JSON.stringify({ success: true, queued: true, position: enqueueData.position }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } catch (enqueueError) {
          console.error('[VideoUpscaler] Enqueue failed:', enqueueError);
          // Fallback: enfileirar localmente
          await supabase
            .from('video_upscaler_jobs')
            .update({
              status: 'queued',
              position: 999,
              waited_in_queue: true,
            })
            .eq('id', jobId);

          return new Response(
            JSON.stringify({ success: true, queued: true, position: 999 }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      // Consume credits first
      const creditResult = await consumeCredits(supabase, userId, creditCost || CREDIT_COST);
      if (!creditResult.success) {
        await supabase
          .from('video_upscaler_jobs')
          .update({ status: 'failed', error_message: 'Insufficient credits' })
          .eq('id', jobId);

        return new Response(
          JSON.stringify({ success: false, code: "INSUFFICIENT_CREDITS", error: creditResult.error }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // CRITICAL: Mark credits as charged for idempotent refund on failure
      await supabase
        .from('video_upscaler_jobs')
        .update({ 
          credits_charged: true,
          user_credit_cost: creditCost || CREDIT_COST
        })
        .eq('id', jobId);
      console.log(`[VideoUpscaler] Job ${jobId} marked as credits_charged=true`);

      // Get the RunningHub API key - use account from Queue Manager or fallback
      const defaultApiKey = Deno.env.get("RUNNINGHUB_API_KEY");
      const runninghubApiKey = accountApiKey || defaultApiKey;
      const accountToUse = accountName;
      
      if (!runninghubApiKey) {
        console.error("[VideoUpscaler] RUNNINGHUB_API_KEY not configured");
        await supabase
          .from('video_upscaler_jobs')
          .update({ status: 'failed', error_message: 'API key not configured' })
          .eq('id', jobId);
        return new Response(
          JSON.stringify({ success: false, error: "API key not configured" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Build webhook URL for this specific tool
      const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
      const webhookUrl = `${supabaseUrl}/functions/v1/runninghub-video-upscaler-webhook`;

      // Call RunningHub API to start the video upscaling
      console.log(`[VideoUpscaler] Starting job ${jobId}. Video: ${videoUrl}, Account: ${accountToUse}`);
      
      const runninghubResponse = await fetch(`${RUNNINGHUB_API_BASE}/run/ai-app/${VIDEO_UPSCALER_WEBAPP_ID}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${runninghubApiKey}`,
        },
        body: JSON.stringify({
          nodeInfoList: [
            {
              nodeId: VIDEO_NODE_ID,
              fieldName: VIDEO_FIELD_NAME,
              fieldValue: videoUrl,
            }
          ],
          instanceType: "default",
          usePersonalQueue: "false",
          webhookUrl: webhookUrl,
        }),
      });

      let runninghubData;
      try {
        runninghubData = await runninghubResponse.json();
      } catch (e) {
        console.error("[VideoUpscaler] Failed to parse RunningHub response:", e);
        runninghubData = { error: "Failed to parse response" };
      }

      console.log("[VideoUpscaler] RunningHub response:", JSON.stringify(runninghubData));

      if (!runninghubResponse.ok || runninghubData.errorCode) {
        const errorMsg = runninghubData.errorMessage || runninghubData.error || `HTTP ${runninghubResponse.status}`;
        console.error("[VideoUpscaler] RunningHub API error:", errorMsg);
        
        await supabase
          .from('video_upscaler_jobs')
          .update({
            status: 'failed',
            error_message: errorMsg,
            completed_at: new Date().toISOString(),
          })
          .eq('id', jobId);

        return new Response(
          JSON.stringify({ success: false, error: errorMsg }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update job with task ID from RunningHub
      const taskId = runninghubData.taskId;
      await supabase
        .from('video_upscaler_jobs')
        .update({
          status: 'running',
          task_id: taskId,
          started_at: new Date().toISOString(),
          user_credit_cost: creditCost || CREDIT_COST,
          api_account: accountToUse,
        })
        .eq('id', jobId);

      console.log(`[VideoUpscaler] Job ${jobId} started successfully. Task ID: ${taskId}`);

      // TIMEOUT SAFETY: Cancel job if no callback in 10 minutes
      EdgeRuntime.waitUntil((async () => {
        await new Promise(r => setTimeout(r, 10 * 60 * 1000)); // 10 minutes
        
        const { data: job } = await supabase
          .from('video_upscaler_jobs')
          .select('status')
          .eq('id', jobId)
          .single();
        
        if (job && (job.status === 'running' || job.status === 'queued')) {
          console.log(`[VideoUpscaler] TIMEOUT: Job ${jobId} stuck for 10min, cancelling...`);
          
          await supabase.rpc('user_cancel_ai_job', {
            p_table_name: 'video_upscaler_jobs',
            p_job_id: jobId
          });
        }
      })());

      return new Response(
        JSON.stringify({ success: true, jobId, taskId }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Route: /queue-status - Get queue status
    if (path === "queue-status" && req.method === "GET") {
      const queueStatus = await checkQueueAvailability(supabase);
      
      const { count: queuedCount } = await supabase
        .from('video_upscaler_jobs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'queued');

      return new Response(
        JSON.stringify({
          running: queueStatus.running,
          queued: queuedCount || 0,
          maxConcurrent: MAX_CONCURRENT_JOBS,
          available: queueStatus.available,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Route: /process-queue - Process next queued job (called by webhook)
    if (path === "process-queue" && req.method === "POST") {
      const queueStatus = await checkQueueAvailability(supabase);

      if (!queueStatus.available) {
        return new Response(
          JSON.stringify({ success: false, reason: "Queue full" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const nextJob = await getNextQueuedJob(supabase);
      if (!nextJob) {
        return new Response(
          JSON.stringify({ success: false, reason: "No queued jobs" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Consume credits for the queued job
      if (nextJob.user_id) {
        const creditResult = await consumeCredits(supabase, nextJob.user_id, CREDIT_COST);
        if (!creditResult.success) {
          await supabase
            .from('video_upscaler_jobs')
            .update({ status: 'failed', error_message: 'Insufficient credits' })
            .eq('id', nextJob.id);

          // Update positions and try next job
          await updateQueuePositions(supabase);
          return new Response(
            JSON.stringify({ success: false, reason: "Insufficient credits for queued job" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      // Get the RunningHub API key
      const runninghubApiKey = Deno.env.get("RUNNINGHUB_API_KEY");
      if (!runninghubApiKey) {
        console.error("[VideoUpscaler] RUNNINGHUB_API_KEY not configured for queue processing");
        await supabase
          .from('video_upscaler_jobs')
          .update({ status: 'failed', error_message: 'API key not configured' })
          .eq('id', nextJob.id);
        await updateQueuePositions(supabase);
        return new Response(
          JSON.stringify({ success: false, reason: "API key not configured" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Build webhook URL
      const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
      const webhookUrl = `${supabaseUrl}/functions/v1/runninghub-video-upscaler-webhook`;

      // Get video URL from job (stored in input_file_name or similar field)
      const videoUrl = nextJob.input_file_name;
      if (!videoUrl) {
        console.error("[VideoUpscaler] No video URL found for queued job:", nextJob.id);
        await supabase
          .from('video_upscaler_jobs')
          .update({ status: 'failed', error_message: 'No video URL found' })
          .eq('id', nextJob.id);
        await updateQueuePositions(supabase);
        return new Response(
          JSON.stringify({ success: false, reason: "No video URL found" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[VideoUpscaler] Processing queued job: ${nextJob.id}. Video: ${videoUrl}`);

      // Call RunningHub API
      const runninghubResponse = await fetch(`${RUNNINGHUB_API_BASE}/run/ai-app/${VIDEO_UPSCALER_WEBAPP_ID}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${runninghubApiKey}`,
        },
        body: JSON.stringify({
          nodeInfoList: [
            {
              nodeId: VIDEO_NODE_ID,
              fieldName: VIDEO_FIELD_NAME,
              fieldValue: videoUrl,
            }
          ],
          instanceType: "default",
          usePersonalQueue: "false",
          webhookUrl: webhookUrl,
        }),
      });

      let runninghubData;
      try {
        runninghubData = await runninghubResponse.json();
      } catch (e) {
        console.error("[VideoUpscaler] Failed to parse RunningHub response:", e);
        runninghubData = { error: "Failed to parse response" };
      }

      console.log("[VideoUpscaler] RunningHub response for queued job:", JSON.stringify(runninghubData));

      if (!runninghubResponse.ok || runninghubData.errorCode) {
        const errorMsg = runninghubData.errorMessage || runninghubData.error || `HTTP ${runninghubResponse.status}`;
        console.error("[VideoUpscaler] RunningHub API error for queued job:", errorMsg);
        
        await supabase
          .from('video_upscaler_jobs')
          .update({
            status: 'failed',
            error_message: errorMsg,
            completed_at: new Date().toISOString(),
          })
          .eq('id', nextJob.id);

        await updateQueuePositions(supabase);
        return new Response(
          JSON.stringify({ success: false, reason: errorMsg }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update job with task ID
      const taskId = runninghubData.taskId;
      await supabase
        .from('video_upscaler_jobs')
        .update({
          status: 'running',
          task_id: taskId,
          started_at: new Date().toISOString(),
          user_credit_cost: CREDIT_COST,
        })
        .eq('id', nextJob.id);

      // Update remaining queue positions
      await updateQueuePositions(supabase);

      console.log(`[VideoUpscaler] Queued job ${nextJob.id} started. Task ID: ${taskId}`);

      return new Response(
        JSON.stringify({ success: true, jobId: nextJob.id, taskId }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
