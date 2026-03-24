

# Plano: Criar sistema reutilizável de Checkout Mercado Pago

## O que será criado

Um **hook React** (`useMPCheckout`) que encapsula toda a lógica do checkout Mercado Pago (modal, validação, redirect, loading, feedback) em uma única chamada. Qualquer página do app poderá usar checkout do Mercado Pago com **3 linhas de código**.

## Como vai funcionar (exemplo de uso)

```tsx
// Em

<lov-plan>

# Plano: Criar sistema reutilizável de Checkout Mercado Pago

## O que será criado

Um **hook React** (`useMPCheckout`) que encapsula toda a lógica do checkout Mercado Pago (modal, validação, redirect, loading, feedback) em uma única chamada. Qualquer página do app poderá usar checkout do Mercado Pago com **3 linhas de código**.

## Como vai funcionar (exemplo de uso)

```text
// Em QUALQUER página:
const { openCheckout, MPCheckoutModal } = useMPCheckout();

// Botão de compra:
<Button onClick={() => openCheckout("slug-do-produto")}>Comprar</Button>

// Modal (colocar no JSX uma vez):
<MPCheckoutModal />
```

Pronto. O hook cuida de tudo: abre modal, coleta nome/email/CPF, valida, chama a edge function, faz tracking do Pixel, redireciona para o Mercado Pago.

## Arquivos a criar/alterar

| Arquivo | Ação |
|---|---|
| `src/hooks/useMPCheckout.tsx` | **CRIAR** — Hook reutilizável com toda a lógica |
| `src/components/checkout/MPEmailModal.tsx` | Manter como está (já funciona perfeitamente) |
| `src/lib/mpCheckout.ts` | Manter como está (função de redirect já corrigida) |
| `src/pages/PlanosUpscalerArcano69v2.tsx` | Refatorar para usar o novo hook (remover lógica duplicada) |

## O que o hook `useMPCheckout` vai conter

1. Estado interno: `selectedSlug`, `loading`, `modalOpen`
2. Função `openCheckout(slug)` — abre o modal com o slug do produto
3. Função `closeCheckout()` — fecha e reseta tudo
4. Handler `onConfirm` — chama `redirectToMPCheckout` com os dados do cliente
5. Componente `MPCheckoutModal` — renderiza o `MPEmailModal` já conectado a tudo
6. Leitura automática de `mp_status` da URL (toast de falha/pendência)

## Detalhes técnicos

```text
useMPCheckout()
  ├── openCheckout(slug) → seta slug + abre modal
  ├── MPCheckoutModal    → renderiza MPEmailModal com props automáticas
  ├── mp_status listener → useEffect que lê ?mp_status=failure|pending da URL
  └── internamente usa   → redirectToMPCheckout (já existente, já corrigido)
                          → MPEmailModal (já existente, já corrigido)
                          → Meta Pixel tracking (InitiateCheckout)
```

O `MPEmailModal` e o `mpCheckout.ts` **não serão alterados** — toda a lógica corrigida nas auditorias anteriores permanece intacta. O hook apenas orquestra esses componentes prontos.

## Resultado

Quando precisar trocar qualquer produto para checkout do Mercado Pago, basta:
1. Importar `useMPCheckout`
2. Chamar `openCheckout("slug-do-produto-no-banco")`
3. Colocar `<MPCheckoutModal />` no JSX

Toda a validação, coleta de dados, tracking, rate limiting, idempotência, ativação de plano, email, CAPI — tudo já funciona automaticamente pela infraestrutura existente (edge functions + webhook).

