

## Reprocessar automaticamente cobranças recusadas pelo antifraude

### Dados reais do Pagar.me (confirmados nos logs)

Sequência de eventos quando antifraude reprova:
```text
charge.created (status: failed)
charge.antifraud_reproved (status: failed)   ← INTERCEPTAR AQUI
charge.payment_failed (status: failed)       ← vem logo depois
```

Payload real do `charge.antifraud_reproved`:
- `body.type` = `charge.antifraud_reproved`
- `body.data.id` = charge ID (ex: `ch_x2LqG4r3HruklNEb`)
- `body.data.last_transaction.antifraud_response.status` = `reproved`
- `body.data.order.metadata.order_id` = UUID da ordem interna
- `body.data.last_transaction.acquirer_message` = `"Transação aprovada com sucesso"` (gateway aprovou, antifraude barrou)

API de retry: `POST https://api.pagar.me/core/v5/charges/{charge_id}/retry` (Basic auth com secret key)

Temos 12 ocorrências de `charge.antifraud_reproved` nos logs.

### Alterações

**1. Migration — coluna de controle**

```sql
ALTER TABLE public.asaas_orders ADD COLUMN antifraud_retry_done boolean DEFAULT false;
```

**2. Edge Function `webhook-pagarme/index.ts`**

Adicionar um bloco **antes** do `else` final (linha ~1436), tratando `charge.antifraud_reproved`:

```text
if eventType === 'charge.antifraud_reproved':
  1. Verificar order.antifraud_retry_done === true → se sim, logar e ignorar
  2. Marcar order.antifraud_retry_done = true (ANTES do retry, evita race)
  3. Extrair charge_id = eventData.id
  4. Chamar POST /charges/{charge_id}/retry com Basic auth (PAGARME_SECRET_KEY)
  5. Logar resultado no webhook_logs (status: 'antifraud_retry_sent' ou 'antifraud_retry_failed')
  6. Se retry for aceito → Pagar.me enviará charge.paid como novo webhook
     → processado normalmente pelo fluxo existente
  7. Se retry falhar (gateway recusar) → Pagar.me enviará charge.payment_failed
     → como antifraud_retry_done=true, não retenta de novo
```

A secret `PAGARME_SECRET_KEY` já está configurada.

### Proteção contra loop

- `antifraud_retry_done = true` é gravado ANTES de chamar a API
- Se o retry também falhar por qualquer motivo, o próximo `charge.antifraud_reproved` ou `charge.payment_failed` encontra a flag `true` e para
- Máximo absoluto: 1 retry por ordem

### Sem alterações em

- Frontend (nenhuma)
- Outros webhooks
- create-pagarme-checkout
- Fluxo de pagamento normal

