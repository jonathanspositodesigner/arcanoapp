
# Correção Completa: Video Upscaler no Painel de Custos + Polling Fallback

## Resumo do Problema

### Problema 1: Jobs de Video Upscaler não aparecem no painel
As funções RPC `get_ai_tools_usage`, `get_ai_tools_usage_count` e `get_ai_tools_usage_summary` **não incluem** a tabela `video_upscaler_jobs`.

### Problema 2: Webhook não chega, interface trava eternamente
O job `d13bbf98-f52e-43ec-a2f9-057ae5e20cec` (Task ID: `2018813168167559169`) está preso em `running` porque:
- O RunningHub completou o processamento com sucesso (-26 coins, 02:10 de duração)
- Nosso webhook `runninghub-video-upscaler-webhook` **nunca foi chamado**
- A interface fica eternamente mostrando o spinner de processamento

---

## Solução Completa

### Parte 1: Atualizar as 3 RPCs para incluir `video_upscaler_jobs`

Migração SQL que adiciona `UNION ALL` com a tabela `video_upscaler_jobs` em cada função.

### Parte 2: Implementar Polling Fallback no Frontend

Como o webhook do RunningHub pode falhar, implementar um sistema de polling no `VideoUpscalerTool.tsx` que:
1. A cada 15 segundos, verifica o status do job diretamente no banco
2. Se o job completou/falhou, atualiza a interface
3. Funciona como backup caso o Realtime também falhe

### Parte 3: Corrigir o Job Específico Manualmente

Atualizar o job do Jonathan para refletir o resultado real:
```sql
UPDATE video_upscaler_jobs 
SET 
  status = 'completed',
  output_url = '[URL do resultado do RunningHub]',
  completed_at = '2026-02-03 22:27:46+00',
  rh_cost = 26
WHERE task_id = '2018813168167559169';
```

---

## Arquivos a Modificar

| Arquivo | Ação |
|---------|------|
| Nova migração SQL | Atualizar as 3 RPCs para incluir `video_upscaler_jobs` |
| `src/pages/VideoUpscalerTool.tsx` | Adicionar polling fallback de 15s |

---

## Detalhes Técnicos

### 1. Migração SQL - Atualizar RPCs

#### 1.1 Função `get_ai_tools_usage`
Adicionar após o bloco de Veste AI:
```sql
UNION ALL

-- Video Upscaler jobs
SELECT 
  vuj.id,
  'Video Upscaler'::TEXT as tool_name,
  vuj.user_id,
  vuj.status,
  COALESCE(vuj.rh_cost, 0) as rh_cost,
  COALESCE(vuj.user_credit_cost, 0) as user_credit_cost,
  COALESCE(vuj.user_credit_cost, 0) - COALESCE(vuj.rh_cost, 0) as profit,
  COALESCE(vuj.waited_in_queue, false) as waited_in_queue,
  COALESCE(vuj.queue_wait_seconds, 0) as queue_wait_seconds,
  CASE 
    WHEN vuj.started_at IS NOT NULL AND vuj.completed_at IS NOT NULL 
    THEN EXTRACT(EPOCH FROM (vuj.completed_at - vuj.started_at))::INTEGER
    ELSE 0
  END as processing_seconds,
  vuj.created_at,
  vuj.started_at,
  vuj.completed_at
FROM video_upscaler_jobs vuj
WHERE vuj.user_id IS NOT NULL
```

#### 1.2 Função `get_ai_tools_usage_count`
Adicionar:
```sql
UNION ALL
SELECT id FROM video_upscaler_jobs 
WHERE user_id IS NOT NULL
  AND (p_start_date IS NULL OR created_at >= p_start_date)
  AND (p_end_date IS NULL OR created_at <= p_end_date)
```

#### 1.3 Função `get_ai_tools_usage_summary`
Adicionar:
```sql
UNION ALL

SELECT 
  vuj.status,
  COALESCE(vuj.rh_cost, 0),
  COALESCE(vuj.user_credit_cost, 0),
  COALESCE(vuj.waited_in_queue, false),
  COALESCE(vuj.queue_wait_seconds, 0),
  CASE 
    WHEN vuj.started_at IS NOT NULL AND vuj.completed_at IS NOT NULL 
    THEN EXTRACT(EPOCH FROM (vuj.completed_at - vuj.started_at))::INTEGER
    ELSE 0
  END
FROM video_upscaler_jobs vuj
WHERE vuj.user_id IS NOT NULL
  AND (p_start_date IS NULL OR vuj.created_at >= p_start_date)
  AND (p_end_date IS NULL OR vuj.created_at <= p_end_date)
```

---

### 2. Polling Fallback no Frontend

Adicionar um `useEffect` que verifica o status do job a cada 15 segundos:

```typescript
// Polling fallback - verifica status diretamente no banco a cada 15s
useEffect(() => {
  if (!jobId || status === 'completed' || status === 'error' || status === 'idle') {
    return;
  }

  const pollInterval = setInterval(async () => {
    try {
      const { data: job } = await supabase
        .from('video_upscaler_jobs')
        .select('status, output_url, error_message')
        .eq('id', jobId)
        .maybeSingle();

      if (!job) return;

      if (job.status === 'completed' && job.output_url) {
        setOutputVideoUrl(job.output_url);
        setStatus('completed');
        setProgress(100);
        refetchCredits();
        processingRef.current = false;
        toast.success('Vídeo upscalado com sucesso!');
      } else if (job.status === 'failed') {
        setStatus('error');
        processingRef.current = false;
        toast.error(job.error_message || 'Erro no processamento');
      }
    } catch (e) {
      console.error('[VideoUpscaler] Polling error:', e);
    }
  }, 15000); // 15 segundos

  return () => clearInterval(pollInterval);
}, [jobId, status, refetchCredits]);
```

---

## Resultado Esperado

| Antes | Depois |
|-------|--------|
| Video Upscaler não aparece no painel de custos | Aparece junto com as outras 3 ferramentas |
| Se webhook falha, interface trava eternamente | Polling detecta conclusão em até 15s |
| Job do Jonathan stuck em `running` | Corrigido para `completed` com rh_cost = 26 |

---

## Observação sobre o Webhook

O problema do webhook não recebido pode ter várias causas:
1. O RunningHub não conseguiu alcançar nosso endpoint (firewall, timeout)
2. Erro transitório de rede
3. Limitação do RunningHub para certos tipos de processamento

O polling fallback resolve isso de forma elegante, sem depender 100% do webhook.
