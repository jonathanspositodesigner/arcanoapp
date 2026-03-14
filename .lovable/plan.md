
Objetivo
- Remover qualquer endereço fictício dos fluxos Pagar.me.
- Garantir que cada botão de plano na /planos-2 abra checkout do produto (slug) correto, sem “vazar” slug de outro produto.

Diagnóstico confirmado
1) Ainda existe fallback de endereço fictício no backend:
- supabase/functions/create-pagarme-checkout/index.ts
  - zip_code: '01310100'
  - city: 'São Paulo'
  - state: 'SP'
- supabase/functions/create-pagarme-subscription/index.ts
  - mesmos fallbacks

2) /planos-2 (5 planos) hoje está com mapeamento de slug correto no código:
- Starter -> plano-starter-{mensal|anual}
- Pro -> plano-pro-{mensal|anual}
- Ultimate -> plano-ultimate-{mensal|anual}
- IA Unlimited -> plano-unlimited-{mensal|anual}
- Free não gera checkout

3) No banco, preços dos produtos de /planos-2 estão corretos:
- plano-ultimate-mensal = 59.90
- plano-ultimate-anual = 598.80
- demais planos e créditos também consistentes.

Plano de implementação
1) Remover endereço falso em todos os checkouts Pagar.me
- Arquivo: supabase/functions/create-pagarme-checkout/index.ts
  - Eliminar defaults de CEP/cidade/estado.
  - Só enviar billing_address quando TODOS os campos vierem válidos.
  - Se endereço incompleto/ausente:
    - PIX: billing_address_editable = true
    - cartão no hosted checkout: billing_address_editable = true (sem injetar dados falsos)
- Arquivo: supabase/functions/create-pagarme-subscription/index.ts
  - Eliminar defaults de CEP/cidade/estado.
  - Exigir endereço completo para enviar customer.address.
  - Se incompleto, retornar erro claro (400) pedindo atualização de endereço no perfil antes de criar assinatura recorrente.

2) Blindar slug para não abrir checkout errado
- Arquivo: src/pages/Planos2.tsx
  - Garantir reset de estado ao fechar modais (pendingSlug, pendingProfile, isSubscriptionFlow, pendingPlanName, pixLoading).
  - Validar antes de abrir PreCheckout/PaymentMethod: nunca abrir sem slug definido.
- Arquivo: src/components/upscaler/PreCheckoutModal.tsx
  - Bloquear submit se productSlug vier vazio/nulo.
  - Mostrar erro amigável e impedir chamada da edge function sem slug.

3) Remover fallbacks perigosos de slug em modais onde há pendingSlug
- Arquivos:
  - src/pages/PlanosArtes.tsx
  - src/pages/PlanosArtesMembro.tsx
  - src/components/combo-artes/PricingCardsSection.tsx
  - src/components/prevenda-pack4/PricingCardsSectionPack4.tsx
- Trocar productSlug={pendingSlug || '...'} por lógica segura:
  - só renderizar/abrir modal quando pendingSlug existir
  - sem fallback para “comprar produto errado” por acidente de estado

4) Conferência “um por um” dos planos da /planos-2
- Validar no código e no payload final:
  - Free: sem checkout
  - Starter mensal/anual
  - Pro mensal/anual
  - Ultimate mensal/anual
  - Unlimited mensal/anual
- Confirmar que cada clique define slug esperado antes de qualquer invoke.

5) Validação pós-implementação (checklist)
- Fluxo logado com perfil completo:
  - clicar em cada plano de /planos-2 e verificar slug enviado no request body
  - verificar abertura da checkout_url correta
- Fluxo sem endereço:
  - PIX deve abrir checkout com campo de endereço editável (sem endereço pré-preenchido falso)
- Fluxo cartão recorrente:
  - sem endereço completo deve bloquear com mensagem clara
  - com endereço completo deve criar assinatura normalmente

Detalhes técnicos
- Não haverá alteração de schema/banco (sem migração).
- Correções concentram-se em:
  - validação e montagem de payload nas edge functions
  - higiene de estado e slug no frontend para impedir “stale slug”
- Resultado esperado:
  - nenhum checkout Pagar.me com endereço fake
  - redução de falhas antifraude por inconsistência de endereço
  - cada plano abrindo apenas o checkout do produto correto.
