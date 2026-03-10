

## Integração Asaas - Checkout PIX + Cartão

### Passo 1: Salvar API Key como Secret
Armazenar `ASAAS_API_KEY` de forma segura no backend.

### Passo 2: Criar tabela `asaas_orders`
Mesma estrutura de `mp_orders`:
- `id`, `user_email`, `product_id`, `amount`, `status`, `payment_id`, `payment_method`, `net_amount`, `paid_at`, `utm_data`, `user_id`, `created_at`, `updated_at`
- Referencia `mp_products` (reutiliza o catálogo existente)
- RLS: admin-only via `has_role`

### Passo 3: Edge Function `create-asaas-checkout`
- Recebe `{ product_slug, user_email, utm_data }`
- Busca produto em `mp_products`
- Cria/busca cliente no Asaas (`POST /v3/customers`)
- Cria cobrança (`POST /v3/payments`) com `billingType: "UNDEFINED"` (PIX + Cartão na mesma tela)
- Salva ordem em `asaas_orders`
- Retorna `{ checkout_url: invoiceUrl, order_id }`

### Passo 4: Edge Function `webhook-asaas`
- Recebe eventos do Asaas
- `PAYMENT_CONFIRMED` / `PAYMENT_RECEIVED`: mesma lógica do `webhook-mercadopago` (criar usuário, conceder pack/créditos, enviar email, UTMify)
- `PAYMENT_REFUNDED`: revogar acesso
- Idempotência via `asaas_orders.payment_id`

### Passo 5: Atualizar página `PlanosUpscalerArcanoMP.tsx`
- Trocar a chamada de `create-mp-checkout` para `create-asaas-checkout` (ou adicionar como opção alternativa)
- Manter o mesmo fluxo: email → checkout → redirect

### Passo 6: Atualizar dashboard de vendas
- Incluir `asaas_orders` na função `get_unified_dashboard_orders` para que vendas Asaas apareçam no dashboard

### Passo 7: config.toml
- Adicionar `[functions.create-asaas-checkout]` e `[functions.webhook-asaas]` com `verify_jwt = false`

### Ação manual necessária do usuário
Configurar webhook no painel Asaas apontando para:
`https://jooojbaljrshgpaxdlou.supabase.co/functions/v1/webhook-asaas`
Eventos: `PAYMENT_CONFIRMED`, `PAYMENT_RECEIVED`, `PAYMENT_REFUNDED`

### Arquivos a criar/editar
| Arquivo | Ação |
|---|---|
| `supabase/functions/create-asaas-checkout/index.ts` | Criar |
| `supabase/functions/webhook-asaas/index.ts` | Criar |
| `src/pages/PlanosUpscalerArcanoMP.tsx` | Editar (trocar/adicionar Asaas) |
| `supabase/config.toml` | Adicionar 2 entries |
| Migration SQL | Criar tabela `asaas_orders` + atualizar `get_unified_dashboard_orders` |

