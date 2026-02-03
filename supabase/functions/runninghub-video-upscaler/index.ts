import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

// Count all running jobs across all AI tools (global queue)
async function getGlobalRunningCount(supabase: any): Promise<number> {
  const tables = ['upscaler_jobs', 'pose_changer_jobs', 'veste_ai_jobs', 'video_upscaler_jobs'];
  let totalRunning = 0;

  for (const table of tables) {
    try {
      const { count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
        .eq('status', 'running');
      totalRunning += count || 0;
    } catch (e) {
      console.error(`[VideoUpscaler] Error counting ${table}:`, e);
    }
  }

  return totalRunning;
}

// Get next queued job for this tool
async function getNextQueuedJob(supabase: any): Promise<any> {
  const { data } = await supabase
    .from('video_upscaler_jobs')
    .select('*')
    .eq('status', 'queued')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  return data;
}

// Update queue positions
async function updateQueuePositions(supabase: any): Promise<void> {
  const { data: queuedJobs } = await supabase
    .from('video_upscaler_jobs')
    .select('id')
    .eq('status', 'queued')
    .order('created_at', { ascending: true });

  if (queuedJobs) {
    for (let i = 0; i < queuedJobs.length; i++) {
      await supabase
        .from('video_upscaler_jobs')
        .update({ position: i + 1 })
        .eq('id', queuedJobs[i].id);
    }
  }
}

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

      // Check global running count
      const runningCount = await getGlobalRunningCount(supabase);
      console.log(`[VideoUpscaler] Global running jobs: ${runningCount}`);

      if (runningCount >= MAX_CONCURRENT_JOBS) {
        // Add to queue
        await updateQueuePositions(supabase);
        
        const { count: queuedCount } = await supabase
          .from('video_upscaler_jobs')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'queued');

        const position = (queuedCount as number || 0) + 1;

        await supabase
          .from('video_upscaler_jobs')
          .update({
            status: 'queued',
            position: position,
            waited_in_queue: true,
          })
          .eq('id', jobId);

        console.log(`[VideoUpscaler] Job ${jobId} queued at position ${position}`);

        return new Response(
          JSON.stringify({ success: true, queued: true, position }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
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

      // Get the RunningHub API key
      const runninghubApiKey = Deno.env.get("RUNNINGHUB_API_KEY");
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
      console.log(`[VideoUpscaler] Starting job ${jobId}. Video: ${videoUrl}`);
      
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
        })
        .eq('id', jobId);

      console.log(`[VideoUpscaler] Job ${jobId} started successfully. Task ID: ${taskId}`);

      return new Response(
        JSON.stringify({ success: true, jobId, taskId }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Route: /queue-status - Get queue status
    if (path === "queue-status" && req.method === "GET") {
      const runningCount = await getGlobalRunningCount(supabase);
      
      const { count: queuedCount } = await supabase
        .from('video_upscaler_jobs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'queued');

      return new Response(
        JSON.stringify({
          running: runningCount,
          queued: queuedCount || 0,
          maxConcurrent: MAX_CONCURRENT_JOBS,
          available: runningCount < MAX_CONCURRENT_JOBS,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Route: /process-queue - Process next queued job (called by webhook)
    if (path === "process-queue" && req.method === "POST") {
      const runningCount = await getGlobalRunningCount(supabase);

      if (runningCount >= MAX_CONCURRENT_JOBS) {
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
