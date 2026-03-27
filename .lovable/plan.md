

## Plano: Migrar todos os checkouts de Packs de Artes de Pagar.me para Mercado Pago

### Contexto
Atualmente, 8 arquivos usam o fluxo Pagar.me (`invokeCheckout` + `PreCheckoutModal` + `PaymentMethodModal`) para vender packs de artes. Todos os slugs necessários já existem na tabela `mp_products`. A migração substitui esse fluxo pelo padrão `useMPCheckout` (mesmo usado em planos-2, upscaler, etc).

### Arquivos a alterar (8 no total)

**Páginas de pricing:**
1. `src/pages/PlanosArtes.tsx` — página principal de compra de packs (normal + renovação + desconto notificação)
2. `src/pages/PlanosArtesMembro.tsx` — página de compra com desconto de membro (20% OFF)

**Componentes prevenda-pack4:**
3. `src/components/prevenda-pack4/PricingCardsSectionPack4.tsx`
4. `src/components/prevenda-pack4/MotionsGallerySectionPack4.tsx`
5. `src/components/prevenda-pack4/GuaranteeSectionPack4.tsx`

**Componentes combo-artes:**
6. `src/components/combo-artes/PricingCardsSection.tsx`
7. `src/components/combo-artes/MotionsGallerySection.tsx`
8. `src/components/combo-artes/GuaranteeSectionCombo.tsx`

### O que muda em cada arquivo

**Remover:**
- Imports: `invokeCheckout`, `preWarmCheckout`, `PreCheckoutModal`, `PaymentMethodModal`, `useProcessingButton`, `getSanitizedUtms`, `getMetaCookies`
- States: `showPreCheckout`, `showPaymentMethodModal`, `pendingSlug`, `pendingProfile`, `userEmail`, `userId`, `isCheckoutSubmitting`
- Funções: `handlePagarmeCheckout`, `handlePagarmeCheckoutWithSlug`, `handlePaymentMethodSelected`, `handlePurchase` (versão Pagar.me), `checkAuth`, `preWarmCheckout`
- JSX: `<PreCheckoutModal />`, `<PaymentMethodModal />`

**Adicionar:**
- Import: `useMPCheckout` de `@/hooks/useMPCheckout`
- Hook: `const { openCheckout, MPCheckoutModal } = useMPCheckout({ source_page: "planos-artes" })`
- JSX: `<MPCheckoutModal />` (substitui os 2 modais removidos)
- Botões chamam: `openCheckout(slug)` em vez do fluxo complexo anterior

**Mapeamento de slugs permanece idêntico** — os mesmos slugs (`pack4-vitalicio`, `vol1-6meses`, `agendas-renov-1ano`, `vol2-membro-vitalicio`, etc.) já existem em `mp_products` e serão passados via `openCheckout(slug)`.

### O que NÃO muda
- Preços exibidos na tela
- Lógica de acesso/permissões
- Lógica de renovação e desconto de membro
- Webhook de ativação (já processa MP)
- Links de checkout Greenn (fallback para packs sem slug Pagar.me continua sendo redirecionamento externo — mas agora esses packs também usarão MP se tiverem slug)
- Nenhuma alteração no banco de dados

### Resultado
- Todos os packs passam a usar checkout Mercado Pago via modal de Nome/Email/CPF
- Código simplificado drasticamente (remoção de ~100 linhas de lógica Pagar.me por arquivo)
- Compatível com WebView (usa `window.location.href`)

