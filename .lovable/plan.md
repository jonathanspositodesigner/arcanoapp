

# Migração dos Planos Mensais/Anuais da Greenn para Pagar.me (Assinatura Recorrente)

## Situação Atual

- A página `/planos-2` tem 5 planos: Free, Starter (R$19,90), Pro (R$39,90), Ultimate (R$59,90), IA Unlimited (R$149,90)
- Versão anual: Starter R$19,90, Pro R$33,90, Ultimate R$49,90, Unlimited R$119,90
- **Hoje cada botão abre um link Greenn direto** (`window.open(paymentUrl)`) — sem checkout interno
- O webhook Greenn (`webhook-greenn`) ativa `planos2_subscriptions` com upsert, seta créditos via `reset_upscaler_credits`
- No cancelamento/reembolso Greenn: reseta para `free`, zera créditos
- **Problema**: checkout via Greenn não tem controle de reembolso robusto, não usa a lógica atômica do Pagar.me

## O Que Vai Mudar

### 1. Banco de Dados

**a) Novos produtos na tabela `mp_products`** (10 registros: 5 planos × 2 períodos):

| slug | title | price | type | Período |
|---|---|---|---|---|
| `plano-starter-mensal` | Plano Starter Mensal | 19.90 | `subscription` | mensal |
| `plano-pro-mensal` | Plano Pro Mensal | 39.90 | `subscription` | mensal |
| `plano-ultimate-mensal` | Plano Ultimate Mensal | 59.90 | `subscription` | mensal |
| `plano-unlimited-mensal` | Plano IA Unlimited Mensal | 149.90 | `subscription` | mensal |
| `plano-starter-anual` | Plano Starter Anual | 19.90 | `subscription` | anual |
| `plano-pro-anual` | Plano Pro Anual | 33.90 | `subscription` | anual |
| `plano-ultimate-anual` | Plano Ultimate Anual | 49.90 | `subscription` | anual |
| `plano-unlimited-anual` | Plano IA Unlimited Anual | 119.90 | `subscription` | anual |

O campo `type = 'subscription'` será novo. Adicionar colunas opcionais `plan_slug` e `billing_period` à tabela `mp_products` para mapear diretamente qual plano ativar.

**b) Coluna nova em `asaas_orders`**: `source_platform TEXT DEFAULT 'pagarme'` — já existe implicitamente, mas vamos adicionar `pagarme_subscription_id TEXT NULL` para rastrear a assinatura recorrente do Pagar.me.

**c) Coluna nova em `planos2_subscriptions`**: `pagarme_subscription_id TEXT NULL` — para saber qual subscription cancelar no Pagar.me quando precisar.

### 2. Edge Function: `create-pagarme-subscription` (NOVA)

Nova função que cria uma assinatura recorrente no Pagar.me via `POST /subscriptions`:

```text
Entrada: { plan_slug, user_email, user_phone, user_name, user_cpf, billing_type, utm_data, user_address }

Fluxo:
1. Validar inputs + rate limit (igual create-pagarme-checkout)
2. Buscar produto em mp_products pelo slug
3. Criar ordem em asaas_orders (status: 'pending', product_id)
4. Chamar Pagar.me POST /subscriptions com:
   - payment_method: 'credit_card' (obrigatório para recorrência)
   - interval: 'month' ou 'year'  
   - interval_count: 1
   - billing_type: 'prepaid'
   - minimum_price: valor em centavos
   - items: [{ description, quantity: 1, pricing_scheme: { price: centavos } }]
   - customer: { name, email, document, phones }
   - card: via tokenização no front OU checkout do Pagar.me
   - metadata: { order_id }
5. Salvar pagarme_subscription_id na ordem
6. Retornar URL do checkout (se usar checkout) ou confirmar (se card direto)
```

**Decisão importante sobre checkout**: O Pagar.me tem dois modos para assinaturas:
- **Checkout hosted**: cria a subscription com `payment_method: 'checkout'` — redireciona o cliente para página Pagar.me
- **Card token direto**: precisa tokenizar o cartão no front-end e enviar o `card_id`

**Recomendação**: Usar o **checkout hosted do Pagar.me** (mesmo modelo dos créditos avulsos), porque já funciona, o cliente já conhece a UX, e não precisa implementar tokenização de cartão no front.

### 3. Webhook: Atualizar `webhook-pagarme` para Tratar Eventos de Subscription

O Pagar.me envia webhooks diferentes para assinaturas:
- `subscription.created` — assinatura criada
- `subscription.updated` — dados atualizados
- `charge.paid` (dentro do ciclo) — cobrança do ciclo paga
- `charge.refunded` — cobrança refunded
- `subscription.canceled` — assinatura cancelada
- `subscription.expired` — expirou

**Lógica no webhook-pagarme**:

