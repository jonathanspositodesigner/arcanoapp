

# Corrigir fluxo completo: email especifico do modal + auto-login + claim automatico

## Problemas

1. O `confirm-email` redireciona para `arcanoapp.lovable.app/` -- deveria usar o dominio real `arcanoapp.voxvisual.com.br`
2. O email de confirmacao enviado pelo modal e identico ao email de confirmacao normal -- deveria ter template separado com botao "Confirmar email e resgatar creditos"
3. Apos confirmar email, o usuario volta deslogado e precisa fazer login manualmente pelo modal para acionar o claim -- deveria voltar ja logado e com creditos

## Solucao

### 1. Nova edge function: `confirm-email-free-trial`

Uma funcao dedicada que ao receber o token:
- Valida e marca o token como usado (igual ao `confirm-email` atual)
- Marca `email_verified = true` no perfil
- Chama a RPC `claim_arcano_free_trial_atomic` direto com service role (credita os 300 creditos)
- Gera um magic link via `generateLink({ type: 'magiclink' })` para auto-logar o usuario
- Redireciona para o magic link que loga o usuario e manda para `/upscaler`

Isso garante que ao clicar no botao do email, o usuario:
- Confirma o email
- Recebe os creditos
- Volta logado na ferramenta de IA

### 2. Nova edge function: `send-free-trial-confirmation-email`

Email com template separado, diferente do email de confirmacao normal:
- Titulo: "Confirme seu email e resgate seus creditos"
- Botao: "Confirmar Email e Resgatar Creditos" (com gradiente roxo/rosa)
- Texto explicando que ao clicar, o usuario recebera 300 creditos gratis
- Link aponta para `confirm-email-free-trial?token=xxx` (nao o `confirm-email` normal)
- Usa SendPulse via OAuth (mesma logica do `send-confirmation-email`)

### 3. Atualizar `AIToolsAuthModal.tsx`

No passo de signup (linha ~211), trocar a chamada de:
```
supabase.functions.invoke('send-confirmation-email', ...)
```
Para:
```
supabase.functions.invoke('send-free-trial-confirmation-email', ...)
```

Isso garante que so quem se cadastrar pelo modal de free trial recebe o email especial. Quem cadastrar normalmente continua recebendo o email de confirmacao normal.

### 4. Corrigir dominio no `confirm-email` existente

Trocar todas as referencias de `https://arcanoapp.lovable.app/` para `https://arcanoapp.voxvisual.com.br/` no `confirm-email/index.ts` (linhas 27, 61 e 150).

## Fluxo corrigido

```text
1. Usuario abre ferramenta IA
2. Modal aparece (nao logado)
3. Cria conta pelo modal
4. Recebe EMAIL ESPECIAL "Confirme e resgate creditos"
5. Clica no botao
6. confirm-email-free-trial executa:
   a. Verifica token
   b. Marca email_verified = true
   c. Chama claim_arcano_free_trial_atomic (300 creditos)
   d. Gera magic link com redirect para /upscaler
   e. Redireciona para o magic link
7. Usuario cai na ferramenta JA LOGADO e COM CREDITOS
```

## Seguranca contra duplicacao

- A RPC `claim_arcano_free_trial_atomic` usa advisory lock + unique constraint no email
- Mesmo que o usuario clique no link varias vezes, so credita uma vez
- Se token ja foi usado, mostra pagina de sucesso sem creditar novamente

## Arquivos criados/modificados

- **CRIAR**: `supabase/functions/confirm-email-free-trial/index.ts`
- **CRIAR**: `supabase/functions/send-free-trial-confirmation-email/index.ts`
- **MODIFICAR**: `src/components/ai-tools/AIToolsAuthModal.tsx` (trocar funcao de envio de email)
- **MODIFICAR**: `supabase/functions/confirm-email/index.ts` (corrigir dominio para voxvisual)

