# Plano: Migração de Checkouts Pagar.me → Mercado Pago

## Resumo

Substituir o fluxo complexo do Pagar.me (profile check → PreCheckoutModal → PaymentMethodModal → invokeCheckout) pelo fluxo simples e já testado do Mercado Pago (`useMPCheckout` → `openCheckout(slug)` → `MPCheckoutModal`), mantendo os mesmos slugs de produto que já existem na tabela `mp_products`.

## Páginas Afetadas


| Página               | Arquivo                    | Fluxo Atual                                       |
| -------------------- | -------------------------- | ------------------------------------------------- |
| Planos de Artes      | `PlanosArtes.tsx`          | `invokeCheckout` → create-pagarme-checkout        |
| Planos Membro        | `PlanosArtesMembro.tsx`    | `invokeCheckout` → create-pagarme-checkout        |
| Upscaler Arcano      | `PlanosUpscalerArcano.tsx` | `redirectToCheckout` → create-pagarme-checkout-v2 |
| Planos IA (Créditos) | `Planos2.tsx`              | `invokeCheckout` → create-pagarme-checkout        |


## O que muda em cada página

Para **cada** página, a migração segue o mesmo padrão mecânico:

1. **Remover imports** do Pagar.me: `invokeCheckout`, `preWarmCheckout`, `redirectToCheckout`, `PreCheckoutModal`, `PaymentMethodModal`, `CheckoutCustomerModal`, `useProcessingButton`, `getSanitizedUtms`, `getMetaCookies`
2. **Adicionar import** do `useMPCheckout`
3. **Substituir estados** (`showPreCheckout`, `pendingSlug`, `pendingProfile`, `showPaymentMethodModal`, `pixLoading`) pelo hook: `const { openCheckout, MPCheckoutModal } = useMPCheckout()`
4. **Substituir handlers** (`handlePagarmeCheckout`, `handlePaymentMethodSelected`, etc.) por chamadas diretas a `openCheckout(slug)`
5. **Remover modais** (`<PreCheckoutModal>`, `<PaymentMethodModal>`, `<CheckoutCustomerModal>`) e adicionar `<MPCheckoutModal />`
6. **Manter os mesmos slugs** de produto — cada botão continua enviando o mesmo slug que já envia hoje

## O que NÃO muda

- **Slugs de produto** — cada botão mantém exatamente o mesmo slug
- **Tabela `mp_products**` — os produtos já devem existir lá (será verificado antes de implementar)
- **Webhook e ativação** — o `webhook-mercadopago` já processa pagamentos e ativa assinaturas/pacotes da mesma forma
- **Meta Pixel / CAPI** — já integrado no `create-mp-checkout`
- **UTMs** — já coletados automaticamente pelo `useMPCheckout` → `redirectToMPCheckout`
- **Lógica de fallback Greenn** — links Greenn para LATAM continuam funcionando como estão

## Pré-requisito: Produtos no banco

Antes de implementar, preciso verificar se todos os slugs do Pagar.me (ex: `pack4-6meses`, `vol1-membro-vitalicio`, `starter-mensal`, etc.) já existem na tabela `mp_products` com preço e `is_active = true`. Se não existirem, precisarão ser criados via INSERT.

## Ordem de execução

Você escolhe quais páginas migrar primeiro. A implementação de cada uma é independente e leva poucos minutos — é uma substituição mecânica sem reconstrução de lógica.  
  
voce vai começar trocando todos os checkouts da pagina planos-upscaler-arcano para o mercado pago seguindo essa mesma logica. mas antes voce vai verificar todos os slugs do [pagar.me](http://pagar.me) e ver se ja existem na tabela do mercado pago e se nao existir criar.