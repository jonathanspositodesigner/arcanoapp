
# Plano: Fila Global de Jobs AI

## Problema Identificado

As Edge Functions contam jobs apenas de suas próprias tabelas, permitindo que mais de 3 jobs rodem simultaneamente quando são de ferramentas diferentes.

## Solução

Modificar ambas as Edge Functions para contar jobs `running` de **todas as tabelas** antes de decidir se enfileira ou inicia.

---

## Alteração 1: runninghub-upscaler/index.ts

**Localização:** Linhas 468-474

**Antes:**
```typescript
const { count: runningCount } = await supabase
  .from('upscaler_jobs')
  .select('*', { count: 'exact', head: true })
  .eq('status', 'running');

console.log(`[RunningHub] Running jobs: ${runningCount}/${MAX_CONCURRENT_JOBS}`);
```

**Depois:**
```typescript
// Count running jobs across ALL AI tools (global queue)
const { count: upscalerRunning } = await supabase
  .from('upscaler_jobs')
  .select('*', { count: 'exact', head: true })
  .eq('status', 'running');

const { count: poseRunning } = await supabase
  .from('pose_changer_jobs')
  .select('*', { count: 'exact', head: true })
  .eq('status', 'running');

const runningCount = (upscalerRunning || 0) + (poseRunning || 0);

console.log(`[RunningHub] Global running jobs: ${runningCount}/${MAX_CONCURRENT_JOBS} (upscaler: ${upscalerRunning || 0}, pose: ${poseRunning || 0})`);
```

---

## Alteração 2: runninghub-pose-changer/index.ts

**Localização:** Linhas 416-422

**Antes:**
```typescript
const { count: runningCount } = await supabase
  .from('pose_changer_jobs')
  .select('*', { count: 'exact', head: true })
  .eq('status', 'running');

console.log(`[PoseChanger] Running jobs: ${runningCount}/${MAX_CONCURRENT_JOBS}`);
```

**Depois:**
```typescript
// Count running jobs across ALL AI tools (global queue)
const { count: upscalerRunning } = await supabase
  .from('upscaler_jobs')
  .select('*', { count: 'exact', head: true })
  .eq('status', 'running');

const { count: poseRunning } = await supabase
  .from('pose_changer_jobs')
  .select('*', { count: 'exact', head: true })
  .eq('status', 'running');

const runningCount = (upscalerRunning || 0) + (poseRunning || 0);

console.log(`[PoseChanger] Global running jobs: ${runningCount}/${MAX_CONCURRENT_JOBS} (upscaler: ${upscalerRunning || 0}, pose: ${poseRunning || 0})`);
```

---

## Comportamento Final

| Situação | Antes | Depois |
|----------|-------|--------|
| 3 upscaler rodando, tenta pose | Inicia (bug) | Enfileira |
| 2 upscaler + 1 pose rodando, tenta upscaler | Inicia (bug) | Enfileira |
| 1 upscaler + 1 pose, tenta qualquer | Inicia | Inicia |
| Fila: 3 upscaler + 2 pose na fila | Processa separado | Processa por ordem global |

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/runninghub-upscaler/index.ts` | Contar jobs de ambas tabelas |
| `supabase/functions/runninghub-pose-changer/index.ts` | Contar jobs de ambas tabelas |

---

## Escalabilidade Futura

Quando novas ferramentas forem adicionadas (Outfit Changer, 3D Stamp Forge, etc.), basta:

1. Adicionar mais uma query para a nova tabela
2. Somar no `runningCount` total

Exemplo futuro:
```typescript
const { count: outfitRunning } = await supabase
  .from('outfit_changer_jobs')
  .select('*', { count: 'exact', head: true })
  .eq('status', 'running');

const runningCount = (upscalerRunning || 0) + (poseRunning || 0) + (outfitRunning || 0);
```
