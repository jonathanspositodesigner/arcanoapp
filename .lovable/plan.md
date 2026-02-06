# Plano: Watchdog de Fallback para Jobs de IA

> **Status**: Não implementado (reservado para uso futuro)
> **Última atualização**: 2026-02-06
> **Problema que resolve**: Jobs travados em "processing" infinito quando webhook da RunningHub falha
> **Palavras-chave para busca**: WATCHDOG_FALLBACK_PLAN, jobs travados processing, processing infinito

---

## Contexto do Problema

### Sintoma
- Usuário dispara um job de IA (Upscaler, Pose Changer, Veste AI)
- RunningHub processa e retorna SUCCESS do lado deles
- No sistema Arcano, o job fica preso em "processing" eternamente
- UI nunca recebe o resultado

### Causa Raiz Identificada
1. **Race Condition no Webhook**: O `task_id` é salvo no banco DEPOIS da chamada à RunningHub retornar. Se a RunningHub enviar o webhook antes do `task_id` ser persistido, o webhook não encontra o job ("Job not found").

2. **Dependência de Evento Único**: O sistema depende 100% do webhook. Se ele falhar por qualquer motivo (rede, timeout, corrida), não há fallback.

3. **Frontend sem Autocura**: A UI depende exclusivamente do Realtime. Se o banco não atualizar, a UI fica presa.

---

## Solução Proposta: Sistema de Watchdog Paralelo

### Estratégia
Criar um sistema **paralelo e isolado** que pode ser ativado/desativado via feature flag, sem modificar o código atual que funciona.

### Componentes

#### 1. Nova Edge Function: `runninghub-job-sync`

Função isolada que consulta a RunningHub diretamente:

```typescript
// supabase/functions/runninghub-job-sync/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RUNNINGHUB_API_URL = 'https://www.runninghub.cn/api/task/openapi/outputs';

const JOB_TABLES = {
  upscaler: 'upscaler_jobs',
  pose_changer: 'pose_changer_jobs',
  veste_ai: 'veste_ai_jobs',
  video_upscaler: 'video_upscaler_jobs',
} as const;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { table, jobId } = await req.json();
    
    if (!table || !jobId) {
      return new Response(
        JSON.stringify({ error: 'Missing table or jobId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validar tabela
    if (!Object.values(JOB_TABLES).includes(table)) {
      return new Response(
        JSON.stringify({ error: 'Invalid table' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Buscar job
    const { data: job, error: jobError } = await supabase
      .from(table)
      .select('id, status, task_id, api_account, output_url, started_at')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return new Response(
        JSON.stringify({ error: 'Job not found', synced: false }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Se já terminal, não precisa sincronizar
    if (['completed', 'failed', 'cancelled'].includes(job.status)) {
      return new Response(
        JSON.stringify({ 
          synced: false, 
          reason: 'already_terminal',
          status: job.status,
          outputUrl: job.output_url 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Se não tem task_id, não dá pra consultar
    if (!job.task_id) {
      return new Response(
        JSON.stringify({ synced: false, reason: 'no_task_id' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar API key da conta
    const { data: account } = await supabase
      .from('runninghub_accounts')
      .select('api_key')
      .eq('account_name', job.api_account || 'arcano_main')
      .single();

    if (!account?.api_key) {
      return new Response(
        JSON.stringify({ synced: false, reason: 'no_api_key' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Consultar RunningHub
    console.log(`[JobSync] Querying RunningHub for task ${job.task_id}`);
    
    const rhResponse = await fetch(RUNNINGHUB_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: account.api_key,
        taskId: job.task_id,
      }),
    });

    if (!rhResponse.ok) {
      console.error(`[JobSync] RunningHub API error: ${rhResponse.status}`);
      return new Response(
        JSON.stringify({ synced: false, reason: 'api_error', status: rhResponse.status }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const rhData = await rhResponse.json();
    console.log(`[JobSync] RunningHub response:`, JSON.stringify(rhData));

    // Verificar se completou
    if (rhData.code === 0 && rhData.data) {
      const outputs = rhData.data;
      
      // Procurar por output com fileUrl
      let outputUrl = null;
      if (Array.isArray(outputs)) {
        for (const output of outputs) {
          if (output.fileUrl) {
            outputUrl = output.fileUrl;
            break;
          }
        }
      }

      if (outputUrl) {
        // Job completou! Chamar /finish do queue-manager
        console.log(`[JobSync] Found output! Calling /finish...`);
        
        const finishResponse = await fetch(
          `${SUPABASE_URL}/functions/v1/runninghub-queue-manager/finish`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            },
            body: JSON.stringify({
              table,
              jobId,
              status: 'completed',
              outputUrl,
              syncedViaWatchdog: true,
            }),
          }
        );

        if (finishResponse.ok) {
          console.log(`[JobSync] Job ${jobId} synced and finished!`);
          return new Response(
            JSON.stringify({ synced: true, status: 'completed', outputUrl }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          console.error(`[JobSync] /finish failed:`, await finishResponse.text());
        }
      }
    }

    // Ainda não completou ou erro
    return new Response(
      JSON.stringify({ 
        synced: false, 
        reason: 'still_processing',
        rhCode: rhData.code,
        rhMsg: rhData.msg 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[JobSync] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message, synced: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

#### 2. Feature Flags no JobManager

Adicionar no final de `src/ai/JobManager.ts`:

```typescript
// ==================== WATCHDOG FEATURE FLAGS ====================
// Toggle para ativar/desativar o sistema de watchdog de fallback
// WATCHDOG_FALLBACK_PLAN - busque por isso para encontrar este plano
export const WATCHDOG_ENABLED = false; // TOGGLE: true para ativar, false para desativar
export const WATCHDOG_INITIAL_DELAY_MS = 30000; // 30s antes de começar polling
export const WATCHDOG_POLL_INTERVAL_MS = 15000; // 15s entre tentativas
export const WATCHDOG_MAX_TIMEOUT_MS = 12 * 60 * 1000; // 12 min timeout total
```

#### 3. Hook de Watchdog

Criar `src/hooks/useJobWatchdog.ts`:

```typescript
import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  WATCHDOG_ENABLED, 
  WATCHDOG_INITIAL_DELAY_MS, 
  WATCHDOG_POLL_INTERVAL_MS,
  WATCHDOG_MAX_TIMEOUT_MS,
  TABLE_MAP,
  ToolType,
  JobStatus,
  JobUpdate
} from '@/ai/JobManager';

