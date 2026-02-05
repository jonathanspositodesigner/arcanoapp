import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
 import { createClient } from 'npm:@supabase/supabase-js@2';

/**
 * RUNNINGHUB QUEUE MANAGER - MULTI-API ARCHITECTURE
 * 
 * Função ÚNICA e CENTRALIZADA para gerenciar a fila global de todas as ferramentas de IA.
 * Suporta múltiplas contas RunningHub (1 a N) com balanceamento automático.
 * 
 * Arquitetura:
 * - Detecta automaticamente quais API keys estão configuradas
 * - Balanceia jobs entre contas disponíveis (3 slots por conta)
 * - Fila global FIFO quando todas as contas estão lotadas
 * 
 * Endpoints:
 * - /check - Verifica disponibilidade global e retorna conta disponível
 * - /process-next - Processa o próximo job da fila global
 * - /status - Retorna status completo com breakdown por conta
 * - /enqueue - Adiciona job à fila global
 * - /cancel-session - Cancela jobs de uma sessão
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// =====================================================
// CONFIGURAÇÃO MULTI-API
// =====================================================
const SLOTS_PER_ACCOUNT = 3;

// Estrutura de conta de API
interface ApiAccount {
  name: string;        // 'primary', 'account_2', 'account_3', etc.
  apiKey: string;
  maxSlots: number;
}

/**
 * Detecta automaticamente quais contas RunningHub estão configuradas
 * Retorna array de contas disponíveis em ordem de prioridade
 */
function getAvailableApiAccounts(): ApiAccount[] {
  const accounts: ApiAccount[] = [];
  
  // Conta 1 - Primary (obrigatória)
  const key1 = (Deno.env.get('RUNNINGHUB_API_KEY') || '').trim();
  if (key1) {
    accounts.push({
      name: 'primary',
      apiKey: key1,
      maxSlots: SLOTS_PER_ACCOUNT,
    });
  }
  
  // Conta 2
  const key2 = (Deno.env.get('RUNNINGHUB_API_KEY_2') || '').trim();
  if (key2) {
    accounts.push({
      name: 'account_2',
      apiKey: key2,
      maxSlots: SLOTS_PER_ACCOUNT,
    });
  }
  
  // Conta 3
  const key3 = (Deno.env.get('RUNNINGHUB_API_KEY_3') || '').trim();
  if (key3) {
    accounts.push({
      name: 'account_3',
      apiKey: key3,
      maxSlots: SLOTS_PER_ACCOUNT,
    });
  }
  
  // Conta 4
  const key4 = (Deno.env.get('RUNNINGHUB_API_KEY_4') || '').trim();
  if (key4) {
    accounts.push({
      name: 'account_4',
      apiKey: key4,
      maxSlots: SLOTS_PER_ACCOUNT,
    });
  }
  
  // Conta 5
  const key5 = (Deno.env.get('RUNNINGHUB_API_KEY_5') || '').trim();
  if (key5) {
    accounts.push({
      name: 'account_5',
      apiKey: key5,
      maxSlots: SLOTS_PER_ACCOUNT,
    });
  }
  
  console.log(`[QueueManager] Detected ${accounts.length} API account(s): ${accounts.map(a => a.name).join(', ')}`);
  return accounts;
}

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
      case 'cancel-session':
        return await handleCancelSession(req);
       case 'check-user-active':
         return await handleCheckUserActive(req);
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
 * Conta jobs em execução POR CONTA em TODAS as tabelas
 */
async function getRunningCountByAccount(accountName: string): Promise<number> {
  let total = 0;
  
  for (const table of JOB_TABLES) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .eq('status', 'running')
      .eq('api_account', accountName);
    
    if (error) {
      console.error(`[QueueManager] Error counting ${table} for ${accountName}:`, error);
    } else {
      total += count || 0;
    }
  }
  
  return total;
}

/**
 * Conta TOTAL de jobs em execução em TODAS as tabelas e contas
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
  
  return total;
}

/**
 * Encontra uma conta com slot disponível
 * Retorna a conta ou null se todas estiverem lotadas
 */
async function getAccountWithAvailableSlot(): Promise<ApiAccount | null> {
  const accounts = getAvailableApiAccounts();
  
  for (const account of accounts) {
    const runningCount = await getRunningCountByAccount(account.name);
    console.log(`[QueueManager] Account ${account.name}: ${runningCount}/${account.maxSlots} slots used`);
    
    if (runningCount < account.maxSlots) {
      return account;
    }
  }
  
  return null;
}

/**
 * Retorna estatísticas detalhadas por conta
 */
