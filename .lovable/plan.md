

## Confirmacao de Email Obrigatoria via SendPulse no Cadastro

### Problema

Hoje, o `auto_confirm` esta ativo no Supabase (necessario para usuarios criados por webhooks de pagamento). Quando alguem se cadastra pelo formulario, a conta fica ativa imediatamente e a pessoa ja pode logar e pegar creditos gratuitos com qualquer email falso.

### Solucao

Adicionar verificacao de email manual controlada pela tabela `profiles` (campo `email_verified`), com envio do email de confirmacao via SendPulse. O `auto_confirm` do Supabase continua ativo (para webhooks), mas o login so e permitido apos confirmacao do email.

### Fluxo novo do cadastro

```text
1. Usuario preenche formulario de signup
2. Conta e criada no Supabase (auto-confirm ON)
3. Profile e criado com email_verified = false
4. Edge Function "send-confirmation-email" gera um token unico, salva no banco, envia email via SendPulse
5. Tela de sucesso: "Verifique seu email para confirmar sua conta"
6. Usuario clica no link do email
7. Edge Function "confirm-email" valida o token, marca email_verified = true no profile
8. Usuario redirecionado para pagina de login
9. No login, o hook verifica email_verified antes de permitir acesso
```

### Mudancas

| Tipo | Arquivo | Detalhe |
|------|---------|---------|
| Migracao | Nova tabela `email_confirmation_tokens` + campo `email_verified` em profiles | Armazena tokens de confirmacao com expiracao |
| Nova Edge Function | `supabase/functions/send-confirmation-email/index.ts` | Gera token, salva no banco, envia email bonito via SendPulse com link de confirmacao |
| Nova Edge Function | `supabase/functions/confirm-email/index.ts` | Recebe token via query param, valida, marca `email_verified = true` no profile, redireciona para login |
| Modificar | `src/hooks/useUnifiedAuth.ts` | No `signup`: chamar `send-confirmation-email` apos criar conta. No `loginWithPassword`: bloquear login se `email_verified = false` |
| Modificar | `src/components/HomeAuthModal.tsx` | Ja tem tela de sucesso pos-signup (signupSuccess), nenhuma mudanca necessaria |
| Modificar | Webhooks existentes (webhook-greenn, create-premium-user, etc.) | Garantir que usuarios criados por webhook tenham `email_verified = true` automaticamente |

### Detalhes tecnicos

**Nova tabela `email_confirmation_tokens`:**
```text
- id: uuid (PK)
- user_id: uuid (FK profiles)
- email: text
- token: text (unique, gerado com crypto.randomUUID)
- expires_at: timestamptz (24 horas apos criacao)
- used_at: timestamptz (null ate ser usado)
- created_at: timestamptz
```

**Campo novo em `profiles`:**
```text
- email_verified: boolean (default false)
```

**Edge Function `send-confirmation-email`:**
```text
1. Recebe { email, user_id }
2. Gera token com crypto.randomUUID()
3. Salva na tabela email_confirmation_tokens
4. Monta link: {SUPABASE_URL}/functions/v1/confirm-email?token={token}
5. Monta HTML bonito (mesmo estilo da plataforma)
6. Envia via SendPulse (mesma logica do send-recovery-email)
```

**Edge Function `confirm-email`:**
```text
1. Recebe token via query param (GET request)
2. Busca token na tabela, verifica se nao expirou e nao foi usado
3. Marca used_at = now()
4. Atualiza profiles SET email_verified = true WHERE id = user_id
5. Retorna HTML bonito com mensagem "Email confirmado!" e botao para login
6. Ou redireciona para a pagina de login da plataforma
```

**Alteracao no `useUnifiedAuth.ts` - signup (linhas 317-386):**
```text
Apos criar o usuario e o profile:
1. Chamar send-confirmation-email com email e user_id
2. Fazer signOut() imediatamente (usuario NAO pode ficar logado)
3. Chamar onSignupSuccess() para mostrar tela de "verifique seu email"
```

**Alteracao no `useUnifiedAuth.ts` - loginWithPassword (linhas 235-312):**
```text
Apos login bem-sucedido, antes de redirecionar:
1. Verificar profile.email_verified
2. Se false: signOut(), mostrar toast "Confirme seu email antes de entrar"
3. Se true: continuar fluxo normal
```

**Webhooks (webhook-greenn, create-premium-user, etc.):**
```text
Todos os webhooks que criam profiles devem setar email_verified = true
pois esses usuarios foram verificados pelo processo de pagamento
```

### Impacto

- Usuarios que se cadastram pelo formulario precisam confirmar email antes de logar
- Usuarios criados por webhooks de pagamento continuam funcionando normalmente (email_verified = true)
- Usuarios existentes: migracao seta email_verified = true para todos os profiles existentes
- Nenhum email e enviado pelo Supabase nativo, tudo via SendPulse
- Impossivel criar contas com emails falsos para pegar creditos

