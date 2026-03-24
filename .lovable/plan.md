
Diagnóstico confirmado (com dados reais do backend):
- A compra teste do email `fotosarmazemmoc@gmail.com` gerou **2 créditos +1500** para o mesmo pagamento (`payment_id 151733322494`), totalizando +3000.
- Existem **2 registros de `webhook_logs`** para o mesmo `transaction_id` (mesmo pagamento), e os logs da função mostram **duas execuções completas em paralelo**.
- Causa raiz: idempotência atual não é atômica (duas execuções passam juntas antes do insert de log).
- O CTA do email em `webhook-mercadopago` está apontando para `/upscaler-arcano`, não para Home.
- Bug adicional crítico encontrado: gravação em `welcome_email_logs` no webhook MP está incompleta (campos obrigatórios não enviados), então o dedup de email falha silenciosamente.

Plano de correção (completo e direto):
1) Correção de dados já afetados
- Aplicar ajuste único no usuário afetado removendo os **1500 créditos duplicados** (com trilha de auditoria em transação de estorno/correção).
- Remover duplicata técnica de log de webhook do mesmo pagamento (manter 1 registro canônico).

2) Blindagem anti-duplicidade no webhook MP
- Refatorar `webhook-mercadopago` para “claim” atômico do processamento por pagamento (antes de conceder crédito/acesso).
- Trocar dedup frágil por chave forte de evento (payment + tipo do evento).
- Garantir que replay do mesmo webhook não execute concessão de novo.

3) Constraints de banco para impedir repetição mesmo sob corrida
- Migração SQL:
  - deduplicar linhas antigas conflitantes;
  - criar índice único para evento MP em `webhook_logs` (por `platform + transaction_id + event_type`);
  - criar índice único em `mp_orders.mp_payment_id` quando não nulo.

4) Garantia extra no crédito (idempotência de negócio)
- Incluir `order_id` na descrição de crédito MP (`Compra MP [order_id]: ...`) e bloquear segunda aplicação da mesma ordem.
- Se webhook reentrar, crédito da mesma ordem não reaplica.

5) CTA dos emails MP para Home (como você pediu)
- Em `supabase/functions/webhook-mercadopago/index.ts`, forçar CTA de compra MP para:
  - `https://arcanoapp.voxvisual.com.br/`
- Aplicar para qualquer produto vindo de checkout Mercado Pago.

6) Confiabilidade de email e dedup
- Corrigir insert em `welcome_email_logs` no webhook MP com todos campos obrigatórios (`platform`, `sent_at`, etc.).
- Usar dedup key por pedido MP (ex.: `mp_order_<order_id>`) para impedir envio duplicado sob corrida.

Arquivos a alterar:
- `supabase/functions/webhook-mercadopago/index.ts`
- `supabase/migrations/<nova_migracao>.sql`

Validação pós-fix (obrigatória):
- Repetir teste de compra MP do Starter e confirmar:
  - apenas 1 transação de crédito (+1500),
  - apenas 1 log de purchase para o payment_id,
  - apenas 1 envio de email registrado,
  - botão “Acessar Agora” abrindo Home,
  - sem duplicidade mesmo com múltiplos webhooks do mesmo pagamento.
