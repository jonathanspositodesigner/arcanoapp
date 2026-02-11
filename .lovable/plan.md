

## Correção: Email de "Primeiro Acesso" não chega ao usuário

### Problema

O fluxo de "Primeiro Acesso" (password_changed = false) chama `supabase.auth.resetPasswordForEmail()` que envia email pelo sistema nativo do Supabase. Esse sistema tem limite de 2-3 emails por hora e entrega muito baixa. Toda a plataforma ja usa SendPulse via a Edge Function `send-single-email`, mas esse fluxo especifico ficou usando o Supabase nativo.

### Solucao

Criar uma nova Edge Function `send-recovery-email` que:
1. Recebe o email do usuario
2. Usa `supabase.auth.admin.generateLink()` para gerar um link de recovery valido
3. Envia o email via SendPulse (mesma logica do `send-single-email`)
4. Retorna sucesso/erro

Depois, alterar o `useUnifiedAuth.ts` e as paginas de `ChangePassword` para chamar essa Edge Function em vez de `supabase.auth.resetPasswordForEmail()`.

### Mudancas

| Tipo | Arquivo | Detalhe |
|------|---------|---------|
| Nova Edge Function | `supabase/functions/send-recovery-email/index.ts` | Gera link de recovery via admin API + envia via SendPulse |
| Modificar | `src/hooks/useUnifiedAuth.ts` | Substituir `resetPasswordForEmail` por chamada a `send-recovery-email` |
| Modificar | `src/pages/ChangePassword.tsx` | Substituir `resendPasswordLink` por chamada a `send-recovery-email` |
| Modificar | `src/pages/ChangePasswordArtes.tsx` | Mesma substituicao |
| Modificar | `src/pages/ChangePasswordArtesMusicos.tsx` | Mesma substituicao |

### Detalhes tecnicos

**Edge Function `send-recovery-email`:**

```text
1. Recebe: { email, redirect_url }
2. Usa supabase admin para gerar link:
   supabase.auth.admin.generateLink({
     type: 'recovery',
     email,
     options: { redirectTo: redirect_url }
   })
3. Extrai o link gerado (action_link)
4. Monta HTML bonito com o link (template estilo da plataforma)
5. Envia via SendPulse (mesma logica do send-single-email: OAuth token, SMTP API)
6. Retorna { success: true }
```

**Alteracao no useUnifiedAuth.ts (linhas 187-220):**

Onde hoje faz:
```text
const { error: resetError } = await supabase.auth.resetPasswordForEmail(...)
```

Vai fazer:
```text
const { data, error } = await supabase.functions.invoke('send-recovery-email', {
  body: { email: normalizedEmail, redirect_url: redirectUrl }
})
```

**Alteracao nas paginas ChangePassword:**

A funcao `resendPasswordLink` vai chamar a Edge Function em vez de `supabase.auth.resetPasswordForEmail`.

### Impacto

- Todos os emails de "Primeiro Acesso" e "Reenviar link" passam a usar SendPulse
- Entrega confiavel e sem limite de rate do Supabase
- Mesmo template visual dos outros emails da plataforma
- Nenhuma mudanca na experiencia do usuario (mesma tela, mesmo fluxo)
