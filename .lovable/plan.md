
## O que eu encontrei (causa real do “sumiu tudo”)

O painel “Custos IA / Uso Ferramentas” está quebrando porque a RPC **`get_ai_tools_usage` (a versão com paginação)** ainda está com o SQL antigo e **continua retornando `INTEGER`** nas colunas de custo, mas a assinatura da função exige **`NUMERIC`**.

Erro confirmado no backend:
- `structure of query does not match function result type`
- `Returned type integer does not match expected type numeric in column 8 (rh_cost)`

Detalhe importante: existem **duas** funções com o mesmo nome `get_ai_tools_usage` (overload):
1) **Paginação**: `(p_start_date, p_end_date, p_page, p_page_size)`  ← **é essa que o painel usa** e está quebrada  
2) **Filtros**: `(p_start_date, p_end_date, p_tool_filter, p_status_filter, p_user_email)` ← essa foi a que recebeu cast e está “ok”

Ou seja: a correção anterior caiu na função errada (a de filtros), e a função certa (a de paginação) ficou bugada, então o painel não consegue listar nada.

---

## Objetivo da correção

- Recriar a RPC **`public.get_ai_tools_usage(timestamp with time zone, timestamp with time zone, integer, integer)`** com casts explícitos:
  - `rh_cost` → `::NUMERIC`
  - `user_credit_cost` → `::NUMERIC`
  - `profit` → `::NUMERIC`

Isso faz o SELECT bater exatamente com o `RETURNS TABLE (... rh_cost NUMERIC, user_credit_cost NUMERIC, profit NUMERIC ...)` e o painel volta a carregar.

---

## Mudanças que vou fazer (backend)

### 1) Migration SQL (corrigir a função de paginação)
Vou criar uma migration que faz `CREATE OR REPLACE FUNCTION public.get_ai_tools_usage(..., p_page, p_page_size)` e, dentro de **cada bloco do UNION ALL** (upscaler, pose, veste, video, cloner), trocar:

- **Antes (quebra):**
```sql
COALESCE(t.rh_cost, 0) as rh_cost,
COALESCE(t.user_credit_cost, 0) as user_credit_cost,
COALESCE(t.user_credit_cost, 0) - COALESCE(t.rh_cost, 0) as profit,
```

- **Depois (certo):**
```sql
COALESCE(t.rh_cost, 0)::NUMERIC as rh_cost,
COALESCE(t.user_credit_cost, 0)::NUMERIC as user_credit_cost,
(COALESCE(t.user_credit_cost, 0) - COALESCE(t.rh_cost, 0))::NUMERIC as profit,
```

### 2) (Opcional, mas recomendado) Evitar confusão com overload
Para evitar isso voltar a acontecer, vou deixar explícito no SQL da migration uma estratégia:

- Opção A (mais segura): **manter as duas** funções `get_ai_tools_usage`, mas garantir que **ambas** estejam coerentes (as duas com casts corretos).
- Opção B (mais limpa): **remover a função antiga de filtros** se ela não é usada no frontend (hoje o código não chama ela), para não ter risco de “corrigir a errada” no futuro.

Eu recomendo a **Opção A** (não quebra nada escondido que possa existir fora do código atual).

---

## Como eu vou validar que voltou (teste técnico)

Depois da migration, vou validar no backend com um SELECT simples:

1) Teste direto da RPC (página 1):
```sql
select * from public.get_ai_tools_usage(now() - interval '30 days', now(), 1, 20);
```

2) Confirmar que não dá erro e que retorna linhas.

3) Confirmar que `get_ai_tools_usage_count` e `get_ai_tools_usage_summary` continuam ok.

---

## Como você valida no app (teste visual)

1) Abrir o painel **Custos IA / Uso Ferramentas**
2) Deixar o período em “Últimos 7 dias” ou “Todo período”
3) Ver se:
   - aparece “Histórico de Uso (X registros)”
   - a tabela lista jobs normalmente
   - paginação funciona

---

## Arquivos/partes que serão alterados

- **Novo arquivo**: `supabase/migrations/XXXXXXXXXXXX_fix_get_ai_tools_usage_pagination_numeric_casts.sql`
- **Sem mudanças de frontend** para esse conserto (o bug aqui é 100% na RPC)

---

## Observação importante (para não “quebrar outra coisa” de novo)

Esse bug é exatamente o tipo de coisa que eu vou prevenir com:
- casts explícitos nas colunas numéricas (pra Postgres nunca “adivinhar” tipo errado em `COALESCE`/`UNION`)
- validação com SELECT logo após a migration (smoke test manual)
- manter as duas versões coerentes (se escolher a opção A)

