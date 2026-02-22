
## Resultado da Auditoria - Flyer Maker

### O que JA esta pronto (checklist completo)

- Tabela `flyer_maker_jobs` criada com RLS e Realtime
- `cleanup_all_stale_ai_jobs` - inclui flyer_maker_jobs
- `user_cancel_ai_job` - inclui flyer_maker_jobs
- `mark_pending_job_as_failed` - inclui flyer_maker_jobs
- `get_ai_tools_usage` (versao paginada com p_page) - inclui flyer_maker_jobs
- `get_ai_tools_usage_count` - inclui flyer_maker_jobs
- `get_ai_tools_usage_summary` - inclui flyer_maker_jobs
- `get_ai_tools_cost_averages` - inclui flyer_maker_jobs
- `src/ai/JobManager.ts` - flyer_maker mapeado
- `supabase/functions/runninghub-flyer-maker/index.ts` - criado e deployado
- `supabase/functions/runninghub-queue-manager/index.ts` - flyer_maker_jobs adicionado (WEBAPP_IDS, JOB_TABLES, TOOL_META, startJobOnRunningHub)
- `supabase/functions/runninghub-webhook/index.ts` - flyer_maker_jobs no IMAGE_JOB_TABLES
- `src/pages/FlyerMakerTool.tsx` - pagina criada
- `src/App.tsx` - rota /flyer-maker registrada
- `src/pages/FerramentasIAAplicativo.tsx` - card adicionado
- `src/components/admin/AdminAIToolsUsageTab.tsx` - mapeamento adicionado
- `src/hooks/useNotificationTokenRecovery.ts` - tipo atualizado
- `src/hooks/useJobPendingWatchdog.ts` - suporta flyer_maker

### O que FALTA (1 item encontrado)

**RPC `get_ai_tools_usage` (versao sem paginacao, com p_tool_filter)** - Esta RPC NAO inclui `flyer_maker_jobs` nem `character_generator_jobs`. Ela so vai ate `arcano_cloner_jobs`. Isso significa que no dashboard admin, ao filtrar por "Flyer Maker" ou visualizar o historico sem paginacao, os jobs do Flyer Maker nao aparecerao.

### Correcao necessaria

Atualizar a RPC `get_ai_tools_usage` (versao sem paginacao) adicionando dois UNION ALL:
1. `character_generator_jobs` como 'Gerador Avatar'
2. `flyer_maker_jobs` como 'Flyer Maker'

Isso alinha essa versao da RPC com a versao paginada que ja tem ambas as tabelas.

### Resumo

A implementacao esta 99% completa. Apenas uma RPC administrativa precisa de atualizacao para garantir visibilidade total no dashboard de custos.
