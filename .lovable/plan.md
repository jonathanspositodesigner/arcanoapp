

## Plano: Customizar cores e título do modal PreCheckout na página Pack 4

### Problema
O `PreCheckoutModal` usa cores fuchsia/roxo (identidade visual do Upscaler), mas na página de pré-venda do Pack 4 a identidade visual é laranja (#EF672C). O título também precisa mudar de "Finalizar Compra" para "Já é quase seu!".

### Abordagem
Adicionar props opcionais ao `PreCheckoutModal` para permitir customização de cores e título sem afetar os outros usos do componente.

### Mudanças

**1. `src/components/upscaler/PreCheckoutModal.tsx`**
- Adicionar props `modalTitle?: string` e `colorScheme?: 'fuchsia' | 'orange'`
- Quando `colorScheme === 'orange'`, trocar todas as referências de cor:
  - `fuchsia-500` → `[#EF672C]`
  - `fuchsia-400` → `[#EF672C]`
  - `purple-600` → `[#f65928]`
  - `from-[#1a0f25] to-[#150a1a]` → `from-[#1a0a0a] to-[#150a05]`
  - Border: `fuchsia-500/30` → `[#EF672C]/30`
- Trocar o título "Finalizar Compra" pelo valor de `modalTitle` (default: `Finalizar Compra`)
- O span colorido no título usará a cor do scheme

**2. `src/components/combo-artes/PricingCardsSection.tsx`**
- Passar `modalTitle="Já é quase seu!"` e `colorScheme="orange"` ao `PreCheckoutModal`
- Passar as mesmas props ao modal de método de pagamento (já está com cores corretas nesse componente)

