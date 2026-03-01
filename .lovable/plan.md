

# Auditoria Completa: Bugs no Cadastro Manual Admin (Planos 2)

## Bugs Encontrados

### Bug 1 (CRITICO): Creditos do PAID_PLANS estao ERRADOS

A lista `PAID_PLANS` no admin tem valores de creditos completamente desatualizados comparado com os valores reais usados pelo webhook (fonte da verdade):

| Plano | Admin (ERRADO) | Webhook (CORRETO) |
|-------|----------------|-------------------|
| Starter | 600 | 1800 |
| Pro | 1500 | 4200 |
| Ultimate | 6000 | 10800 |
| IA Unlimited | 999999 | 99999 |

**Impacto**: Quando o admin cria um usuario manualmente, ele recebe creditos ERRADOS. Um usuario Ultimate recebe 6.000 em vez de 10.800. Um Starter recebe 600 em vez de 1.800.

### Bug 2 (CRITICO): getPlanFeatures nao define daily_prompt_limit correto

A funcao `getPlanFeatures` retorna `daily_prompt_limit` simplificado que nao bate com o webhook:

| Plano | Admin getPlanFeatures | Webhook (CORRETO) |
|-------|----------------------|-------------------|
| Starter | 5 | 5 (OK) |
| Pro | null | 10 |
| Ultimate | null | 24 |
| Unlimited | null | null (OK) |

**Impacto**: Pro e Ultimate manuais ficam sem limite diario (null = ilimitado), enquanto assinantes via checkout tem limites de 10 e 24 respectivamente.

### Bug 3 (MEDIO): Pro deveria ter has_video_generation = true

No webhook, o plano Pro tem `has_video_generation: true`, mas o `getPlanFeatures` do admin retorna `has_video_generation: false` para Pro.

**Impacto**: Usuarios Pro criados manualmente nao conseguem gerar videos, enquanto os que assinam via checkout conseguem.

### Bug 4 (BAIXO): Edge function cria registro desnecessario em premium_users

A funcao `create-premium-user` cria um registro na tabela `premium_users` (sistema legado) para todo usuario manual. Isso e desnecessario para Planos 2 e pode causar confusao na administracao.

## Correcoes

### Correcao 1: Atualizar PAID_PLANS com valores corretos do webhook

No arquivo `src/components/admin/AdminPlanos2SubscribersTab.tsx`, atualizar a constante PAID_PLANS:

```text
ANTES:
  starter: credits 600
  pro: credits 1500
  ultimate: credits 6000
  unlimited: credits 999999

DEPOIS:
  starter: credits 1800
  pro: credits 4200
  ultimate: credits 10800
  unlimited: credits 99999
```

### Correcao 2: Atualizar getPlanFeatures para bater com o webhook

Incluir `daily_prompt_limit` correto e `has_video_generation` correto para cada plano:

```text
starter: has_image: false, has_video: false, daily_limit: 5
pro: has_image: true, has_video: true, daily_limit: 10
ultimate/unlimited: has_image: true, has_video: true, daily_limit: 24 (ultimate) / null (unlimited)
```

### Correcao 3: Separar o case 'ultimate' do 'unlimited' no getPlanFeatures

Atualmente estao agrupados, mas Ultimate tem `daily_prompt_limit: 24` enquanto Unlimited tem `null`. Precisam de cases separados.

## Resumo de mudancas

**Arquivo**: `src/components/admin/AdminPlanos2SubscribersTab.tsx`
- Atualizar `PAID_PLANS` com creditos corretos (4 valores)
- Reescrever `getPlanFeatures` com valores que batem exatamente com o webhook
- Separar cases de ultimate e unlimited

Nenhuma mudanca no banco necessaria - os registros antigos com valores errados ja foram corrigidos anteriormente, e os novos serao criados corretos.

