

## Plano: Corrigir identificação de plataforma real (Greenn vs Hotmart) para cálculo correto de taxas

### Problema
O campo `source_platform` retornado pela RPC `get_unified_dashboard_orders` contém o nome do **produto/plataforma interna** ('artes-eventos', 'prompts', 'app', 'hotmart-es') em vez da **plataforma de pagamento** real ('greenn' ou 'hotmart'). O código de taxas verifica `platform === 'greenn'` ou `platform === 'hotmart'`, nunca encontra match, e calcula R$0 de taxas para todas as vendas de webhook.

### Dados reais
- Vendas **Greenn**: têm `greenn_contract_id` preenchido (plataformas: app, artes-eventos, prompts)
- Vendas **Hotmart**: têm status no formato `PURCHASE_APPROVED` ou plataforma contendo 'hotmart' (ex: 'hotmart-es')

### Solução
**Atualizar a RPC** `get_unified_dashboard_orders` para calcular `source_platform` corretamente:

```sql
-- No bloco de webhook_logs, trocar:
--   wl.platform::text
-- Por:
CASE 
  WHEN wl2.greenn_contract_id IS NOT NULL THEN 'greenn'
  WHEN wl2.platform ILIKE '%hotmart%' OR wl2.status LIKE 'PURCHASE_%' THEN 'hotmart'
  ELSE 'greenn'  -- fallback (maioria das vendas webhook são Greenn)
END::text
```

Isso faz com que o frontend receba 'greenn' ou 'hotmart' corretamente, e o cálculo de taxas existente (`amount * 0.0499 + 1.00` para Greenn, `amount * 0.099 + 1.00` para Hotmart) funcione sem nenhuma mudança no código frontend.

### Arquivo a alterar
| Ação | Arquivo |
|------|---------|
| Migration SQL | Atualizar a function `get_unified_dashboard_orders` |

Nenhuma mudança no frontend necessária — o código de taxas já está correto, só precisa receber os dados certos.

