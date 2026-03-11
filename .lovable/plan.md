

## Auditoria — Remover Fundo: Problemas Encontrados

### Verificação ponto a ponto

| Item | Status | Detalhe |
|------|--------|---------|
| Custos IA — filtro | ✅ OK | "Remover Fundo" está em `TOOL_FILTERS` |
| Custos IA — `getTableName` | ✅ OK | Retorna `bg_remover_jobs` |
| Custos IA — `getInputColumn` | ✅ OK | Retorna `input_url` (antes/depois funciona) |
| Custos IA — badge de cor | ❌ **FALTA** | `getToolBadge` não tem entrada para "Remover Fundo" — aparece sem cor |
| Compressão >2000px | ✅ OK | `ImageCompressionModal` + `optimizeForAI` chamados corretamente |
| Fila centralizada | ✅ OK | Queue manager, enqueue, e startJob com `bg_remover_jobs` |
| Débito de créditos | ✅ OK | `consume_upscaler_credits` no edge function após upload |
| Estorno em falha | ✅ OK | Refund em START_FAILED e START_EXCEPTION |
| Cleanup stale jobs | ✅ OK | `cleanup_all_stale_ai_jobs` inclui bg_remover_jobs |
| Cancel/watchdog | ✅ OK | `user_cancel_ai_job` e `mark_pending_job_as_failed` incluem bg_remover_jobs |
| Arcano Cloner regressão | ✅ OK | `arcano_cloner_jobs` presente em ambas RPCs |
| Download Safari | ✅ OK | Usa `useResilientDownload` com 5 fallbacks |
| **Upload RLS** | ❌ **CRÍTICO** | **Não existe policy de INSERT** para o folder `bg-remover/` no bucket `artes-cloudinary`. Uploads vão falhar com erro de RLS. |

---

### O que precisa ser corrigido

#### 1. Migration SQL — Policy de upload para `bg-remover/`

Criar policy igual às outras ferramentas (pose-changer, veste-ai, etc):
- INSERT para authenticated onde `foldername[1] = 'bg-remover'` e `foldername[2] = auth.uid()`
- UPDATE com mesma condição (para upsert funcionar)

#### 2. Badge de cor no admin

Adicionar `"Remover Fundo": "bg-teal-500/20 text-teal-400 border-teal-500/30"` no mapa de cores em `getToolBadge` dentro de `AdminAIToolsUsageTab.tsx`.

---

### Resumo

São apenas 2 correções: uma migration de RLS (crítica, sem ela o upload falha) e uma linha de cor no admin (cosmética mas necessária pra visualização).

