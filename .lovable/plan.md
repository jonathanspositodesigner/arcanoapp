

## Plano: Checkout Reserva Automático (Sem Botão, Sem Fricção)

### Problema Atual
- O fallback após 2s mostra um **botão** que o usuário precisa clicar manualmente (fricção)
- O botão redireciona para **páginas internas** do app, não para um checkout Pagar.me real
- Quando o checkout principal falha/demora, o usuário fica preso

### Solução: Dual-Fire Automático

Disparar **duas chamadas em paralelo** ao submeter o formulário:
1. **Checkout completo** (com todos os dados do usuário, como hoje)
2. **Checkout lightweight** (sem dados do usuário, `customer_editable: true`, Pagar.me coleta tudo)

A primeira que retornar com `checkout_url` faz o redirect automático. Zero botão, zero fricção.

```text
Usuário clica "Finalizar e Pagar"
  ├── t=0s: Dispara DUAS chamadas paralelas
  │         ├── Call A: checkout completo (dados pré-preenchidos)
  │         └── Call B: checkout lightweight (sem dados, customer_editable)
  ├── t=Xs: Primeira que retornar checkout_url → redirect automático ✅
  └── Ambas falharam → toast de erro detalhado
```

### Mudanças

#### 1. Edge Function `create-pagarme-checkout` - Flag `lightweight`
- Novo campo opcional no body: `lightweight: true`
- Quando `lightweight`:
  - Pula validação de CPF e telefone
  - Customer com dados mínimos (só email + nome genérico)
  - `customer_editable: true` no checkout (usuário preenche no Pagar.me)
  - `billing_address_editable: true` sempre
  - Ainda cria ordem no banco para rastreio (status `pending`, marcada como `lightweight`)

#### 2. Frontend `PreCheckoutModal.tsx`
- No `handleSubmit`, disparar `Promise.race` entre:
  - Chamada A: checkout completo (payload atual)
  - Chamada B: checkout lightweight (`lightweight: true`, sem CPF/phone/address)
- Remover completamente: estado `showFallback`, botão de fallback, `FALLBACK_CHECKOUT_URLS`, timer de 2s
- A primeira resposta com `checkout_url` faz redirect automático
- Se ambas falharem: toast com erro detalhado (mantém `ERROR_MESSAGES`)
- Cancelar a outra chamada quando uma resolver (via `AbortController` ou ref flag)

#### 3. Limpeza de ordens duplicadas
- A chamada que "perder" a race criará uma ordem `pending` no banco que nunca será paga
- A limpeza automática existente (marca `failed` ordens pending sem pagamento após 30min) já cuida disso
- Adicionar metadata `{ race_fallback: true }` na ordem lightweight para identificação

### Arquivos Modificados
1. `supabase/functions/create-pagarme-checkout/index.ts` - Suporte a flag `lightweight`
2. `src/components/upscaler/PreCheckoutModal.tsx` - Dual-fire automático, remover botão fallback

### Segurança
- A ordem lightweight ainda é criada no banco com `source_platform: 'pagarme'`
- O webhook processa normalmente quando o pagamento é confirmado
- Nenhuma chave de API exposta no frontend