async function getAccountsStats(): Promise<Array<{
  name: string;
  running: number;
  maxSlots: number;
  available: number;
}>> {
  const accounts = getAvailableApiAccounts();
  const stats = [];
  
  for (const account of accounts) {
    const running = await getRunningCountByAccount(account.name);
    stats.push({
      name: account.name,
      running,
      maxSlots: account.maxSlots,
      available: Math.max(0, account.maxSlots - running),
    });
  }
  
  return stats;
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
 * /check - Verifica disponibilidade e retorna conta com slot livre
 */
async function handleCheck(req: Request): Promise<Response> {
  const accounts = getAvailableApiAccounts();
  const totalMaxSlots = accounts.reduce((sum, acc) => sum + acc.maxSlots, 0);
  const globalRunning = await getGlobalRunningCount();
  
  // Encontrar conta com slot disponível
  const availableAccount = await getAccountWithAvailableSlot();
  
  return new Response(JSON.stringify({
    available: availableAccount !== null,
    running: globalRunning,
    maxConcurrent: totalMaxSlots,
    slotsAvailable: totalMaxSlots - globalRunning,
    // Informações da conta disponível (para uso pelas Edge Functions)
    accountName: availableAccount?.name || null,
    accountApiKey: availableAccount?.apiKey || null,
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * /enqueue - Adiciona job à fila e retorna posição GLOBAL
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
 * /cancel-session - Cancela todos os jobs QUEUED de uma sessão
 */
async function handleCancelSession(req: Request): Promise<Response> {
  try {
    const { sessionId, userId } = await req.json();
    
    if (!sessionId && !userId) {
      return new Response(JSON.stringify({ error: 'sessionId or userId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    let totalCancelled = 0;
    const cancelledJobs: { table: string; id: string }[] = [];
    
    for (const table of JOB_TABLES) {
      let query = supabase
        .from(table)
        .select('id, user_id, user_credit_cost')
        .eq('status', 'queued');
      
      if (sessionId) {
        query = query.eq('session_id', sessionId);
      } else if (userId) {
        query = query.eq('user_id', userId);
      }
      
      const { data: queuedJobs, error } = await query;
      
      if (error || !queuedJobs || queuedJobs.length === 0) continue;
      
      for (const job of queuedJobs) {
        await supabase
          .from(table)
          .update({
            status: 'cancelled',
            error_message: 'User left page while in queue',
            completed_at: new Date().toISOString(),
          })
          .eq('id', job.id);
        
        // Devolver créditos se foram consumidos
        if (job.user_credit_cost && job.user_id) {
          try {
            await supabase.rpc('refund_upscaler_credits', {
              _user_id: job.user_id,
              _amount: job.user_credit_cost,
              _description: 'Refund: cancelled while in queue'
            });
            console.log(`[QueueManager] Refunded ${job.user_credit_cost} credits to ${job.user_id}`);
          } catch (refundError) {
            console.error(`[QueueManager] Failed to refund credits:`, refundError);
          }
        }
        
        cancelledJobs.push({ table, id: job.id });
        totalCancelled++;
      }
    }
    
    console.log(`[QueueManager] Cancelled ${totalCancelled} queued jobs for session ${sessionId || userId}`);
    
    // Atualizar posições da fila global
    if (totalCancelled > 0) {
      await updateAllQueuePositions();
    }
    
    return new Response(JSON.stringify({
      success: true,
      cancelledCount: totalCancelled,
      cancelledJobs,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('[QueueManager] Cancel session error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

/**
 * /status - Retorna status completo da fila global com breakdown por conta
 */
async function handleStatus(): Promise<Response> {
  const accounts = getAvailableApiAccounts();
  const accountsStats = await getAccountsStats();
  const queuedCounts = await getQueuedCounts();
  const totalQueued = Object.values(queuedCounts).reduce((a, b) => a + b, 0);
  const totalMaxSlots = accounts.reduce((sum, acc) => sum + acc.maxSlots, 0);
  const totalRunning = accountsStats.reduce((sum, acc) => sum + acc.running, 0);
  
  return new Response(JSON.stringify({
    // Totais globais
    totalMaxSlots,
    totalRunning,
    totalSlotsAvailable: totalMaxSlots - totalRunning,
    totalQueued,
    // Breakdown por conta
    accounts: accountsStats,
    // Breakdown por ferramenta (fila)
    queuedByTool: queuedCounts,
    // Compatibilidade com código antigo
    running: totalRunning,
    maxConcurrent: totalMaxSlots,
    slotsAvailable: totalMaxSlots - totalRunning,
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * /process-next - Processa o próximo job na fila global (FIFO cross-tool)
 * Chamado pelos webhooks quando um job termina
 */
async function handleProcessNext(): Promise<Response> {
  // Verificar se há conta com slot disponível
  const availableAccount = await getAccountWithAvailableSlot();
  
  if (!availableAccount) {
    console.log('[QueueManager] No slots available in any account');
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
  
  console.log(`[QueueManager] Processing next job from ${oldestJob.table}: ${oldestJob.job.id} using account ${availableAccount.name}`);
  
  // Calcular tempo de espera na fila
  const queueWaitSeconds = Math.round(
    (Date.now() - new Date(oldestJob.job.created_at).getTime()) / 1000
  );
  
  // Marcar como running e associar à conta
  await supabase
    .from(oldestJob.table)
    .update({
      status: 'running',
      started_at: new Date().toISOString(),
      position: 0,
      queue_wait_seconds: queueWaitSeconds,
      api_account: availableAccount.name,
    })
    .eq('id', oldestJob.job.id);
  
  // Iniciar processamento no RunningHub com a API key da conta disponível
  const result = await startJobOnRunningHub(
    oldestJob.table, 
    oldestJob.job, 
    availableAccount
  );
  
  // Atualizar posições das filas
  await updateAllQueuePositions();
  
  return new Response(JSON.stringify({
    processed: true,
    table: oldestJob.table,
    jobId: oldestJob.job.id,
    taskId: result.taskId,
    queueWaitSeconds,
    accountUsed: availableAccount.name,
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Inicia um job no RunningHub baseado no tipo de ferramenta
 * AGORA RECEBE A CONTA (com API key) A SER USADA
 */
async function startJobOnRunningHub(
  table: JobTable, 
  job: any,
  account: ApiAccount
): Promise<{ taskId: string | null }> {
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
      const videoWebhookUrl = `${SUPABASE_URL}/functions/v1/runninghub-video-upscaler-webhook`;
      nodeInfoList = [
        { nodeId: "3", fieldName: "video", fieldValue: job.input_file_name },
      ];
      return await callRunningHubApi(webappId, nodeInfoList, videoWebhookUrl, table, job.id, account);
      
    default:
      console.error(`[QueueManager] Unknown table: ${table}`);
      return { taskId: null };
  }
  
  return await callRunningHubApi(webappId, nodeInfoList, webhookUrl, table, job.id, account);
}

/**
 * Chama a API do RunningHub COM A API KEY DA CONTA ESPECIFICADA
 */
async function callRunningHubApi(
  webappId: string,
  nodeInfoList: any[],
  webhookUrl: string,
  table: string,
  jobId: string,
  account: ApiAccount
): Promise<{ taskId: string | null }> {
  const requestBody = {
    nodeInfoList,
    instanceType: "default",
    usePersonalQueue: false,
    webhookUrl,
  };
  
  console.log(`[QueueManager] Calling RunningHub for ${table} using account ${account.name}:`, JSON.stringify(requestBody));
  
  try {
    const response = await fetch(`https://www.runninghub.ai/openapi/v2/run/ai-app/${webappId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${account.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });
    
    const data = await response.json();
    console.log(`[QueueManager] RunningHub response (account ${account.name}):`, JSON.stringify(data));
    
    if (data.taskId) {
      await supabase
        .from(table)
        .update({ 
          task_id: data.taskId,
          api_account: account.name,
        })
        .eq('id', jobId);
      
      console.log(`[QueueManager] Job ${jobId} started with taskId: ${data.taskId} on account ${account.name}`);
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
 */
async function updateAllQueuePositions(): Promise<void> {
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
 
 /**
  * /check-user-active - Verifica se o usuário tem algum job ativo em QUALQUER ferramenta
  */
 async function handleCheckUserActive(req: Request): Promise<Response> {
   try {
     const { userId } = await req.json();
     
     if (!userId) {
       return new Response(JSON.stringify({ error: 'userId is required' }), {
         status: 400,
         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
       });
     }
     
     // Mapeamento de tabela para nome amigável da ferramenta
     const toolNames: Record<JobTable, string> = {
       'upscaler_jobs': 'Upscaler Arcano',
       'video_upscaler_jobs': 'Video Upscaler',
       'pose_changer_jobs': 'Pose Changer',
       'veste_ai_jobs': 'Veste AI',
     };
     
     // Verificar em TODAS as tabelas de jobs
     for (const table of JOB_TABLES) {
       const { data, error } = await supabase
         .from(table)
         .select('id, status')
         .eq('user_id', userId)
         .in('status', ['running', 'queued'])
         .limit(1)
         .maybeSingle();
       
       if (error) {
         console.error(`[QueueManager] Error checking ${table}:`, error);
         continue;
       }
       
       if (data) {
         console.log(`[QueueManager] User ${userId} has active job in ${table}`);
         return new Response(JSON.stringify({
           hasActiveJob: true,
           activeTool: toolNames[table],
           activeJobId: data.id,
           activeStatus: data.status,
         }), {
           headers: { ...corsHeaders, 'Content-Type': 'application/json' },
         });
       }
     }
     
     // Nenhum job ativo encontrado
     return new Response(JSON.stringify({
       hasActiveJob: false,
       activeTool: null,
     }), {
       headers: { ...corsHeaders, 'Content-Type': 'application/json' },
     });
     
   } catch (error) {
     console.error('[QueueManager] CheckUserActive error:', error);
     return new Response(JSON.stringify({ 
       error: error instanceof Error ? error.message : 'Unknown error' 
     }), {
       status: 500,
       headers: { ...corsHeaders, 'Content-Type': 'application/json' },
     });
   }
 }
