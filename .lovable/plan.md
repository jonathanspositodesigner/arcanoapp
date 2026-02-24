

## Configurar Plano Free (300 creditos/mes) e Plano Starter (produto 160732)

Tudo sera feito **separado** dos planos Arcano Premium existentes. Nenhuma tabela, funcao ou webhook existente sera modificada.

---

### PARTE 1: Plano Free - 300 creditos mensais para novas contas

**Como funciona:** Quando um novo usuario confirma seu email (via `confirm-email` edge function), ele recebe automaticamente 300 creditos mensais. Esses creditos nao sao cumulativos -- a cada mes sao resetados para 300 (nao somados).

**Alteracoes:**

1. **Edge Function `confirm-email/index.ts`** - Apos confirmar o email com sucesso (linha 145), adicionar logica para conceder 300 creditos mensais usando a RPC `reset_upscaler_credits` (que ja existe e faz exatamente isso: seta o monthly_balance para o valor informado). Isso so sera feito se o usuario ainda nao tiver creditos (para nao sobrescrever creditos de quem ja comprou algo).

2. **Nova tabela `planos2_subscriptions`** - Tabela separada para rastrear assinaturas dos novos planos da pagina /planos-2. Colunas: user_id, plan_slug (free, starter, pro, ultimate, unlimited), is_active, credits_per_month, daily_prompt_limit, greenn_product_id, greenn_contract_id, created_at, expires_at. Todos os novos usuarios confirmados terao uma entrada com plan_slug='free'.

3. **Funcao de reset mensal** - Uma RPC `reset_planos2_monthly_credits` que pode ser chamada por cron para resetar os creditos mensais de todos os usuarios com planos ativos (nao cumulativo: seta para o valor do plano, nao soma).

---

### PARTE 2: Plano Starter - Produto 160732

**Como funciona:** Quando o webhook Greenn recebe uma venda do produto 160732, o sistema:
- Cria/encontra o usuario
- Registra a assinatura na tabela `planos2_subscriptions` com plan_slug='starter'
- Concede 1.800 creditos mensais
- Libera 5 prompts premium por dia

**Alteracoes:**

1. **Nova Edge Function `webhook-greenn-planos2/index.ts`** - Webhook completamente separado dos existentes. Processa apenas produtos dos novos planos (/planos-2). Para o produto 160732 (Starter):
   - Cria usuario se nao existir (mesmo padrao dos outros webhooks)
   - Insere/atualiza registro em `planos2_subscriptions`
   - Concede 1.800 creditos mensais via `reset_upscaler_credits`
   - Usa `greenn_contract_id` para idempotencia (mesmo padrao)

2. **Bloqueio de Geracao de Imagem e Video** - Usuarios no plano Starter (e Free) nao terao acesso as paginas `/gerar-imagem` e `/gerar-video`. Sera adicionada uma verificacao no frontend dessas duas paginas que consulta a tabela `planos2_subscriptions` para verificar se o usuario tem um plano que permite essas funcionalidades (Pro ou superior). Se nao tiver, mostra uma mensagem de upgrade.

3. **Limite de 5 prompts premium/dia** - O plano Starter tera `daily_prompt_limit = 5` registrado na tabela. A logica de limite diario de prompts no frontend usara esse valor da tabela quando o usuario estiver em um dos novos planos.

---

### Detalhes Tecnicos

**Nova tabela `planos2_subscriptions`:**
```text
- id: UUID (PK)
- user_id: UUID (FK auth.users, UNIQUE)
- plan_slug: TEXT (free, starter, pro, ultimate, unlimited)
- is_active: BOOLEAN (default true)
- credits_per_month: INTEGER
- daily_prompt_limit: INTEGER (nullable, null = ilimitado)
- has_image_generation: BOOLEAN (default false)
- has_video_generation: BOOLEAN (default false)
- greenn_product_id: INTEGER (nullable)
- greenn_contract_id: TEXT (nullable)
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
- expires_at: TIMESTAMPTZ (nullable)
```

**Mapeamento dos planos (para referencia futura):**

| Plano | Slug | Creditos/mes | Prompts/dia | Gerar Imagem | Gerar Video |
|-------|------|-------------|-------------|--------------|-------------|
| Free | free | 300 | 0 | Nao | Nao |
| Starter | starter | 1.800 | 5 | Nao | Nao |
| Pro | pro | 4.200 | 10 | Sim | Sim |
| Ultimate | ultimate | 10.800 | 24 | Sim | Sim |
| Unlimited | unlimited | Ilimitado | Ilimitado | Sim | Sim |

**Arquivos criados:**
- `supabase/functions/webhook-greenn-planos2/index.ts` - Novo webhook separado
- Migracao SQL para criar tabela `planos2_subscriptions` com RLS

**Arquivos editados:**
- `supabase/functions/confirm-email/index.ts` - Adicionar concessao de 300 creditos + registro free
- `src/pages/GerarImagemTool.tsx` - Adicionar verificacao de acesso (bloquear free/starter)
- `src/pages/GerarVideoTool.tsx` - Adicionar verificacao de acesso (bloquear free/starter)
- `supabase/config.toml` - Registrar nova edge function com verify_jwt = false

**Nada sera alterado nos:**
- Webhooks existentes (webhook-greenn-artes, webhook-greenn-creditos, webhook-greenn-musicos)
- Tabela premium_users e suas funcoes
- Hook usePremiumStatus e AuthContext
- Nenhum plano Arcano Premium existente

