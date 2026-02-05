
# Continuação da Refatoração - Fase Final

## Resumo do que já foi feito
- ✅ Migração do banco (colunas `credits_charged`, `credits_refunded`, `job_payload`)
- ✅ JobManager centralizado criado (`src/ai/JobManager.ts`)
- ✅ Edge functions atualizadas

## O que falta fazer agora

### 1. Corrigir erro de tipagem no JobManager.ts
**Linha 197**: O TypeScript não consegue inferir o tipo do `job` retornado pelo Supabase com tabela dinâmica.

**Correção**: Usar `as unknown as { id: string }` para forçar a tipagem.

### 2. Repontar as 4 páginas para usar o JobManager

| Página | Mudanças |
|--------|----------|
| `PoseChangerTool.tsx` | Já está bem estruturado (upload → job → run). Migrar para usar `JobManager.cancelJob()` ao invés de update direto |
| `VesteAITool.tsx` | Idem - migrar cancelamento para JobManager |
| `UpscalerArcanoTool.tsx` | **Corrigir ordem**: hoje cria job antes do upload (gera órfão). Inverter para upload → job → run |
| `VideoUpscalerTool.tsx` | **Corrigir ordem**: idem - cria job antes do upload. Inverter ordem |

### 3. Deploy das edge functions
- `runninghub-queue-manager`
- `runninghub-webhook`
- `runninghub-video-upscaler-webhook`

## Arquivos que serão modificados

```
src/ai/JobManager.ts          → Corrigir tipagem (linha 197)
src/pages/PoseChangerTool.tsx → Usar JobManager.cancelJob()
src/pages/VesteAITool.tsx     → Usar JobManager.cancelJob()
src/pages/UpscalerArcanoTool.tsx → Inverter ordem upload→job + usar JobManager
src/pages/VideoUpscalerTool.tsx  → Inverter ordem upload→job + usar JobManager
```

## Hooks que podem ser removidos depois
- `useActiveJobCheck.ts` → Substituído por `JobManager.checkActiveJob()`
- Lógica duplicada de cancelamento nas páginas

## Resultado esperado
- Nenhum job órfão (só cria no banco após upload OK)
- Cancelamento centralizado com reembolso idempotente
- Erros mostrados exatamente como vêm do backend
- Código limpo e sem duplicação
