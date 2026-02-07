
# Sistema de Sincronização Tripla para Jobs de IA

## Status: ✅ IMPLEMENTADO

### Componentes Criados

1. **`src/hooks/useJobStatusSync.ts`** - Hook global que implementa:
   - Realtime (primário): Supabase Realtime para updates instantâneos
   - Polling Silencioso (backup): Inicia após 15s, roda a cada 5s por até 3 min
   - Visibility Recovery: Ao voltar de outra aba, verifica imediatamente

2. **`src/ai/JobManager.ts`** - Adicionada função `queryJobStatus()` para polling direto

### Ferramentas Atualizadas

- ✅ `UpscalerArcanoTool.tsx` - Usando useJobStatusSync
- ✅ `PoseChangerTool.tsx` - Usando useJobStatusSync  
- ✅ `VesteAITool.tsx` - Usando useJobStatusSync
- ✅ `VideoUpscalerTool.tsx` - Usando useJobStatusSync (removido polling manual antigo)

### Garantias

| Item | Status |
|------|--------|
| Funciona offline parcial | ✅ Polling recupera quando volta |
| Funciona em qualquer dispositivo | ✅ Não depende de WebSocket |
| Funciona em qualquer rede | ✅ Fallback HTTP direto |
| Não impacta performance | ✅ Polling leve e com timeout |

---

# Plano Anterior: Unificação de Rotas de Ferramentas de IA

## Diagnóstico do Problema

**Causa Raiz:** O frontend depende 100% do Supabase Realtime para receber atualizações de status dos jobs. Quando o Realtime falha silenciosamente (problemas de rede, WebSocket desconectado, dispositivo em standby), o usuário fica preso em "processando" eternamente, mesmo com o job já completo no banco.

**Evidência:** O usuário `lindnelsonfelipe20@gmail.com` tem 5+ jobs marcados como `completed` no banco com `output_url` preenchido, mas o frontend não exibiu o resultado.

---

## Arquitetura da Solução

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SISTEMA DE SINCRONIZAÇÃO TRIPLA                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. REALTIME (primário)                                                    │
│     └── Subscription do Supabase Realtime (instantâneo)                    │
│                                                                             │
│  2. POLLING SILENCIOSO (backup automático)                                 │
│     └── Inicia após 15s, roda a cada 5s, para após 3 min                   │
│         (detecta status terminal mesmo sem Realtime)                       │
│                                                                             │
│  3. RECUPERAÇÃO POR VISIBILIDADE (quando usuário volta)                    │
│     └── Ao voltar de outra aba/app, verifica imediatamente no banco        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Componentes a Criar/Modificar

### 1. CRIAR: Hook Global `useJobStatusSync`

**Localização:** `src/hooks/useJobStatusSync.ts`

Este hook encapsula a lógica de sincronização tripla e será usado por TODAS as ferramentas de IA:

```tsx
interface UseJobStatusSyncOptions {
  jobId: string | null;
  toolType: 'upscaler' | 'pose_changer' | 'veste_ai' | 'video_upscaler';
  enabled: boolean;
  onStatusChange: (update: JobUpdate) => void;
}

// Retorna função de cleanup
const { cleanup } = useJobStatusSync({
  jobId,
  toolType: 'upscaler',
  enabled: status === 'processing' || status === 'waiting',
  onStatusChange: (update) => {
    if (update.status === 'completed' && update.outputUrl) {
      setOutputImage(update.outputUrl);
      setStatus('completed');
    } else if (update.status === 'failed') {
      setStatus('error');
    }
  }
});
```

**Lógica Interna:**

1. **Realtime Subscription** (como já existe)
2. **Polling Silencioso:**
   - Delay inicial: 15 segundos (dá tempo pro Realtime funcionar)
   - Intervalo: 5 segundos
   - Timeout máximo: 3 minutos (depois para de pollar)
   - Consulta direta ao banco: `SELECT status, output_url, error_message FROM {table} WHERE id = {jobId}`
3. **Visibility Recovery:**
   - Listener em `document.visibilitychange`
   - Quando `visibilityState === 'visible'` e há job ativo, consulta banco imediatamente

---

### 2. MODIFICAR: Todas as Ferramentas de IA

**Arquivos afetados:**
- `src/pages/UpscalerArcanoTool.tsx`
- `src/pages/PoseChangerTool.tsx`
- `src/pages/VesteAITool.tsx`
- `src/pages/VideoUpscalerTool.tsx`

**Mudança:** Substituir a lógica atual de Realtime-only pelo novo hook `useJobStatusSync`.

**Antes (UpscalerArcanoTool.tsx linhas 188-264):**
```tsx
// Subscribe to Realtime updates when jobId changes
useEffect(() => {
  if (!jobId) return;
  const channel = supabase.channel(`upscaler-job-${jobId}`)
    .on('postgres_changes', {...}, (payload) => {...})
    .subscribe();
  // ...
}, [jobId]);
```

