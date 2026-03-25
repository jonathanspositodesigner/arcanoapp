

# Plano: Migrar checkouts de créditos avulsos da página Planos2 para Mercado Pago

## Resumo

Substituir o fluxo Pagar.me (profile check → PreCheckoutModal → PaymentMethodModal → invokeCheckout) pelos créditos avulsos na página `Planos2.tsx`, usando o hook `useMPCheckout` já testado. Os slugs `creditos-1500`, `creditos-4200` e `creditos-14000` já existem na tabela `mp_products` com `is_active = true`.

**Importante**: Nesta etapa, apenas os créditos avulsos serão migrados. Os planos de assinatura continuam usando o fluxo atual do Pagar.me.

## Verificação de pré-requisitos

| Slug | Existe em mp_products | Ativo |
|------|----------------------|-------|
| creditos-1500 | Sim | Sim |
| creditos-4200 | Sim | Sim |
| creditos-14000 | Sim | Sim |

## Mudanças no arquivo `src/pages/Planos2.tsx`

### 1. Adicionar import do hook
```tsx
import { useMPCheckout } from "@/hooks/useMPCheckout";
```

### 2. Inicializar o hook dentro do componente
```tsx
const { openCheckout, MPCheckoutModal } = useMPCheckout({ source_page: "planos-2" });
```

### 3. Substituir `handleCreditPurchase`
O handler complexo (linhas 125-159) que verifica perfil, abre PreCheckoutModal e PaymentMethodModal será substituído por uma chamada direta a `openCheckout(slug)`:
```tsx
// Antes: handleCreditPurchase(slug) → profile check → modal chain → invokeCheckout
// Depois: openCheckout(slug) → MPEmailModal → redirectToMPCheckout
```

### 4. Atualizar botões de crédito (linha 865)
```tsx
// Antes:
onClick={() => handleCreditPurchase(plan.slug)}
disabled={isLoading || !!pixLoading || isCheckoutSubmitting}

// Depois:
onClick={() => openCheckout(plan.slug)}
```
Remover estado `isLoading` / `pixLoading` dos botões de crédito (o loading agora é controlado internamente pelo hook).

### 5. Adicionar `<MPCheckoutModal />` no JSX
Colocar o componente do modal antes do fechamento do `</div>` principal.

### 6. Limpeza parcial
Como os planos de assinatura ainda usam Pagar.me, **manter** os imports e estados do fluxo Pagar.me (`PreCheckoutModal`, `PaymentMethodModal`, `invokeCheckout`, etc.). Remover apenas:
- A função `handleCreditPurchase` (substituída por `openCheckout`)
- O estado `pixLoading` (usado apenas nos créditos)
- O loading visual do Loader2 nos cards de crédito (o hook cuida disso internamente)

Os modais `PreCheckoutModal` e `PaymentMethodModal` continuam sendo usados pelos planos de assinatura.

## O que NÃO muda
- Slugs dos produtos (mesmos 3 slugs)
- Webhook e ativação de créditos (já configurado no `webhook-mercadopago`)
- Meta Pixel/CAPI (já integrado no `create-mp-checkout`)
- UTMs (coletados automaticamente pelo hook)
- Fluxo de assinaturas (continua Pagar.me por enquanto)
- Todo o layout visual dos cards de crédito

