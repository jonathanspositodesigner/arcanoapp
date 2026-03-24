

# Auditoria Completa v5: Fluxo Mercado Pago — Bugs Restantes

## Status Geral

O fluxo está **90% correto**. A maioria dos bugs críticos anteriores foi resolvida. Restam 2 bugs que afetam cenários específicos.

---

## 🔴 BUG 1: Reembolso de plano de créditos NÃO revoga acesso ao pack

**Onde**: `webhook-mercadopago/index.ts`, linhas 744-773

**Problema**: Quando um plano de créditos (Starter/Pro/Ultimate) é reembolsado, o webhook:
- ✅ Revoga os créditos via `revoke_lifetime_credits_on_refund`
- ❌ **NÃO revoga** o `user_pack_purchases` com `pack_slug = 'upscaller-arcano'`

Isso acontece porque a condição de revogação do pack (linha 747) verifica `product.pack_slug`, mas os produtos de créditos têm `pack_slug = null` no banco. A inserção do pack `upscaller-arcano` para créditos foi adicionada no webhook (linhas 592-613), mas a revogação correspondente **não foi**.

**Resultado**: O cliente pede reembolso do Starter, perde os créditos, mas **mantém acesso** ao pack `upscaller-arcano` para sempre.

**Correção**: Na seção de reembolso, após revogar créditos, também desativar o `user_pack_purchases` com `pack_slug = 'upscaller-arcano'` para o `user_id`.

---

## 🟡 BUG 2: CTA do email aponta para pack_slug errado

**Onde**: `webhook-mercadopago/index.ts`, linha 656

**Problema**: A condição para definir o link CTA no email é:
```typescript
product.pack_slug === 'upscaler-arcano' || product.type === 'credits'
```

O pack_slug real do vitalício é `upscaller-arcano` (com dois `l`), não `upscaler-arcano`. Então para o vitalício, a condição `product.pack_slug === 'upscaler-arcano'` é **false**. Cai no fallback `https://arcanoapp.voxvisual.com.br/` em vez de apontar para o Upscaler.

O email do vitalício manda o cliente para a home em vez da ferramenta.

**Correção**: Adicionar `upscaller-arcano` na condição:
```typescript
product.pack_slug === 'upscaler-arcano' || product.pack_slug === 'upscaller-arcano' || product.type === 'credits'
```

---

## ✅ O que está correto (confirmado)

| Item | Status |
|---|---|
| Slugs dos 4 produtos no frontend batem com o banco | ✅ |
| Starter/Pro/Ultimate = type `credits` no banco | ✅ |
| Vitalício existe no banco com pack_slug correto | ✅ |
| Créditos adicionados via `add_lifetime_credits` | ✅ |
| Pack `upscaller-arcano` inserido para planos de créditos | ✅ |
| Vitalício insere pack com `access_type: vitalicio` | ✅ |
| Idempotência via `webhook_logs.transaction_id` | ✅ |
| `check-purchase-exists` verifica `mp_orders` | ✅ |
| Meta CAPI Purchase enviado com dados reais | ✅ |
| InitiateCheckout event_id sincronizado Pixel/CAPI | ✅ |
| Rate limiting no create-checkout | ✅ |
| Dedup email usa `order.id` | ✅ |
| Modal reseta campos ao reabrir | ✅ |
| Feedback mp_status na página 69 | ✅ |
| UTMify recebe dados de venda | ✅ |
| Admin notificado | ✅ |
| Back URLs corretas | ✅ |
| Reembolso revoga créditos | ✅ |
| Reembolso revoga pack (vitalício) | ✅ |
| merchant_order ignorado | ✅ |
| UI do Starter mostra ✅ em todas as features | ✅ |

---

## Plano de Correção

### 1. Revogar pack `upscaller-arcano` no reembolso de créditos

No `webhook-mercadopago/index.ts`, dentro do bloco de reembolso para `product.type === 'credits'`, adicionar:

```typescript
// Revogar acesso ao pack que foi concedido na compra de créditos
await supabase
  .from('user_pack_purchases')
  .update({ is_active: false, updated_at: new Date().toISOString() })
  .eq('user_id', order.user_id)
  .eq('pack_slug', 'upscaller-arcano')
  .eq('access_type', 'credits')
```

### 2. Corrigir CTA link do email do vitalício

Na linha 656, trocar a condição para incluir o slug correto.

## Arquivos a alterar

| Arquivo | Alteração |
|---|---|
| `supabase/functions/webhook-mercadopago/index.ts` | Revogar pack no reembolso de créditos + corrigir CTA link |

