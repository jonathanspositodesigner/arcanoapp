import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * RUNNINGHUB WEBHOOK - CENTRALIZED
 * 
 * Webhook ÚNICO que recebe callbacks do RunningHub para:
 * - Upscaler Arcano (upscaler_jobs)
 * - Pose Changer (pose_changer_jobs)
 * - Veste AI (veste_ai_jobs)
 * 
 * Quando um job termina, delega para o Queue Manager /finish
 * que cuida de:
 * - Finalizar job
 * - Reembolsar créditos se falhou
 * - Processar próximo da fila
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const IMAGE_JOB_TABLES = ['upscaler_jobs', 'pose_changer_jobs', 'veste_ai_jobs', 'arcano_cloner_jobs', 'character_generator_jobs'] as const;

// De Longe → Standard fallback configuration
const WEBAPP_ID_STANDARD = '2017030861371219969';
const WEBAPP_ID_LONGE = '2020634325636616194';

/**
 * logStep - Registra etapa do job para observabilidade
 */
async function logStep(
  table: string,
  jobId: string,
  step: string,
  details?: Record<string, any>
): Promise<void> {
  const timestamp = new Date().toISOString();
  const entry = { step, timestamp, ...details };
  
  try {
    const { data: job } = await supabase
      .from(table)
      .select('step_history')
      .eq('id', jobId)
      .maybeSingle();
    
    const currentHistory = (job?.step_history as any[]) || [];
    const newHistory = [...currentHistory, entry];
    
    await supabase
      .from(table)
      .update({
        current_step: step,
        step_history: newHistory,
      })
      .eq('id', jobId);
    
    console.log(`[Webhook] ${table} Job ${jobId}: ${step}`, details || '');
  } catch (e) {
    console.error(`[logStep] Error:`, e);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    console.log('[Webhook] Received:', JSON.stringify(payload));

    const event = payload.event;
    const taskId = payload.taskId;
    const eventData = payload.eventData || {};
    const taskStatus = eventData.status;
    
    console.log(`[Webhook] Event: ${event}, TaskId: ${taskId}, Status: ${taskStatus}`);

    // Só processa TASK_END
    if (event !== 'TASK_END') {
      return new Response(JSON.stringify({ success: true, message: 'Event ignored' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!taskId) {
      console.error('[Webhook] No taskId');
      return new Response(JSON.stringify({ error: 'Missing taskId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extrair output
    let outputUrl: string | null = null;
    let errorMessage: string | null = null;

    const results = eventData.results || [];
    if (Array.isArray(results) && results.length > 0) {
      const imageResult = results.find((r: any) => 
        ['png', 'jpg', 'jpeg', 'webp'].includes(r.outputType)
      );
      outputUrl = imageResult?.url || results[0]?.url || null;
    }

    if (taskStatus === 'FAILED') {
      errorMessage = eventData.errorMessage || eventData.errorCode || 'Processing failed';
    }

    // Encontrar job - minimal select that works for ALL tables
    let jobTable: string | null = null;
    let jobData: any = null;

    for (const table of IMAGE_JOB_TABLES) {
      const { data: job, error: lookupError } = await supabase
        .from(table)
        .select('id, started_at, user_credit_cost')
        .eq('task_id', taskId)
        .maybeSingle();

      if (lookupError) {
        console.error(`[Webhook] Error querying ${table}:`, lookupError.message);
        continue;
      }

      if (job) {
        jobTable = table;
        jobData = job;
        console.log(`[Webhook] Found job in ${table}: ${job.id}`);
        
        // Enrich with upscaler-specific columns only for upscaler_jobs (fallback logic)
        if (table === 'upscaler_jobs') {
          const { data: enriched } = await supabase
            .from('upscaler_jobs')
            .select('category, fallback_attempted, input_file_name, detail_denoise, resolution, prompt, version')
            .eq('id', job.id)
            .maybeSingle();
          if (enriched) {
            jobData = { ...jobData, ...enriched };
          }
        }
        break;
      }
    }

    if (!jobData || !jobTable) {
      console.log('[Webhook] Job not found');
      return new Response(JSON.stringify({ success: true, message: 'Job not found' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Salvar payload bruto do webhook + log etapa
    await supabase
      .from(jobTable)
      .update({ raw_webhook_payload: payload })
      .eq('id', jobData.id);
    
    await logStep(jobTable, jobData.id, 'webhook_received', { 
      event, 
      taskStatus, 
      hasOutput: !!outputUrl 
    });

    // Calcular custo RH
    const completedAt = new Date();
    let rhCost = 0;
    
    if (jobData.started_at && !errorMessage) {
      const startedAt = new Date(jobData.started_at);
      const processingSeconds = Math.max(1, Math.ceil((completedAt.getTime() - startedAt.getTime()) / 1000));
      rhCost = Math.round(processingSeconds * 0.2);
    }

    const newStatus = errorMessage ? 'failed' : (outputUrl ? 'completed' : 'failed');
    const finalError = errorMessage || (newStatus === 'failed' ? 'No output received' : null);

    // ========================================
    // FALLBACK LOGIC: De Longe → Standard
    // Se job "pessoas_longe" falhou e ainda não tentou fallback, tenta automaticamente
    // ========================================
    if (
      jobTable === 'upscaler_jobs' &&
      newStatus === 'failed' &&
      jobData.category === 'pessoas_longe' &&
      !jobData.fallback_attempted &&
      jobData.input_file_name
    ) {
      console.log(`[Webhook] FALLBACK TRIGGERED for De Longe job ${jobData.id}`);
      
      // Marcar que vamos tentar fallback
      await supabase
        .from('upscaler_jobs')
        .update({ 
          fallback_attempted: true,
          original_task_id: taskId,
          current_step: 'fallback_starting',
          error_message: null, // Limpar erro anterior
        })
        .eq('id', jobData.id);
      
      await logStep('upscaler_jobs', jobData.id, 'fallback_starting', { 
        originalError: finalError,
        originalTaskId: taskId 
      });
      
      // Chamar edge function /fallback para retry com workflow Standard
      try {
        const fallbackUrl = `${SUPABASE_URL}/functions/v1/runninghub-upscaler/fallback`;
        
        const fallbackResponse = await fetch(fallbackUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            jobId: jobData.id,
            inputFileName: jobData.input_file_name,
            detailDenoise: jobData.detail_denoise || 0.15,
            resolution: jobData.resolution || 2048,
            prompt: jobData.prompt,
          }),
        });
        
        const fallbackResult = await fallbackResponse.json();
        console.log('[Webhook] Fallback response:', JSON.stringify(fallbackResult));
        
        if (fallbackResult.success) {
          // Fallback iniciado com sucesso - não finaliza o job ainda
          return new Response(JSON.stringify({ 
            success: true, 
            fallback: true,
            message: 'Fallback triggered, retrying with Standard workflow' 
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } else {
          // Fallback falhou ao iniciar - continua com a falha normal
          console.error('[Webhook] Fallback failed to start:', fallbackResult.error);
          await logStep('upscaler_jobs', jobData.id, 'fallback_failed', { 
            error: fallbackResult.error 
          });
        }
      } catch (fallbackError) {
        console.error('[Webhook] Fallback call failed:', fallbackError);
        await logStep('upscaler_jobs', jobData.id, 'fallback_error', { 
          error: String(fallbackError) 
        });
      }
    }

    // Delegar para Queue Manager /finish (com payload do webhook)
    try {
      const finishUrl = `${SUPABASE_URL}/functions/v1/runninghub-queue-manager/finish`;
      
      const response = await fetch(finishUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          table: jobTable,
          jobId: jobData.id,
          status: newStatus,
          outputUrl,
          errorMessage: finalError,
          taskId,
          rhCost,
          webhookPayload: payload,
        }),
      });
      
      const result = await response.json();
      console.log('[Webhook] Queue Manager /finish response:', JSON.stringify(result));
    } catch (queueError) {
      console.error('[Webhook] Error calling Queue Manager:', queueError);
      
      // Fallback: atualizar diretamente
      await supabase
        .from(jobTable)
        .update({
          status: newStatus,
          current_step: newStatus,
          output_url: outputUrl,
          error_message: finalError,
          failed_at_step: newStatus === 'failed' ? 'webhook_received' : null,
          completed_at: completedAt.toISOString(),
          rh_cost: rhCost > 0 ? rhCost : null
        })
        .eq('task_id', taskId);
      
      await logStep(jobTable, jobData.id, newStatus, { outputUrl, error: finalError });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Webhook] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
