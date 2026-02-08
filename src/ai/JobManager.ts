/**
 * AI TOOLS JOB MANAGER - CENTRAL MODULE
 * 
 * Módulo único e centralizado para gerenciar jobs de todas as ferramentas de IA:
 * - Upscaler Arcano
 * - Pose Changer
 * - Veste AI
 * - Video Upscaler
 * 
 * Responsabilidades:
 * - Verificar se usuário já tem job ativo (1 por usuário)
 * - Criar job no banco (APÓS upload das imagens)
 * - Consumir créditos de forma atômica
 * - Chamar edge function para iniciar processamento
 * - Gerenciar subscription realtime
 * - Cancelar jobs com reembolso
 * - Exibir erros reais sem mascarar
 */

import { supabase } from '@/integrations/supabase/client';

// ==================== TYPES ====================

export type ToolType = 'upscaler' | 'pose_changer' | 'veste_ai' | 'video_upscaler' | 'arcano_cloner';
export type JobStatus = 'pending' | 'queued' | 'starting' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface JobResult {
  success: boolean;
  jobId?: string;
  queued?: boolean;
  position?: number;
  error?: string;
  code?: string;
}

export interface ActiveJobInfo {
  hasActiveJob: boolean;
  activeTool: string | null;
  activeJobId?: string;
  activeStatus?: string;
}

export interface CancelResult {
  success: boolean;
  refundedAmount: number;
  errorMessage?: string;
}

export interface JobUpdate {
  status: JobStatus;
  outputUrl?: string;
  errorMessage?: string;
  position?: number;
  currentStep?: string;
}

// Table names mapping
const TABLE_MAP: Record<ToolType, string> = {
  upscaler: 'upscaler_jobs',
  pose_changer: 'pose_changer_jobs',
  veste_ai: 'veste_ai_jobs',
  video_upscaler: 'video_upscaler_jobs',
  arcano_cloner: 'arcano_cloner_jobs',
};

// Edge function names mapping
const EDGE_FUNCTION_MAP: Record<ToolType, string> = {
  upscaler: 'runninghub-upscaler/run',
  pose_changer: 'runninghub-pose-changer/run',
  veste_ai: 'runninghub-veste-ai/run',
  video_upscaler: 'runninghub-video-upscaler/run',
  arcano_cloner: 'runninghub-arcano-cloner/run',
};

// Tool names for display
const TOOL_NAMES: Record<string, ToolType> = {
  'Upscaler Arcano': 'upscaler',
  'Video Upscaler': 'video_upscaler',
  'Pose Changer': 'pose_changer',
  'Veste AI': 'veste_ai',
  'Arcano Cloner': 'arcano_cloner',
};

// ==================== CORE FUNCTIONS ====================

/**
 * Verifica se o usuário já tem um job ativo em QUALQUER ferramenta
 * Isso impede múltiplos jobs simultâneos por usuário
 */
