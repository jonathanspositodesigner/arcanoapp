

## Resultado da Verificação dos Checkouts da /prevenda-pack4

### ✅ O que está CORRETO

**Slugs dos botões de pricing** — Todos os 3 planos apontam para os slugs certos:
- 6 meses → `pack4-6meses`
- 1 ano → `pack4-1ano`
- Vitalício → `pack4lancamento`

**Produtos no banco** — Os 3 slugs existem na tabela `mp_products`, ativos, com `pack_slug = 'pack-arcano-vol-4'` e preços corretos (R$ 27, R$ 37, R$ 47).

**Webhook Pagar.me (fulfillment)** — O webhook usa `product.pack_slug` para conceder acesso em `user_pack_purchases`, então qualquer um dos 3 slugs vai liberar o pack `pack-arcano-vol-4` com o `access_type` correto (6_meses, 1_ano ou vitalicio).

**Bundle do vitalício** — O slug `pack4lancamento` também concede o bônus `pack-de-sao-joao` via `BUNDLE_EXTRA_PACKS`.

**Reembolso** — O `refund-pagarme` tem `REFUND_BUNDLE_EXTRA_PACKS` configurado para revogar o `pack-de-sao-joao` junto com o estorno do `pack4lancamento`.

**Checkout flow (pricing cards)** — Usa `create-pagarme-checkout` corretamente via `supabase.functions.invoke`.

### ⚠️ Problema encontrado

**MotionsGallerySectionPack4** — O botão "QUERO ACESSO VITALÍCIO" da seção de vídeos animados (Motions) está usando uma URL externa hardcoded (`https://pay.pagstar.com/pack4lancamento`) em vez do fluxo Pagar.me. Isso significa que esse botão específico NÃO passa pelo checkout correto — abre uma URL externa que pode nem existir/funcionar.

### Plano de correção

Corrigir o `MotionsGallerySectionPack4.tsx` para usar o mesmo fluxo de checkout Pagar.me (via `create-pagarme-checkout`) em vez da URL hardcoded. Isso envolve:

1. Adicionar a mesma lógica de checkout do `PricingCardsSectionPack4` (auth check → PreCheckoutModal ou PaymentMethodModal → `create-pagarme-checkout` com slug `pack4lancamento`).
2. Remover a constante `CHECKOUT_URL_PACK4` e o `window.open` externo.

**Arquivo a alterar:** `src/components/prevenda-pack4/MotionsGallerySectionPack4.tsx`

Nenhum outro arquivo precisa de mudança. Todos os demais checkouts estão configurados corretamente.

