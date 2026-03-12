

## Problema identificado

Existem **2 bugs** que causam o problema:

### Bug 1: Webhook reseta `password_changed` para `false` em usuários existentes

Na linha 453 do `webhook-pagarme/index.ts`, o upsert do perfil **sempre** seta `password_changed: false`:

```typescript
await supabase.from('profiles').upsert({
  ...
  password_changed: false,  // ← PROBLEMA: reseta para false mesmo se já era true
  ...
}, { onConflict: 'id' })
```

Quando `jonathan@admin.com` (que já tinha conta com `password_changed: true`) comprou, o webhook resetou `password_changed` para `false`. Isso fez a página `/sucesso-compra` achar que era primeiro acesso.

### Bug 2: Página de sucesso tenta auto-login com email como senha

Na `/sucesso-compra` (e `/sucesso-upscaler-arcano`), quando `password_changed === false`, o código tenta `signInWithPassword({ email, password: email })`. Para usuários existentes que já definiram senha, isso falha e redireciona para `/login` com mensagem genérica de erro.

### Correções

**1. `webhook-pagarme/index.ts` (linha 442-456)** — Preservar `password_changed` existente

Em vez de hardcodar `password_changed: false`, usar o valor existente do perfil:

```typescript
await supabase.from('profiles').upsert({
  ...
  password_changed: existingProfile ? undefined : false, // Só seta false para perfis novos
  ...
}, { onConflict: 'id' })
```

Na prática, a melhor abordagem é remover `password_changed` do upsert quando o perfil já existe, para não sobrescrever. Construir o objeto de upsert condicionalmente:

```typescript
const profileData: Record<string, unknown> = {
  id: userId,
  email,
  name: profileName,
  // ... demais campos
  email_verified: true,
  updated_at: new Date().toISOString()
};

// Só setar password_changed: false para perfis NOVOS (que não existiam)
if (!existingProfile) {
  profileData.password_changed = false;
}

await supabase.from('profiles').upsert(profileData, { onConflict: 'id' })
```

**2. `SucessoCompra.tsx` e `SucessoUpscalerArcano.tsx`** — Corrigir fluxo para usuários existentes

Quando `passwordChanged === true`, redirecionar para login normalmente (já funciona). O problema real era o Bug 1 que transformava `true` em `false`.

Mas como prevenção adicional, quando `passwordChanged === false` e o auto-login falha (porque o usuário já tem senha definida), a mensagem deveria ser mais clara:

```typescript
} else if (!passwordChanged) {
  const { error: loginError } = await supabase.auth.signInWithPassword({
    email: trimmed,
    password: trimmed,
  });
  if (!loginError) {
    toast.success("Bem-vindo! Defina sua senha.");
    navigate("/change-password");
  } else {
    // Usuário já tem senha — redirecionar para login normal
    toast.success("Conta encontrada! Faça login com sua senha.");
    navigate("/login");
  }
}
```

**3. Mesma correção nos outros webhooks** — `webhook-greenn`, `webhook-greenn-artes`, `webhook-greenn-musicos`, `webhook-mercadopago`

Todos esses webhooks também hardcodam `password_changed: false` no upsert, causando o mesmo bug para usuários existentes que compram novamente.

### Resumo das mudanças

| Arquivo | Mudança |
|---------|---------|
| `webhook-pagarme/index.ts` | Não sobrescrever `password_changed` de perfis existentes |
| `webhook-greenn/index.ts` | Idem |
| `webhook-greenn-artes/index.ts` | Idem |
| `webhook-greenn-musicos/index.ts` | Idem |
| `webhook-mercadopago/index.ts` | Idem |
| `SucessoCompra.tsx` | Melhorar mensagem quando auto-login falha |
| `SucessoUpscalerArcano.tsx` | Idem |

### Correção imediata no banco

Restaurar o `password_changed` do `jonathan@admin.com`:

```sql
UPDATE profiles SET password_changed = true WHERE email = 'jonathan@admin.com';
```