export async function checkActiveJob(userId: string): Promise<ActiveJobInfo> {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/runninghub-queue-manager/check-user-active`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ userId }),
      }
    );
    
    if (!response.ok) {
      console.error('[JobManager] checkActiveJob failed:', response.status);
      return { hasActiveJob: false, activeTool: null };
    }
    
    return await response.json();
  } catch (error) {
    console.error('[JobManager] checkActiveJob error:', error);
    return { hasActiveJob: false, activeTool: null };
  }
}

/**
 * Cancela um job ativo e reembolsa créditos (se aplicável)
 * Usa a função RPC do banco que é idempotente
 */
export async function cancelJob(
  toolType: ToolType | string, 
  jobId: string
): Promise<CancelResult> {
  try {
    // Converter nome da ferramenta para table name se necessário
    let tableName: string;
    if (toolType in TABLE_MAP) {
      tableName = TABLE_MAP[toolType as ToolType];
    } else if (toolType in TOOL_NAMES) {
      tableName = TABLE_MAP[TOOL_NAMES[toolType]];
    } else {
      // Assume que já é o nome da tabela
      tableName = toolType;
    }
    
    console.log(`[JobManager] Cancelling job ${jobId} in ${tableName}`);
    
    const { data, error } = await supabase.rpc('user_cancel_ai_job', {
      p_table_name: tableName,
      p_job_id: jobId,
    });
    
    if (error) {
      console.error('[JobManager] Cancel error:', error);
      return { 
        success: false, 
        refundedAmount: 0, 
        errorMessage: error.message 
      };
    }
    
    const result = Array.isArray(data) ? data[0] : data;
    console.log('[JobManager] Cancel result:', result);
    
    return {
      success: result?.success ?? false,
      refundedAmount: result?.refunded_amount ?? 0,
      errorMessage: result?.error_message ?? undefined,
    };
  } catch (error) {
    console.error('[JobManager] Cancel exception:', error);
    return { 
      success: false, 
      refundedAmount: 0, 
      errorMessage: error instanceof Error ? error.message : 'Erro desconhecido' 
    };
  }
}

/**
 * Cria um job no banco de dados
 * IMPORTANTE: Deve ser chamado APÓS o upload das imagens para evitar órfãos
 */
export async function createJob(
  toolType: ToolType,
  userId: string,
  sessionId: string,
  payload: Record<string, any>
): Promise<{ jobId: string | null; error?: string }> {
  const tableName = TABLE_MAP[toolType];
  
  try {
    const insertData = {
      session_id: sessionId,
      user_id: userId,
      status: 'pending' as const,  // Estado neutro - edge function decide o real
      ...payload,
    };
    
    const { data: job, error } = await supabase
      .from(tableName as any)
      .insert(insertData)
      .select('id')
      .single();
    
    if (error || !job) {
      console.error('[JobManager] createJob error:', error);
      return { jobId: null, error: error?.message || 'Failed to create job' };
    }
    
    const jobRecord = job as unknown as { id: string };
    console.log(`[JobManager] Job created in ${tableName}:`, jobRecord.id);
    return { jobId: jobRecord.id };
  } catch (error) {
    console.error('[JobManager] createJob exception:', error);
    return { 
      jobId: null,
      error: error instanceof Error ? error.message : 'Failed to create job' 
    };
  }
}

/**
 * Inicia o processamento de um job chamando a edge function
 * A edge function cuida de:
 * - Consumir créditos
 * - Verificar fila
 * - Chamar RunningHub
 */
export async function startJob(
  toolType: ToolType,
  jobId: string,
  payload: Record<string, any>
): Promise<JobResult> {
  const edgeFunction = EDGE_FUNCTION_MAP[toolType];
  const tableName = TABLE_MAP[toolType];
  
  try {
    console.log(`[JobManager] Starting job ${jobId} via ${edgeFunction}`);
    
    const { data, error } = await supabase.functions.invoke(edgeFunction, {
      body: { jobId, ...payload },
    });
    
    if (error) {
      // Tentar extrair erro detalhado
      let errorMessage = error.message || 'Erro desconhecido';
      if (errorMessage.includes('non-2xx')) {
        errorMessage = 'Falha na comunicação com o servidor. Tente novamente.';
      }
      
      // Marcar job como falho
      await markJobFailed(tableName, jobId, errorMessage);
      
      return { success: false, error: errorMessage };
    }
    
    console.log(`[JobManager] Edge function response:`, data);
    
    // Verificar erros conhecidos
    if (data.code === 'INSUFFICIENT_CREDITS') {
      return { success: false, code: 'INSUFFICIENT_CREDITS', error: 'Créditos insuficientes' };
    }
    
    if (data.code === 'RATE_LIMIT_EXCEEDED') {
      return { success: false, code: 'RATE_LIMIT_EXCEEDED', error: 'Muitas requisições. Aguarde 1 minuto.' };
    }
    
    if (data.code === 'IMAGE_TRANSFER_ERROR') {
      const detail = data.error || 'Falha ao enviar imagens';
      await markJobFailed(tableName, jobId, detail);
      return { success: false, code: 'IMAGE_TRANSFER_ERROR', error: detail };
    }
    
    if (data.error && !data.success && !data.queued) {
      await markJobFailed(tableName, jobId, data.error);
      return { success: false, error: data.error };
    }
    
    return {
      success: data.success ?? false,
      jobId,
      queued: data.queued ?? false,
      position: data.position ?? 0,
    };
  } catch (error) {
    console.error('[JobManager] startJob exception:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    await markJobFailed(tableName, jobId, errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Marca um job como falho via QueueManager /finish para garantir reembolso
 */
async function markJobFailed(
  tableName: string,
  jobId: string,
  errorMessage: string
): Promise<void> {
  try {
    // Chamar QueueManager /finish para garantir reembolso idempotente
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/runninghub-queue-manager/finish`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          table: tableName,
          jobId: jobId,
          status: 'failed',
          errorMessage: errorMessage,
        }),
      }
    );
    
    if (!response.ok) {
      console.error('[JobManager] markJobFailed via QueueManager failed:', response.status);
      // Fallback: update direto (sem reembolso, mas pelo menos marca como failed)
      await supabase
        .from(tableName as any)
        .update({
          status: 'failed' as const,
          error_message: errorMessage,
          completed_at: new Date().toISOString(),
        })
        .eq('id', jobId);
    } else {
      console.log(`[JobManager] Job ${jobId} marked as failed via QueueManager (reembolso garantido)`);
    }
  } catch (error) {
    console.error('[JobManager] markJobFailed exception:', error);
    // Fallback em caso de erro de rede
    try {
      await supabase
        .from(tableName as any)
        .update({
          status: 'failed' as const,
          error_message: errorMessage,
          completed_at: new Date().toISOString(),
        })
        .eq('id', jobId);
    } catch (fallbackError) {
      console.error('[JobManager] Fallback update also failed:', fallbackError);
    }
  }
}

