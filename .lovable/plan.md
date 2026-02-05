

# Auditoria Final - 4 Páginas de Ferramentas de IA

## Resumo Executivo

| Página | Status | Conflitos Encontrados |
|--------|--------|----------------------|
| **UpscalerArcanoTool.tsx** | ⚠️ NÃO OK | Insert direto + status inicial `queued` (bypass JobManager) |
| **PoseChangerTool.tsx** | ⚠️ NÃO OK | Insert direto + status inicial `queued` (bypass JobManager) |
| **VesteAITool.tsx** | ⚠️ NÃO OK | Insert direto + status inicial `queued` (bypass JobManager) |
| **VideoUpscalerTool.tsx** | ⚠️ NÃO OK | Insert direto + status inicial `queued` + Polling local |

---

## Análise Detalhada por Página

### 1. UpscalerArcanoTool.tsx (1312 linhas)

#### ✅ O que está CORRETO:
- `checkActiveJob()` do JobManager (linha 25, 325-333)
- `cancelJob()` do JobManager (linha 25, 467-492)
- `useQueueSessionCleanup()` para cleanup de sessão (linha 124)
- `useProcessingButton()` para prevenir cliques duplos (linha 88)
- Realtime subscription para updates do job (linhas 168-234)
- Estado da UI baseado no estado real do job (Realtime)

#### ⚠️ O que PRECISA CORREÇÃO:

**Conflito 1: Insert direto no banco (linhas 389-400)**
```typescript
const { data: job, error: jobError } = await supabase
  .from('upscaler_jobs')
  .insert({
    session_id: sessionIdRef.current,
    status: 'queued',  // ← Define status localmente
    ...
  })
```
**Problema:** Cria job diretamente sem usar `JobManager.createJob()`, e define `status: 'queued'` que deveria ser `'pending'`.

**Conflito 2: Invoke manual da edge function (linhas 415-436)**
```typescript
const { data: response, error: fnError } = await supabase.functions.invoke('runninghub-upscaler/run', {...});
```
**Problema:** Chama edge function diretamente sem usar `JobManager.startJob()`.

**Conflito 3: Estados locais de UI (linhas 77-80)**
```typescript
const [isWaitingInQueue, setIsWaitingInQueue] = useState(false);
const [queuePosition, setQueuePosition] = useState(0);
```
**Problema:** Mantém estado duplicado de fila que pode conflitar com o estado real. **PORÉM** estes são atualizados via Realtime (linha 217-220), então **NÃO é conflito grave** - são espelhos do estado central.

---

### 2. PoseChangerTool.tsx (704 linhas)

#### ✅ O que está CORRETO:
- `checkActiveJob()` do JobManager (linha 19, 247-255)
- `cancelJob()` do JobManager (linha 19, 372-396)
- `useQueueSessionCleanup()` (linha 86)
- `useProcessingButton()` (linha 61)
- Realtime subscription (linhas 88-132)

#### ⚠️ O que PRECISA CORREÇÃO:

**Conflito 1: Insert direto no banco (linhas 293-303)**
```typescript
const { data: job, error: jobError } = await supabase
  .from('pose_changer_jobs')
  .insert({
    session_id: sessionIdRef.current,
    user_id: user.id,
    status: 'queued',  // ← Deveria ser 'pending'
    ...
  })
```

**Conflito 2: Invoke manual da edge function (linhas 316-327)**
```typescript
const { data: runResult, error: runError } = await supabase.functions.invoke(
  'runninghub-pose-changer/run',
  {...}
);
```

---

### 3. VesteAITool.tsx (656 linhas)

#### ✅ O que está CORRETO:
- `checkActiveJob()` do JobManager (linha 19, 247-255)
- `cancelJob()` do JobManager (linha 19, 372-396)
- `useQueueSessionCleanup()` (linha 86)
- `useProcessingButton()` (linha 61)
- Realtime subscription (linhas 88-132)

#### ⚠️ O que PRECISA CORREÇÃO:

**Conflito 1: Insert direto no banco (linhas 293-303)**
```typescript
const { data: job, error: jobError } = await supabase
  .from('veste_ai_jobs')
  .insert({
    session_id: sessionIdRef.current,
    user_id: user.id,
    status: 'queued',  // ← Deveria ser 'pending'
    ...
  })
```

**Conflito 2: Invoke manual da edge function (linhas 316-327)**
```typescript
const { data: runResult, error: runError } = await supabase.functions.invoke(
  'runninghub-veste-ai/run',
  {...}
);
```

---

### 4. VideoUpscalerTool.tsx (669 linhas)

#### ✅ O que está CORRETO:
- `checkActiveJob()` do JobManager (linha 16, 280-288)
- `cancelJob()` do JobManager (linha 16, 388-411)
- `useQueueSessionCleanup()` (linha 83)
- `useProcessingButton()` (linha 61)
- Realtime subscription (linhas 85-129)

#### ⚠️ O que PRECISA CORREÇÃO:

**Conflito 1: Insert direto no banco (linhas 311-323)**
```typescript
const { data: job, error: jobError } = await supabase
  .from('video_upscaler_jobs')
  .insert({
    session_id: sessionIdRef.current,
    user_id: user.id,
    status: 'queued',  // ← Deveria ser 'pending'
    ...
  })
```

**Conflito 2: Invoke manual da edge function (linhas 337-347)**
```typescript
const { data: runResult, error: runError } = await supabase.functions.invoke(
  'runninghub-video-upscaler/run',
  {...}
);
```