const ACTIVE_STATUSES: JobStatus[] = ['pending', 'queued', 'starting', 'running'];

export function useJobWatchdog(
  toolType: ToolType,
  jobId: string | null,
  status: string,
  onUpdate: (update: JobUpdate) => void
) {
  const initialDelayRef = useRef<NodeJS.Timeout | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const attemptCountRef = useRef(0);

  const cleanup = useCallback(() => {
    if (initialDelayRef.current) {
      clearTimeout(initialDelayRef.current);
      initialDelayRef.current = null;
    }
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    startTimeRef.current = null;
    attemptCountRef.current = 0;
  }, []);

  const syncJob = useCallback(async () => {
    if (!jobId) return;

    const tableName = TABLE_MAP[toolType];
    attemptCountRef.current += 1;
    
    console.log(`[Watchdog] Attempt #${attemptCountRef.current} for job ${jobId}`);

    try {
      const { data, error } = await supabase.functions.invoke('runninghub-job-sync', {
        body: { table: tableName, jobId },
      });

      if (error) {
        console.error('[Watchdog] Sync error:', error);
        return;
      }

      console.log('[Watchdog] Sync response:', data);

      if (data.synced && data.status === 'completed' && data.outputUrl) {
        console.log('[Watchdog] Job synced successfully!');
        onUpdate({
          status: 'completed',
          outputUrl: data.outputUrl,
        });
        cleanup();
        return;
      }

      if (data.reason === 'already_terminal') {
        console.log('[Watchdog] Job already terminal:', data.status);
        onUpdate({
          status: data.status,
          outputUrl: data.outputUrl,
        });
        cleanup();
        return;
      }

      // Verificar timeout total
      const elapsed = Date.now() - (startTimeRef.current || Date.now());
      if (elapsed >= WATCHDOG_MAX_TIMEOUT_MS) {
        console.log('[Watchdog] Max timeout reached, forcing failure');
        
        // Forçar finalização como timeout
        await supabase.functions.invoke('runninghub-queue-manager/finish', {
          body: {
            table: tableName,
            jobId,
            status: 'failed',
            errorMessage: 'Timeout: processamento excedeu o tempo limite (12 minutos)',
          },
        });

        onUpdate({
          status: 'failed',
          errorMessage: 'Timeout: processamento excedeu o tempo limite',
        });
        cleanup();
      }

    } catch (error) {
      console.error('[Watchdog] Exception:', error);
    }
  }, [jobId, toolType, onUpdate, cleanup]);

  useEffect(() => {
    // Não fazer nada se watchdog desativado
    if (!WATCHDOG_ENABLED) return;
    
    // Não fazer nada se não tem jobId ou não está em status ativo
    if (!jobId || !ACTIVE_STATUSES.includes(status as JobStatus)) {
      cleanup();
      return;
    }

    // Já está rodando
    if (initialDelayRef.current || pollIntervalRef.current) return;

    console.log(`[Watchdog] Starting for job ${jobId} (status: ${status})`);
    startTimeRef.current = Date.now();

    // Aguardar delay inicial antes de começar a verificar
    initialDelayRef.current = setTimeout(() => {
      initialDelayRef.current = null;
      
      // Primeira verificação
      syncJob();
      
      // Polling contínuo
      pollIntervalRef.current = setInterval(syncJob, WATCHDOG_POLL_INTERVAL_MS);
    }, WATCHDOG_INITIAL_DELAY_MS);

    return cleanup;
  }, [jobId, status, syncJob, cleanup]);

  // Cleanup on unmount
  useEffect(() => cleanup, [cleanup]);
}
```

#### 4. Integração nas Ferramentas

Adicionar em cada ferramenta (UpscalerArcanoTool, PoseChangerTool, VesteAITool):

```typescript
import { useJobWatchdog } from '@/hooks/useJobWatchdog';

