
# Plano: Integrar MovieLed Maker no dashboard Custos IA

## Diagnóstico

### Notificação sonora: OK
O MovieLed Maker já usa `useAIJob` (registerJob/updateJobStatus) + `useJobStatusSync` com `onGlobalStatusChange: updateJobStatus`. O AIJobContext toca o som automaticamente quando o status chega em `completed`/`failed`. Nada a fazer aqui.

### Dashboard Custos IA: FALTANDO
O MovieLed Maker **não aparece** na página `/admin-prompts/custos-ia`. Falta:

1. **4 RPCs no banco** que precisam de UNION ALL com `movieled_maker_jobs`:
   - `get_ai_tools_usage` (versão paginada)
   - `get_ai_tools_usage` (versão com filtros)
   - `get_ai_tools_usage_count`
   - `get_ai_tools_usage_summary`
   - `get_ai_tools_cost_averages`

2. **Frontend** (`AdminAIToolsUsageTab.tsx`):
   - Adicionar `"MovieLed Maker"` ao array `TOOL_FILTERS`
   - Adicionar case `"MovieLed Maker": return "movieled_maker_jobs"` no `getTableName()`

3. **Tabela de Custos** (`AIToolsProfitTable.tsx`):
   - Definir custo de créditos do MovieLed Maker (500 para Wan 2.2, 850 para Veo 3.1)

## Mudanças

### 1. Migration SQL
Recriar as 5 RPCs adicionando `UNION ALL SELECT ... FROM movieled_maker_jobs` com `'MovieLed Maker'` como tool_name, seguindo o mesmo padrão das outras ferramentas (bg_remover, flyer_maker, etc.).

### 2. `src/components/admin/AdminAIToolsUsageTab.tsx`
- Adicionar `{ value: "MovieLed Maker", label: "MovieLed Maker" }` ao `TOOL_FILTERS`
- Adicionar `case "MovieLed Maker": return "movieled_maker_jobs"` ao `getTableName()`

### 3. `src/components/admin/AIToolsProfitTable.tsx`
- Verificar se o MovieLed Maker aparece automaticamente via RPC ou se precisa de entrada manual de custos

## Resumo
| Item | Status |
|------|--------|
| Som de notificação | Já funciona |
| Trava de navegação (job ativo) | Já funciona |
| Dashboard Custos IA - RPCs | Precisa adicionar UNION ALL |
| Dashboard Custos IA - Filtros frontend | Precisa adicionar |
| Dashboard Custos IA - Tabela de nomes | Precisa adicionar |
