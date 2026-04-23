import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'npm:@supabase/supabase-js@2';
import { normalizeAIError } from "../_shared/error-normalizer.ts";

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

// LIMITE GLOBAL FIXO: 20 jobs simultâneos
const GLOBAL_MAX_CONCURRENT = 20;
const SLOTS_PER_ACCOUNT = 20;

interface ApiAccount {
  name: string;
  apiKey: string;
  maxSlots: number;
}

const WEBAPP_IDS = {
  upscaler_jobs: {
    pessoas_sem_rosto: '2037188547966406658',
    pessoas_com_rosto: '2037184937371115522',
    fotoAntiga: '2018913880214343681',
    comida: '2015855359243587585',
    logo: '2019239272464785409',
    render3d: '2019234965992509442',
  },
  pose_changer_jobs: '2018451429635133442',
  veste_ai_jobs: '2018755100210106369',
  video_upscaler_jobs: '2018810750139109378',
  arcano_cloner_jobs: '2019877042115842050',
  character_generator_jobs: '2020943778751713282',
  flyer_maker_jobs: '2025656642724962305',
  bg_remover_jobs: '2031815099811368962',
  image_generator_jobs: {
    standard: '2036803905421582337',
    cinema_studio: '2041980127348789250',
  },
  video_generator_jobs: {
    'veo3.1': '2037253069662068738',
    'veo3.1_text_only': '2037271484384681986',
    'wan2.2': '2037260767040380929',
    'wan2.2_text_only': '2037277392862973953',
  },
  movieled_maker_jobs: {
    'veo3.1': '2021398746331881473',
    'wan2.2': '2038686081360596993',
    'kling2.5': '2047044202881617921',
  },
};

// Tables that have the reference_prompt_id column for collaborator earnings
const TABLES_WITH_REFERENCE_PROMPT_ID = new Set([
  'arcano_cloner_jobs',
  'pose_changer_jobs',
  'veste_ai_jobs',
  'movieled_maker_jobs',
]);

const JOB_TABLES = ['upscaler_jobs', 'pose_changer_jobs', 'veste_ai_jobs', 'video_upscaler_jobs', 'arcano_cloner_jobs', 'character_generator_jobs', 'flyer_maker_jobs', 'bg_remover_jobs', 'image_generator_jobs', 'video_generator_jobs', 'movieled_maker_jobs'] as const;
type JobTable = typeof JOB_TABLES[number];

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ==================== NOTIFICATION HELPERS ====================

const TOOL_CONFIG: Record<JobTable, { name: string; url: string; emoji: string }> = {
  upscaler_jobs: { name: 'Upscaler Arcano', url: '/upscaler-arcano-tool', emoji: '✨' },
  pose_changer_jobs: { name: 'Pose Changer', url: '/pose-changer-tool', emoji: '🎨' },
  veste_ai_jobs: { name: 'Veste AI', url: '/veste-ai-tool', emoji: '👕' },
  video_upscaler_jobs: { name: 'Video Upscaler', url: '/video-upscaler-tool', emoji: '🎬' },
  arcano_cloner_jobs: { name: 'Arcano Cloner', url: '/arcano-cloner-tool', emoji: '👤' },
  character_generator_jobs: { name: 'Gerador Personagem', url: '/gerador-personagem', emoji: '🧑‍🎨' },
  flyer_maker_jobs: { name: 'Flyer Maker', url: '/flyer-maker', emoji: '🎭' },
  bg_remover_jobs: { name: 'Remover Fundo', url: '/remover-fundo', emoji: '🖼️' },
  image_generator_jobs: { name: 'Gerar Imagem', url: '/gerar-imagem', emoji: '🖌️' },
  video_generator_jobs: { name: 'Gerar Vídeo', url: '/gerar-video', emoji: '🎥' },
  movieled_maker_jobs: { name: 'MovieLed Maker', url: '/movieled-maker', emoji: '📺' },
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
    if (Array.isArray(data) && data.length > 0) {
      const row = data[0];
      // Sum all *_cancelled columns from the wide return type
      for (const [key, val] of Object.entries(row || {})) {
        if (key.endsWith('_cancelled') && typeof val === 'number') {
          totalCancelled += val;
        }
      }
    }
    if (totalCancelled > 0) {
      console.log(`[QueueManager] Cleanup: ${totalCancelled} stale jobs cancelled`);
      await updateAllQueuePositions();
    }
    
    // Cleanup de pending órfãos (> 30s, task_id = null)
    await cleanupOrphanPendingJobs();
    
    return totalCancelled;
  } catch (e) {
    console.error('[QueueManager] Cleanup exception:', e);
    return 0;
  }
}

/**
 * cleanupOrphanPendingJobs - Limpa jobs travados em 'pending' por mais de 30s
 * 
 * Critério seguro de limpeza:
 * - status = 'pending'
 * - task_id IS NULL (nunca iniciou no RunningHub)
 * - created_at < NOW() - 30 segundos
 * 
 * Jobs que atendem este critério NUNCA iniciaram processamento, então:
 * - Não têm créditos cobrados (credits_charged = false)
 * - Podem ser marcados como 'failed' com segurança
 */