// Dentro do componente, junto com os outros hooks:
useJobWatchdog('upscaler', jobId, status, (update) => {
  console.log('[Watchdog Callback] Received update:', update);
  
  if (update.status === 'completed' && update.outputUrl) {
    setOutputImage(update.outputUrl);
    setStatus('completed');
    setProgress(100);
    endSubmit();
    toast.success('Imagem processada com sucesso!');
  } else if (update.status === 'failed') {
    setStatus('error');
    endSubmit();
    toast.error(update.errorMessage || 'Erro no processamento');
  }
});
```

---

## Como Ativar

1. Criar a edge function `runninghub-job-sync`
2. Adicionar as feature flags no `JobManager.ts`
3. Criar o hook `useJobWatchdog.ts`
4. Adicionar o hook nas ferramentas
5. Mudar `WATCHDOG_ENABLED = true`
6. Deploy

## Como Desativar

1. Mudar `WATCHDOG_ENABLED = false`
2. Pronto! Sistema volta ao comportamento original

---

## Fluxo Visual

```text
┌─────────────────────────────────────────────────────────────────┐
│                    FLUXO NORMAL (não muda)                      │
│  Job criado → Edge Function → RunningHub → Webhook → Realtime  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ (se webhook falhar ou atrasar)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    WATCHDOG (PARALELO)                          │
│                                                                 │
│  Após 30s em "running":                                         │
│    ↓                                                            │
│  Chama /runninghub-job-sync                                     │
│    ↓                                                            │
│  Consulta RunningHub API diretamente                            │
│    ↓                                                            │
│  Se SUCCESS: chama /finish → atualiza DB → Realtime             │
│    ↓                                                            │
│  UI reflete automaticamente                                     │
│                                                                 │
│  Se 12min sem resposta: força status 'failed' com timeout       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Checklist de Implementação

- [ ] Criar `supabase/functions/runninghub-job-sync/index.ts`
- [ ] Adicionar função no `supabase/config.toml`
- [ ] Adicionar feature flags em `src/ai/JobManager.ts`
- [ ] Criar `src/hooks/useJobWatchdog.ts`
- [ ] Integrar hook em `UpscalerArcanoTool.tsx`
- [ ] Integrar hook em `PoseChangerTool.tsx`
- [ ] Integrar hook em `VesteAITool.tsx`
- [ ] Testar com `WATCHDOG_ENABLED = false` (nada muda)
- [ ] Testar com `WATCHDOG_ENABLED = true` (fallback ativo)
- [ ] Deploy para produção

---

## Histórico

| Data | Evento |
|------|--------|
| 2026-02-06 | Plano documentado para uso futuro |
