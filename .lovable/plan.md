

## Diagnóstico: Reembolso Pagar.me não processado

### Problemas encontrados

**1. Webhook de reembolso nunca chegou**
Os logs da edge function `webhook-pagarme` mostram ZERO eventos de reembolso (`charge.refunded`, `order.canceled`). O webhook recebeu eventos de criação e pagamento normalmente, mas o evento de refund simplesmente nunca foi enviado pelo Pagar.me para o endpoint. Isso indica que no painel do Pagar.me, os webhooks de reembolso podem não estar configurados.

**2. Tabela `webhook_logs` com schema incompatível**
O código do `webhook-pagarme` usa colunas `transaction_id` e `event_type` que **NÃO EXISTEM** na tabela `webhook_logs`. Resultado:
- As inserções de log falham silenciosamente (sem trilha de auditoria)
- A checagem de idempotência sempre retorna vazio (não bloqueia reprocessamento, mas também não registra nada)
- Por isso não há nenhum registro na `webhook_logs` para `platform = 'pagarme'`

**3. Estado atual da compra teste**
- Ordem `4b9b1393` → status `paid` (nunca mudou para `refunded`)
- `user_pack_purchases` → `is_active: true` para `upscaller-arcano` (acesso nunca revogado)

### Plano de correção

**1. Migração SQL: adicionar colunas faltantes na `webhook_logs`**
- Adicionar `transaction_id TEXT`
- Adicionar `event_type TEXT`
- Isso corrige a compatibilidade do webhook-pagarme com a tabela e habilita a trilha de auditoria e idempotência

**2. Atualizar `webhook-pagarme/index.ts` para cobrir mais event types**
- Além de `charge.refunded` e `order.canceled`, adicionar `charge.chargedback` e `charge.underpaid`
- Também tratar o cenário onde `order.status` já não é `paid` (para casos de reprocessamento)

**3. Verificação obrigatória pelo usuário (ação manual)**
- Você precisa verificar no painel do Pagar.me se o webhook está configurado para receber eventos de reembolso. O endpoint correto é: `https://jooojbaljrshgpaxdlou.supabase.co/functions/v1/webhook-pagarme`
- Os eventos necessários são: `charge.refunded`, `charge.chargedback`, `order.canceled`

### Detalhes técnicos

**Migração SQL:**
```sql
ALTER TABLE webhook_logs ADD COLUMN IF NOT EXISTS transaction_id TEXT;
ALTER TABLE webhook_logs ADD COLUMN IF NOT EXISTS event_type TEXT;
```

**Webhook — trecho de refund atualizado:**
- Remover a condição `&& order.status === 'paid'` da verificação de reembolso (para processar mesmo se o status já mudou por alguma razão)
- Adicionar `charge.chargedback` na lista de eventos de reembolso

