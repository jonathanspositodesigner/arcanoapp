
Objetivo: garantir que reembolso de compra de créditos (incluindo 1.500 créditos da página planos-2) SEMPRE retire os créditos da conta e nunca passe “sucesso falso”.

1) Diagnóstico confirmado (causa raiz)
- O reembolso está chamando `remove_lifetime_credits` em backend functions.
- Essa RPC hoje exige contexto admin por `auth.uid()` e retorna:
  - `success: false`
  - `error_message: "Access denied: admin role required"`
- As funções `refund-pagarme` e `webhook-pagarme`/`webhook-mercadopago` verificam só `error` do transporte e não validam `data[0].success`, então seguem como se tivesse revogado.
- Evidência já vista em log: `✅ Créditos revogados: 1500` junto de payload `success: false` (falso positivo).

2) O que vou implementar
- Corrigir o motor de revogação de créditos para reembolso no banco (função dedicada para refund):
  - permitir execução apenas por backend (service role) e admin;
  - revogar de forma segura sem saldo negativo (`LEAST(valor_reembolso, lifetime_balance)`);
  - gravar transação com `amount` negativo e `balance_after` correto;
  - retornar `success`, `amount_revoked`, `new_balance`.
- Atualizar funções de pagamento para usar essa revogação correta e validar retorno real:
  - `supabase/functions/refund-pagarme/index.ts`
  - `supabase/functions/webhook-pagarme/index.ts`
  - `supabase/functions/webhook-mercadopago/index.ts`
- Corrigir idempotência de reembolso no `webhook-pagarme`:
  - lock atômico de status (`paid -> refund_processing`) para evitar débito duplo quando chegam eventos múltiplos (`charge.refunded`, `order.canceled`, etc.).
  - só quem adquirir o lock processa; demais eventos são ignorados como duplicados.
- Tratar erro de revogação como erro de negócio real:
  - não retornar “reembolso concluído com sucesso” se a remoção de créditos falhar.

3) Correção dos casos já quebrados
- Fazer ajuste de dados para os pedidos já reembolsados que ficaram com créditos:
  - localizar ordens de créditos com status `refunded` sem débito correspondente;
  - aplicar débito único de correção e registrar transação auditável.
- Inclui o caso reportado da compra de 1.500 já reembolsada.

4) Validação (fim a fim)
- Teste 1: comprar 1.500 créditos -> saldo sobe +1500.
- Teste 2: reembolsar -> saldo cai -1500 e transação aparece como débito.
- Teste 3: simular webhook duplicado de reembolso -> saldo não cai duas vezes.
- Teste 4: usuário comum não consegue chamar RPC de revogação (segurança).
- Teste 5: confirmar no histórico que descrição/valor ficam consistentes.

Detalhes técnicos
- Arquivos alvo:
  - `supabase/functions/refund-pagarme/index.ts`
  - `supabase/functions/webhook-pagarme/index.ts`
  - `supabase/functions/webhook-mercadopago/index.ts`
  - nova migration SQL para função de revogação de refund e endurecimento de autorização.
- Estratégia de robustez:
  - validar sempre `revokeResult?.[0]?.success` (não só `error`);
  - lock atômico de reembolso por ordem para evitar condição de corrida;
  - auditoria obrigatória em `upscaler_credit_transactions` com `balance_after`.