/**
 * Subscribe para atualizações de um job via Realtime
 * Retorna uma função para cancelar a subscription
 * 
 * @param onStatusChange - Callback adicional para notificar mudanças de status
 *                         Usado pelo AIJobContext para tocar som
 */
export function subscribeToJob(
  toolType: ToolType,
  jobId: string,
  onUpdate: (update: JobUpdate) => void,
  onStatusChange?: (status: JobStatus) => void
): () => void {
  const tableName = TABLE_MAP[toolType];
  
  console.log(`[JobManager] Subscribing to ${tableName} job ${jobId}`);
  
  const channel = supabase
    .channel(`job-${toolType}-${jobId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: tableName,
        filter: `id=eq.${jobId}`
      },
      (payload) => {
        const data = payload.new as any;
        const status = data.status as JobStatus;
        
        console.log(`[JobManager] Job update:`, data);
        
        // Notificar callback de status (para AIJobContext)
        if (onStatusChange) {
          onStatusChange(status);
        }
        
        onUpdate({
          status,
          outputUrl: data.output_url,
          errorMessage: data.error_message,
          position: data.position,
        });
      }
    )
    .subscribe((status) => {
      console.log(`[JobManager] Subscription status:`, status);
    });
  
  // Retorna função para cancelar subscription
  return () => {
    console.log(`[JobManager] Unsubscribing from job ${jobId}`);
    supabase.removeChannel(channel);
  };
}

/**
 * Upload de arquivo para o Storage
 */
export async function uploadToStorage(
  file: File | Blob,
  folder: string,
  userId: string,
  fileName?: string
): Promise<{ url: string | null; error?: string }> {
  try {
    const timestamp = Date.now();
    const extension = file instanceof File 
      ? (file.name.split('.').pop() || 'webp')
      : 'webp';
    const finalName = fileName || `${timestamp}.${extension}`;
    const filePath = `${folder}/${userId}/${finalName}`;
    
    const { error: uploadError } = await supabase.storage
      .from('artes-cloudinary')
      .upload(filePath, file, {
        contentType: file.type || 'image/webp',
        upsert: true,
      });
    
    if (uploadError) {
      console.error('[JobManager] Upload error:', uploadError);
      return { url: null, error: uploadError.message };
    }
    
    const { data: urlData } = supabase.storage
      .from('artes-cloudinary')
      .getPublicUrl(filePath);
    
    console.log('[JobManager] File uploaded:', urlData.publicUrl);
    return { url: urlData.publicUrl };
  } catch (error) {
    console.error('[JobManager] Upload exception:', error);
    return { 
      url: null, 
      error: error instanceof Error ? error.message : 'Upload failed' 
    };
  }
}

/**
 * Verifica o saldo de créditos do usuário
 */
export async function checkCredits(
  userId: string
): Promise<{ balance: number; sufficient: boolean; required: number }> {
  try {
    const { data, error } = await supabase.rpc('get_upscaler_credits', {
      _user_id: userId
    });
    
    if (error) {
      console.error('[JobManager] checkCredits error:', error);
      return { balance: 0, sufficient: false, required: 0 };
    }
    
    return { 
      balance: data ?? 0, 
      sufficient: true, 
      required: 0 
    };
  } catch (error) {
    console.error('[JobManager] checkCredits exception:', error);
    return { balance: 0, sufficient: false, required: 0 };
  }
}

/**
 * Consulta direta ao banco para obter status de um job
 * Usado pelo sistema de polling de backup quando Realtime falha
 */
export async function queryJobStatus(
  toolType: ToolType,
  jobId: string
): Promise<JobUpdate | null> {
  const tableName = TABLE_MAP[toolType];
  
  try {
    const { data, error } = await supabase
      .from(tableName as any)
      .select('status, output_url, error_message, position, current_step')
      .eq('id', jobId)
      .maybeSingle();
    
    if (error || !data) {
      console.error('[JobManager] queryJobStatus error:', error);
      return null;
    }
    
    const record = data as any;
    return {
      status: record.status,
      outputUrl: record.output_url,
      errorMessage: record.error_message,
      position: record.position,
      currentStep: record.current_step,
    };
  } catch (error) {
    console.error('[JobManager] queryJobStatus exception:', error);
    return null;
  }
}

// Export table map for components that need it
export { TABLE_MAP, TOOL_NAMES };
