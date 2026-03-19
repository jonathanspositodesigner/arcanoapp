

## Fix: Usuários antigos marcados como "primeiro acesso"

### Problema
Contas criadas antes de 12/03/2026 com `password_changed = false` são forçadas ao fluxo de "primeiro acesso" mesmo que o usuário já saiba a senha e consiga autenticar normalmente.

### Locais afetados (4 pontos no código)

1. `src/hooks/useUnifiedAuth.ts` linha 176 — `checkEmail()`: se `!passwordChanged`, entra no fluxo de primeiro acesso (auto-login com email como senha)
2. `src/hooks/useUnifiedAuth.ts` linha 301 — `loginWithPassword()`: após login com sucesso, se `!profile.password_changed`, redireciona para `/change-password`
3. `src/pages/UserLogin.tsx` linha 39 — `checkLoginStatus`: se já logado e `!password_changed`, redireciona para `/change-password`
4. `src/components/arcano-cloner/ArcanoClonerAuthModal.tsx` linha 224 — se `!passwordChanged`, auto-login com email como senha

### Correções

**1. useUnifiedAuth.ts — `checkEmail()` (linha 176)**
Antes de entrar no fluxo de primeiro acesso, buscar `created_at` do perfil. Se `created_at < '2026-03-12'`, pular o fluxo de primeiro acesso e ir direto para o step de senha (password). Isso requer alterar a função `check_profile_exists` para retornar `created_at` também, OU fazer um select separado.

Abordagem mais simples: alterar a RPC `check_profile_exists` para retornar `created_at` junto.

**2. useUnifiedAuth.ts — `loginWithPassword()` (linha 301)**
Após login com sucesso e `!profile.password_changed`, adicionar `created_at` ao select da linha 288. Se `created_at < '2026-03-12'`, auto-corrigir `password_changed = true` e continuar login normalmente sem redirecionar.

**3. UserLogin.tsx — `checkLoginStatus` (linha 33-43)**
Adicionar `created_at` ao select. Se `created_at < '2026-03-12'` e `!password_changed`, auto-corrigir e navegar direto para `redirectTo`.

**4. ArcanoClonerAuthModal.tsx — `handleCheckEmail` (linha 224)**
Mesmo fix: se conta é pré-corte, tratar como se tivesse senha e ir para password step.

### Alteração na RPC `check_profile_exists`
Adicionar `created_at` ao retorno:
```sql
CREATE OR REPLACE FUNCTION public.check_profile_exists(check_email TEXT)
RETURNS TABLE(exists_in_db BOOLEAN, password_changed BOOLEAN, created_at TIMESTAMPTZ)
```

### Backfill no banco (SQL migration)
Marcar `password_changed = true` para perfis criados antes de `2026-03-12` que já fizeram login (evidência: `last_sign_in_at IS NOT NULL` na `auth.users` ou existe algum job/transaction no nome deles).

Como não temos acesso direto a `auth.users` em migrations normais, usamos um critério alternativo: perfis que têm `created_at < '2026-03-12'` E já possuem registros em `upscaler_credit_transactions` (indica uso ativo da plataforma).

```sql
UPDATE profiles SET password_changed = true
WHERE created_at < '2026-03-12'
AND password_changed IS NOT TRUE
AND id IN (
  SELECT DISTINCT user_id FROM upscaler_credit_transactions
);
```

### Resumo de arquivos
- `supabase/migrations/` — nova migration para alterar RPC + backfill
- `src/hooks/useUnifiedAuth.ts` — auto-fix para contas pré-corte nos 2 fluxos
- `src/pages/UserLogin.tsx` — auto-fix no check de login
- `src/components/arcano-cloner/ArcanoClonerAuthModal.tsx` — auto-fix no check de email

