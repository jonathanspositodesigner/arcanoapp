

# Plano: Ofertas Avulsas Exclusivas da Landing Page Arcano Cloner

## Resumo

Criar 3 produtos independentes e exclusivos para a página `/arcanocloner-teste`. Cada produto concede **créditos vitalícios** + **benefícios de assinatura premium permanentes** (sem expiração). Os produtos não interferem em nenhum plano existente.

## Produtos

| Plano | Slug | Preço | Créditos Vitalícios | Benefícios Premium |
|-------|------|-------|---------------------|-------------------|
| Starter | `landing-starter-avulso` | R$ 24,90 | 1.500 | Starter (sem imagem/vídeo gen) |
| Pro | `landing-pro-avulso` | R$ 37,00 | 4.200 | Pro (com imagem + vídeo gen) |
| Ultimate | `landing-ultimate-avulso` | R$ 79,90 | 14.000 | Ultimate (com imagem + vídeo gen) |

## Etapas

### 1. Inserir 3 novos produtos na tabela `mp_products`

Criar 3 registros com um novo tipo `landing_bundle` para distingui-los. Campos-chave:
- `type`: `'landing_bundle'` (novo tipo para o webhook identificar)
- `plan_slug`: `'starter'` / `'pro'` / `'ultimate'` (qual nível de benefício ativar)
- `credits_amount`: 1500 / 4200 / 14000
- `access_type`: `'vitalicio'`
- Sem `billing_period` (não é assinatura recorrente)

### 2. Atualizar o webhook `webhook-pagarme`

Adicionar um bloco de processamento para `product.type === 'landing_bundle'`:

1. **Adicionar créditos vitalícios** via `add_lifetime_credits` RPC (igual ao tipo `credits`)
2. **Ativar benefícios premium permanentes** via upsert em `planos2_subscriptions`:
   - `plan_slug` do produto
   - `expires_at: null` (nunca expira)
   - `is_active: true`
   - Config do plano (starter/pro/ultimate) usando o mesmo `PLAN_CONFIG` já existente
   - `credits_per_month: 0` (sem créditos mensais — apenas vitalícios)
   - **NÃO resetar créditos mensais** (evita sobrescrever créditos existentes)
   - **NÃO chamar `reset_upscaler_credits`** — só o `add_lifetime_credits`

Proteção: se o usuário já tiver um plano ativo de nível superior (ex: comprou Ultimate e depois tenta Starter), manter o plano superior.

### 3. Atualizar `LandingPricingSection.tsx`

- Adicionar slug a cada plano: `landing-starter-avulso`, `landing-pro-avulso`, `landing-ultimate-avulso`
- Importar `PreCheckoutModal`, `PaymentMethodModal` e a lógica de checkout (similar ao Planos2)
- O botão "Comprar agora" abre o fluxo de checkout Pagar.me:
  - Se não logado → abre `PreCheckoutModal` com o slug do produto
  - Se logado com perfil completo → abre `PaymentMethodModal` (PIX/Cartão)
  - Se logado sem perfil → abre `PreCheckoutModal`
- Importar `invokeCheckout` e hooks necessários

### 4. Atualizar o webhook `refund-pagarme` (se existir)

Garantir que estornos de `landing_bundle` revoguem tanto os créditos quanto os benefícios premium.

## Detalhes Técnicos

- Os slugs são **completamente novos** e não conflitam com nenhum produto existente
- O tipo `landing_bundle` é novo — nenhum código existente processa esse tipo, então zero risco de interferência
- Os créditos entram como `lifetime_balance` (nunca expiram, nunca resetam)
- A assinatura ativada com `expires_at: null` funciona para sempre
- O webhook já tem toda a infraestrutura de criar usuário, enviar email, Meta CAPI etc. — apenas adicionamos um novo bloco de processamento

## Arquivos Alterados

1. **`mp_products`** — 3 novos registros (via insert tool)
2. **`supabase/functions/webhook-pagarme/index.ts`** — novo bloco para `landing_bundle`
3. **`src/components/arcano-cloner/LandingPricingSection.tsx`** — checkout funcional com PreCheckoutModal
