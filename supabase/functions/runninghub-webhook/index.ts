import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * RUNNINGHUB WEBHOOK
 * 
 * Webhook ÚNICO que recebe callbacks do RunningHub para:
 * - Upscaler Arcano (upscaler_jobs)
 * - Pose Changer (pose_changer_jobs)
 * - Veste AI (veste_ai_jobs)
 * 
 * Quando um job termina, chama o Queue Manager centralizado para processar
 * o próximo job na fila global.
 * 
 * Nota: Video Upscaler usa webhook próprio (runninghub-video-upscaler-webhook)
 * por ter formato de resposta diferente.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Tabelas de jobs de imagem (Video Upscaler tem webhook próprio)
const IMAGE_JOB_TABLES = ['upscaler_jobs', 'pose_changer_jobs', 'veste_ai_jobs'] as const;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    console.log('[Webhook] Received payload:', JSON.stringify(payload));

    // RunningHub API v2 webhook format
    const event = payload.event;
    const taskId = payload.taskId;
    const eventData = payload.eventData || {};
    const taskStatus = eventData.status;
    
    console.log(`[Webhook] Event: ${event}, TaskId: ${taskId}, Status: ${taskStatus}`);

    // Só processa eventos TASK_END
    if (event !== 'TASK_END') {
      console.log('[Webhook] Ignoring non-TASK_END event');
      return new Response(JSON.stringify({ success: true, message: 'Event ignored' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!taskId) {
      console.error('[Webhook] No taskId in payload');
      return new Response(JSON.stringify({ error: 'Missing taskId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extrair URL de output dos results
    let outputUrl: string | null = null;
    let errorMessage: string | null = null;

    const results = eventData.results || [];
    
    if (Array.isArray(results) && results.length > 0) {
      const imageResult = results.find((r: any) => 
        r.outputType === 'png' || 
        r.outputType === 'jpg' || 
        r.outputType === 'jpeg' || 
        r.outputType === 'webp'
      );
      outputUrl = imageResult?.url || results[0]?.url || null;
    }

    if (taskStatus === 'FAILED') {
      errorMessage = eventData.errorMessage || eventData.errorCode || 'Processing failed';
    }

    console.log(`[Webhook] OutputUrl: ${outputUrl}, Error: ${errorMessage}`);

    // Encontrar o job em uma das tabelas
    let jobTable: string | null = null;
    let jobData: any = null;

    for (const table of IMAGE_JOB_TABLES) {
      const { data: job, error } = await supabase
        .from(table)
        .select('id, started_at, user_credit_cost')
        .eq('task_id', taskId)
        .maybeSingle();

      if (job) {
        jobTable = table;
        jobData = job;
        console.log(`[Webhook] Found job in ${table}: ${job.id}`);
        break;
      }
    }

    if (!jobData || !jobTable) {
      console.log('[Webhook] Job not found in any table');
      return new Response(JSON.stringify({ success: true, message: 'Job not found' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calcular custo RH baseado no tempo de processamento (0.2 RH por segundo)
    const completedAt = new Date();
    let rhCost = 0;
    
    if (jobData.started_at && !errorMessage) {
      const startedAt = new Date(jobData.started_at);
      const processingSeconds = Math.max(1, Math.ceil((completedAt.getTime() - startedAt.getTime()) / 1000));
      rhCost = Math.round(processingSeconds * 0.2);
      console.log(`[Webhook] Processing time: ${processingSeconds}s, RH Cost: ${rhCost}`);
    }

    // Atualizar o job
    const newStatus = errorMessage ? 'failed' : (outputUrl ? 'completed' : 'failed');
    
    const { error: updateError } = await supabase
      .from(jobTable)
      .update({
        status: newStatus,
        output_url: outputUrl,
        error_message: errorMessage || (newStatus === 'failed' ? 'No output received' : null),
        completed_at: completedAt.toISOString(),
        rh_cost: rhCost > 0 ? rhCost : null
      })
      .eq('task_id', taskId);

    if (updateError) {
      console.error('[Webhook] Error updating job:', updateError);
    } else {
      console.log(`[Webhook] Job updated - Status: ${newStatus}, RH Cost: ${rhCost}`);
    }

    // ========================================
    // CHAMAR O QUEUE MANAGER CENTRALIZADO
    // ========================================
    // Isso processa o próximo job na fila global (de qualquer ferramenta)
    try {
      const queueManagerUrl = `${SUPABASE_URL}/functions/v1/runninghub-queue-manager/process-next`;
      console.log('[Webhook] Calling Queue Manager to process next job...');
      
      const response = await fetch(queueManagerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
      });
      
      const result = await response.json();
      console.log('[Webhook] Queue Manager response:', JSON.stringify(result));
    } catch (queueError) {
      console.error('[Webhook] Error calling Queue Manager:', queueError);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Webhook] Unhandled error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
