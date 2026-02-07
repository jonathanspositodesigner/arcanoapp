import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'npm:@supabase/supabase-js@2';

/**
 * RUNNINGHUB QUEUE MANAGER - CENTRALIZED JOB ORCHESTRATOR
 * 
 * Função ÚNICA e CENTRALIZADA para gerenciar a fila global de todas as ferramentas de IA.
 * 
 * REGRAS:
 * 1. Máximo 3 jobs simultâneos GLOBAL (STARTING ou RUNNING)
 * 2. Fila FIFO global quando exceder 3
 * 3. 1 job ativo por usuário (QUEUED/STARTING/RUNNING)
 * 4. Erro = terminal + reembolso obrigatório
 * 5. Reembolso idempotente (credits_charged + credits_refunded)
 * 
 * Endpoints:
 * - /check - Verifica disponibilidade global
 * - /check-user-active - Verifica se usuário tem job ativo
 * - /process-next - Processa próximo job da fila global
 * - /finish - Finaliza job (chamado pelos webhooks)
 * - /cancel-session - Cancela jobs de uma sessão
 * - /status - Status completo da fila
 * - /enqueue - Adiciona job à fila
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// LIMITE GLOBAL FIXO: 3 jobs simultâneos
const GLOBAL_MAX_CONCURRENT = 3;
const SLOTS_PER_ACCOUNT = 3;

interface ApiAccount {
  name: string;
  apiKey: string;
  maxSlots: number;
}

const WEBAPP_IDS = {
  upscaler_jobs: {
    pro: '2015865378030755841',
    standard: '2017030861371219969',
    longe: '2017343414227963905',
    fotoAntiga: '2018913880214343681',
    comida: '2015855359243587585',
    logo: '2019239272464785409',
    render3d: '2019234965992509442',
  },
  pose_changer_jobs: '2018451429635133442',
  veste_ai_jobs: '2018755100210106369',
  video_upscaler_jobs: '2018810750139109378',
};

const JOB_TABLES = ['upscaler_jobs', 'pose_changer_jobs', 'veste_ai_jobs', 'video_upscaler_jobs'] as const;
type JobTable = typeof JOB_TABLES[number];

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ==================== NOTIFICATION HELPERS ====================

const TOOL_CONFIG: Record<JobTable, { name: string; url: string; emoji: string }> = {
  upscaler_jobs: { name: 'Upscaler Arcano', url: '/upscaler-arcano-tool', emoji: '✨' },
  pose_changer_jobs: { name: 'Pose Changer', url: '/pose-changer-tool', emoji: '🎨' },
  veste_ai_jobs: { name: 'Veste AI', url: '/veste-ai-tool', emoji: '👕' },
  video_upscaler_jobs: { name: 'Video Upscaler', url: '/video-upscaler-tool', emoji: '🎬' },
};

/**
 * sendJobCompletionNotification - Envia notificação push quando job completa
 * Cria token temporário (15 min TTL) e envia push para todos os dispositivos do usuário
 */
