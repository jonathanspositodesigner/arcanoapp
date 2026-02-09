
## Adicionar Gerador de Avatar nos dashboards de Custos IA e Rentabilidade

### Problema
A tabela `character_generator_jobs` nao esta incluida nas 4 RPCs do banco de dados que alimentam as paginas de Custos IA e Rentabilidade. Tambem falta o mapeamento no frontend.

### Solucao

#### 1. Atualizar 4 RPCs no banco de dados (migration SQL)

Recriar as seguintes funcoes adicionando um bloco `UNION ALL` para `character_generator_jobs` com `tool_name = 'Gerador Avatar'`:

- **`get_ai_tools_usage`** -- lista paginada de jobs (Custos IA)
- **`get_ai_tools_usage_count`** -- contagem total para paginacao
- **`get_ai_tools_usage_summary`** -- cards de resumo (totais, medias)
- **`get_ai_tools_cost_averages`** -- medias de custo (Rentabilidade)

A tabela `character_generator_jobs` possui todas as colunas necessarias: `rh_cost`, `user_credit_cost`, `waited_in_queue`, `queue_wait_seconds`, `started_at`, `completed_at`, `status`, `error_message`, `user_id`, `created_at`.

#### 2. Atualizar frontend - AdminAIToolsUsageTab.tsx

- Adicionar `{ value: "Gerador Avatar", label: "Gerador Avatar" }` no array `TOOL_FILTERS`
- Adicionar cor no `getToolBadge`: `"Gerador Avatar": "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"`
- Adicionar mapeamento no `getTableName`: `case "Gerador Avatar": return "character_generator_jobs";`

#### 3. Atualizar frontend - AIToolsProfitTable.tsx

- Adicionar `"Gerador Avatar": 100` no objeto `TOOL_CREDIT_COSTS` (100 creditos conforme definido na ferramenta)

### Detalhes Tecnicos

Cada RPC sera recriada com `CREATE OR REPLACE FUNCTION` adicionando o bloco UNION ALL para a tabela `character_generator_jobs`. As colunas numericas usarao cast `::NUMERIC` para evitar erros de type mismatch no UNION ALL, seguindo o padrao ja estabelecido.

Arquivos modificados:
- 1 migration SQL (4 RPCs)
- `src/components/admin/AdminAIToolsUsageTab.tsx` (3 pontos)
- `src/components/admin/AIToolsProfitTable.tsx` (1 ponto)