```text
IF eventType == 'charge.paid' E produto.type == 'subscription':
  1. Lock atômico (pending → processing) — já existe
  2. Criar/buscar usuário — já existe
  3. Upsert planos2_subscriptions com:
     - plan_slug do produto
     - credits_per_month, daily_prompt_limit, has_image_generation, etc.
     - pagarme_subscription_id
     - expires_at = +30d (mensal) ou +365d (anual)
     - is_active = true
  4. reset_upscaler_credits (resetar créditos mensais)
  5. Atualizar ordem → paid
  6. Enviar email de boas-vindas (sendPlanos2WelcomeEmail)
  7. Notificar admin

IF eventType == 'charge.refunded' E produto.type == 'subscription':
  1. Lock atômico (paid → refund_processing)
  2. Resetar planos2_subscriptions → free (credits=100, sem image/video gen)
  3. Zerar créditos via reset_upscaler_credits(_amount: 0)
  4. Cancelar subscription no Pagar.me (DELETE /subscriptions/{id})
  5. Marcar ordem → refunded

IF eventType == 'subscription.canceled':
  1. Buscar ordem pelo pagarme_subscription_id
  2. Desativar planos2_subscriptions → free
  3. Zerar créditos
  4. Marcar ordens → canceled
```

### 4. Refund Manual: Atualizar `refund-pagarme`

Quando admin faz reembolso manual de um produto `type == 'subscription'`:
1. Cancelar a subscription no Pagar.me: `DELETE /subscriptions/{subscription_id}`
2. Resetar `planos2_subscriptions` → free
3. Zerar créditos com `reset_upscaler_credits(0)`
4. Marcar ordem → refunded

### 5. Frontend: `Planos2.tsx`

Trocar o fluxo dos botões de `window.open(greennUrl)` para o mesmo checkout Pagar.me:

```text
Botão "Assinar" clicado:
  1. Se não logado → abrir modal de signup
  2. Se logado → verificar perfil completo (nome, phone, cpf, endereço)
     - Se incompleto → PreCheckoutModal (já existe)
     - Se completo → PaymentMethodModal (PIX ou Cartão)
  3. Chamar create-pagarme-subscription (ou create-pagarme-checkout com flag de subscription)
  4. Redirecionar para checkout Pagar.me
```

Remover todos os `paymentUrl` da Greenn dos dados dos planos.

### 6. Mapeamento de Plano → Configuração (no webhook)

```typescript
const PAGARME_PLAN_CONFIG: Record<string, {
  slug: string;
  credits_per_month: number;
  daily_prompt_limit: number | null;
  has_image_generation: boolean;
  has_video_generation: boolean;
  cost_multiplier: number;
}> = {
  'plano-starter-mensal': { slug: 'starter', credits_per_month: 1800, daily_prompt_limit: 5, has_image_generation: false, has_video_generation: false, cost_multiplier: 1.0 },
  'plano-pro-mensal': { slug: 'pro', credits_per_month: 4200, daily_prompt_limit: 10, has_image_generation: true, has_video_generation: true, cost_multiplier: 1.0 },
  'plano-ultimate-mensal': { slug: 'ultimate', credits_per_month: 10800, daily_prompt_limit: 24, has_image_generation: true, has_video_generation: true, cost_multiplier: 1.0 },
  'plano-unlimited-mensal': { slug: 'unlimited', credits_per_month: 99999, daily_prompt_limit: null, has_image_generation: true, has_video_generation: true, cost_multiplier: 0.5 },
  // Anuais = mesma config, período diferente
  'plano-starter-anual': { ... mesmo que mensal },
  'plano-pro-anual': { ... },
  'plano-ultimate-anual': { ... },
  'plano-unlimited-anual': { ... },
}
```

### 7. Garantia de Revogação Total no Reembolso

Checklist do que é revogado quando há reembolso/cancelamento:
- `planos2_subscriptions` → resetar para `free` (credits=100, sem image/video, cost_multiplier=1.0)
- `upscaler_credits` → zerar via `reset_upscaler_credits(0)` (monthly=0, balance=lifetime only)
- Subscription Pagar.me → cancelar via API `DELETE /subscriptions/{id}`
- Ordem → status `refunded`
- Webhook log → registrar evento
- **Tudo atômico**: se qualquer etapa falhar, retornar erro 500 (não reportar sucesso falso)

### 8. Consideração sobre PIX em Assinaturas

O Pagar.me **NÃO suporta PIX para recorrência** — só cartão de crédito e boleto. Para o primeiro pagamento, podemos usar checkout hosted que aceita PIX, mas a recorrência automática precisa de cartão.

**Opções**:
- **Opção A**: Assinatura = só cartão de crédito (recorrência real do Pagar.me)
- **Opção B**: PIX = checkout avulso que gera uma "assinatura manual" (sem recorrência automática, o cliente precisa pagar de novo todo mês)

**Recomendação**: Opção A — usar checkout Pagar.me que cria a subscription com cartão. Se o cliente quer PIX, fazemos um checkout avulso de período único (como funciona hoje com créditos) e ativamos o plano por 30 ou 365 dias sem recorrência automática.

### Resumo dos Arquivos

| Arquivo | Ação |
|---|---|
| `supabase/migrations/xxx.sql` | Novos produtos + colunas |
| `supabase/functions/create-pagarme-subscription/index.ts` | NOVO — cria subscription Pagar.me |
| `supabase/functions/webhook-pagarme/index.ts` | EDITAR — tratar subscription events |
| `supabase/functions/refund-pagarme/index.ts` | EDITAR — cancelar subscription + revogar plano |
| `src/pages/Planos2.tsx` | EDITAR — trocar checkout Greenn → Pagar.me |
| `supabase/config.toml` | Adicionar nova function |

