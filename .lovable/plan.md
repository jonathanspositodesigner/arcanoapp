

# Correção: Link de redefinição de senha inválido ou expirado

## Diagnóstico (logs de autenticação)

O problema do `novatinho15714@gmail.com` está claro nos logs:

1. **12:58:02** — Link de recuperação gerado com sucesso
2. **12:58:18** — `/verify` chamado de **DFW (Dallas)** → LOGIN SUCCESS (token consumido)
3. **12:58:18** — `/verify` chamado de **GRU (São Paulo)** → "One-time token not found"
4. **12:59 a 13:00** — Mais tentativas → todas "One-time token not found"

**Causa raiz:** O Gmail (e outros provedores) faz **prefetch/escaneamento automático de links** nos e-mails para verificar segurança. Esse scanner (IP de Dallas/DFW) acessou o link `/verify` ANTES do usuário real (IP de São Paulo/GRU), consumindo o token de uso único. Quando o usuário clicou, o token já tinha sido usado.

**Isso afeta TODOS os usuários que usam Gmail** (e possivelmente Outlook/Yahoo). Não é um caso isolado.

## Solução

Trocar o fluxo de link direto ao `/verify` por um fluxo com **token via query parameter**. Assim o prefetch do Gmail NÃO consome o token, porque ele só vai para a página do app (uma página React estática), e o token é trocado via JavaScript no lado do cliente.

### 1. Atualizar `send-recovery-email` — Construir URL segura

Em vez de enviar o `action_link` direto (que aponta para `/auth/v1/verify?token=...`), extrair o `token_hash` e `type` do link e montar uma URL que aponte direto para a página de reset:

```
https://arcanoapp.voxvisual.com.br/reset-password?token_hash=XXXX&type=recovery
```

O prefetch do Gmail vai acessar essa URL, mas é apenas uma página React — não consome o token.

### 2. Atualizar `ResetPassword.tsx` — Verificar token via `verifyOtp`

Ao carregar a página, detectar `token_hash` e `type` nos query params. Se presentes, chamar:

```typescript
supabase.auth.verifyOtp({ token_hash, type: 'recovery' })
```

Isso estabelece a sessão autenticada. Depois o fluxo de `updateUser({ password })` funciona normalmente.

Se não houver token nos params, verificar se já existe sessão (caso do hash fragment atual funcionar).

### 3. Aplicar a mesma correção nos 3 reset pages

- `src/pages/ResetPassword.tsx`
- `src/pages/ResetPasswordArtes.tsx`
- `src/pages/ResetPasswordArtesMusicos.tsx`

### 4. Atualizar os 3 forgot password pages

Alterar o `redirect_url` enviado para `send-recovery-email` para não incluir `/reset-password` (já que agora a URL será construída no edge function direto).

## Arquivos modificados

- `supabase/functions/send-recovery-email/index.ts` — extrair token e montar URL segura
- `src/pages/ResetPassword.tsx` — usar `verifyOtp` com token_hash
- `src/pages/ResetPasswordArtes.tsx` — mesma correção
- `src/pages/ResetPasswordArtesMusicos.tsx` — mesma correção

