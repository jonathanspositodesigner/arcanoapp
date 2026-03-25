

# Plano: Migrar Checkouts de Assinaturas para Mercado Pago + Substituir Cobranças Pagar.me por MP

## Contexto e Pesquisa

### Mercado Pago Subscriptions API — Resultado da Pesquisa

O Mercado Pago oferece **assinaturas recorrentes** via API `/preapproval`:

**Cartão de Crédito (Recorrência Automática):**
- Criar assinatura com `card_token_id` + `status: "authorized"` = MP cobra automaticamente a cada ciclo
- Suporta `frequency_type: "months"` ou `"days"`, `transaction_amount`, `start_date`, `end_date`
- O MP gerencia tentativas de cobrança, notificações e cancelamento
- Webhooks de pagamento chegam normalmente via `payment` notification

**Sem Cartão (Checkout Link — "pending"):**
- Criar assinatura com `status: "pending"` (sem `card_token_id`) → MP retorna `init_point` (URL de checkout)
- O cliente acessa o link, escolhe cartão ou outro método, e o MP passa a cobrar automaticamente
- **PIX Recorrente (Pix Automático)**: Lançado em Junho/2025 pelo Banco Central. O Mercado Pago **ainda NÃO suporta** Pix Automático como método de recorrência nas suas APIs. Apenas cartão de crédito é suportado para cobrança automática recorrente.

### Fluxo Atual das Assinaturas (Pagar.me)
1. **Frontend (Planos2.tsx)**: `handleSubscriptionPurchase` → verifica perfil → `PreCheckoutModal` (coleta nome/CPF/tel/endereço) → `PaymentMethodModal` (PIX ou Cartão) → `invokeCheckout` → redireciona para checkout hospedado Pagar.me
2. **Backend**: `create-pagarme-checkout` gera order na `asaas_orders` + link checkout Pagar.me
3. **Webhook**: `webhook-pagarme` ativa plano, cria subscription Pagar.me recorrente (para cartão)
4. **Cobrança PIX**: `process-billing-reminders` envia sequência de 6 emails com links Pagar.me para renovação
5. **Recovery emails**: `send-pix-recovery-email` envia emails para ordens pendentes com checkout Pagar.me
6. **Estorno**: `refund-pagarme` cancela subscription Pagar.me e revoga acesso

### O que PRECISA mudar

```text
┌─────────────────────────┐     ┌──────────────────────────┐
│   FLUXO ATUAL           │     │   FLUXO NOVO             │
│                         │     │                          │
│ Frontend                │     │ Frontend                 │
│  PreCheckoutModal       │ ──▶ │  useMPCheckout (hook)    │
│  PaymentMethodModal     │     │  MPEmailModal            │
│  invokeCheckout         │     │  redirectToMPCheckout    │
│                         │     │                          │
│ Edge Functions          │     │ Edge Functions           │
│  create-pagarme-checkout│ ──▶ │  create-mp-checkout      │
│  webhook-pagarme (subs) │ ──▶ │  webhook-mercadopago     │
│  process-billing-reminders│──▶│  (gera checkout MP)      │
│  send-pix-recovery-email│ ──▶ │  (gera checkout MP)      │
│  refund-pagarme (cancel)│ ──▶ │  (cancel via MP API)     │
└─────────────────────────┘     └──────────────────────────┘
```

---

## Etapas de Implementação

### Etapa 1: Migrar checkout de assinaturas no Frontend (Planos2.tsx)

Substituir o fluxo `handleSubscriptionPurchase` → `PreCheckoutModal` → `PaymentMethodModal` → `invokeCheckout` pelo mesmo padrão já usado nos créditos: `openCheckout(slug)` via `useMPCheckout`.

**Mudanças:**
- `handleSubscriptionPurchase` passa a chamar `openCheckout(slug)` diretamente
- Remover `PreCheckoutModal`, `PaymentMethodModal`, `invokeCheckout` e todos os estados associados (`showPreCheckout`, `preCheckoutSlug`, `pendingSlug`, `pendingProfile`, `showPaymentMethodModal`, `isSubscriptionFlow`)
- Remover import de `checkoutFetch.ts` e `PreCheckoutModal`
- O `MPEmailModal` coleta nome/email/CPF (suficiente para o MP)

**Pré-requisito**: Validar que os slugs de assinatura (`plano-starter-mensal`, `plano-pro-mensal`, etc.) existem na tabela `mp_products` com `is_active = true`. Se não existirem, criar via migration.

