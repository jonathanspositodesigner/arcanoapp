import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * RUNNINGHUB VIDEO UPSCALER WEBHOOK
 * 
 * Webhook específico para Video Upscaler porque o formato de resposta
 * do RunningHub para vídeo é diferente (dados dentro de eventData).
 * 
 * Quando um job termina, chama o Queue Manager centralizado para processar
 * o próximo job na fila global.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const payload = await req.json();
    console.log("[VideoUpscaler Webhook] Received payload:", JSON.stringify(payload));

    // RunningHub envia dados dentro de eventData para webhooks de vídeo
    const eventData = payload.eventData || payload;
    
    const taskId = eventData.taskId || payload.taskId;
    const status = eventData.status;
    const results = eventData.results || [];
    const errorMessage = eventData.errorMessage || eventData.failedReason?.message || "";
    const usage = eventData.usage || {};
    
    // Calcular custo RH do usage
    const rhCost = usage.consumeCoins ? parseInt(usage.consumeCoins) : 0;
    
    // Obter URL de output
    const outputUrl = results.length > 0 ? results[0].url : null;

    if (!taskId) {
      console.error("[VideoUpscaler Webhook] Missing taskId in payload");
      return new Response(
        JSON.stringify({ success: false, error: "Missing taskId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Encontrar o job
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

    // Calcular custo RH baseado no tempo de processamento
    let calculatedRhCost = rhCost;
    if (job.started_at && (status === "SUCCESS" || status === "FAILED")) {
      const startedAt = new Date(job.started_at);
      const completedAt = new Date();
      const processingSeconds = (completedAt.getTime() - startedAt.getTime()) / 1000;
      calculatedRhCost = Math.round(processingSeconds * 0.2);
      console.log(`[VideoUpscaler Webhook] Processing time: ${processingSeconds}s, RH cost: ${calculatedRhCost}`);
    }

    // Atualizar status do job
    if (status === "SUCCESS") {
      if (!outputUrl) {
        console.error("[VideoUpscaler Webhook] SUCCESS but no output URL");
        await supabase
          .from('video_upscaler_jobs')
          .update({
            status: 'failed',
            error_message: 'No output URL received',
            completed_at: new Date().toISOString(),
            rh_cost: calculatedRhCost,
          })
          .eq('id', job.id);
      } else {
        await supabase
          .from('video_upscaler_jobs')
          .update({
            status: 'completed',
            output_url: outputUrl,
            completed_at: new Date().toISOString(),
            rh_cost: calculatedRhCost,
          })
          .eq('id', job.id);

        console.log(`[VideoUpscaler Webhook] Job ${job.id} completed: ${outputUrl}`);
      }
    } else if (status === "FAILED") {
      await supabase
        .from('video_upscaler_jobs')
        .update({
          status: 'failed',
          error_message: errorMessage || 'Unknown error',
          completed_at: new Date().toISOString(),
          rh_cost: calculatedRhCost,
        })
        .eq('id', job.id);

      console.log(`[VideoUpscaler Webhook] Job ${job.id} failed: ${errorMessage}`);
    } else if (status === "RUNNING" || status === "QUEUED") {
      await supabase
        .from('video_upscaler_jobs')
        .update({ status: 'running' })
        .eq('id', job.id);

      console.log(`[VideoUpscaler Webhook] Job ${job.id} status: ${status}`);
    }

    // ========================================
    // CHAMAR O QUEUE MANAGER CENTRALIZADO
    // ========================================
    if (status === "SUCCESS" || status === "FAILED") {
      try {
        const queueManagerUrl = `${SUPABASE_URL}/functions/v1/runninghub-queue-manager/process-next`;
        console.log('[VideoUpscaler Webhook] Calling Queue Manager...');
        
        await fetch(queueManagerUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
        });
        
        console.log("[VideoUpscaler Webhook] Queue Manager triggered");
      } catch (e) {
        console.error("[VideoUpscaler Webhook] Failed to call Queue Manager:", e);
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
