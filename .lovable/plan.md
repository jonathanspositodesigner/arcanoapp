

# Recuperacao de 300 Creditos para 41 Usuarios

## Situacao

41 usuarios completaram o fluxo de confirmacao de email (clicaram no link, token marcado como `used_at`), mas a chamada ao RPC `claim_arcano_free_trial_atomic` falhou silenciosamente dentro da edge function `confirm-email-free-trial`. Resultado: email confirmado, mas **zero creditos** e **zero registros** em `arcano_cloner_free_trials` ou `upscaler_credits`.

## Solucao em 2 partes

### Parte 1: Edge Function `grant-recovery-credits`

Uma edge function chamada uma unica vez que:

1. Busca os 41 usuarios afetados (tokens com `used_at` preenchido mas sem creditos)
2. Para cada um, executa o mesmo RPC `claim_arcano_free_trial_atomic` que falhou antes
3. Se o RPC falhar novamente, faz INSERT direto via `service_role` (bypass RLS):
   - Insere em `arcano_cloner_free_trials` (para marcar como resgatado)
   - Faz UPSERT em `upscaler_credits` com 300 monthly_balance
   - Registra em `upscaler_credit_transactions`
4. Envia email de notificacao para cada usuario informando que os creditos foram concedidos
5. Retorna relatorio de sucesso/falha

### Parte 2: Template do Email de Notificacao

Email enviado via SendPulse com o mesmo design do email de confirmacao original:
- Assunto: "Seus 300 creditos gratis ja estao na sua conta!"
- Corpo: Informa que houve um problema tecnico e que os creditos foram adicionados
- Botao: "Comecar a Usar" -> link para `/ferramentas-ia-aplicativo` com magic link para auto-login
- Mesmo estilo visual (fundo escuro, gradiente roxo/rosa)

### Protecoes Anti-Duplicata

- Antes de conceder creditos, verifica se o usuario ja tem registro em `arcano_cloner_free_trials`
- Se ja tiver, pula (nao da creditos duplicados)
- UPSERT com `ON CONFLICT (user_id)` em `upscaler_credits`

## Detalhes Tecnicos

### Arquivo criado

`supabase/functions/grant-recovery-credits/index.ts`

### Fluxo da Edge Function

```text
POST /grant-recovery-credits (com auth header admin)
  |
  v
[Busca 41 users: tokens used_at NOT NULL + sem upscaler_credits]
  |
  v
[Para cada user:]
  1. Tenta RPC claim_arcano_free_trial_atomic
  2. Se falhar: INSERT direto com service_role
  3. Gera magic link para auto-login
  4. Envia email via SendPulse
  |
  v
[Retorna JSON com resultados]
```

### Correcao do bug original

Alem do envio, vou corrigir a `confirm-email-free-trial` para que, se o RPC falhar, faca um fallback com INSERT direto usando `service_role`. Assim novos usuarios nao terao o mesmo problema.

### Apos aprovacao

1. Crio a edge function `grant-recovery-credits`
2. Corrijo `confirm-email-free-trial` com fallback
3. Faco deploy
4. Chamo a funcao uma vez para processar os 41 usuarios
5. Todos recebem email + creditos

