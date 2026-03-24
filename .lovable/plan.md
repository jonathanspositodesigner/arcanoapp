# Auditoria v7: Fluxo Mercado Pago — Resultado Final

## ✅ Tudo Funcionando Corretamente


| Item                                                                | Status |
| ------------------------------------------------------------------- | ------ |
| Checkout com payer completo (nome/email/CPF)                        | ✅      |
| Rate limiting (5/min por email)                                     | ✅      |
| Idempotência via `webhook_logs.transaction_id`                      | ✅      |
| Créditos adicionados via `add_lifetime_credits` com lock            | ✅      |
| Pack `upscaller-arcano` inserido para planos de créditos            | ✅      |
| Vitalício insere pack com `access_type: vitalicio`                  | ✅      |
| Reembolso revoga créditos E pack (inclusive `access_type: credits`) | ✅      |
| Meta CAPI Purchase + InitiateCheckout com event_id                  | ✅      |
| Email de compra com template por tipo (créditos vs vitalício)       | ✅      |
| Dedup email usa `order.id`                                          | ✅      |
| Admin notificado com nome do cliente                                | ✅      |
| UTMify recebe dados de venda                                        | ✅      |
| `check-purchase-exists` verifica `mp_orders`                        | ✅      |
| `complete-purchase-onboarding` verifica `mp_orders`                 | ✅      |
| Back URLs corretas (`/sucesso-compra`)                              | ✅      |
| Feedback `mp_status` na página 69                                   | ✅      |
| CTA link corrigido para ambos os slugs                              | ✅      |
| merchant_order ignorado                                             | ✅      |
| Auto-cleanup de ordens pending duplicadas                           | ✅      |
| UI Starter mostra ✅ em todas as features                            | ✅      |
| webhook_logs inserido para vendas e reembolsos                      | ✅      |
| Onboarding (profile + listUsers paginado)                           | ✅      |
| Página de sucesso reconhece compras MP                              | ✅      |


---

## 🟡 BUG MÉDIO 1: Reembolso de créditos revoga acesso de TODAS as compras

**Onde**: `webhook-mercadopago/index.ts`, linhas 774-781

**Problema**: Quando um plano de créditos é reembolsado, a revogação do pack faz:

```typescript
.eq('user_id', order.user_id)
.eq('pack_slug', 'upscaller-arcano')
.eq('access_type', 'credits')
```

Se o cliente comprou **Starter** e depois **Pro** separadamente, ele tem **uma** entrada `user_pack_purchases` com `access_type: 'credits'` (porque a inserção usa `maybeSingle` e não duplica). Se o Starter for reembolsado, o sistema revoga essa única entrada — e o cliente perde acesso mesmo tendo o Pro ativo.

A raiz do problema: não há vínculo entre a entrada em `user_pack_purchases` e a ordem específica (`mp_orders.id`). Ao revogar, não tem como saber se há outra compra de créditos ativa.

**Correção**: Antes de revogar o pack `access_type: 'credits'`, verificar se existem **outras** ordens pagas do mesmo usuário com produtos de créditos. Se sim, manter o acesso.

---

---

## Resumo

O fluxo está **95%+ correto**. O único bug funcional é o cenário de reembolso quando o cliente tem múltiplas compras de créditos (cenário raro, mas real). Os demais pontos são de segurança/UX já conhecidos.

## Plano de Correção (1 item)

### Proteger reembolso de créditos contra revogação indevida

No `webhook-mercadopago/index.ts`, na seção de reembolso para `product.type === 'credits'`, antes de revogar o pack:

```typescript
// Verificar se há outras ordens pagas de créditos para este usuário
const { data: otherCreditOrders } = await supabase
  .from('mp_orders')
  .select('id, mp_products!inner(type)')
  .eq('user_id', order.user_id)
  .eq('status', 'paid')
  .neq('id', order.id)

const hasOtherCredits = otherCreditOrders?.some(o => o.mp_products?.type === 'credits')

if (!hasOtherCredits) {
  // Só revogar o pack se não houver outras compras de créditos ativas
  await supabase
    .from('user_pack_purchases')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('user_id', order.user_id)
    .eq('pack_slug', 'upscaller-arcano')
    .eq('access_type', 'credits')
}
```


| Arquivo                                           | Alteração                                                       |
| ------------------------------------------------- | --------------------------------------------------------------- |
| `supabase/functions/webhook-mercadopago/index.ts` | Proteger revogação de pack contra múltiplas compras de créditos |
