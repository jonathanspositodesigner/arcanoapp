import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * RUNNINGHUB VIDEO UPSCALER WEBHOOK
 * 
 * Webhook específico para Video Upscaler (formato diferente).
 * Delega para Queue Manager /finish para:
 * - Finalizar job
 * - Reembolsar créditos se falhou
 * - Processar próximo da fila
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

  // Helper para log de etapas
  const logStep = async (jobId: string, step: string, details?: Record<string, any>) => {
    const timestamp = new Date().toISOString();
    const entry = { step, timestamp, ...details };
    
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
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
      
      console.log(`[VideoUpscaler Webhook] Job ${jobId}: ${step}`, details || '');
    } catch (e) {
      console.error(`[logStep] Error:`, e);
    }
  };

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const payload = await req.json();
    console.log("[VideoUpscaler Webhook] Received:", JSON.stringify(payload));

    // RunningHub envia dados dentro de eventData para vídeo
    const eventData = payload.eventData || payload;
    
    const taskId = eventData.taskId || payload.taskId;
    const status = eventData.status;
    const results = eventData.results || [];
    const errorMessage = eventData.errorMessage || eventData.failedReason?.message || "";
    const usage = eventData.usage || {};
    
    const rhCost = usage.consumeCoins ? parseInt(usage.consumeCoins) : 0;
    const outputUrl = results.length > 0 ? results[0].url : null;

    if (!taskId) {
      console.error("[VideoUpscaler Webhook] Missing taskId");
      return new Response(
        JSON.stringify({ success: false, error: "Missing taskId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Encontrar job
    const { data: job, error: findError } = await supabase
      .from('video_upscaler_jobs')
      .select('id, started_at, user_credit_cost')
      .eq('task_id', taskId)
      .maybeSingle();

    if (findError || !job) {
      console.error("[VideoUpscaler Webhook] Job not found:", taskId);
      return new Response(
        JSON.stringify({ success: false, error: "Job not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[VideoUpscaler Webhook] Found job ${job.id}, status: ${status}`);

    // Salvar payload bruto do webhook
    await supabase
      .from('video_upscaler_jobs')
      .update({ raw_webhook_payload: payload })
      .eq('id', job.id);
    
    await logStep(job.id, 'webhook_received', { status, hasOutput: !!outputUrl });

    // Calcular custo RH baseado no tempo
    let calculatedRhCost = rhCost;
    if (job.started_at && (status === "SUCCESS" || status === "FAILED")) {
      const startedAt = new Date(job.started_at);
      const completedAt = new Date();
      const processingSeconds = (completedAt.getTime() - startedAt.getTime()) / 1000;
      calculatedRhCost = Math.round(processingSeconds * 0.2);
    }

    // Determinar status final
    let newStatus: string;
    let finalError: string | null = null;

    if (status === "SUCCESS") {
      newStatus = outputUrl ? 'completed' : 'failed';
      if (!outputUrl) finalError = 'No output URL received';
    } else if (status === "FAILED") {
      newStatus = 'failed';
      finalError = errorMessage || 'Unknown error';
    } else if (status === "RUNNING" || status === "QUEUED") {
      // Ainda processando, só atualizar status
      await supabase
        .from('video_upscaler_jobs')
        .update({ status: 'running' })
        .eq('id', job.id);
      
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      // Status desconhecido
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Delegar para Queue Manager /finish
    try {
      const finishUrl = `${SUPABASE_URL}/functions/v1/runninghub-queue-manager/finish`;
      
      const response = await fetch(finishUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          table: 'video_upscaler_jobs',
          jobId: job.id,
          status: newStatus,
          outputUrl,
          errorMessage: finalError,
          taskId,
          rhCost: calculatedRhCost,
          webhookPayload: payload,
        }),
      });
      
      const result = await response.json();
      console.log("[VideoUpscaler Webhook] Queue Manager response:", JSON.stringify(result));
    } catch (e) {
      console.error("[VideoUpscaler Webhook] Error calling Queue Manager:", e);
      
      // Fallback: atualizar diretamente
      await supabase
        .from('video_upscaler_jobs')
        .update({
          status: newStatus,
          current_step: newStatus,
          output_url: outputUrl,
          error_message: finalError,
          failed_at_step: newStatus === 'failed' ? 'webhook_received' : null,
          completed_at: new Date().toISOString(),
          rh_cost: calculatedRhCost,
        })
        .eq('id', job.id);
      
      await logStep(job.id, newStatus, { outputUrl, error: finalError });
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