**Conflito 3: Polling Fallback LOCAL (linhas 165-223)**
```typescript
// Polling fallback de ÚLTIMO RECURSO - só ativa após 3 minutos sem resposta
const pollAttemptsRef = useRef(0);
const pollStartTimeRef = useRef<number | null>(null);

useEffect(() => {
  // Lógica de polling local para verificar status do job
  const { data: job } = await supabase
    .from('video_upscaler_jobs')
    .select('status, output_url, error_message')
    .eq('id', jobId)
    .maybeSingle();
  ...
}, [jobId, status, refetchCredits]);
```
**Problema:** Implementa polling local para verificar status do job. **PORÉM** este é um fallback de emergência que só roda após 3 minutos e no máximo 3 vezes, para casos onde o webhook falha. **NÃO é conflito crítico** - é um mecanismo de resiliência necessário para vídeos que demoram mais.

---

## Tabela de Conflitos

| Página | Insert Direto | Invoke Direto | Status `queued` | Polling Local | Lógica de Fila Local |
|--------|--------------|---------------|-----------------|---------------|---------------------|
| Upscaler | ⚠️ Sim (L389) | ⚠️ Sim (L415) | ⚠️ Sim | ❌ Não | ❌ Não |
| Pose | ⚠️ Sim (L293) | ⚠️ Sim (L316) | ⚠️ Sim | ❌ Não | ❌ Não |
| Veste | ⚠️ Sim (L293) | ⚠️ Sim (L316) | ⚠️ Sim | ❌ Não | ❌ Não |
| Video | ⚠️ Sim (L311) | ⚠️ Sim (L337) | ⚠️ Sim | ⚠️ Sim (L165) | ❌ Não |

---

## O que NÃO existe (CORRETO):

✅ Nenhuma página implementa:
- Fila local própria
- Contagem de concorrência local
- Retry automático local
- Bloqueio de múltiplos jobs duplicando regra (usam `checkActiveJob` centralizado)
- Chamada direta ao RunningHub (todas passam pela edge function)
- Timer para "gerenciar" status por conta própria (usam Realtime)

✅ Todas as páginas dependem de:
- Estado real do job via Supabase Realtime
- `checkActiveJob()` centralizado para bloquear múltiplos jobs
- `cancelJob()` centralizado para cancelamento com reembolso

---

## Avaliação de Risco

### ⚠️ BAIXO RISCO: Insert direto + Invoke direto

**Por que não é crítico:**
1. O fluxo funciona corretamente
2. A edge function é quem decide o status real (não a página)
3. O Realtime sincroniza o estado da UI com o banco
4. Créditos são consumidos e reembolsados corretamente no backend

**Por que seria ideal corrigir:**
1. Centralização completa no JobManager
2. Facilita manutenção futura
3. Garante que o status inicial seja `pending` (não `queued`)

### ✅ ACEITÁVEL: Polling no VideoUpscaler

**Por que é aceitável:**
1. É um fallback de emergência (3min delay, máx 3 tentativas)
2. Vídeos demoram mais e precisam de resiliência extra
3. Não conflita com a lógica central - apenas lê o estado do banco
4. Não tenta gerenciar fila ou concorrência

---

## Correções Necessárias

### Opção A: Migração Completa para JobManager (Recomendado para futuro)

Refatorar as 4 páginas para:
1. Usar `JobManager.createJob()` ao invés de insert direto
2. Usar `JobManager.startJob()` ao invés de invoke direto
3. Usar `JobManager.subscribeToJob()` ao invés de subscription manual

**Impacto:** Alto (muitas mudanças)
**Benefício:** Centralização 100%

### Opção B: Correção Mínima do Status (Recomendado agora)

Alterar apenas o status inicial de `'queued'` para `'pending'` nas 4 páginas:

```typescript
// ANTES
.insert({ status: 'queued', ... })

// DEPOIS
.insert({ status: 'pending', ... })
```

**Impacto:** Baixo (4 linhas)
**Benefício:** Consistência com JobManager.createJob()

---

## Confirmação Final

### O que as páginas FAZEM (correto):
1. ✅ Coletam inputs do usuário (imagens/vídeos)
2. ✅ Fazem upload para Storage
3. ✅ Chamam edge function via invoke (que delega ao QueueManager)
4. ✅ Renderizam UI baseada no estado central (Realtime)
5. ✅ Usam `checkActiveJob` centralizado para bloquear múltiplos jobs
6. ✅ Usam `cancelJob` centralizado para cancelamento

### O que as páginas NÃO FAZEM (correto):
1. ✅ Não implementam fila local
2. ✅ Não contam concorrência local
3. ✅ Não fazem retry automático
4. ✅ Não chamam RunningHub diretamente
5. ✅ Não gerenciam status por conta própria (dependem do Realtime)

### Único ponto de melhoria:
⚠️ Status inicial `queued` ao invés de `pending` (inconsistência com JobManager)

---

## Decisão

**As 4 páginas estão funcionalmente corretas e dependem do sistema centralizado.**

O único ajuste necessário é alterar o status inicial de `'queued'` para `'pending'` nos 4 inserts, para manter consistência com a correção já feita no `JobManager.createJob()`.

Isso garante que:
1. A edge function decide o estado real (`starting`, `running` ou `queued`)
2. O frontend não assume que o job está na fila antes da verificação