async function sendJobCompletionNotification(
  table: JobTable,
  jobId: string,
  userId: string
): Promise<void> {
  try {
    // Verificar se usuário tem push subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('user_id', userId);
    
    if (subError || !subscriptions || subscriptions.length === 0) {
      console.log(`[QueueManager] No push subscriptions for user ${userId}`);
      return;
    }
    
    console.log(`[QueueManager] User ${userId} has ${subscriptions.length} push subscriptions`);
    
    // Gerar token temporário (15 minutos)
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    
    // Salvar token
    const { error: tokenError } = await supabase.from('job_notification_tokens').insert({
      token,
      table_name: table,
      job_id: jobId,
      user_id: userId,
      expires_at: expiresAt.toISOString()
    });
    
    if (tokenError) {
      console.error('[QueueManager] Failed to create notification token:', tokenError);
      return;
    }
    
    // Limpar tokens expirados do usuário (housekeeping)
    await supabase
      .from('job_notification_tokens')
      .delete()
      .eq('user_id', userId)
      .lt('expires_at', new Date().toISOString());
    
    // Preparar URL com token
    const config = TOOL_CONFIG[table];
    const notificationUrl = `${config.url}?nt=${token}`;
    
    // Enviar notificação via Edge Function existente
    const notificationPayload = {
      title: config.name,
      body: `${config.emoji} Seu resultado ficou pronto! Toque para ver.`,
      url: notificationUrl,
    };
    
    console.log(`[QueueManager] Sending push notification for job ${jobId}:`, notificationPayload);
    
    // Usar a Edge Function send-push-notification modificada para enviar apenas para este usuário
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-push-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({
        ...notificationPayload,
        user_id: userId, // Novo parâmetro para filtrar por usuário
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[QueueManager] Push notification failed:', errorText);
    } else {
      const result = await response.json();
      console.log(`[QueueManager] Push notification sent:`, result);
    }
    
  } catch (e) {
    console.error('[QueueManager] sendJobCompletionNotification error:', e);
  }
}

// ==================== OBSERVABILITY HELPER ====================

/**
 * logStep - Registra uma etapa do job para observabilidade
 * Atualiza current_step e adiciona ao step_history
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
    // Buscar step_history atual
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
    
    console.log(`[${table}] Job ${jobId}: ${step}`, details || '');
  } catch (e) {
    console.error(`[logStep] Error logging step for ${table}/${jobId}:`, e);
  }
}

/**
 * logStepFailure - Registra falha em uma etapa específica
 */
async function logStepFailure(
  table: string,
  jobId: string,
  failedAtStep: string,
  errorMessage: string,
  rawResponse?: Record<string, any>
): Promise<void> {
  const timestamp = new Date().toISOString();
  const entry = { step: 'failed', timestamp, at_step: failedAtStep, error: errorMessage };
  
  try {
    const { data: job } = await supabase
      .from(table)
      .select('step_history')
      .eq('id', jobId)
      .maybeSingle();
    
    const currentHistory = (job?.step_history as any[]) || [];
    const newHistory = [...currentHistory, entry];
    
    const updateData: Record<string, any> = {
      current_step: 'failed',
      failed_at_step: failedAtStep,
      step_history: newHistory,
    };
    
    if (rawResponse) {
      updateData.raw_api_response = rawResponse;
    }
    
    await supabase.from(table).update(updateData).eq('id', jobId);
    
    console.log(`[${table}] Job ${jobId}: FAILED at ${failedAtStep}:`, errorMessage);
  } catch (e) {
    console.error(`[logStepFailure] Error:`, e);
  }
}

// ==================== HELPERS ====================

function getAvailableApiAccounts(): ApiAccount[] {
  const accounts: ApiAccount[] = [];
  
  const key1 = (Deno.env.get('RUNNINGHUB_API_KEY') || '').trim();
  if (key1) accounts.push({ name: 'primary', apiKey: key1, maxSlots: SLOTS_PER_ACCOUNT });
  
  const key2 = (Deno.env.get('RUNNINGHUB_API_KEY_2') || '').trim();
  if (key2) accounts.push({ name: 'account_2', apiKey: key2, maxSlots: SLOTS_PER_ACCOUNT });
  
  const key3 = (Deno.env.get('RUNNINGHUB_API_KEY_3') || '').trim();
  if (key3) accounts.push({ name: 'account_3', apiKey: key3, maxSlots: SLOTS_PER_ACCOUNT });
  
  const key4 = (Deno.env.get('RUNNINGHUB_API_KEY_4') || '').trim();
  if (key4) accounts.push({ name: 'account_4', apiKey: key4, maxSlots: SLOTS_PER_ACCOUNT });
  
  const key5 = (Deno.env.get('RUNNINGHUB_API_KEY_5') || '').trim();
  if (key5) accounts.push({ name: 'account_5', apiKey: key5, maxSlots: SLOTS_PER_ACCOUNT });
  
  return accounts;
}

async function getRunningCountByAccount(accountName: string): Promise<number> {
  let total = 0;
  for (const table of JOB_TABLES) {
    const { count } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .in('status', ['running', 'starting'])
      .eq('api_account', accountName);
    total += count || 0;
  }
  return total;
}

async function getGlobalRunningCount(): Promise<number> {
  let total = 0;
  for (const table of JOB_TABLES) {
    const { count } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .in('status', ['running', 'starting']);
    total += count || 0;
  }
  return total;
}

async function getAccountWithAvailableSlot(): Promise<ApiAccount | null> {
  const accounts = getAvailableApiAccounts();
  for (const account of accounts) {
    const runningCount = await getRunningCountByAccount(account.name);
    if (runningCount < account.maxSlots) {
      return account;
    }
  }
  return null;
}

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

async function cleanupStaleJobs(): Promise<number> {
  try {
    console.log('[QueueManager] Running opportunistic cleanup...');
    const { data, error } = await supabase.rpc('cleanup_all_stale_ai_jobs');
    if (error) {
      console.error('[QueueManager] Cleanup error:', error);
      return 0;
    }
    let totalCancelled = 0;
    if (Array.isArray(data)) {
      for (const row of data) {
        totalCancelled += row.cancelled_count || 0;
      }
    }
    if (totalCancelled > 0) {
      console.log(`[QueueManager] Cleanup: ${totalCancelled} stale jobs cancelled`);
      await updateAllQueuePositions();
    }
    return totalCancelled;
  } catch (e) {
    console.error('[QueueManager] Cleanup exception:', e);
    return 0;
  }
}

async function updateAllQueuePositions(): Promise<void> {
  interface QueuedJob { id: string; created_at: string; table: JobTable; }
  const allQueuedJobs: QueuedJob[] = [];
  
  for (const table of JOB_TABLES) {
    const { data: jobs } = await supabase.from(table).select('id, created_at').eq('status', 'queued');
    if (jobs) {
      for (const job of jobs) {
        allQueuedJobs.push({ ...job, table });
      }
    }
  }
  
  allQueuedJobs.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  
  for (let i = 0; i < allQueuedJobs.length; i++) {
    const job = allQueuedJobs[i];
    await supabase.from(job.table).update({ position: i + 1 }).eq('id', job.id);
  }
  
  console.log(`[QueueManager] Updated GLOBAL positions for ${allQueuedJobs.length} queued jobs`);
}

async function refundCreditsIfNeeded(
  table: string,
  jobId: string,
  userId: string | null,
  creditCost: number | null,
  creditsCharged: boolean,
  creditsRefunded: boolean
): Promise<number> {
  // Só reembolsa se foi cobrado E ainda não foi reembolsado
  if (!creditsCharged || creditsRefunded || !creditCost || creditCost <= 0 || !userId) {
    return 0;
  }
  
  try {
    await supabase.rpc('refund_upscaler_credits', {
      _user_id: userId,
      _amount: creditCost,
      _description: 'Estorno automático: job falhou'
    });
    
    // Marcar como reembolsado
    await supabase.from(table).update({ credits_refunded: true }).eq('id', jobId);
    
    console.log(`[QueueManager] Refunded ${creditCost} credits to ${userId}`);
    return creditCost;
  } catch (error) {
    console.error('[QueueManager] Refund error:', error);
    return 0;
  }
}

// ==================== MAIN HANDLER ====================

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
        return await handleCheck();
      case 'check-user-active':
        return await handleCheckUserActive(req);
      case 'process-next':
        return await handleProcessNext();
      case 'finish':
        return await handleFinish(req);
      case 'status':
        return await handleStatus();
      case 'enqueue':
        return await handleEnqueue(req);
      case 'cancel-session':
        return await handleCancelSession(req);
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

// ==================== ENDPOINT HANDLERS ====================

async function handleCheck(): Promise<Response> {
  await cleanupStaleJobs();
  
  const globalRunning = await getGlobalRunningCount();
  const totalQueued = await getTotalQueuedCount();
  const slotsAvailable = Math.max(0, GLOBAL_MAX_CONCURRENT - globalRunning);
  
  // Se tem slots E não tem fila, pode iniciar imediatamente
  const mustQueue = globalRunning >= GLOBAL_MAX_CONCURRENT || totalQueued > 0;
  const availableAccount = await getAccountWithAvailableSlot();
  
  console.log(`[QueueManager] /check: running=${globalRunning}, queued=${totalQueued}, mustQueue=${mustQueue}`);
  
  return new Response(JSON.stringify({
    available: !mustQueue && availableAccount !== null,
    running: globalRunning,
    maxConcurrent: GLOBAL_MAX_CONCURRENT,
    slotsAvailable,
    totalQueued,
    accountName: availableAccount?.name || null,
    accountApiKey: availableAccount?.apiKey || null,
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function handleCheckUserActive(req: Request): Promise<Response> {
  try {
    await cleanupStaleJobs();
    
    const { userId } = await req.json();
    
    if (!userId) {
      return new Response(JSON.stringify({ error: 'userId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const toolNames: Record<JobTable, string> = {
      'upscaler_jobs': 'Upscaler Arcano',
      'video_upscaler_jobs': 'Video Upscaler',
      'pose_changer_jobs': 'Pose Changer',
      'veste_ai_jobs': 'Veste AI',
    };
    
    // Verificar em TODAS as tabelas - incluir STARTING
    for (const table of JOB_TABLES) {
      const { data, error } = await supabase
        .from(table)
        .select('id, status')
        .eq('user_id', userId)
        .in('status', ['running', 'queued', 'starting'])
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

async function handleProcessNext(): Promise<Response> {
  await cleanupStaleJobs();
  
  const globalRunning = await getGlobalRunningCount();
  if (globalRunning >= GLOBAL_MAX_CONCURRENT) {
    console.log(`[QueueManager] Global limit reached: ${globalRunning}/${GLOBAL_MAX_CONCURRENT}`);
    return new Response(JSON.stringify({ processed: false, reason: 'Global limit reached' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  
  const availableAccount = await getAccountWithAvailableSlot();
  if (!availableAccount) {
    return new Response(JSON.stringify({ processed: false, reason: 'No slots available' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  
  // Buscar job mais antigo na fila (FIFO global)
  let oldestJob: { table: JobTable; job: any } | null = null;
  
  for (const table of JOB_TABLES) {
    const { data: job } = await supabase
      .from(table)
      .select('*')
      .eq('status', 'queued')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    
    if (!job) continue;
    
    if (!oldestJob || new Date(job.created_at) < new Date(oldestJob.job.created_at)) {
      oldestJob = { table, job };
    }
  }
  
  if (!oldestJob) {
    return new Response(JSON.stringify({ processed: false, reason: 'No queued jobs' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  
  console.log(`[QueueManager] Processing next job from ${oldestJob.table}: ${oldestJob.job.id}`);
  
  const queueWaitSeconds = Math.round(
    (Date.now() - new Date(oldestJob.job.created_at).getTime()) / 1000
  );
  
  // Marcar como STARTING (ocupa vaga)
  await supabase
    .from(oldestJob.table)
    .update({
      status: 'starting',
      current_step: 'starting',
      started_at: new Date().toISOString(),
      position: 0,
      queue_wait_seconds: queueWaitSeconds,
      api_account: availableAccount.name,
    })
    .eq('id', oldestJob.job.id);
  
  await logStep(oldestJob.table, oldestJob.job.id, 'starting', { 
    queueWaitSeconds, 
    accountName: availableAccount.name 
  });
  
  // Iniciar no RunningHub
  const result = await startJobOnRunningHub(oldestJob.table, oldestJob.job, availableAccount);
  
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

async function handleFinish(req: Request): Promise<Response> {
  try {
    const { table, jobId, status, outputUrl, errorMessage, taskId, rhCost, webhookPayload } = await req.json();
    
    if (!table || !jobId) {
      return new Response(JSON.stringify({ error: 'table and jobId are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log(`[QueueManager] /finish: ${table}/${jobId} status=${status}`);
    
    // Buscar dados do job
    const { data: job } = await supabase
      .from(table)
      .select('user_id, user_credit_cost, credits_charged, credits_refunded')
      .eq('id', jobId)
      .maybeSingle();
    
    if (!job) {
      return new Response(JSON.stringify({ error: 'Job not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const isFailure = status === 'failed' || status === 'cancelled';
    
    // Se falhou, reembolsar créditos (idempotente)
    let refundedAmount = 0;
    if (isFailure) {
      refundedAmount = await refundCreditsIfNeeded(
        table,
        jobId,
        job.user_id,
        job.user_credit_cost,
        job.credits_charged ?? false,
        job.credits_refunded ?? false
      );
    }
    
    // Atualizar job com campos de observabilidade
    const updateData: Record<string, any> = {
      status: status,
      completed_at: new Date().toISOString(),
      current_step: status,
    };
    
    if (outputUrl) updateData.output_url = outputUrl;
    if (errorMessage) {
      updateData.error_message = errorMessage;
      updateData.failed_at_step = 'webhook_received';
    }
    if (rhCost) updateData.rh_cost = rhCost;
    if (webhookPayload) updateData.raw_webhook_payload = webhookPayload;
    
    await supabase.from(table).update(updateData).eq('id', jobId);
    
    // Log da etapa final
    await logStep(table, jobId, status, { 
      outputUrl: outputUrl ? 'received' : null, 
      error: errorMessage,
      refundedAmount 
    });
    
    // GERAR THUMBNAIL - apenas para jobs de imagem completados com sucesso
    if (status === 'completed' && outputUrl && table !== 'video_upscaler_jobs') {
      try {
        console.log(`[QueueManager] Triggering thumbnail generation for ${jobId}`);
        
        // Chamar Edge Function de thumbnail (fire-and-forget, não bloqueia)
        fetch(`${SUPABASE_URL}/functions/v1/generate-thumbnail`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` 
          },
          body: JSON.stringify({ 
            imageUrl: outputUrl, 
            jobId, 
            table,
            userId: job?.user_id || null
          })
        }).catch(e => console.error('[QueueManager] Thumbnail generation failed:', e));
        
      } catch (e) {
        // Não bloquear se falhar - thumbnail é nice-to-have
        console.error('[QueueManager] Error triggering thumbnail:', e);
      }
    }
    
    // ENVIAR NOTIFICAÇÃO PUSH - quando job completa com sucesso
    if (status === 'completed' && job?.user_id) {
      try {
        await sendJobCompletionNotification(table, jobId, job.user_id);
      } catch (e) {
        // Não bloquear se falhar - notificação é nice-to-have
        console.error('[QueueManager] Error sending push notification:', e);
      }
    }
    
    // Processar próximo da fila
    try {
      await handleProcessNext();
    } catch (e) {
      console.error('[QueueManager] Error processing next:', e);
    }
    
    return new Response(JSON.stringify({
      success: true,
      refundedAmount,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('[QueueManager] Finish error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

async function handleStatus(): Promise<Response> {
  const accounts = getAvailableApiAccounts();
  const accountsStats = [];
  
  for (const account of accounts) {
    const running = await getRunningCountByAccount(account.name);
    accountsStats.push({
      name: account.name,
      running,
      maxSlots: account.maxSlots,
      available: Math.max(0, account.maxSlots - running),
    });
  }
  
  const queuedCounts: Record<string, number> = {};
  for (const table of JOB_TABLES) {
    const { count } = await supabase.from(table).select('*', { count: 'exact', head: true }).eq('status', 'queued');
    queuedCounts[table] = count || 0;
  }
  
  const totalQueued = Object.values(queuedCounts).reduce((a, b) => a + b, 0);
  const totalRunning = accountsStats.reduce((sum, acc) => sum + acc.running, 0);
  
  return new Response(JSON.stringify({
    totalMaxSlots: GLOBAL_MAX_CONCURRENT,
    totalRunning,
    totalSlotsAvailable: Math.max(0, GLOBAL_MAX_CONCURRENT - totalRunning),
    totalQueued,
    accounts: accountsStats,
    queuedByTool: queuedCounts,
    running: totalRunning,
    maxConcurrent: GLOBAL_MAX_CONCURRENT,
    slotsAvailable: Math.max(0, GLOBAL_MAX_CONCURRENT - totalRunning),
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function handleEnqueue(req: Request): Promise<Response> {
  try {
    const { table, jobId, creditCost } = await req.json();
    
    if (!table || !jobId) {
      return new Response(JSON.stringify({ error: 'table and jobId are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const { data: job } = await supabase.from(table).select('created_at').eq('id', jobId).maybeSingle();
    
    if (!job) {
      return new Response(JSON.stringify({ error: 'Job not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Calcular posição global
    let position = 1;
    for (const t of JOB_TABLES) {
      const { count } = await supabase
        .from(t)
        .select('*', { count: 'exact', head: true })
        .eq('status', 'queued')
        .lt('created_at', job.created_at);
      position += count || 0;
    }
    
    const updateData: Record<string, any> = {
      status: 'queued',
      current_step: 'queued',
      position,
      waited_in_queue: true,
    };
    if (creditCost !== undefined) updateData.user_credit_cost = creditCost;
    
    await supabase.from(table).update(updateData).eq('id', jobId);
    await logStep(table, jobId, 'queued', { position });
    
    console.log(`[QueueManager] Job ${jobId} enqueued at position ${position}`);
    
    return new Response(JSON.stringify({
      success: true,
      queued: true,
      position,
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
        .select('id, user_id, user_credit_cost, credits_charged, credits_refunded')
        .eq('status', 'queued');
      
      if (sessionId) {
        query = query.eq('session_id', sessionId);
      } else if (userId) {
        query = query.eq('user_id', userId);
      }
      
      const { data: queuedJobs } = await query;
      if (!queuedJobs || queuedJobs.length === 0) continue;
      
      for (const job of queuedJobs) {
        // Reembolsar se necessário (idempotente)
        await refundCreditsIfNeeded(
          table,
          job.id,
          job.user_id,
          job.user_credit_cost,
          job.credits_charged ?? false,
          job.credits_refunded ?? false
        );
        
        await supabase
          .from(table)
          .update({
            status: 'cancelled',
            error_message: 'User left page while in queue',
            completed_at: new Date().toISOString(),
            credits_refunded: true,
          })
          .eq('id', job.id);
        
        cancelledJobs.push({ table, id: job.id });
        totalCancelled++;
      }
    }
    
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

// ==================== RUNNINGHUB INTEGRATION ====================

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
      // Determinar WebApp baseado na categoria e versão persistidas
      const category = job.category || 'pessoas_perto';
      const version = job.version || 'standard';
      const framingMode = job.framing_mode || 'perto';
      
      if (category === 'fotoAntiga') {
        webappId = WEBAPP_IDS.upscaler_jobs.fotoAntiga;
        nodeInfoList = [
          { nodeId: "139", fieldName: "image", fieldValue: job.input_url || job.input_file_name },
        ];
      } else if (category === 'comida') {
        webappId = WEBAPP_IDS.upscaler_jobs.comida;
        nodeInfoList = [
          { nodeId: "50", fieldName: "image", fieldValue: job.input_url || job.input_file_name },
        ];
        if (version === 'pro' && job.detail_denoise !== undefined) {
          nodeInfoList.push({ nodeId: "48", fieldName: "value", fieldValue: job.detail_denoise });
        }
      } else if (category === 'logo') {
        webappId = WEBAPP_IDS.upscaler_jobs.logo;
        nodeInfoList = [
          { nodeId: "39", fieldName: "image", fieldValue: job.input_url || job.input_file_name },
        ];
        if (version === 'pro' && job.detail_denoise !== undefined) {
          nodeInfoList.push({ nodeId: "33", fieldName: "value", fieldValue: job.detail_denoise });
        }
      } else if (category === 'render3d') {
        webappId = WEBAPP_IDS.upscaler_jobs.render3d;
        nodeInfoList = [
          { nodeId: "301", fieldName: "image", fieldValue: job.input_url || job.input_file_name },
        ];
        if (version === 'pro' && job.detail_denoise !== undefined) {
          nodeInfoList.push({ nodeId: "300", fieldName: "value", fieldValue: job.detail_denoise });
        }
      } else if (framingMode === 'longe') {
        webappId = WEBAPP_IDS.upscaler_jobs.longe;
        nodeInfoList = [
          { nodeId: "26", fieldName: "image", fieldValue: job.input_url || job.input_file_name },
        ];
        if (job.resolution) {
          const resValue = job.resolution === '4k' ? 4096 : 2048;
          nodeInfoList.push({ nodeId: "75", fieldName: "value", fieldValue: resValue });
        }
      } else {
        webappId = version === 'pro' ? WEBAPP_IDS.upscaler_jobs.pro : WEBAPP_IDS.upscaler_jobs.standard;
        const resNodeId = version === 'pro' ? '73' : '75';
        
        nodeInfoList = [
          { nodeId: "26", fieldName: "image", fieldValue: job.input_url || job.input_file_name },
        ];
        
        if (job.detail_denoise !== undefined) {
          nodeInfoList.push({ nodeId: "25", fieldName: "value", fieldValue: job.detail_denoise });
        }
        if (job.prompt) {
          nodeInfoList.push({ nodeId: "128", fieldName: "text", fieldValue: job.prompt });
        }
        if (job.resolution) {
          const resValue = job.resolution === '4k' ? 4096 : 2048;
          nodeInfoList.push({ nodeId: resNodeId, fieldName: "value", fieldValue: resValue });
        }
      }
      break;
      
    case 'pose_changer_jobs':
      webappId = WEBAPP_IDS.pose_changer_jobs;
      nodeInfoList = [
        { nodeId: "27", fieldName: "image", fieldValue: job.person_image_url || job.person_file_name },
        { nodeId: "60", fieldName: "image", fieldValue: job.reference_image_url || job.reference_file_name },
      ];
      break;
      
    case 'veste_ai_jobs':
      webappId = WEBAPP_IDS.veste_ai_jobs;
      nodeInfoList = [
        { nodeId: "41", fieldName: "image", fieldValue: job.person_image_url || job.person_file_name },
        { nodeId: "43", fieldName: "image", fieldValue: job.clothing_image_url || job.clothing_file_name },
      ];
      break;
      
    case 'video_upscaler_jobs':
      webappId = WEBAPP_IDS.video_upscaler_jobs;
      const videoWebhookUrl = `${SUPABASE_URL}/functions/v1/runninghub-video-upscaler-webhook`;
      nodeInfoList = [
        { nodeId: "3", fieldName: "video", fieldValue: job.video_url || job.input_file_name },
      ];
      return await callRunningHubApi(webappId, nodeInfoList, videoWebhookUrl, table, job.id, account);
      
    default:
      console.error(`[QueueManager] Unknown table: ${table}`);
      return { taskId: null };
  }
  
  return await callRunningHubApi(webappId, nodeInfoList, webhookUrl, table, job.id, account);
}

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
  
  console.log(`[QueueManager] Calling RunningHub (${account.name}):`, JSON.stringify(requestBody));
  
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
    console.log(`[QueueManager] RunningHub response:`, JSON.stringify(data));
    
    if (data.taskId) {
      await supabase
        .from(table)
        .update({ 
          task_id: data.taskId,
          api_account: account.name,
          status: 'running',
        })
        .eq('id', jobId);
      
      return { taskId: data.taskId };
    } else {
      const errorMsg = data.message || data.error || 'Failed to start job';
      
      // Buscar dados para reembolso
      const { data: job } = await supabase
        .from(table)
        .select('user_id, user_credit_cost, credits_charged, credits_refunded')
        .eq('id', jobId)
        .maybeSingle();
      
      if (job) {
        await refundCreditsIfNeeded(
          table, jobId, job.user_id, job.user_credit_cost,
          job.credits_charged ?? false, job.credits_refunded ?? false
        );
      }
      
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
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[QueueManager] Error calling RunningHub:`, error);
    
    const { data: job } = await supabase
      .from(table)
      .select('user_id, user_credit_cost, credits_charged, credits_refunded')
      .eq('id', jobId)
      .maybeSingle();
    
    if (job) {
      await refundCreditsIfNeeded(
        table, jobId, job.user_id, job.user_credit_cost,
        job.credits_charged ?? false, job.credits_refunded ?? false
      );
    }
    
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
