

# Plano: Migrar checkout da página /planos-2 de Mercado Pago para Pagar.me + estrutura unificada

## Resumo

Trocar o gateway de checkout na página `/planos-2` de Mercado Pago (`useMPCheckout`) para Pagar.me (`create-pagarme-checkout-v2`), mantendo o mesmo modal de coleta de dados (Nome, E-mail, CPF) e preparando um hook unificado reutilizável para migrar o resto do site depois.

---

## Etapa 1 — Criar hook unificado `usePagarmeCheckout`

Criar `src/hooks/usePagarmeCheckout.tsx` — espelho exato do `useMPCheckout`, mas chamando `redirectToCheckout` de `src/lib/pagarmeCheckout.ts` em vez de `redirectToMPCheckout`.

- Mesma API: `openCheckout(slug)`, `isLoading`, `PagarmeCheckoutModal` (componente renderizável)
- Reutiliza o **mesmo `MPEmailModal`** (renomeado internamente para `CheckoutCustomerModal` ou simplesmente reutilizado como está) para coleta de Nome/Email/CPF
- Inclui feedback de URL params (`pagarme_status`) igual ao MP faz com `mp_status`
- Aceita `source_page` nas opções

## Etapa 2 — Atualizar `src/lib/pagarmeCheckout.ts` para aceitar customer data obrigatório

A função `redirectToCheckout` já aceita `customer` opcional. Ajustar para enviar os dados corretamente no payload (campos `customer_name`, `customer_email`, `customer_document`) — já faz isso, só garantir que é chamado com os dados do modal.

## Etapa 3 — Migrar `Planos2.tsx`

Substituições diretas:
- `import { useMPCheckout }` → `import { usePagarmeCheckout }`
- `const { openCheckout, isLoading: isMPLoading, MPCheckoutModal } = useMPCheckout(...)` → `const { openCheckout, isLoading, PagarmeCheckoutModal } = usePagarmeCheckout(...)`
- `<MPCheckoutModal />` → `<PagarmeCheckoutModal />`
- Referências a `isMPLoading` → `isLoading`

Nenhuma mudança visual, nenhuma mudança nos slugs dos produtos, nenhuma mudança na lógica de planos.

## Etapa 4 — Estrutura para migração futura do site inteiro

O hook `usePagarmeCheckout` será a peça central. Para migrar qualquer outra página:
1. Trocar `useMPCheckout` → `usePagarmeCheckout`
2. Trocar `<MPCheckoutModal />` → `<PagarmeCheckoutModal />`
3. Pronto — mesma interface, gateway diferente

---

## Arquivos

| Arquivo | Ação |
|---------|------|
| `src/hooks/usePagarmeCheckout.tsx` | **Criar** — hook espelho do `useMPCheckout` usando Pagar.me |
| `src/pages/Planos2.tsx` | **Editar** — trocar import e uso do hook |
| `src/lib/pagarmeCheckout.ts` | **Manter** — já tem a função pronta, sem mudanças necessárias |
| `src/components/checkout/MPEmailModal.tsx` | **Manter** — reutilizado como está (mesmo modal) |

