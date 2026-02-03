import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const payload = await req.json();
    console.log("[VideoUpscaler Webhook] Received payload:", JSON.stringify(payload));

    // Extract task ID and status from RunningHub webhook payload
    // PLACEHOLDER: Adjust field names based on actual RunningHub API response
    const taskId = payload.taskId || payload.task_id;
    const status = payload.status;
    const outputUrl = payload.output_url || payload.outputUrl || payload.result?.url;
    const errorMessage = payload.error || payload.errorMessage || payload.message;
    const rhCost = payload.cost || payload.credits_used || 0;

    if (!taskId) {
      console.error("[VideoUpscaler Webhook] Missing taskId in payload");
      return new Response(
        JSON.stringify({ success: false, error: "Missing taskId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find the job by task_id
    const { data: job, error: findError } = await supabase
      .from('video_upscaler_jobs')
      .select('*')
      .eq('task_id', taskId)
      .maybeSingle();

    if (findError || !job) {
      console.error("[VideoUpscaler Webhook] Job not found for taskId:", taskId);
      return new Response(
        JSON.stringify({ success: false, error: "Job not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[VideoUpscaler Webhook] Found job ${job.id} with status ${status}`);

    // Handle different statuses
    if (status === "completed" || status === "success" || status === "COMPLETED") {
      if (!outputUrl) {
        console.error("[VideoUpscaler Webhook] Completed but no output URL");
        await supabase
          .from('video_upscaler_jobs')
          .update({
            status: 'failed',
            error_message: 'No output URL received',
            completed_at: new Date().toISOString(),
            rh_cost: rhCost,
          })
          .eq('id', job.id);
      } else {
        await supabase
          .from('video_upscaler_jobs')
          .update({
            status: 'completed',
            output_url: outputUrl,
            completed_at: new Date().toISOString(),
            rh_cost: rhCost,
          })
          .eq('id', job.id);

        console.log(`[VideoUpscaler Webhook] Job ${job.id} completed with output: ${outputUrl}`);
      }
    } else if (status === "failed" || status === "error" || status === "FAILED") {
      await supabase
        .from('video_upscaler_jobs')
        .update({
          status: 'failed',
          error_message: errorMessage || 'Unknown error',
          completed_at: new Date().toISOString(),
          rh_cost: rhCost,
        })
        .eq('id', job.id);

      console.log(`[VideoUpscaler Webhook] Job ${job.id} failed: ${errorMessage}`);
    } else if (status === "processing" || status === "running" || status === "PROCESSING") {
      await supabase
        .from('video_upscaler_jobs')
        .update({ status: 'running' })
        .eq('id', job.id);

      console.log(`[VideoUpscaler Webhook] Job ${job.id} is processing`);
    } else {
      console.log(`[VideoUpscaler Webhook] Unknown status: ${status}`);
    }

    // Process next job in queue if this one is done
    if (status === "completed" || status === "success" || status === "failed" || status === "error" ||
        status === "COMPLETED" || status === "FAILED") {
      try {
        // Trigger queue processing
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        await fetch(`${supabaseUrl}/functions/v1/runninghub-video-upscaler/process-queue`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
          },
        });
        console.log("[VideoUpscaler Webhook] Triggered queue processing");
      } catch (e) {
        console.error("[VideoUpscaler Webhook] Failed to trigger queue processing:", e);
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[VideoUpscaler Webhook] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
