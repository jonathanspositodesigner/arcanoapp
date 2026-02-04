import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * RUNNINGHUB QUEUE MANAGER
 * 
 * Função ÚNICA e CENTRALIZADA para gerenciar a fila global de todas as ferramentas de IA.
 * Todas as 4 ferramentas (Upscaler, Pose Changer, Veste AI, Video Upscaler) usam esta função
 * para verificar disponibilidade de slots e processar a fila.
 * 
 * Endpoints:
 * - /check - Verifica se há slot disponível na fila global
 * - /process-next - Processa o próximo job de qualquer ferramenta quando um slot libera
 * - /status - Retorna status completo da fila global
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RUNNINGHUB_API_KEY = (Deno.env.get('RUNNINGHUB_API_KEY') || '').trim();

// Configuração global
const MAX_CONCURRENT_JOBS = 3;

// WebApp IDs para cada ferramenta
const WEBAPP_IDS = {
  upscaler_jobs: {
    pro: '2015865378030755841',
    standard: '2017030861371219969',
    longe: '2017343414227963905',
  },
  pose_changer_jobs: '2018451429635133442',
  veste_ai_jobs: '2018755100210106369',
  video_upscaler_jobs: '2018810750139109378',
};

// Tabelas de jobs
const JOB_TABLES = ['upscaler_jobs', 'pose_changer_jobs', 'veste_ai_jobs', 'video_upscaler_jobs'] as const;
type JobTable = typeof JOB_TABLES[number];

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();
    
    console.log(`[QueueManager] Endpoint: ${path}`);

    switch (path) {
      case 'check':
        return await handleCheck(req);
      case 'process-next':
        return await handleProcessNext();
      case 'status':
        return await handleStatus();
      case 'enqueue':
        return await handleEnqueue(req);
      default:
        return new Response(JSON.stringify({ error: 'Invalid endpoint' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    console.error('[QueueManager] Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

/**
 * Conta jobs em execução em TODAS as tabelas
 */
async function getGlobalRunningCount(): Promise<number> {
  let total = 0;
  
  for (const table of JOB_TABLES) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .eq('status', 'running');
    
    if (error) {
      console.error(`[QueueManager] Error counting ${table}:`, error);
    } else {
      total += count || 0;
    }
  }
  
  console.log(`[QueueManager] Total running: ${total}/${MAX_CONCURRENT_JOBS}`);
  return total;
}

/**
 * Conta jobs na fila de cada tabela
 */
async function getQueuedCounts(): Promise<Record<JobTable, number>> {
  const counts: Record<string, number> = {};
  
  for (const table of JOB_TABLES) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .eq('status', 'queued');
    
    counts[table] = error ? 0 : (count || 0);
  }
  
  return counts as Record<JobTable, number>;
}

/**
 * Calcula a posição GLOBAL de um job na fila (considerando TODAS as ferramentas)
 * Retorna a posição baseada em created_at (FIFO global)
 */
async function getGlobalQueuePosition(jobCreatedAt: string): Promise<number> {
  let position = 1;
  
  for (const table of JOB_TABLES) {
    const { count } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .eq('status', 'queued')
      .lt('created_at', jobCreatedAt);
    
    position += count || 0;
  }
  
  return position;
}

/**
 * Conta TODOS os jobs na fila global
 */
async function getTotalQueuedCount(): Promise<number> {
  let total = 0;
  
  for (const table of JOB_TABLES) {
    const { count } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .eq('status', 'queued');
    
    total += count || 0;
  }
  
  return total;
}

/**
 * /check - Verifica se há slot disponível na fila global
 */
async function handleCheck(req: Request): Promise<Response> {
  const runningCount = await getGlobalRunningCount();
  const available = runningCount < MAX_CONCURRENT_JOBS;
  const slotsAvailable = MAX_CONCURRENT_JOBS - runningCount;
  
  return new Response(JSON.stringify({
    available,
    running: runningCount,
    maxConcurrent: MAX_CONCURRENT_JOBS,
    slotsAvailable,
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * /enqueue - Adiciona job à fila e retorna posição GLOBAL
 * Chamado pelas Edge Functions quando não há slot disponível
 */
async function handleEnqueue(req: Request): Promise<Response> {
  try {
    const { table, jobId, creditCost } = await req.json();
    
    if (!table || !jobId) {
      return new Response(JSON.stringify({ error: 'table and jobId are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Verificar se a tabela é válida
    if (!JOB_TABLES.includes(table as JobTable)) {
      return new Response(JSON.stringify({ error: 'Invalid table' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Obter created_at do job
    const { data: job, error: jobError } = await supabase
      .from(table)
      .select('created_at')
      .eq('id', jobId)
      .maybeSingle();
    
    if (jobError || !job) {
      return new Response(JSON.stringify({ error: 'Job not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Calcular posição GLOBAL na fila
    const globalPosition = await getGlobalQueuePosition(job.created_at);
    
    // Atualizar job com status queued e posição global
    const updateData: Record<string, any> = {
      status: 'queued',
      position: globalPosition,
      waited_in_queue: true,
    };
    
    if (creditCost !== undefined) {
      updateData.user_credit_cost = creditCost;
    }
    
    await supabase
      .from(table)
      .update(updateData)
      .eq('id', jobId);
    
    console.log(`[QueueManager] Job ${jobId} enqueued at GLOBAL position ${globalPosition}`);
    
    return new Response(JSON.stringify({
      success: true,
      queued: true,
      position: globalPosition,
      totalQueued: await getTotalQueuedCount(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('[QueueManager] Enqueue error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

/**
 * /status - Retorna status completo da fila global
 */
async function handleStatus(): Promise<Response> {
  const runningCount = await getGlobalRunningCount();
  const queuedCounts = await getQueuedCounts();
  const totalQueued = Object.values(queuedCounts).reduce((a, b) => a + b, 0);
  
  return new Response(JSON.stringify({
    running: runningCount,
    maxConcurrent: MAX_CONCURRENT_JOBS,
    slotsAvailable: MAX_CONCURRENT_JOBS - runningCount,
    totalQueued,
    queuedByTool: queuedCounts,
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * /process-next - Processa o próximo job na fila global (FIFO cross-tool)
 * Chamado pelos webhooks quando um job termina
 */
async function handleProcessNext(): Promise<Response> {
  const runningCount = await getGlobalRunningCount();
  
  if (runningCount >= MAX_CONCURRENT_JOBS) {
    console.log('[QueueManager] No slots available');
    return new Response(JSON.stringify({ processed: false, reason: 'No slots available' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  
  // Buscar o job mais antigo na fila de TODAS as tabelas
  let oldestJob: { table: JobTable; job: any } | null = null;
  
  for (const table of JOB_TABLES) {
    const { data: job, error } = await supabase
      .from(table)
      .select('*')
      .eq('status', 'queued')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    
    if (error || !job) continue;
    
    if (!oldestJob || new Date(job.created_at) < new Date(oldestJob.job.created_at)) {
      oldestJob = { table, job };
    }
  }
  
  if (!oldestJob) {
    console.log('[QueueManager] No jobs in queue');
    return new Response(JSON.stringify({ processed: false, reason: 'No queued jobs' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  
  console.log(`[QueueManager] Processing next job from ${oldestJob.table}: ${oldestJob.job.id}`);
  
  // Calcular tempo de espera na fila
  const queueWaitSeconds = Math.round(
    (Date.now() - new Date(oldestJob.job.created_at).getTime()) / 1000
  );
  
  // Marcar como running
  await supabase
    .from(oldestJob.table)
    .update({
      status: 'running',
      started_at: new Date().toISOString(),
      position: 0,
      queue_wait_seconds: queueWaitSeconds,
    })
    .eq('id', oldestJob.job.id);
  
  // Iniciar processamento no RunningHub
  const result = await startJobOnRunningHub(oldestJob.table, oldestJob.job);
  
  // Atualizar posições das filas
  await updateAllQueuePositions();
  
  return new Response(JSON.stringify({
    processed: true,
    table: oldestJob.table,
    jobId: oldestJob.job.id,
    taskId: result.taskId,
    queueWaitSeconds,
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Inicia um job no RunningHub baseado no tipo de ferramenta
 */
async function startJobOnRunningHub(table: JobTable, job: any): Promise<{ taskId: string | null }> {
  const webhookUrl = `${SUPABASE_URL}/functions/v1/runninghub-webhook`;
  
  let webappId: string;
  let nodeInfoList: any[];
  
  switch (table) {
    case 'upscaler_jobs':
      webappId = WEBAPP_IDS.upscaler_jobs.pro;
      nodeInfoList = [
        { nodeId: "26", fieldName: "image", fieldValue: job.input_file_name },
        { nodeId: "25", fieldName: "value", fieldValue: job.detail_denoise || 0.15 },
      ];
      if (job.prompt) {
        nodeInfoList.push({ nodeId: "128", fieldName: "text", fieldValue: job.prompt });
      }
      break;
      
    case 'pose_changer_jobs':
      webappId = WEBAPP_IDS.pose_changer_jobs;
      nodeInfoList = [
        { nodeId: "27", fieldName: "image", fieldValue: job.person_file_name },
        { nodeId: "60", fieldName: "image", fieldValue: job.reference_file_name },
      ];
      break;
      
    case 'veste_ai_jobs':
      webappId = WEBAPP_IDS.veste_ai_jobs;
      nodeInfoList = [
        { nodeId: "41", fieldName: "image", fieldValue: job.person_file_name },
        { nodeId: "43", fieldName: "image", fieldValue: job.clothing_file_name },
      ];
      break;
      
    case 'video_upscaler_jobs':
      webappId = WEBAPP_IDS.video_upscaler_jobs;
      // Video upscaler usa webhook próprio para formato diferente de resposta
      const videoWebhookUrl = `${SUPABASE_URL}/functions/v1/runninghub-video-upscaler-webhook`;
      nodeInfoList = [
        { nodeId: "3", fieldName: "video", fieldValue: job.input_file_name },
      ];
      return await callRunningHubApi(webappId, nodeInfoList, videoWebhookUrl, table, job.id);
      
    default:
      console.error(`[QueueManager] Unknown table: ${table}`);
      return { taskId: null };
  }
  
  return await callRunningHubApi(webappId, nodeInfoList, webhookUrl, table, job.id);
}

/**
 * Chama a API do RunningHub
 */
async function callRunningHubApi(
  webappId: string,
  nodeInfoList: any[],
  webhookUrl: string,
  table: string,
  jobId: string
): Promise<{ taskId: string | null }> {
  const requestBody = {
    nodeInfoList,
    instanceType: "default",
    usePersonalQueue: false,
    webhookUrl,
  };
  
  console.log(`[QueueManager] Calling RunningHub for ${table}:`, JSON.stringify(requestBody));
  
  try {
    const response = await fetch(`https://www.runninghub.ai/openapi/v2/run/ai-app/${webappId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RUNNINGHUB_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    });
    
    const data = await response.json();
    console.log(`[QueueManager] RunningHub response:`, JSON.stringify(data));
    
    if (data.taskId) {
      await supabase
        .from(table)
        .update({ task_id: data.taskId })
        .eq('id', jobId);
      
      console.log(`[QueueManager] Job ${jobId} started with taskId: ${data.taskId}`);
      return { taskId: data.taskId };
    } else {
      const errorMsg = data.message || data.error || 'Failed to start job';
      await supabase
        .from(table)
        .update({
          status: 'failed',
          error_message: errorMsg,
          completed_at: new Date().toISOString(),
        })
        .eq('id', jobId);
      
      console.error(`[QueueManager] Failed to start job ${jobId}:`, errorMsg);
      return { taskId: null };
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[QueueManager] Error calling RunningHub:`, error);
    
    await supabase
      .from(table)
      .update({
        status: 'failed',
        error_message: errorMsg,
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId);
    
    return { taskId: null };
  }
}

/**
 * Atualiza posições da fila GLOBALMENTE em todas as tabelas
 * Posição é baseada em created_at considerando TODAS as filas
 */
async function updateAllQueuePositions(): Promise<void> {
  // Buscar TODOS os jobs queued de TODAS as tabelas com seus created_at
  interface QueuedJob {
    id: string;
    created_at: string;
    table: JobTable;
  }
  
  const allQueuedJobs: QueuedJob[] = [];
  
  for (const table of JOB_TABLES) {
    const { data: jobs } = await supabase
      .from(table)
      .select('id, created_at')
      .eq('status', 'queued');
    
    if (jobs) {
      for (const job of jobs) {
        allQueuedJobs.push({ ...job, table });
      }
    }
  }
  
  // Ordenar globalmente por created_at (FIFO)
  allQueuedJobs.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  
  // Atualizar posições globalmente
  for (let i = 0; i < allQueuedJobs.length; i++) {
    const job = allQueuedJobs[i];
    await supabase
      .from(job.table)
      .update({ position: i + 1 })
      .eq('id', job.id);
  }
  
  console.log(`[QueueManager] Updated GLOBAL positions for ${allQueuedJobs.length} queued jobs`);
}
