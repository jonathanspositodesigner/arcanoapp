
# Plano de Limpeza Completa das Ferramentas de IA

## 1. Varredura de Conflitos - Resultados

### Lista de conflitos identificados:

| Arquivo | O que é | Conflito | Decisão |
|---------|---------|----------|---------|
| `src/pages/UpscalerArcanoTool.tsx` | Insert direto (linha 389-400) + invoke manual (linha 415+) | Bypass do JobManager | **Manter** - Funciona corretamente, migração futura |
| `src/pages/PoseChangerTool.tsx` | Insert direto (linha 293-303) + invoke manual (linha 316+) | Bypass do JobManager | **Manter** - Funciona corretamente |
| `src/pages/VesteAITool.tsx` | Insert direto (linha 293-303) + invoke manual (linha 316+) | Bypass do JobManager | **Manter** - Funciona corretamente |
| `src/pages/VideoUpscalerTool.tsx` | Insert direto (linha 311-323) + Polling fallback (linhas 165-223) | Polling gasta recursos Cloud | **Manter polling** - Backup necessário para vídeos |
| `runninghub-video-upscaler` | Funções locais `getNextQueuedJob` e `updateQueuePositions` (linhas 77-106) | Duplica lógica do QueueManager | **Remover** - Delegar 100% ao central |
| **CRÍTICO**: Todas as Edge Functions | Flag `credits_charged` NÃO é atualizada após consumo | Reembolso automático quebrado | **Corrigir** - Adicionar update da flag |

## 2. Remoções e Correções

### A) Backend - Correções Críticas (Edge Functions)

**Problema**: As 4 edge functions consomem créditos mas NÃO marcam `credits_charged = true`, impedindo o reembolso automático pelo QueueManager.

**Correção**: Adicionar em cada função, após sucesso do `consume_upscaler_credits`:
```typescript
await supabase.from('*_jobs').update({ 
  credits_charged: true,
  user_credit_cost: creditCost 
}).eq('id', jobId);
```

| Edge Function | Local do consumo | Ação |
|---------------|------------------|------|
| `runninghub-upscaler` | Linha 527-534 | Adicionar update linha ~562 |
| `runninghub-pose-changer` | Linha 453-460 | Adicionar update linha ~487 |
| `runninghub-veste-ai` | Linha 466-473 | Adicionar update após consumo |
| `runninghub-video-upscaler` | Linha 109-131 | Adicionar update após consumo |

### B) Backend - Remoção de lógica duplicada

**Arquivo**: `supabase/functions/runninghub-video-upscaler/index.ts`

| Função | Linhas | Ação |
|--------|--------|------|
| `getNextQueuedJob()` | 77-88 | **Remover** - QueueManager já faz isso |
| `updateQueuePositions()` | 91-106 | **Remover** - QueueManager já faz isso |

### C) Frontend - Manter como está

As páginas funcionam corretamente com a lógica atual. A migração completa para JobManager pode ser feita futuramente sem urgência, pois:
- `checkActiveJob()` do JobManager já é usado
- `cancelJob()` do JobManager já é usado  
- O fluxo upload→job→invoke funciona corretamente

## 3. Mapa de Ferramentas → Workflows (Confirmado)

| Ferramenta | WebApp IDs | Edge Function | Webhook |
|------------|------------|---------------|---------|
| **Upscaler Arcano** | Pro: `2015865378030755841`, Standard: `2017030861371219969`, Longe: `2017343414227963905`, FotoAntiga: `2018913880214343681`, Comida: `2015855359243587585`, Logo: `2019239272464785409`, Render3D: `2019234965992509442` | `runninghub-upscaler/run` | `runninghub-webhook` |
| **Pose Changer** | `2018451429635133442` (Nodes: 27=Person, 60=Pose) | `runninghub-pose-changer/run` | `runninghub-webhook` |
| **Veste AI** | `2018755100210106369` (Nodes: 41=Person, 43=Clothing) | `runninghub-veste-ai/run` | `runninghub-webhook` |
| **Video Upscaler** | `2018810750139109378` (Node: 3=Video) | `runninghub-video-upscaler/run` | `runninghub-video-upscaler-webhook` |

## 4. Anti-Job-Preso (Já Implementado)

| Mecanismo | Localização | Funcionamento |
|-----------|-------------|---------------|
| Cleanup oportunístico | `QueueManager /check, /process-next` | RPC `cleanup_all_stale_ai_jobs` a cada requisição |
| Timeout 10min | Todas as edge functions | `EdgeRuntime.waitUntil()` cancela jobs presos |
| Webhook idempotente | `QueueManager /finish` | Verifica `credits_charged` + `credits_refunded` |

## 5. Guardrails para Ferramentas Futuras

### A) Criar documentação `docs/job-system.md`

```markdown
# Sistema de Jobs de IA - Regras Obrigatórias

## Regras de Negócio
1. **Limite global**: Máximo 3 jobs simultâneos (STARTING + RUNNING)
2. **FIFO global**: Fila única entre todas as ferramentas
3. **1 job por usuário**: Verificar via `/check-user-active`
4. **Erro = terminal**: FAILED + reembolso, sem retry automático
5. **Webhook finaliza**: Só QueueManager `/finish` atualiza status final

## Contrato Obrigatório (Nova Ferramenta)
1. Chamar `checkActiveJob(userId)` antes de processar
2. Upload de arquivos ANTES de criar job (previne órfãos)
3. Após consumir créditos: `update({ credits_charged: true })`
4. Delegar fila ao QueueManager `/check` e `/enqueue`
5. Webhook deve chamar QueueManager `/finish`
```

### B) Checagem simples (ESLint rule sugerida)

Banir import direto de tabelas de jobs em páginas:
```
// Proibido: supabase.from('upscaler_jobs').insert()
// Permitido: JobManager.createJob()
```

## 6. Arquitetura Final

```
┌────────────────────────────────────────────────────────────┐
│                      FRONTEND                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ src/ai/JobManager.ts (Única fonte de verdade)        │  │
│  │ • checkActiveJob() • cancelJob() • subscribeToJob()  │  │
│  └──────────────────────────────────────────────────────┘  │
│              ↓                                              │
│  4 Tool Pages: upload → insert → invoke edge function      │
└────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────┐
│                      BACKEND                                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ runninghub-queue-manager (Orquestrador Central)      │  │
│  │ • /check • /enqueue • /finish • /process-next        │  │
│  └──────────────────────────────────────────────────────┘  │
│              ↓                                              │
│  4 Edge Functions: validação → créditos → RunningHub       │
│              ↓                                              │
│  2 Webhooks: delegam para QueueManager /finish             │
└────────────────────────────────────────────────────────────┘
```

## Resumo das Ações

| Prioridade | Ação | Arquivos |
|------------|------|----------|
| **CRÍTICA** | Adicionar `credits_charged = true` após consumo de créditos | 4 edge functions |
| ALTA | Remover funções duplicadas de fila | `runninghub-video-upscaler` |
| MÉDIA | Criar documentação do sistema | `docs/job-system.md` |
| BAIXA | Migrar páginas para usar JobManager completo | 4 tool pages (futuro) |
