

# Plano: Nova integração Pagar.me — checkout direto sem modais

## O que muda

Clicou no botão de compra → chama edge function com `product_slug` → recebe URL → redireciona para o checkout hospedado do Pagar.me. **Zero modais**. O cliente preenche tudo (nome, CPF, email, endereço, forma de pagamento) direto na página do Pagar.me.

## Alterações

### 1. Nova Edge Function: `create-pagarme-checkout-v2`

Edge function enxuta que recebe apenas:
```json
{ "product_slug": "upscaler-arcano-pro" }
```

Lógica:
- Busca produto na `mp_products` pelo slug
- Cria ordem na `asaas_orders` (status: pending, sem dados pessoais)
- Chama `POST /orders` no Pagar.me com payload mínimo:
  - `items` (nome, valor, quantidade)
  - `payments.checkout` com `customer_editable: true`, `billing_address_editable: true`
  - `accepted_payment_methods: ['pix', 'credit_card']`
  - Sem objeto `customer` (Pagar.me coleta tudo no checkout hospedado)
- Retorna `{ checkout_url, order_id }`
- Fire-and-forget: atualiza `asaas_orders.asaas_payment_id`
- Fire-and-forget: Meta CAPI InitiateCheckout (com UTMs se fornecidos)
- Mantém retry com backoff e idempotency_key

Opcionalmente aceita `utm_data`, `fbp`, `fbc` para tracking (não obrigatórios).

### 2. Novo utilitário: `src/lib/pagarmeCheckout.ts`

Função reutilizável para todas as páginas:
```typescript
export async function redirectToCheckout(productSlug: string, options?: { utmData?, fbp?, fbc? }): Promise<void>
```

- Chama a edge function `create-pagarme-checkout-v2`
- Se receber `checkout_url`, faz `window.location.href = url`
- Se der erro, mostra toast com mensagem amigável
- Timeout de 20s com AbortController
- Dispara `fbq('track', 'InitiateCheckout')` se disponível

### 3. Atualizar `PlanosUpscalerArcano.tsx`

**Remover:**
- Import e uso de `PreCheckoutModal`
- Import e uso de `preWarmCheckout`
- Import de `checkoutFetch`
- Estados `checkoutModalOpen` e `checkoutProductSlug`
- Bloco JSX do `PreCheckoutModal` (linhas 928-939)

**Substituir `handlePurchase`:**
```typescript
const [purchaseLoading, setPurchaseLoading] = useState<string | null>(null);

const handlePurchase = async (productSlug?: string | unknown) => {
  const slug = typeof productSlug === 'string' && productSlug.trim().length > 0
    ? productSlug : 'upscaller-arcano-vitalicio';
  setPurchaseLoading(slug);
  await redirectToCheckout(slug);
  setPurchaseLoading(null);
};
```

- Botões de compra mostram spinner enquanto `purchaseLoading === plan.productSlug`

### 4. Edge function antiga (`create-pagarme-checkout`) NÃO será deletada

Outras páginas (Planos2, PlanosArtesMembro, ArcanoClonerLanding, ComboArtes) ainda usam o fluxo antigo com PreCheckoutModal. A migração delas será feita depois. A nova v2 convive com a antiga.

## Arquivos

| Arquivo | Alteração |
|---|---|
| `supabase/functions/create-pagarme-checkout-v2/index.ts` | Criar — edge function enxuta (só slug → checkout URL) |
| `src/lib/pagarmeCheckout.ts` | Criar — utilitário reutilizável `redirectToCheckout` |
| `src/pages/PlanosUpscalerArcano.tsx` | Remover PreCheckoutModal/preWarm, usar `redirectToCheckout` direto nos botões |