**Depois:**
```tsx
// Sistema de sincronização tripla (Realtime + Polling + Visibility)
useJobStatusSync({
  jobId,
  toolType: 'upscaler',
  enabled: status === 'processing' || isWaitingInQueue,
  onStatusChange: (update) => {
    updateJobStatus(update.status);
    setCurrentStep(update.currentStep || update.status);
    
    if (update.status === 'completed' && update.outputUrl) {
      setOutputImage(update.outputUrl);
      setStatus('completed');
      setProgress(100);
      setIsWaitingInQueue(false);
      toast.success(t('upscalerTool.toast.success'));
    } else if (update.status === 'failed') {
      setStatus('error');
      setLastError({...});
    } else if (update.status === 'running') {
      setStatus('processing');
      setIsWaitingInQueue(false);
    } else if (update.status === 'queued') {
      setIsWaitingInQueue(true);
      setQueuePosition(update.position || 1);
    }
  }
});
```

---

### 3. ATUALIZAR: JobManager para Incluir Função de Query Direta

**Arquivo:** `src/ai/JobManager.ts`

Adicionar função para consulta direta ao banco (usada pelo polling):

```tsx
export async function queryJobStatus(
  toolType: ToolType,
  jobId: string
): Promise<JobUpdate | null> {
  const tableName = TABLE_MAP[toolType];
  
  const { data, error } = await supabase
    .from(tableName)
    .select('status, output_url, error_message, position, current_step')
    .eq('id', jobId)
    .maybeSingle();
  
  if (error || !data) return null;
  
  return {
    status: data.status,
    outputUrl: data.output_url,
    errorMessage: data.error_message,
    position: data.position,
    currentStep: data.current_step,
  };
}
```

---

## Fluxo de Recuperação

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  CENÁRIO: Usuário inicia job e perde conexão Realtime                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  t=0s    Job iniciado, status = 'processing'                               │
│          ├── Realtime subscription ativa (primário)                        │
│          └── Polling NÃO iniciado ainda                                    │
│                                                                             │
│  t=15s   Polling backup inicia silenciosamente                             │
│          └── Verifica banco a cada 5s                                      │
│                                                                             │
│  t=30s   Webhook atualiza banco: status = 'completed', output_url = '...'  │
│          ├── Realtime FALHA (WebSocket desconectado)                       │
│          └── Polling detecta mudança no banco → UI atualiza! ✅            │
│                                                                             │
│  OU                                                                         │
│                                                                             │
│  Usuário sai do app e volta:                                               │
│          └── visibilitychange → Query imediata → UI atualiza! ✅           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Configurações do Polling

| Parâmetro | Valor | Justificativa |
|-----------|-------|---------------|
| Delay inicial | 15s | Dá tempo pro Realtime funcionar (normal é <5s) |
| Intervalo | 5s | Rápido o suficiente para UX, leve para o banco |
| Timeout máximo | 180s (3min) | Evita polling infinito; após isso, job provavelmente falhou |
| Execução | Silenciosa | Usuário não vê, apenas funciona como backup |

---

## Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/hooks/useJobStatusSync.ts` | **CRIAR** | Hook global de sincronização tripla |
| `src/ai/JobManager.ts` | **MODIFICAR** | Adicionar `queryJobStatus()` |
| `src/pages/UpscalerArcanoTool.tsx` | **MODIFICAR** | Usar novo hook |
| `src/pages/PoseChangerTool.tsx` | **MODIFICAR** | Usar novo hook |
| `src/pages/VesteAITool.tsx` | **MODIFICAR** | Usar novo hook |
| `src/pages/VideoUpscalerTool.tsx` | **MODIFICAR** | Remover polling antigo, usar novo hook |

---

## Garantias

| Item | Status |
|------|--------|
| Funciona offline parcial | ✅ Polling recupera quando volta |
| Funciona em qualquer dispositivo | ✅ Não depende de WebSocket |
| Funciona em qualquer rede | ✅ Fallback HTTP direto |
| Não impacta performance | ✅ Polling leve e com timeout |
| Edge Functions | ❌ Nenhuma alteração |
| Webhooks | ❌ Nenhuma alteração |
| Banco de dados | ❌ Nenhuma alteração |
| Lógica de créditos | ❌ Intocada |

---

## Padrão para Ferramentas Futuras

Qualquer nova ferramenta de IA DEVE usar o hook `useJobStatusSync`:

```tsx
import { useJobStatusSync } from '@/hooks/useJobStatusSync';

// Na função do componente:
useJobStatusSync({
  jobId,
  toolType: 'nova_ferramenta',
  enabled: isProcessing,
  onStatusChange: handleStatusUpdate
});
```

Isso garante que TODAS as ferramentas terão o sistema de sincronização tripla automaticamente.
