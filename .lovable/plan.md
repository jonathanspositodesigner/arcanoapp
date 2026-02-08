
## Resumo
Corrigir o erro **"structure of query does not match function result type"** que está quebrando o painel de Custos IA. O problema é incompatibilidade de tipos entre INTEGER e NUMERIC nas RPCs.

---

## Causa Raiz

O erro exato é:
> `Returned type integer does not match expected type numeric in column 8`

A RPC `get_ai_tools_usage` declara no retorno:
```sql
RETURNS TABLE (
  ...
  rh_cost NUMERIC,         -- coluna 8
  user_credit_cost NUMERIC,
  profit NUMERIC,
  ...
)
```

Mas dentro da CTE, estou fazendo:
```sql
COALESCE(uj.rh_cost, 0) as rh_cost  -- retorna INTEGER, não NUMERIC
```

O PostgreSQL não faz cast automático de INTEGER para NUMERIC em RETURNS TABLE.

---

## Solução

Adicionar cast explícito `::NUMERIC` em todas as colunas que declaram retorno NUMERIC:

```sql
-- ANTES (bugado)
COALESCE(uj.rh_cost, 0) as rh_cost,
COALESCE(uj.user_credit_cost, 0) as user_credit_cost,
COALESCE(uj.user_credit_cost, 0) - COALESCE(uj.rh_cost, 0) as profit,

-- DEPOIS (corrigido)
COALESCE(uj.rh_cost, 0)::NUMERIC as rh_cost,
COALESCE(uj.user_credit_cost, 0)::NUMERIC as user_credit_cost,
(COALESCE(uj.user_credit_cost, 0) - COALESCE(uj.rh_cost, 0))::NUMERIC as profit,
```

---

## Arquivos a Modificar

| Arquivo | Ação |
|---------|------|
| Migration SQL | Recriar a RPC `get_ai_tools_usage` com casts explícitos |

---

## O que Será Corrigido na Migration

Na função `get_ai_tools_usage`, para **todas as 5 tabelas** (upscaler, pose_changer, veste_ai, video_upscaler, arcano_cloner):

```sql
SELECT 
  uj.id,
  'Upscaler Arcano'::TEXT as tool_name,
  uj.user_id,
  uj.status,
  uj.error_message,
  COALESCE(uj.rh_cost, 0)::NUMERIC as rh_cost,              -- CAST ADICIONADO
  COALESCE(uj.user_credit_cost, 0)::NUMERIC as user_credit_cost,  -- CAST ADICIONADO
  (COALESCE(uj.user_credit_cost, 0) - COALESCE(uj.rh_cost, 0))::NUMERIC as profit,  -- CAST ADICIONADO
  COALESCE(uj.waited_in_queue, false) as waited_in_queue,
  COALESCE(uj.queue_wait_seconds, 0) as queue_wait_seconds,
  CASE 
    WHEN uj.started_at IS NOT NULL AND uj.completed_at IS NOT NULL 
    THEN EXTRACT(EPOCH FROM (uj.completed_at - uj.started_at))::INTEGER
    ELSE 0
  END as processing_seconds,
  uj.created_at,
  uj.started_at,
  uj.completed_at
FROM upscaler_jobs uj
WHERE uj.user_id IS NOT NULL
```

Isso será repetido para os outros 4 blocos UNION ALL (pose_changer_jobs, veste_ai_jobs, video_upscaler_jobs, arcano_cloner_jobs).

---

## Resultado Esperado

Após a correção:
- ✅ O painel de Custos IA voltará a funcionar
- ✅ Todos os jobs aparecerão normalmente
- ✅ O Arcano Cloner estará integrado corretamente