### Etapa 2: Verificar/criar produtos de assinatura na mp_products

Consultar a tabela `mp_products` para confirmar que todos os 8 slugs de assinatura existem:
- `plano-starter-mensal`, `plano-starter-anual`
- `plano-pro-mensal`, `plano-pro-anual`
- `plano-ultimate-mensal`, `plano-ultimate-anual`
- `plano-unlimited-mensal`, `plano-unlimited-anual`

Cada um precisa ter: `type = 'subscription'`, `plan_slug` (ex: `starter`), `billing_period` (ex: `mensal`), `price`, `is_active = true`.

Se faltarem, criar via migration SQL.

### Etapa 3: Expandir webhook-mercadopago para ativar assinaturas

O webhook-mercadopago **já processa** packs, créditos e upgrades. Precisa ser expandido para processar `type = 'subscription'` com a mesma lógica que existe no `webhook-pagarme`:

- Quando `product.type === 'subscription'` e `product.plan_slug`:
  - Upsert em `planos2_subscriptions` com `credits_per_month`, `has_image_generation`, etc.
  - Reset de créditos via RPC `reset_upscaler_credits`
  - Definir `expires_at` (30 ou 365 dias)
  - **NÃO cria subscription recorrente no MP** (primeira versão = pagamento avulso por ciclo, igual ao PIX atual)

### Etapa 4: Migrar process-billing-reminders para gerar checkouts MP

Substituir a função `createRenewalCheckout` (que chama Pagar.me API) por uma que chama `create-mp-checkout` ou diretamente a API de preferências do MP:

- Em vez de criar ordem Pagar.me → criar preferência MP (como já faz `create-mp-checkout`)
- A URL retornada (`init_point`) substitui o `checkoutUrl` do Pagar.me nos emails
- Remover seção PIX copia-e-cola dos emails (MP não retorna isso no checkout hospedado)
- Manter toda a lógica de controle (dedup, blacklist, day_offset, templates do DB)

### Etapa 5: Migrar send-pix-recovery-email para checkouts MP

Mesma lógica: substituir `generateCheckoutUrl` (Pagar.me) por criação de preferência MP.

### Etapa 6: Expandir estorno (webhook-mercadopago) para assinaturas

O refund no webhook-mercadopago **já funciona** para packs e créditos. Adicionar lógica para `type === 'subscription'`:
- Reset para plano free em `planos2_subscriptions`
- Remover créditos do ciclo atual

### Etapa 7: Limpeza

- Remover `checkoutFetch.ts` (não mais usado)
- Remover `PreCheckoutModal` se não for usado em nenhuma outra página
- Remover `PaymentMethodModal` se não for usado em nenhuma outra página
- Remover referência a `PAGARME_SECRET_KEY` nas funções migradas

---

## Sobre Recorrência Automática com Cartão (MP Preapproval)

**Abordagem recomendada para V1**: Manter o mesmo modelo de cobrança manual via email que já funciona com PIX. O Mercado Pago Checkout Pro gera um link de pagamento por ciclo, e a sequência de emails (`process-billing-reminders`) envia os lembretes. Isso é mais simples e já está provado no sistema atual.

**V2 futura (opcional)**: Implementar `POST /preapproval` do MP para criar assinatura recorrente automática no cartão. Isso eliminaria a necessidade dos emails de cobrança para pagamentos com cartão, mas requer:
- Coletar `card_token_id` (exige integrar MP.js no frontend para tokenizar cartão)
- Processar webhooks de subscription (`preapproval`) além dos de `payment`
- Gerenciar ciclo de vida da subscription (pausar, cancelar, atualizar cartão)

**PIX Recorrente**: O Pix Automático foi lançado pelo Banco Central em junho/2025, mas o Mercado Pago **ainda não implementou** suporte a Pix Automático nas suas APIs. Portanto, para PIX a cobrança continua sendo via email com link de checkout.

---

## O que NÃO muda

- Slugs dos produtos (mesmos nomes)
- Tabelas `planos2_subscriptions`, `upscaler_credit_transactions`
- RPC `reset_upscaler_credits`, `add_lifetime_credits`
- Lógica de renovação de créditos via `cron-reset-credits`
- Templates de email no DB (`renewal_email_templates`)
- Meta Pixel/CAPI (já integrado no `create-mp-checkout` e `webhook-mercadopago`)
- UTMs e UTMify
- Todo o layout visual da página Planos2

