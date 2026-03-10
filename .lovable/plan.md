

## Revisão: Integração Pagar.me — Problemas Encontrados

Revisei os 3 arquivos principais: `create-pagarme-checkout/index.ts`, `webhook-pagarme/index.ts` e `PreCheckoutModal.tsx`. O `config.toml` já está configurado corretamente com `verify_jwt = false` para ambas as functions.

### Sobre o CPF

O CPF **é obrigatório** na API do Pagar.me. O campo `document` no objeto `customer` é required. O código atual já tem um fallback `document: cpf || '00000000000'`, mas enviar `00000000000` pode ser rejeitado pela API. **O campo CPF deve permanecer no formulário.**

### Problemas identificados e correções

**1. Extração da URL de checkout pode falhar**
O código atual tenta extrair a URL de:
```
pagarmeData.charges?.[0]?.last_transaction?.payment_url
pagarmeData.checkouts?.[0]?.payment_url
```
A resposta do Pagar.me para orders com `payment_method: 'checkout'` retorna a URL em `charges[0].last_transaction.url` (não `payment_url`). Precisa adicionar mais fallbacks para cobrir todas as variações da resposta.

**2. Webhook: estrutura do evento Pagar.me**
O Pagar.me envia webhooks no formato `{ id, type, data, account }`. O `metadata` com `order_id` fica em `data.metadata` para eventos de `order.*`, mas para `charge.*` fica em `data.order.metadata`. Precisa buscar em ambos os caminhos.

**3. Webhook: idempotência ausente**
Não há verificação na `webhook_logs` para evitar processamento duplicado do mesmo evento. Todos os outros webhooks do projeto (Greenn, Hotmart, MP) usam idempotência via `webhook_logs`.

**4. Webhook: log na tabela webhook_logs**
Os outros webhooks logam na tabela `webhook_logs` para auditoria. O webhook do Pagar.me não faz isso.

**5. Edge function: import do supabase-js**
O `create-pagarme-checkout` usa `https://esm.sh/@supabase/supabase-js@2` e o `webhook-pagarme` usa `npm:@supabase/supabase-js@2`. Devem ser consistentes — o padrão `npm:` é mais estável no Deno.

### Plano de correções

1. **`create-pagarme-checkout/index.ts`**
   - Trocar import para `npm:@supabase/supabase-js@2`
   - Melhorar extração da `checkout_url` com mais fallbacks (`url`, `payment_url`, `checkout_url`)
   - Logar resposta completa do Pagar.me para debug
   - Manter CPF obrigatório (é required na API)

2. **`webhook-pagarme/index.ts`**
   - Buscar `order_id` em `data.metadata.order_id` E `data.order.metadata.order_id`
   - Adicionar idempotência via `webhook_logs` (mesmo padrão dos outros webhooks)
   - Logar evento na `webhook_logs` para auditoria
   - Trocar import para consistência

3. **`PreCheckoutModal.tsx`** — sem alterações necessárias, está correto

### Nenhuma alteração de banco necessária
As tabelas `asaas_orders`, `webhook_logs`, `mp_products` já existem e são reutilizadas.

