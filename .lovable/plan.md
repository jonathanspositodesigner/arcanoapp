
Objetivo: garantir que no fluxo de Cartão de Crédito do checkout puro não seja enviado nenhum e-mail (nem fictício), e impedir que pedidos/usuários fiquem com `@temp.arcano`.

1) Diagnóstico confirmado
- O modal de cartão já dispara auto-submit sem `user_email` no frontend (`PreCheckoutModal`).
- O e-mail fictício está sendo criado no backend em `create-pagarme-checkout` (`checkout-xxxx@temp.arcano`) quando `billing_type === 'CREDIT_CARD'`.
- O webhook depois usa `order.user_email` como fonte principal, então mantém esse e-mail fictício no pedido/perfil mesmo quando o cliente digitou e-mail real no checkout hospedado.

2) Correção principal (somente backend de checkout)
- Arquivo: `supabase/functions/create-pagarme-checkout/index.ts`
  - Remover geração de e-mail fictício no cartão puro.
  - Para `CREDIT_CARD` sem e-mail:
    - não enviar `customer.email` ao gateway;
    - não enviar dados pessoais (mantém checkout puro);
    - parar de usar e-mail fictício em logs/rate-limit/meta.
  - Se o gateway exigir e-mail em algum cenário, retornar erro explícito (sem inventar e-mail).

3) Ajuste de persistência interna (para não guardar lixo)
- Banco:
  - Tornar `public.asaas_orders.user_email` nullable (hoje é NOT NULL).
- `create-pagarme-checkout`:
  - Em cartão puro sem e-mail, salvar `user_email = null`.
  - Deduplicação por e-mail só roda quando houver e-mail real (PIX e demais casos).

4) Correção de reconciliação no webhook (usar e-mail real digitado no gateway)
- Arquivo: `supabase/functions/webhook-pagarme/index.ts`
  - Extrair e-mail do payload do gateway (`customer.email` em `charge.*`).
  - Definir `effectiveEmail` com prioridade:
    1. e-mail real do gateway (válido e não temporário),
    2. e-mail já salvo no pedido (se válido e não temporário).
  - Antes de criar usuário/perfil, atualizar `asaas_orders.user_email` com `effectiveEmail`.
  - Se evento de pagamento vier sem e-mail e o pedido estiver sem e-mail válido, não finalizar com dado inválido; registrar status técnico e aguardar evento com e-mail (ex.: `charge.paid`).

5) Limpeza dos dados já contaminados
- Backfill controlado:
  - Localizar pedidos `@temp.arcano`.
  - Atualizar com e-mail real extraído de `webhook_logs.payload.data.customer.email` quando disponível e válido.
  - Atualizar perfil vinculado quando não houver conflito de e-mail existente.

6) Validação final (E2E e regressão)
- Cartão (upscaler arcano):
  - Selecionar cartão no modal sem preencher dados locais.
  - Confirmar request do checkout sem `user_email`.
  - Confirmar que não aparece mais `@temp.arcano` no pedido final.
  - Confirmar que, após pagamento, pedido/perfil usam o e-mail digitado no checkout hospedado.
- PIX:
  - Confirmar que continua exigindo e validando e-mail/CPF/telefone normalmente.
- Regressão:
  - Confirmar que fluxos que usam o mesmo backend (ex.: arcano cloner) não voltam a gravar e-mail fictício.
