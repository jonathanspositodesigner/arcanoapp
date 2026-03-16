

## Plano: Painel de Erros Detalhados na Página Custos IA

### Problema Atual
A página admin "Custos IA" mostra erros apenas como um tooltip minúsculo com `error_message`. As tabelas de jobs armazenam dados ricos de debug (`failed_at_step`, `step_history`, `current_step`, `raw_api_response`, `raw_webhook_payload`) que nunca são exibidos.

### Mudanças

#### 1. Nova aba/seção "Log de Erros" no `AdminAIToolsUsageTab.tsx`
Adicionar um filtro de status "Somente Falhas" e uma seção dedicada que aparece acima da tabela principal com:
- **Cards de resumo de erros**: total de falhas por ferramenta, por tipo de erro (`failed_at_step`), taxa de erro (%)
- **Tabela de erros expandida**: quando o status é `failed`, mostrar uma linha expandível com todos os detalhes

#### 2. Modal de detalhes do erro (ao clicar num job com falha)
Quando o job clicado tem status `failed`, o modal existente vai buscar campos adicionais da tabela correspondente:
- `error_message` (completo, sem truncar)
- `failed_at_step` - em qual etapa falhou
- `current_step` - último step atingido
- `step_history` - timeline completa do job (JSON formatado)
- `raw_api_response` - resposta bruta da API (JSON)
- `raw_webhook_payload` - payload do webhook (JSON)
- `credits_charged` / `credits_refunded` - estado dos créditos

**Implementação**: No `handleJobClick`, quando `record.status !== 'completed'`, buscar esses campos extras via `supabase.from(tableName).select('error_message, failed_at_step, current_step, step_history, raw_api_response, raw_webhook_payload, credits_charged, credits_refunded, task_id, api_account').eq('id', record.id)`.

#### 3. Filtro de status na tabela principal
Adicionar um `Select` de filtro por status: "Todos", "Concluídos", "Falhas", "Em processamento", "Na fila"
- Filtro "Falhas" mostra apenas jobs com `status = 'failed'`

#### 4. Novo card de resumo: "Erros por Tipo"
Na seção de summary cards, adicionar:
- Card com taxa de falha (% falhas/total)
- Ao clicar, mostra breakdown por `failed_at_step` (pending_timeout, webhook_received, uploading_user_image, etc.)

#### 5. Coluna "Etapa do Erro" na tabela
Adicionar coluna `failed_at_step` na tabela principal para jobs com status `failed`, mostrando exatamente onde falhou sem precisar abrir modal.

### Mudanças no RPC (migration)
Adicionar `failed_at_step` ao retorno de `get_ai_tools_usage` - campo já existe em todas as tabelas de jobs.

### Arquivos modificados
1. **Migration SQL** - Recriar `get_ai_tools_usage` adicionando `failed_at_step` ao RETURNS TABLE
2. **`AdminAIToolsUsageTab.tsx`** - Filtro de status, coluna `failed_at_step`, modal de erro expandido com dados completos, cards de taxa de erro

