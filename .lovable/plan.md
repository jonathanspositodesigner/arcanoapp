

## Diagnóstico Detalhado

Consultei diretamente o banco de dados para entender de onde vêm os números. Aqui está o que a RPC `get_unified_dashboard_orders` retorna para hoje:

```text
FONTE DOS DADOS (RPC retorna TUDO junto):

1. mp_orders (Mercado Pago) — SEM FILTRO DE STATUS:
   ├─ 7 pedidos com status "pending" (só geraram PIX, não pagaram)
   └─ 1 pedido com status "refunded" (pagou mas pediu reembolso)
   = 8 pedidos FALSOS sendo incluídos

2. webhook_logs (Greenn + Hotmart) — com DISTINCT ON:
   ├─ artes-eventos: 29 vendas pagas ✓
   ├─ hotmart-es:    12 vendas pagas
   ├─ creditos:       2 vendas pagas
   └─ prompts:        2 vendas pagas
   = 45 vendas de webhooks
```

**O problema**: A query da RPC inclui TODOS os `mp_orders` sem filtrar por `status = 'paid'`. Os 7 pedidos "pending" (PIX gerado mas não pago) e 1 "refunded" estão entrando na contagem. Esses 8 registros do Mercado Pago não deveriam aparecer.

## Plano de Correção

**1. Corrigir a RPC `get_unified_dashboard_orders`**

Adicionar filtro `WHERE o.status = 'paid'` na parte do `mp_orders`:

```sql
-- ANTES (pega TUDO do mp_orders):
FROM mp_orders o
WHERE o.created_at >= _start AND o.created_at < _end

-- DEPOIS (pega SÓ os pagos):
FROM mp_orders o
WHERE o.created_at >= _start AND o.created_at < _end
  AND o.status = 'paid'
```

Isso elimina os 8 registros fantasma do Mercado Pago (7 pending + 1 refunded).

**2. Arquivo afetado**: Uma nova migration SQL atualizando a função `get_unified_dashboard_orders`.

**Nota**: Após a correção, o dashboard mostrará 45 vendas aprovadas no total (29 Greenn artes + 12 Hotmart + 2 Créditos + 2 Prompts). Se você quer ver apenas as 29 de artes-eventos, podemos adicionar um filtro por plataforma.

