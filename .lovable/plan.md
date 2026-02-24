

## Plano: Emails de boas-vindas por plano + Correção de acesso Premium para Planos v2

Existem 3 problemas para resolver:

---

### Problema 1: Nenhum email é enviado ao comprador dos Planos v2

Atualmente, o `processPlanos2Webhook` faz o upsert na subscription e reseta créditos, mas **nao envia nenhum email de boas-vindas**. O fluxo legado tem a funcao `sendWelcomeEmail`, mas ela so conhece os planos antigos.

**Solucao**: Criar uma funcao `sendPlanos2WelcomeEmail` dentro do `webhook-greenn/index.ts` com template especifico para cada plano (Starter, Pro, Ultimate, Unlimited). O email segue o padrao SendPulse existente, com:
- Nome do plano e beneficios especificos
- Credenciais de acesso (email/senha)
- Link CTA para `https://arcanoapp.voxvisual.com.br/`
- Tracking de abertura/clique via `welcome-email-tracking`

Templates por plano:
- **Starter**: "Plano Starter ativado! 1.800 creditos, 5 prompts premium/dia"
- **Pro**: "Plano Pro ativado! 4.200 creditos, 10 prompts premium/dia, geracao de imagens e videos"
- **Ultimate**: "Plano Ultimate ativado! 10.800 creditos, 24 prompts premium/dia, geracao de imagens e videos"
- **Unlimited**: "Plano IA Unlimited ativado! Creditos ilimitados, sem limite de prompts, 50% OFF nas ferramentas"

Chamar essa funcao no final do `processPlanos2Webhook`, apos o sucesso do upsert.

---

### Problema 2: Compradores dos Planos v2 nao veem a Biblioteca de Prompts nem Ferramentas de IA na home

A raiz do problema: a funcao SQL `is_premium()` so verifica a tabela `premium_users`. Planos v2 ficam em `planos2_subscriptions` - entao esses usuarios nunca sao detectados como premium.

A cascata:
1. `is_premium()` retorna `false` para usuarios planos2
2. `AuthContext.tsx` seta `isPremium = false`
3. `Index.tsx` calcula `hasPromptsAccess = false` (precisa de `isPremium`)
4. Sidebar/TopBar mostram "Torne-se Premium" em vez de "Premium Ativo"

**Solucao**: Atualizar a funcao SQL `is_premium()` para tambem verificar `planos2_subscriptions`:

```text
SELECT EXISTS (
  SELECT 1 FROM premium_users
  WHERE user_id = auth.uid() AND is_active = true
  AND (expires_at IS NULL OR expires_at > now())
)
OR EXISTS (
  SELECT 1 FROM planos2_subscriptions
  WHERE user_id = auth.uid() AND is_active = true
  AND plan_slug != 'free'
  AND (expires_at IS NULL OR expires_at > now())
)
```

Isso resolve de uma vez:
- Badge "Premium Ativo" na sidebar e topbar
- Acesso a "Biblioteca de Prompts" na home (hasPromptsAccess)
- Acesso as "Ferramentas de IA" na home

---

### Problema 3: Starter nao libera 5 prompts premium/dia

O hook `useDailyPromptLimit` usa `planType` do sistema legado (`arcano_basico`, `arcano_pro`), nao conhece os slugs do planos2 (`starter`, `pro`, etc). Como o planType vem de `premium_users` e usuarios planos2 nao tem registro la, o limite nunca e aplicado corretamente.

**Solucao**: Atualizar `useDailyPromptLimit.ts` para tambem consultar `planos2_subscriptions.daily_prompt_limit` quando o usuario for planos2. Ou melhor, integrar com o `usePlanos2Access` ja existente. Adicionar ao Index.tsx a verificacao de planos2 para desbloquear ferramentas.

Tambem precisa atualizar `Index.tsx` para considerar `isPlanos2User` ao calcular `hasPromptsAccess` e `hasToolAccess`.

---

### Detalhes tecnicos

**Arquivos modificados:**

1. **`supabase/functions/webhook-greenn/index.ts`**
   - Adicionar funcao `sendPlanos2WelcomeEmail()` com template HTML por plano
   - Chamar no final de `processPlanos2Webhook` apos sucesso

2. **Migracao SQL** (nova)
   - `CREATE OR REPLACE FUNCTION is_premium()` para incluir check em `planos2_subscriptions`

3. **`src/pages/Index.tsx`**
   - Importar `usePlanos2Access`
   - Incluir `isPlanos2User && planSlug !== 'free'` no calculo de `hasPromptsAccess`
   - Incluir planos2 com `has_image_generation` no calculo de `hasToolAccess`

4. **`src/hooks/useDailyPromptLimit.ts`**
   - Aceitar `dailyPromptLimit` opcional do planos2
   - Usar esse limite quando presente, em vez de hardcoded por planType

5. **`src/pages/BibliotecaPrompts.tsx`**
   - Passar o `daily_prompt_limit` do planos2 para `useDailyPromptLimit`

---

### Resumo

- 1 funcao SQL atualizada (`is_premium`)
- 1 edge function editada (`webhook-greenn`)
- 3 arquivos frontend editados (`Index.tsx`, `useDailyPromptLimit.ts`, `BibliotecaPrompts.tsx`)
- Nenhum arquivo novo criado, nenhum deletado

