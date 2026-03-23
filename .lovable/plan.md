

# Plano: Corrigir fluxo de login para clientes que nunca definiram senha

## Diagnóstico

O cliente `assessoriaraybelmonte@gmail.com`:
- Conta criada em Dez/2025 pelo webhook (senha = email)
- `password_changed = true` no perfil (setado incorretamente pelo webhook)
- `last_sign_in_at = NULL` no auth — **nunca fez login**
- Quando tenta fazer login, vai direto para a tela de senha, digita algo errado e recebe "Email ou senha incorretos"
- O cliente interpreta isso como "cadastro não encontrado"

**Causa raiz**: O webhook cria o usuário com `password = email` e marca `password_changed = true`. Quando o usuário tenta logar depois, ele não sabe que a senha é o próprio email. O sistema pula o fluxo de "primeiro acesso" porque:
1. `password_changed = true` (setado incorretamente)
2. Conta é anterior a 2026-03-12 (cutoff de legacy), que auto-fixa `password_changed = true`

Resultado: o usuário fica preso na tela de senha sem saber qual é.

## Correções

### 1. Adicionar verificação de `last_sign_in_at` no `useUnifiedAuth`

Quando o perfil existe com `password_changed = true` mas o usuário **nunca fez login** (`last_sign_in_at = null` no auth.users), tratar como primeiro acesso:
- Tentar auto-login com `email como senha` (a senha padrão do webhook)
- Se funcionar: redirecionar para troca de senha obrigatória
- Se falhar: mostrar tela de senha normalmente

Para isso, criar uma nova RPC `check_user_login_history` (SECURITY DEFINER) que retorna se o user já fez login alguma vez, consultando `auth.users.last_sign_in_at`.

### 2. Atualizar `check_profile_exists` para retornar `has_logged_in`

Adicionar campo `has_logged_in` no retorno da RPC, que consulta `auth.users.last_sign_in_at IS NOT NULL`. Assim o frontend sabe se a pessoa realmente já acessou a plataforma.

### 3. Ajustar o fluxo no `useUnifiedAuth.checkEmail`

```text
Email encontrado + password_changed + has_logged_in = false
  → Tentar auto-login (senha = email)
  → Se ok: redirecionar para troca de senha
  → Se falhar: mostrar tela de senha com hint "Sua senha inicial é seu email"
```

### 4. Ajustar o mesmo fluxo no `ArcanoClonerAuthModal`

Mesma lógica do item 3 para o modal do Arcano Cloner.

### 5. Corrigir `complete-purchase-onboarding` para não setar `password_changed = true`

Quando a edge function cria ou atualiza o perfil durante o onboarding pós-compra, ela deve setar `password_changed = true` **apenas** quando o usuário efetivamente define uma senha naquele momento. Atualmente ela sempre seta `true`.

## Arquivos modificados

| Arquivo | Alteracao |
|---|---|
| Migration SQL | Atualizar `check_profile_exists` para retornar `has_logged_in` via `auth.users.last_sign_in_at` |
| `src/hooks/useUnifiedAuth.ts` | Usar `has_logged_in` para detectar primeiro acesso real e tentar auto-login |
| `src/components/arcano-cloner/ArcanoClonerAuthModal.tsx` | Mesma logica de primeiro acesso |
| `supabase/functions/complete-purchase-onboarding/index.ts` | Setar `password_changed` corretamente |

