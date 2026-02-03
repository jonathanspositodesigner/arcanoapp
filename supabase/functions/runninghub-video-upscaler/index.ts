import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// PLACEHOLDER: Configure with the actual WebApp ID when API documentation is provided
const VIDEO_UPSCALER_WEBAPP_ID = "PLACEHOLDER_VIDEO_UPSCALER_WEBAPP_ID";
const MAX_CONCURRENT_JOBS = 3;
const CREDIT_COST = 150;

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

      // Update job to running
      await supabase
        .from('video_upscaler_jobs')
        .update({
          status: 'running',
          started_at: new Date().toISOString(),
          user_credit_cost: creditCost || CREDIT_COST,
        })
        .eq('id', jobId);

      // PLACEHOLDER: Call RunningHub API when documentation is provided
      // For now, we just mark the job as running and wait for the webhook
      console.log(`[VideoUpscaler] Job ${jobId} started. Video URL: ${videoUrl}`);
      console.log(`[VideoUpscaler] PLACEHOLDER: API integration pending. WebApp ID: ${VIDEO_UPSCALER_WEBAPP_ID}`);

      // TODO: Implement actual RunningHub API call here
      // const runninghubApiKey = Deno.env.get("RUNNINGHUB_API_KEY");
      // const response = await fetch("https://api.runninghub.ai/...", {
      //   method: "POST",
      //   headers: { ... },
      //   body: JSON.stringify({ ... })
      // });

      return new Response(
        JSON.stringify({ success: true, jobId }),
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

      // Update job to running
      await supabase
        .from('video_upscaler_jobs')
        .update({
          status: 'running',
          started_at: new Date().toISOString(),
          user_credit_cost: CREDIT_COST,
        })
        .eq('id', nextJob.id);

      // Update remaining queue positions
      await updateQueuePositions(supabase);

      console.log(`[VideoUpscaler] Processing queued job: ${nextJob.id}`);

      // TODO: Start actual processing with RunningHub

      return new Response(
        JSON.stringify({ success: true, jobId: nextJob.id }),
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
