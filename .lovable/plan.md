

# Auditoria: Fluxos de Assinatura e Emails — Mercado Pago

## Resumo Geral

O sistema está **bem estruturado** na maior parte, mas encontrei **3 problemas** que precisam ser corrigidos antes do deploy e **2 observações** importantes.

---

## Fluxos por Tipo de Pagamento

### 1. Créditos Avulsos (creditos-1500, creditos-4200, creditos-14000)
**Status: ✅ OK**
- Frontend: `openCheckout(slug)` → MPEmailModal → `redirectToMPCheckout`
- Webhook: Adiciona créditos via `add_lifetime_credits`, concede acesso ao pack
- Estorno: Revoga créditos via `revoke_lifetime_credits_on_refund`
- Email de compra: Enviado via SendPulse com template correto para `type: 'credits'`

### 2. Assinaturas (starter/pro/ultimate/unlimited × mensal/anual)
**Status: ✅ OK (com ressalvas)**
- Frontend: `handleSubscriptionPurchase(planName)` → monta slug correto → `openCheckout(slug)`
- Todos os 8 slugs existem na `mp_products` com preços e `is_active = true`
- Webhook: Faz upsert em `planos2_subscriptions` com config correta (créditos, image/video, cost_multiplier)
- Reset de créditos via `reset_upscaler_credits`
- Expiração: 30 dias (mensal) ou 365 dias (anual)
- Estorno: Reset para plano `free` + zera créditos

### 3. Emails de Cobrança Recorrente (process-billing-reminders)
**Status: ✅ OK**
- Já migrado para Mercado Pago: função `createRenewalCheckout` usa `MERCADOPAGO_ACCESS_TOKEN`
- Gera `preferences` no MP e retorna `init_point`
- Templates do banco (`renewal_email_templates`) com placeholders funcionando
- Controle de dedup, blacklist, stopped_reason tudo mantido

### 4. Recovery Emails (send-pix-recovery-email)
**Status: ⚠️ PROBLEMA** — veja abaixo

---

## Problemas Encontrados

### 🔴 Problema 1: `send-pix-recovery-email` busca na tabela `asaas_orders`

**Arquivo:** `supabase/functions/send-pix-recovery-email/index.ts` (linha 234)

A função busca ordens pendentes na tabela **`asaas_orders`** (tabela do Pagar.me), mas as novas compras via Mercado Pago são salvas na tabela **`mp_orders`**. Isso significa que:
- Ordens pendentes do Mercado Pago **nunca serão encontradas** por esta função
- A função só recuperaria ordens antigas do Pagar.me (que não existem mais)

**Correção necessária:** Mudar a query para buscar em `mp_orders` em vez de `asaas_orders`.

### 🔴 Problema 2: `process-billing-reminders` busca produto por `plan_slug` sem filtrar `billing_period`

**Arquivo:** `supabase/functions/process-billing-reminders/index.ts` (linha 460-466)

```typescript
.eq('plan_slug', sub.plan_slug)  // ex: 'pro'
.eq('is_active', true)
.limit(1)
.maybeSingle()
```

O `plan_slug` na `planos2_subscriptions` é armazenado como `starter`, `pro`, etc. (sem sufixo mensal/anual). A query busca na `mp_products` por `plan_slug = 'pro'`, mas existem **4 produtos** com `plan_slug = 'pro'`:
- `plano-pro-mensal` (R$39,90)
- `plano-pro-anual` (R$406,80)
- `upscaler-arcano-pro` (R$37,00, tipo credits)
- `landing-pro-avulso` (R$37,00, tipo landing_bundle)

O `limit(1)` retorna **qualquer um** deles — podendo gerar o checkout com preço **errado** (ex: cobrar R$406,80 de um plano mensal, ou R$37,00 de um pack avulso).

**Correção necessária:** Adicionar filtro `.eq('type', 'subscription')` e idealmente também filtrar por `billing_period` (armazenando o período na `planos2_subscriptions` ou deduzindo pelo valor do `expires_at`).

### 🟡 Problema 3: URLs de `back_urls` inconsistentes

Os `back_urls` variam entre as funções:
- **`create-mp-checkout`**: Usa `arcanoapp.lovable.app`
- **`process-billing-reminders`**: Usa `arcanoapp.voxvisual.com.br`
- **`send-pix-recovery-email`**: Usa `arcanoapp.voxvisual.com.br`

Não é um erro funcional (ambos provavelmente funcionam), mas é uma inconsistência que pode confundir. Idealmente padronizar para um só domínio.

---

## Observações

### 📌 Comentário desatualizado
`process-billing-reminders` linha 478 tem o comentário `// 9. Create Pagar.me PIX checkout`, mas a função já chama o Mercado Pago. É cosmético, não afeta funcionamento.

### 📌 Email de compra para assinaturas
O email de compra enviado pelo webhook (`buildPurchaseEmailHtml`) trata assinaturas com o bloco genérico "Acesso Vitalício Ativado" (o `else` final). Isso pode confundir o cliente que comprou um **plano mensal** — ele veria "Acesso Vitalício" quando na verdade é mensal. Idealmente adicionar um bloco específico para `type === 'subscription'`.

---

## Plano de Correções (para implementar)

1. **`send-pix-recovery-email`**: Trocar query de `asaas_orders` para `mp_orders`
2. **`process-billing-reminders`**: Adicionar `.eq('type', 'subscription')` e filtro de `billing_period` na query de produtos
3. **Email de compra**: Adicionar bloco específico para assinaturas no `buildPurchaseEmailHtml`
4. **Comentários**: Atualizar referências a "Pagar.me" para "Mercado Pago"
5. **URLs**: Padronizar `back_urls` (opcional)

