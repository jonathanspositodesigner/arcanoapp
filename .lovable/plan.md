

## Diagnóstico: Múltiplos cliques no checkout

### Problema identificado

Existem **3 pontos de entrada** para o checkout Pagar.me, e nenhum deles usa o `useProcessingButton` (que já existe e funciona bem nas ferramentas de IA):

1. **`Planos2.tsx` — `handleCreditPurchase`**: O `pixLoading` só é setado **depois** que o profile é buscado e o método de pagamento escolhido. Durante os ~500ms da query de profile, o botão continua clicável. Resultado: múltiplas queries de profile e potencialmente múltiplos modais abertos.

2. **`Planos2.tsx` — `handlePaymentMethodSelected`**: Após escolher PIX/Cartão, o loading é setado, mas se o usuário clicou rápido antes do modal fechar, pode disparar duplicado.

3. **`PricingCardsSection.tsx` — `handlePaymentMethodSelected`**: Mesmo padrão — `isLoading` só é setado depois do modal fechar.

4. **`PreCheckoutModal.tsx` — `handleSubmit`**: Usa `loading` state, mas sem ref síncrono. Entre o clique e o React renderizar `disabled`, um segundo clique passa.

### Solução

Aplicar o `useProcessingButton` (já existente em `src/hooks/useProcessingButton.ts`) nos 3 arquivos de checkout. O hook usa **ref síncrono** que bloqueia instantaneamente, antes mesmo do React re-renderizar.

### Mudanças por arquivo

**1. `src/pages/Planos2.tsx`**
- Importar `useProcessingButton`
- Usar `startSubmit()`/`endSubmit()` no `handleCreditPurchase` (guard no início, release no finally/redirect)
- Desabilitar todos os botões de compra com `isSubmitting`
- Remover dependência exclusiva do `pixLoading` para o disabled

**2. `src/components/combo-artes/PricingCardsSection.tsx`**
- Importar `useProcessingButton`
- Aplicar no `handleBuy` e `handlePaymentMethodSelected`
- Desabilitar botão com `isSubmitting`

**3. `src/components/upscaler/PreCheckoutModal.tsx`**
- Importar `useProcessingButton`
- Aplicar no `handleSubmit` e `handleOneClickPurchase`
- Desabilitar botões "Ir para Pagamento" e "Comprar com 1 Clique" com `isSubmitting`

### Resultado esperado
- Bloqueio **instantâneo** (via ref, não espera React re-render)
- Zero ordens duplicadas por clique duplo
- Redução direta do abandono causado por confusão de múltiplos redirects