async function cleanupOrphanPendingJobs(): Promise<number> {
  // Increased from 30s to 180s - 30s was too aggressive and killed legitimate jobs
  // that were still initializing (downloading images, uploading to RunningHub, etc.)
  const PENDING_TIMEOUT_SECONDS = 180;
  let totalCleaned = 0;
  
  try {
    for (const table of JOB_TABLES) {
      // Buscar pending órfãos - only truly orphaned jobs (no step_history progress)
      const { data: orphans, error } = await supabase
        .from(table)
        .select('id, created_at, user_id, step_history, current_step')
        .eq('status', 'pending')
        .is('task_id', null)
        .lt('created_at', new Date(Date.now() - PENDING_TIMEOUT_SECONDS * 1000).toISOString());
      
      if (error) {
        console.error(`[QueueManager] Error querying orphan pending jobs in ${table}:`, error);
        continue;
      }
      
      if (!orphans || orphans.length === 0) continue;
      
      console.log(`[QueueManager] Found ${orphans.length} orphan pending jobs in ${table}`);
      
      // Marcar como failed - but skip jobs that show signs of active processing
      for (const orphan of orphans) {
        // GUARD: Skip if job has step_history (means Edge Function started processing)
        const stepHistory = (orphan as any).step_history;
        const currentStep = (orphan as any).current_step;
        if (stepHistory && Array.isArray(stepHistory) && stepHistory.length > 0) {
          console.log(`[QueueManager] Skipping orphan ${orphan.id} - has ${stepHistory.length} step(s) in history, still processing`);
          continue;
        }
        // GUARD: Skip if current_step indicates active work
        if (currentStep && currentStep !== 'pending' && currentStep !== null) {
          console.log(`[QueueManager] Skipping orphan ${orphan.id} - current_step='${currentStep}', still processing`);
          continue;
        }
        
        const { error: updateError } = await supabase
          .from(table)
          .update({
            status: 'failed',
            error_message: 'Falha ao iniciar: servidor não respondeu em tempo hábil',
            current_step: 'failed',
            failed_at_step: 'pending_timeout',
            completed_at: new Date().toISOString(),
          })
          .eq('id', orphan.id)
          .eq('status', 'pending'); // Garantir que ainda está pending
        
        if (updateError) {
          console.error(`[QueueManager] Error marking orphan ${orphan.id} as failed:`, updateError);
        } else {
          totalCleaned++;
          console.log(`[QueueManager] Marked orphan pending job ${orphan.id} as failed`);
        }
      }
    }
    
    if (totalCleaned > 0) {
      console.log(`[QueueManager] Cleaned ${totalCleaned} orphan pending jobs total`);
    }
    
  } catch (e) {
    console.error('[QueueManager] cleanupOrphanPendingJobs exception:', e);
  }
  
  return totalCleaned;
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
      case 'run-or-queue':
        return await handleRunOrQueue(req);
      case 'retry':
        return await handleRetry(req);
      case 'reconcile':
        return await handleReconcile(req);
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
  // REMOVED: cleanupStaleJobs() - was causing heavy processing on high-traffic endpoint
  
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
    // REMOVED: cleanupStaleJobs() - was causing heavy processing on high-traffic endpoint
    
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
      'arcano_cloner_jobs': 'Arcano Cloner',
      'character_generator_jobs': 'Gerador Personagem',
      'flyer_maker_jobs': 'Flyer Maker',
      'bg_remover_jobs': 'Remover Fundo',
      'image_generator_jobs': 'Gerar Imagem',
      'video_generator_jobs': 'Gerar Vídeo',
      'movieled_maker_jobs': 'MovieLed Maker',
    };
    
    // Verificar em TODAS as tabelas - incluir STARTING e PENDING recente (< 35s)
    // CORREÇÃO: Incluir pending recente para evitar duplicados
    const PENDING_GRACE_PERIOD_SECONDS = 185; // Slightly above orphan timeout (180s)
    const pendingCutoff = new Date(Date.now() - PENDING_GRACE_PERIOD_SECONDS * 1000).toISOString();
    
    for (const table of JOB_TABLES) {
      // Primeiro: verificar jobs ativos (running, queued, starting)
      const { data: activeJob, error: activeError } = await supabase
        .from(table)
        .select('id, status')
        .eq('user_id', userId)
        .in('status', ['running', 'queued', 'starting'])
        .limit(1)
        .maybeSingle();
      
      if (activeError) {
        console.error(`[QueueManager] Error checking active jobs in ${table}:`, activeError);
        continue;
      }
      
      if (activeJob) {
        console.log(`[QueueManager] User ${userId} has active job in ${table}: ${activeJob.id}`);
        return new Response(JSON.stringify({
          hasActiveJob: true,
          activeTool: toolNames[table],
          activeJobId: activeJob.id,
          activeStatus: activeJob.status,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      // Segundo: verificar pending recente (< 35s, task_id null = ainda inicializando)
      // Isso impede duplicados durante a janela de inicialização
      const { data: pendingJob, error: pendingError } = await supabase
        .from(table)
        .select('id, status, created_at')
        .eq('user_id', userId)
        .eq('status', 'pending')
        .is('task_id', null)
        .gt('created_at', pendingCutoff)
        .limit(1)
        .maybeSingle();
      
      if (pendingError) {
        console.error(`[QueueManager] Error checking pending jobs in ${table}:`, pendingError);
        continue;
      }
      
      if (pendingJob) {
        console.log(`[QueueManager] User ${userId} has recent pending job in ${table}: ${pendingJob.id} (blocking duplicate)`);
        return new Response(JSON.stringify({
          hasActiveJob: true,
          activeTool: toolNames[table],
          activeJobId: pendingJob.id,
          activeStatus: 'pending (initializing)',
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
    
    // Stage 1: Fetch universal fields (schema-safe for ALL tables)
    const { data: job } = await supabase
      .from(table)
      .select('user_id, user_credit_cost, credits_charged, credits_refunded, status')
      .eq('id', jobId)
      .maybeSingle();
    
    // Stage 2: Conditionally fetch reference_prompt_id only for supported tables
    let referencePromptId: string | null = null;
    if (job && TABLES_WITH_REFERENCE_PROMPT_ID.has(table)) {
      try {
        const { data: promptData } = await supabase
          .from(table)
          .select('reference_prompt_id')
          .eq('id', jobId)
          .maybeSingle();
        referencePromptId = promptData?.reference_prompt_id || null;
        console.log(`[QueueManager] /finish: reference_prompt_id="${referencePromptId}" for ${table}/${jobId}`);
      } catch (e) {
        console.error(`[QueueManager] /finish: Error fetching reference_prompt_id:`, e);
      }
    }
    
    if (!job) {
      return new Response(JSON.stringify({ error: 'Job not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // IDEMPOTENCY: If job is already terminal, return success without side effects
    if (['completed', 'failed', 'cancelled'].includes(job.status)) {
      console.log(`[QueueManager] /finish: Job ${jobId} already terminal (${job.status}), skipping duplicate`);
      return new Response(JSON.stringify({ success: true, skipped: true, reason: 'already_terminal' }), {
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
    
    // Re-upload external output to Supabase storage for video tools (movieled, video_generator)
    // so URLs persist for 24h instead of expiring from external CDNs
    let finalOutputUrl = outputUrl;
    if (status === 'completed' && outputUrl && (table === 'movieled_maker_jobs' || table === 'video_generator_jobs')) {
      try {
        const isExternalUrl = !outputUrl.includes('supabase.co/storage');
        if (isExternalUrl) {
          console.log(`[QueueManager] Re-uploading external output for ${table}/${jobId}`);
          const videoRes = await fetch(outputUrl);
          if (videoRes.ok) {
            const videoBlob = await videoRes.blob();
            const folder = table === 'movieled_maker_jobs' ? 'movieled' : 'video-generator';
            const storagePath = `${folder}/${job.user_id}/${jobId}.mp4`;
            const { error: uploadErr } = await supabase.storage
              .from('artes-cloudinary')
              .upload(storagePath, videoBlob, { contentType: 'video/mp4', upsert: true });
            if (!uploadErr) {
              const { data: publicData } = supabase.storage
                .from('artes-cloudinary')
                .getPublicUrl(storagePath);
              finalOutputUrl = publicData.publicUrl;
              console.log(`[QueueManager] Re-uploaded to storage: ${storagePath}`);
            } else {
              console.error(`[QueueManager] Storage upload error:`, uploadErr.message);
            }
          } else {
            console.error(`[QueueManager] Failed to download external output: HTTP ${videoRes.status}`);
          }
        }
      } catch (reuploadErr) {
        console.error(`[QueueManager] Re-upload failed (keeping original URL):`, reuploadErr);
      }
    }
    
    if (finalOutputUrl) updateData.output_url = finalOutputUrl;
    if (errorMessage) {
      updateData.error_message = normalizeAIError(errorMessage).message;
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
    
    // COLLABORATOR TOOL EARNINGS - Register earning if job used a partner prompt as reference
    if (status === 'completed' && referencePromptId && job?.user_id) {
      try {
        console.log(`[QueueManager] /finish: Registering tool earning for prompt ${referencePromptId} on ${table}`);
        const { data: earningResult } = await supabase.rpc('register_collaborator_tool_earning', {
          _job_id: jobId,
          _tool_table: table,
          _prompt_id: referencePromptId,
          _user_id: job.user_id,
        });
        console.log(`[QueueManager] /finish: Tool earning result:`, earningResult);
      } catch (e) {
        // Non-blocking - earning registration is best-effort
        console.error('[QueueManager] /finish: Error registering tool earning:', e);
      }
    }
    
    // Processar próximo da fila (async, don't block response)
    // Use fire-and-forget pattern to reduce webhook response time
    const processNextUrl = `${SUPABASE_URL}/functions/v1/runninghub-queue-manager/process-next`;
    fetch(processNextUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({}),
    }).catch(e => console.error('[QueueManager] Error triggering process-next:', e));
    
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

// ==================== RECONCILE ====================
// Queries RunningHub for the actual task status before the frontend kills a job
async function handleReconcile(req: Request): Promise<Response> {
  try {
    const { table, jobId } = await req.json();
    
    if (!table || !jobId) {
      return new Response(JSON.stringify({ error: 'table and jobId required', resolved: false }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log(`[QueueManager] /reconcile: ${table}/${jobId}`);
    
    // Get job's task_id and current status
    const { data: job } = await supabase
      .from(table)
      .select('task_id, status, api_account')
      .eq('id', jobId)
      .maybeSingle();
    
    if (!job || !job.task_id) {
      return new Response(JSON.stringify({ resolved: false, reason: 'no_task_id' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Already terminal - nothing to do
    if (['completed', 'failed', 'cancelled'].includes(job.status)) {
      return new Response(JSON.stringify({ resolved: true, status: job.status }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Get the API key for this account
    const accounts = getAvailableApiAccounts();
    const account = accounts.find(a => a.name === job.api_account) || accounts[0];
    if (!account) {
      return new Response(JSON.stringify({ resolved: false, reason: 'no_api_key' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Query RunningHub for task status
    const statusResponse = await fetch('https://www.runninghub.ai/task/openapi/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: account.apiKey, taskId: job.task_id }),
    });
    
    const statusData = await statusResponse.json();
    console.log(`[QueueManager] Reconcile status for ${job.task_id}:`, JSON.stringify(statusData));
    
    if (statusData.code !== 0) {
      return new Response(JSON.stringify({ resolved: false, reason: 'api_error', details: statusData }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const taskStatus = statusData.data?.status || statusData.data?.taskStatus;
    
    // If task completed successfully, extract output and finish
    if (taskStatus === 'SUCCESS' || taskStatus === 'COMPLETED') {
      const results = statusData.data?.outputFileList || statusData.data?.results || [];
      let outputUrl: string | null = null;
      
      if (Array.isArray(results) && results.length > 0) {
        const videoResult = results.find((r: any) => ['mp4', 'webm', 'mov'].includes(r.outputType || r.fileType));
        const imageResult = results.find((r: any) => ['png', 'jpg', 'jpeg', 'webp'].includes(r.outputType || r.fileType));
        outputUrl = videoResult?.fileUrl || videoResult?.url || imageResult?.fileUrl || imageResult?.url || results[0]?.fileUrl || results[0]?.url || null;
      }
      
      if (outputUrl) {
        console.log(`[QueueManager] Reconcile: task ${job.task_id} completed with output!`);
        
        // Delegate to /finish to handle all side effects
        const finishUrl = `${SUPABASE_URL}/functions/v1/runninghub-queue-manager/finish`;
        await fetch(finishUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
          body: JSON.stringify({ table, jobId, status: 'completed', outputUrl, taskId: job.task_id }),
        });
        
        await logStep(table, jobId, 'reconciled_completed', { taskId: job.task_id, outputUrl: 'found' });
        
        return new Response(JSON.stringify({ resolved: true, status: 'completed' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }
    
    // If task failed on provider side
    if (taskStatus === 'FAILED' || taskStatus === 'ERROR') {
      const rawErrorMsg = statusData.data?.errorMessage || statusData.data?.failedReason?.exception_message || 'Provider task failed';
      const errorMsg = normalizeAIError(rawErrorMsg).message;
      
      const finishUrl = `${SUPABASE_URL}/functions/v1/runninghub-queue-manager/finish`;
      await fetch(finishUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
        body: JSON.stringify({ table, jobId, status: 'failed', errorMessage: errorMsg, taskId: job.task_id }),
      });
      
      await logStep(table, jobId, 'reconciled_failed', { taskId: job.task_id, error: errorMsg });
      
      return new Response(JSON.stringify({ resolved: true, status: 'failed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Task still running on provider - DON'T kill it
    console.log(`[QueueManager] Reconcile: task ${job.task_id} still ${taskStatus} on provider`);
    return new Response(JSON.stringify({ resolved: false, reason: 'still_running', providerStatus: taskStatus }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('[QueueManager] Reconcile error:', error);
    return new Response(JSON.stringify({ resolved: false, error: error instanceof Error ? error.message : 'Unknown' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
    // REMOVED: cleanupStaleJobs() - moved to less frequent endpoints only
    
    
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

// ==================== RUN-OR-QUEUE (CENTRALIZED DECISION) ====================

/**
 * handleRunOrQueue - Endpoint único para decidir se um job roda imediatamente ou entra na fila.
 * 
 * REGRA CRÍTICA: O job chega aqui com status='pending', portanto NÃO se conta
 * como running/starting. Isso elimina o bug de auto-contagem.
 * 
 * Lógica:
 * - Se running < 3 E fila vazia E conta disponível → marca starting, executa no RunningHub
 * - Senão → enfileira com posição FIFO global
 */
async function handleRunOrQueue(req: Request): Promise<Response> {
  try {
    const { table, jobId } = await req.json();
    
    if (!table || !jobId || !JOB_TABLES.includes(table as JobTable)) {
      return new Response(JSON.stringify({ error: 'Valid table and jobId are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log(`[QueueManager] /run-or-queue: table=${table}, jobId=${jobId}`);

    const { data: currentJob, error: currentJobError } = await supabase
      .from(table)
      .select('id, user_id, status, task_id, created_at')
      .eq('id', jobId)
      .maybeSingle();

    if (currentJobError || !currentJob) {
      return new Response(JSON.stringify({ error: 'Job not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (['queued', 'starting', 'running', 'completed'].includes(currentJob.status)) {
      console.log(`[QueueManager] run-or-queue idempotent skip for ${jobId} (${currentJob.status})`);
      return new Response(JSON.stringify({
        success: true,
        queued: currentJob.status === 'queued',
        taskId: currentJob.task_id,
        status: currentJob.status,
        duplicate: true,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (currentJob.user_id) {
      const pendingCutoff = new Date(Date.now() - 185 * 1000).toISOString();
      const { data: conflictingJob } = await supabase
        .from(table)
        .select('id, status, task_id, created_at')
        .eq('user_id', currentJob.user_id)
        .neq('id', jobId)
        .or(`status.in.(queued,starting,running),and(status.eq.pending,task_id.is.null,created_at.gt.${pendingCutoff})`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (conflictingJob) {
        await supabase
          .from(table)
          .update({
            status: 'failed',
            current_step: 'failed',
            failed_at_step: 'duplicate_guard',
            error_message: `DUPLICATE_REQUEST_BLOCKED: active job ${conflictingJob.id} (${conflictingJob.status})`,
            completed_at: new Date().toISOString(),
          })
          .eq('id', jobId)
          .eq('status', 'pending');

        console.log(`[QueueManager] duplicate blocked for user ${currentJob.user_id}: ${jobId} -> active ${conflictingJob.id}`);
        return new Response(JSON.stringify({
          success: false,
          error: 'User already has an active Arcano Cloner job',
          code: 'DUPLICATE_ACTIVE_JOB',
          activeJobId: conflictingJob.id,
          activeStatus: conflictingJob.status,
        }), {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }
    
    // Limpeza oportunística
    await cleanupStaleJobs();
    
    // Job está 'pending' - NÃO conta como running/starting
    const globalRunning = await getGlobalRunningCount();
    const totalQueued = await getTotalQueuedCount();
    
    console.log(`[QueueManager] run-or-queue: running=${globalRunning}, queued=${totalQueued}, max=${GLOBAL_MAX_CONCURRENT}`);
    
    // Pode iniciar imediatamente se: running < 20 E fila vazia E conta disponível
    if (globalRunning < GLOBAL_MAX_CONCURRENT && totalQueued === 0) {
      const availableAccount = await getAccountWithAvailableSlot();
      if (availableAccount) {
        // Buscar dados completos do job
        const { data: job, error: jobError } = await supabase
          .from(table)
          .select('*')
          .eq('id', jobId)
          .maybeSingle();
        
        if (jobError || !job) {
          return new Response(JSON.stringify({ error: 'Job not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        // Marcar como STARTING agora (ocupa vaga)
        const { data: claimedRows } = await supabase
          .from(table)
          .update({
            status: 'starting',
            current_step: 'starting',
            started_at: new Date().toISOString(),
            position: 0,
            waited_in_queue: false,
            api_account: availableAccount.name,
          })
          .eq('id', jobId)
          .eq('status', 'pending')
          .select('id');

        if (!claimedRows || claimedRows.length === 0) {
          console.log(`[QueueManager] Job ${jobId} was already claimed by another request, skipping duplicate start`);
          return new Response(JSON.stringify({
            success: true,
            duplicate: true,
            status: 'starting',
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        await logStep(table, jobId, 'starting', { accountName: availableAccount.name, via: 'run-or-queue' });
        
        // Executar no RunningHub (caminho único)
        const result = await startJobOnRunningHub(table as JobTable, job, availableAccount);
        
        if (result.taskId) {
          return new Response(JSON.stringify({
            success: true,
            taskId: result.taskId,
            accountUsed: availableAccount.name,
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        // Falha ao iniciar - reembolso já feito por callRunningHubApi
        return new Response(JSON.stringify({
          success: false,
          error: 'Failed to start job on RunningHub',
          refunded: true,
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }
    
    // Enfileirar (FIFO global)
    const { data: job } = await supabase.from(table).select('created_at').eq('id', jobId).maybeSingle();
    
    if (!job) {
      return new Response(JSON.stringify({ error: 'Job not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Calcular posição global FIFO
    let position = 1;
    for (const t of JOB_TABLES) {
      const { count } = await supabase
        .from(t)
        .select('*', { count: 'exact', head: true })
        .eq('status', 'queued')
        .lt('created_at', job.created_at);
      position += count || 0;
    }
    
    await supabase.from(table).update({
      status: 'queued',
      current_step: 'queued',
      position,
      waited_in_queue: true,
    }).eq('id', jobId);
    
    await logStep(table, jobId, 'queued', { position, via: 'run-or-queue' });
    
    console.log(`[QueueManager] Job ${jobId} enqueued at position ${position} (via run-or-queue)`);
    
    return new Response(JSON.stringify({
      success: true,
      queued: true,
      position,
      totalQueued: await getTotalQueuedCount(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('[QueueManager] run-or-queue error:', error);
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
  // Read params from job_payload (primary) with fallbacks to direct columns
  const p = job.job_payload || {};
  
  let webappId: string;
  let nodeInfoList: any[];
  
  switch (table) {
    case 'upscaler_jobs': {
      const category = p.category || job.category || 'pessoas_perto';
      const version = p.version || job.version || 'standard';
      const framingMode = p.framingMode || job.framing_mode || 'perto';
      const inputFile = p.inputFileName || job.input_file_name;
      const detailDenoise = p.detailDenoise ?? job.detail_denoise;
      let resolution = p.resolution || job.resolution;
      const prompt = p.prompt || job.prompt;
      const editingLevel = p.editingLevel ?? job.editing_level;
      
      // VRAM GUARDRAIL: Cap resolution to 2048 if it would exceed safe output limits
      // This prevents OOM errors on RunningHub GPUs
      if (resolution && Number(resolution) > 2048) {
        console.log(`[QueueManager] VRAM guardrail: capping resolution from ${resolution} to 2048 for safety`);
        resolution = 2048;
      }
      
      if (category === 'fotoAntiga') {
        webappId = WEBAPP_IDS.upscaler_jobs.fotoAntiga;
        nodeInfoList = [{ nodeId: "139", fieldName: "image", fieldValue: inputFile }];
      } else if (category === 'comida') {
        webappId = WEBAPP_IDS.upscaler_jobs.comida;
        nodeInfoList = [{ nodeId: "50", fieldName: "image", fieldValue: inputFile }];
        if (detailDenoise !== undefined) {
          nodeInfoList.push({ nodeId: "48", fieldName: "value", fieldValue: String(detailDenoise) });
        }
      } else if (category === 'logo') {
        webappId = WEBAPP_IDS.upscaler_jobs.logo;
        nodeInfoList = [{ nodeId: "39", fieldName: "image", fieldValue: inputFile }];
        if (version === 'pro' && detailDenoise !== undefined) {
          nodeInfoList.push({ nodeId: "33", fieldName: "value", fieldValue: String(detailDenoise) });
        }
      } else if (category === 'render3d') {
        webappId = WEBAPP_IDS.upscaler_jobs.render3d;
        nodeInfoList = [{ nodeId: "301", fieldName: "image", fieldValue: inputFile }];
        if (version === 'pro' && detailDenoise !== undefined) {
          nodeInfoList.push({ nodeId: "300", fieldName: "value", fieldValue: String(detailDenoise) });
        }
      } else if (category?.startsWith('pessoas') && (!detailDenoise || detailDenoise <= 0)) {
        // Pessoas SEM detalhar rosto → nova API unificada (V3 Turbo e V3 Pro)
        webappId = WEBAPP_IDS.upscaler_jobs.pessoas_sem_rosto;
        nodeInfoList = [
          { nodeId: "1", fieldName: "image", fieldValue: inputFile },
          { nodeId: "548", fieldName: "value", fieldValue: String(resolution || 4096) },
        ];
      } else {
        // Pessoas COM detalhar rosto ativo (V3 Pro) → nova API com face detail
        webappId = WEBAPP_IDS.upscaler_jobs.pessoas_com_rosto;
        nodeInfoList = [
          { nodeId: "1", fieldName: "image", fieldValue: inputFile },
          { nodeId: "102", fieldName: "value", fieldValue: String(detailDenoise) },
          { nodeId: "547", fieldName: "value", fieldValue: String(resolution || 4096) },
        ];
      }
      break;
    }
      
    case 'pose_changer_jobs': {
      webappId = WEBAPP_IDS.pose_changer_jobs;
      nodeInfoList = [
        { nodeId: "27", fieldName: "image", fieldValue: p.personFileName || job.person_file_name },
        { nodeId: "60", fieldName: "image", fieldValue: p.referenceFileName || job.reference_file_name },
      ];
      break;
    }
      
    case 'veste_ai_jobs': {
      webappId = WEBAPP_IDS.veste_ai_jobs;
      nodeInfoList = [
        { nodeId: "41", fieldName: "image", fieldValue: p.personFileName || job.person_file_name },
        { nodeId: "43", fieldName: "image", fieldValue: p.clothingFileName || job.clothing_file_name },
      ];
      break;
    }
      
    case 'video_upscaler_jobs': {
      webappId = WEBAPP_IDS.video_upscaler_jobs;
      const videoWebhookUrl = `${SUPABASE_URL}/functions/v1/runninghub-video-upscaler-webhook`;
      nodeInfoList = [
        { nodeId: "3", fieldName: "video", fieldValue: p.videoUrl || job.video_url || job.input_file_name },
      ];
      return await callRunningHubApi(webappId, nodeInfoList, videoWebhookUrl, table, job.id, account);
    }
      
    case 'arcano_cloner_jobs': {
      webappId = WEBAPP_IDS.arcano_cloner_jobs;
      nodeInfoList = [
        { nodeId: "58", fieldName: "image", fieldValue: p.userFileName || job.user_file_name },
        { nodeId: "62", fieldName: "image", fieldValue: p.referenceFileName || job.reference_file_name },
        { nodeId: "133", fieldName: "value", fieldValue: String(p.creativity ?? job.creativity ?? 0) },
        { nodeId: "135", fieldName: "text", fieldValue: p.customPrompt || job.custom_prompt || '' },
        { nodeId: "148", fieldName: "aspectRatio", fieldValue: p.aspectRatio || job.aspect_ratio || '4:3' },
      ];
      break;
    }

    case 'character_generator_jobs': {
      // Check if this is a refine job (has refine data in job_payload)
      if (p.isRefine) {
        webappId = '2021009449481150465'; // WEBAPP_ID_REFINE
        nodeInfoList = [
          { nodeId: "39", fieldName: "image", fieldValue: p.frontFileName },
          { nodeId: "40", fieldName: "image", fieldValue: p.semiProfileFileName },
          { nodeId: "41", fieldName: "image", fieldValue: p.profileFileName },
          { nodeId: "42", fieldName: "image", fieldValue: p.lowAngleFileName },
          { nodeId: "45", fieldName: "image", fieldValue: p.resultFileName },
          { nodeId: "47", fieldName: "text", fieldValue: p.selectedNumbers || '' },
        ];
      } else {
        webappId = WEBAPP_IDS.character_generator_jobs;
        nodeInfoList = [
          { nodeId: "41", fieldName: "image", fieldValue: p.frontFileName || job.front_file_name },
          { nodeId: "39", fieldName: "image", fieldValue: p.profileFileName || job.profile_file_name },
          { nodeId: "40", fieldName: "image", fieldValue: p.semiProfileFileName || job.semi_profile_file_name },
          { nodeId: "42", fieldName: "image", fieldValue: p.lowAngleFileName || job.low_angle_file_name },
        ];
      }
      break;
    }

    case 'flyer_maker_jobs': {
      // Agenda/Contrate/Outro subtypes: use pre-built nodeInfoList + alternate webappId from job_payload
      if ((p.flyerSubType === 'agenda' || p.flyerSubType === 'contrate' || p.flyerSubType === 'outro') && Array.isArray(p.nodeInfoList) && p.webappId) {
        webappId = p.webappId;
        nodeInfoList = p.nodeInfoList;
        break;
      }

      webappId = WEBAPP_IDS.flyer_maker_jobs;
      const artistFiles = p.artistFileNames || (job.artist_photo_file_names as string[]) || [];
      const firstArtist = artistFiles[0] || '';
      nodeInfoList = [];
      // Only include artist nodes that have actual images
      const artistNodes = [11, 12, 13, 14, 15];
      for (let i = 0; i < artistNodes.length; i++) {
        if (artistFiles[i]) {
          nodeInfoList.push({ nodeId: String(artistNodes[i]), fieldName: "image", fieldValue: artistFiles[i] });
        }
      }
      nodeInfoList.push(
        { nodeId: "1", fieldName: "image", fieldValue: p.referenceFileName || job.reference_file_name },
        { nodeId: "28", fieldName: "image", fieldValue: p.logoFileName || job.logo_file_name },
        { nodeId: "6", fieldName: "text", fieldValue: p.dateTimeLocation || job.date_time_location || '' },
        { nodeId: "10", fieldName: "text", fieldValue: p.artistNames || job.artist_names || '' },
        { nodeId: "7", fieldName: "text", fieldValue: p.title || job.title || '' },
        { nodeId: "9", fieldName: "text", fieldValue: p.footerPromo || job.footer_promo || '' },
        { nodeId: "103", fieldName: "text", fieldValue: p.address || job.address || '' },
        { nodeId: "153", fieldName: "aspectRatio", fieldValue: p.imageSize || job.image_size || '9:16' },
        { nodeId: "111", fieldName: "value", fieldValue: String(p.creativity ?? job.creativity ?? 0) },
      );
      break;
    }

    case 'bg_remover_jobs': {
      webappId = WEBAPP_IDS.bg_remover_jobs;
      nodeInfoList = [
        { nodeId: "1", fieldName: "image", fieldValue: p.inputFileName || job.input_file_name },
      ];
      break;
    }

    case 'image_generator_jobs': {
      const isCinemaStudio = p.source === 'cinema_studio_photo';
      const imgGenIds = WEBAPP_IDS.image_generator_jobs as Record<string, string>;
      
      if (isCinemaStudio) {
        // Cinema Studio: new WebApp with 10 reference image nodes
        webappId = imgGenIds.cinema_studio;
        const cinemaImageNodes = ['58', '150', '151', '152', '153', '154', '155', '147', '148', '149'];
        const refFiles = p.referenceFileNames || [];
        nodeInfoList = [
          { nodeId: "145", fieldName: "aspectRatio", fieldValue: p.aspectRatio || job.aspect_ratio || '4:3' },
          { nodeId: "135", fieldName: "text", fieldValue: p.prompt || job.prompt || '' },
        ];
        for (let i = 0; i < cinemaImageNodes.length; i++) {
          nodeInfoList.push({
            nodeId: cinemaImageNodes[i],
            fieldName: "image",
            fieldValue: refFiles[i] || 'example.png',
          });
        }
        // Also send node 62 as fallback placeholder
        nodeInfoList.push({
          nodeId: "62",
          fieldName: "image",
          fieldValue: refFiles[10] || 'example.png',
        });
      } else {
        // Standard Gerar Imagem: original 6-node workflow
        webappId = imgGenIds.standard;
        const refFiles = p.referenceFileNames || [];
        const imageNodes = ['58', '147', '148', '149', '62', '150'];
        nodeInfoList = [
          { nodeId: "151", fieldName: "aspectRatio", fieldValue: p.aspectRatio || job.aspect_ratio || '4:3' },
          { nodeId: "152", fieldName: "text", fieldValue: p.prompt || job.prompt || '' },
        ];
        for (let i = 0; i < imageNodes.length; i++) {
          nodeInfoList.push({
            nodeId: imageNodes[i],
            fieldName: "image",
            fieldValue: refFiles[i] || 'example.png',
          });
        }
      }
      break;
    }
      
    case 'video_generator_jobs': {
      const videoModel = p.model || job.model || 'veo3.1';
      const webappIds = WEBAPP_IDS.video_generator_jobs as Record<string, string>;
      // Frames are now uploaded as fileNames by generate-video edge function
      const hasStartFrame = !!p.startFrameFileName;
      const hasEndFrame = !!p.endFrameFileName;
      const hasFrames = hasStartFrame && hasEndFrame;
      
      nodeInfoList = [];
      
      if (videoModel === 'wan2.2') {
        // Wan 2.2 nodes: 37=FIRST FRAME, 16=LAST FRAME, 9=PROMPT
        if (hasFrames) {
          webappId = webappIds['wan2.2'];
          nodeInfoList.push({ nodeId: "37", fieldName: "image", fieldValue: p.startFrameFileName, description: "FIRST FRAME" });
          nodeInfoList.push({ nodeId: "16", fieldName: "image", fieldValue: p.endFrameFileName, description: "LAST FRAME" });
          nodeInfoList.push({
            nodeId: "9",
            fieldName: "text",
            fieldValue: p.prompt || job.prompt || '',
            description: "text",
          });
        } else {
          // Text-only mode
          webappId = webappIds['wan2.2_text_only'];
          console.log(`[QueueManager] Wan 2.2 text-only mode, using webapp ${webappId}`);
          nodeInfoList.push({
            nodeId: "15",
            fieldName: "text",
            fieldValue: p.prompt || job.prompt || '',
            description: "text",
          });
        }
      } else {
        // Veo 3.1 - single image (node 5) or text-only
        const hasVeoImage = !!p.startFrameFileName;
        const isVeoTextOnly = !hasVeoImage;
        const veoNodeId = isVeoTextOnly ? "8" : "3";
        
        if (hasVeoImage) {
          webappId = webappIds['veo3.1'];
          // Single image goes to node 5 only (node 15 removed from workflow)
          nodeInfoList.push({ nodeId: "5", fieldName: "image", fieldValue: p.startFrameFileName, description: "LAST FRAME" });
        } else {
          webappId = webappIds['veo3.1_text_only'];
          console.log(`[QueueManager] Veo 3.1 text-only mode, using webapp ${webappId}, nodeId=${veoNodeId}`);
        }
        nodeInfoList.push({
          nodeId: veoNodeId,
          fieldName: "aspect_ratio",
          fieldData: JSON.stringify([
            { name: "auto", index: "auto", description: "", fastIndex: 1.0 },
            { name: "16:9", index: "16:9", description: "", fastIndex: 2.0 },
            { name: "9:16", index: "9:16", description: "", fastIndex: 3.0 },
          ]),
          fieldValue: p.aspectRatio || job.aspect_ratio || "16:9",
          description: "aspect_ratio",
        });
        nodeInfoList.push({
          nodeId: veoNodeId,
          fieldName: "prompt",
          fieldValue: p.prompt || job.prompt || '',
          description: "prompt",
        });
      }
      
      break;
    }
      
    case 'movieled_maker_jobs': {
      const movieEngine = p.engine || job.engine || 'veo3.1';
      const movieWebappIds = WEBAPP_IDS.movieled_maker_jobs as Record<string, string>;
      webappId = movieWebappIds[movieEngine] || movieWebappIds['veo3.1'];
      nodeInfoList = [
        { nodeId: "68", fieldName: "image", fieldValue: p.rhFileName || job.reference_file_name, description: "image" },
        { nodeId: "72", fieldName: "text", fieldValue: p.inputText || job.input_text || '', description: "text" },
      ];
      break;
    }

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
  
  const MAX_RETRIES = 3;
  const RETRY_DELAYS = [3000, 8000, 15000];
  const RETRYABLE_STATUSES = [429, 502, 503, 504];
  
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      
      const response = await fetch(`https://www.runninghub.ai/openapi/v2/run/ai-app/${webappId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${account.apiKey}`,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      
      // Check for retryable HTTP status
      if (RETRYABLE_STATUSES.includes(response.status) && attempt < MAX_RETRIES - 1) {
        await response.text(); // consume body
        const jitter = Math.random() * 2000;
        const delay = RETRY_DELAYS[attempt] + jitter;
        console.warn(`[QueueManager] RunningHub returned ${response.status}, retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      
      const data = await response.json();
      console.log(`[QueueManager] RunningHub response:`, JSON.stringify(data));
      
      if (data.taskId) {
        await supabase
          .from(table)
          .update({ 
            task_id: data.taskId,
            api_account: account.name,
            status: 'running',
            raw_api_response: data,
          })
          .eq('id', jobId);
        
        return { taskId: data.taskId };
      } else {
        const isQueueLimit = data.errorCode === 421 || String(data.message || '').toLowerCase().includes('queue limit');
        
        // Retry on queue limit (transient)
        if (isQueueLimit && attempt < MAX_RETRIES - 1) {
          const jitter = Math.random() * 2000;
          const delay = RETRY_DELAYS[attempt] + jitter;
          console.warn(`[QueueManager] RunningHub queue limit, retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        
        const errorMsg = isQueueLimit ? 'api queue limit reached' : (data.message || data.error || 'Failed to start job');
        
        // Save raw response for debugging
        await supabase.from(table).update({ raw_api_response: data }).eq('id', jobId);
        await logStepFailure(table, jobId, 'runninghub_api_call', errorMsg, data);
        
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
            failed_at_step: 'runninghub_api_call',
            completed_at: new Date().toISOString(),
          })
          .eq('id', jobId);
        
        return { taskId: null };
      }
    } catch (error: any) {
      const isAbort = error.name === 'AbortError';
      const errorMsg = isAbort ? `RunningHub request timed out (attempt ${attempt + 1})` : (error.message || 'Unknown error');
      
      console.error(`[QueueManager] Error calling RunningHub (attempt ${attempt + 1}/${MAX_RETRIES}):`, errorMsg);
      
      // Retry on timeout or network error
      if (attempt < MAX_RETRIES - 1) {
        const jitter = Math.random() * 2000;
        const delay = RETRY_DELAYS[attempt] + jitter;
        console.warn(`[QueueManager] Retrying in ${Math.round(delay)}ms...`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      
      // Final attempt failed - refund and mark as failed
      await logStepFailure(table, jobId, 'runninghub_api_call', errorMsg);
      
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
          failed_at_step: 'runninghub_api_call',
          completed_at: new Date().toISOString(),
        })
        .eq('id', jobId);
      
      return { taskId: null };
    }
  }
  
  return { taskId: null };
}

/**
 * handleRetry - Re-submits a failed job using its saved job_payload.
 * Called by the webhook when a transient infrastructure error is detected.
 */
async function handleRetry(req: Request): Promise<Response> {
  try {
    const { table, jobId } = await req.json();
    
    if (!table || !jobId || !JOB_TABLES.includes(table as JobTable)) {
      return new Response(JSON.stringify({ error: 'Valid table and jobId required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log(`[QueueManager] /retry: table=${table}, jobId=${jobId}`);
    
    // Fetch job with payload
    const { data: job, error: jobError } = await supabase
      .from(table)
      .select('*')
      .eq('id', jobId)
      .maybeSingle();
    
    if (jobError || !job) {
      return new Response(JSON.stringify({ error: 'Job not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Reset job to starting state
    const account = await getAccountWithAvailableSlot() || getAvailableApiAccounts()[0];
    
    await supabase
      .from(table)
      .update({
        status: 'starting',
        current_step: 'auto_retrying',
        started_at: new Date().toISOString(),
        error_message: null,
        failed_at_step: null,
        task_id: null,
        api_account: account.name,
      })
      .eq('id', jobId);
    
    await logStep(table, jobId, 'auto_retrying', { accountName: account.name });
    
    // Re-submit to RunningHub
    const result = await startJobOnRunningHub(table as JobTable, job, account);
    
    if (result.taskId) {
      console.log(`[QueueManager] Auto-retry successful for ${jobId}, new taskId: ${result.taskId}`);
      return new Response(JSON.stringify({ success: true, taskId: result.taskId }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.error(`[QueueManager] Auto-retry failed for ${jobId}`);
    return new Response(JSON.stringify({ success: false, error: 'Retry submission failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('[QueueManager] /retry error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
