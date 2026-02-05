

# Unificação das Ferramentas de IA - Hook Centralizado

## Problema Atual

Cada ferramenta (Upscaler, Pose Changer, Veste AI, Video Upscaler) tem **~400-500 linhas de código duplicado** para:
- Prevenção de duplicação (`processingRef`)
- Gerenciamento de sessão (`sessionIdRef`)
- Timeout de 10 minutos
- Conexão Realtime com Supabase
- Verificação de créditos
- Verificação de job ativo
- Estados de processamento
- Limpeza de fila ao sair da página
- Upload para Storage
- Tratamento de erros
- Rotação de mensagens de fila

**Total de duplicação:** ~1600 linhas espalhadas em 4 arquivos

---

## Solução: `useAIToolProcessor` Hook Unificado

Criar **UM ÚNICO HOOK** que encapsula toda a lógica comum. As ferramentas individuais passam apenas:
- Nome da tabela de jobs
- Edge function a chamar
- Custo em créditos
- Callback para montar o payload específico

---

## Estrutura do Hook

```text
src/hooks/useAIToolProcessor.ts
├── Estados
│   ├── status: 'idle' | 'uploading' | 'processing' | 'waiting' | 'completed' | 'error'
│   ├── progress: number
│   ├── jobId: string | null
│   ├── queuePosition: number
│   ├── outputUrl: string | null
│   └── error: ErrorDetails | null
│
├── Refs (internos)
│   ├── processingRef (lock síncrono anti-duplicação)
│   ├── sessionIdRef (UUID da sessão)
│   ├── realtimeChannelRef (subscription Supabase)
│   └── timeoutRef (10 min fallback)
│
├── Hooks Internos Consumidos
│   ├── useQueueSessionCleanup (auto-cancel ao sair)
│   ├── useJobReconciliation (polling silencioso)
│   └── useActiveJobCheck (bloqueio de jobs simultâneos)
│
├── Funções Expostas
│   ├── startJob(inputData) - Inicia processamento
│   ├── cancelJob() - Cancela job na fila
│   ├── reset() - Volta ao estado inicial
│   └── uploadToStorage(file, prefix) - Upload helper
│
└── Retorno
    └── { status, progress, jobId, queuePosition, outputUrl, error, 
          startJob, cancelJob, reset, uploadToStorage, isProcessing }
```

---

## Configuração por Ferramenta

Cada ferramenta passa uma configuração simples:

```typescript
interface AIToolConfig {
  toolName: string;                    // 'upscaler' | 'pose-changer' | 'veste-ai' | 'video-upscaler'
  tableName: string;                   // 'upscaler_jobs' | 'pose_changer_jobs' | etc.
  edgeFunctionPath: string;            // 'runninghub-upscaler/run'
  creditCost: number;                  // 60, 80, 150
  storagePath: string;                 // 'upscaler' | 'pose-changer' | etc.
  successMessage?: string;             // Toast de sucesso
  queueMessages?: QueueMessage[];      // Mensagens personalizadas de espera
}
```

---

## Exemplo de Uso (Pose Changer Refatorado)

```typescript
// ANTES: ~500 linhas de código
// DEPOIS: ~150 linhas focadas só na UI

const PoseChangerTool = () => {
  const { user } = usePremiumStatus();
  const { balance: credits } = useUpscalerCredits(user?.id);
  
  const {
    status,
    progress,
    queuePosition,
    outputUrl,
    isProcessing,
    startJob,
    cancelJob,
    reset,
    uploadToStorage,
  } = useAIToolProcessor({
    toolName: 'pose-changer',
    tableName: 'pose_changer_jobs',
    edgeFunctionPath: 'runninghub-pose-changer/run',
    creditCost: 60,
    storagePath: 'pose-changer',
    successMessage: 'Pose alterada com sucesso!',
  });

  // Estados específicos da UI
  const [personImage, setPersonImage] = useState<string | null>(null);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);

  const handleProcess = async () => {
    // Comprime e faz upload
    const personUrl = await uploadToStorage(personFile, 'person');
    const referenceUrl = await uploadToStorage(referenceFile, 'reference');
    
    // Inicia o job com payload específico
    await startJob({
      personImageUrl: personUrl,
      referenceImageUrl: referenceUrl,
    });
  };

  // ... resto é só UI pura (inputs, preview, botões)
};
```

---

## Arquivos a Criar/Modificar

### Novos Arquivos
1. **`src/hooks/useAIToolProcessor.ts`** (~250 linhas)
   - Hook principal com toda lógica unificada

2. **`src/types/ai-tools.ts`** (~50 linhas)
   - Tipos compartilhados (AIToolConfig, ProcessingStatus, etc.)

### Arquivos a Refatorar
3. **`src/pages/PoseChangerTool.tsx`**
   - De ~500 linhas → ~150 linhas (só UI)

4. **`src/pages/VesteAITool.tsx`**
   - De ~500 linhas → ~150 linhas (só UI)

5. **`src/pages/VideoUpscalerTool.tsx`**
   - De ~700 linhas → ~250 linhas (só UI + lógica de trim)

6. **`src/pages/UpscalerArcanoTool.tsx`**
   - De ~1350 linhas → ~600 linhas (só UI + configurações de prompt)

### Arquivos a Deletar (código migrado para hook)
- Lógica duplicada será removida de cada página

---

## Benefícios

| Métrica | Antes | Depois |
|---------|-------|--------|
| Linhas duplicadas | ~1600 | 0 |
| Linhas totais AI tools | ~3050 | ~1300 |
| Arquivos para corrigir bug | 4 | 1 |
| Consistência entre ferramentas | Parcial | 100% |

---

## Fluxo Interno do Hook

```text
startJob(payload)
    │
    ├── if (processingRef.current) return ❌
    │
    ├── processingRef.current = true ✓
    │
    ├── checkActiveJob() → hasActiveJob? → BLOCK
    │
    ├── checkCredits() → insufficient? → BLOCK
    │
    ├── setStatus('uploading')
    │
    ├── createJobInDB() → jobId
    │
    ├── subscribeToRealtime(jobId)
    │
    ├── startTimeout(10min)
    │
    ├── callEdgeFunction(payload)
    │       │
    │       ├── success → setStatus('processing')
    │       ├── queued → setStatus('waiting') + setQueuePosition
    │       └── error → setStatus('error')
    │
    └── Realtime listener
            │
            ├── 'completed' → setOutputUrl + setStatus('completed') + processingRef = false
            ├── 'failed' → setStatus('error') + processingRef = false
            ├── 'running' → setStatus('processing')
            └── 'queued' → setStatus('waiting') + update position
```

---

## Ordem de Implementação

1. Criar `src/types/ai-tools.ts` com tipos compartilhados
2. Criar `src/hooks/useAIToolProcessor.ts` com lógica completa
3. Refatorar `PoseChangerTool.tsx` (mais simples, serve de validação)
4. Refatorar `VesteAITool.tsx`
5. Refatorar `VideoUpscalerTool.tsx`
6. Refatorar `UpscalerArcanoTool.tsx` (mais complexo, por último)
7. Testar todas as ferramentas

