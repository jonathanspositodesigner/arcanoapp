

## Pagina de Resgate de Teste Gratis (240 creditos)

### O que sera feito

Uma nova pagina `/teste-gratis` com fluxo completo de verificacao, cadastro e resgate de 240 creditos.

### Fluxo do usuario

```text
1. Usuario acessa /teste-gratis
2. Digita o email
3. Sistema verifica:
   a) Ja resgatou na tabela promo_claims (1500 creditos)? -> Bloqueia
   b) Ja resgatou na tabela arcano_cloner_free_trials (240 creditos)? -> Bloqueia
   c) Se nao resgatou nada:
      - TEM cadastro (check_profile_exists) -> Pede senha, faz login, resgata 240 creditos, redireciona para /ferramentas-ia-aplicativo
      - NAO tem cadastro -> Abre formulario de cadastro (nome, email, senha), cria conta, envia email de confirmacao via SendPulse (mesmo fluxo atual), ao confirmar email vai pra home
```

### Cenarios de bloqueio

- "Voce ja resgatou uma promocao anteriormente" com botao "Ir para as Ferramentas de IA"

### Mudancas

| Tipo | Arquivo | Detalhe |
|------|---------|---------|
| Nova pagina | `src/pages/TesteGratis.tsx` | Pagina com 4 estados: email, login, signup, bloqueado |
| Nova Edge Function | `supabase/functions/check-free-trial-eligibility/index.ts` | Verifica email nas duas tabelas de promo (promo_claims + arcano_cloner_free_trials) e se tem cadastro |
| Nova Edge Function | `supabase/functions/claim-free-trial/index.ts` | Resgata 240 creditos via RPC, requer usuario autenticado + email_verified |
| Modificar | `src/App.tsx` | Adicionar rota /teste-gratis e lazy import |

### Detalhes tecnicos

**Edge Function `check-free-trial-eligibility`:**
- Recebe `{ email }` via POST (sem auth necessario)
- Verifica na tabela `promo_claims` se o email ja resgatou (qualquer promo_code)
- Verifica na tabela `arcano_cloner_free_trials` se o email ja resgatou
- Verifica via RPC `check_profile_exists` se tem cadastro
- Retorna `{ eligible: bool, has_account: bool, reason?: string }`

**Edge Function `claim-free-trial`:**
- Requer autenticacao (Authorization header)
- Verifica `email_verified = true` no profile
- Verifica novamente nas tabelas de promo se ja resgatou (seguranca server-side)
- Chama RPC `claim_arcano_free_trial_atomic` para dar os 240 creditos
- Retorna `{ success: bool, credits_granted: number }`

**Pagina `TesteGratis.tsx`:**
- Estado `email`: campo de email + botao "Verificar"
- Estado `blocked`: mensagem de que ja resgatou + botao para ferramentas
- Estado `login`: campo de senha (email ja preenchido), faz login via supabase.auth.signInWithPassword, verifica email_verified, chama claim-free-trial, redireciona para /ferramentas-ia-aplicativo
- Estado `signup`: formulario com nome, email (readonly), senha. Cria conta, cria profile com email_verified=false, chama send-confirmation-email (SendPulse), faz signOut, mostra mensagem "verifique seu email". Ao confirmar email, usuario vai pra home (fluxo existente do confirm-email)
- Visual: mesmo estilo da pagina ResgatarCreditos (dark purple gradient, cards com borda roxa)

