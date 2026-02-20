

# Teste Gratis na Pagina ArcanoClonerTeste - Sistema Completo e Isolado

## Resumo
Criar uma sessao de cadastro para teste gratis abaixo dos resultados de usuarios na pagina `/arcanocloner-teste`. O visitante informa nome, email e WhatsApp, recebe um email de confirmacao, e ao clicar no link recebe 240 creditos que expiram em 24h. Quando esses creditos acabarem, aparece um modal exclusivo de "teste concluido".

---

## Arquitetura do Fluxo

```text
Visitante preenche formulario (nome, email, whatsapp)
        |
        v
Edge Function "send-landing-trial-email" 
  -> Verifica duplicidade na tabela "landing_cloner_trials"
  -> Gera token unico
  -> Salva na tabela "landing_cloner_trials"
  -> Envia email via SendPulse com link de confirmacao
        |
        v
Formulario muda para: "Verifique seu email para ativar o teste"
        |
        v
Visitante clica no link do email
        |
        v
Edge Function "confirm-landing-trial"
  -> Valida token (nao expirado, nao usado)
  -> Cria conta auth (signUp com senha = email)
  -> Cria profile
  -> Insere 240 creditos mensais com expires_at = NOW + 24h
  -> Registra transacao com source = 'landing_cloner_trial'
  -> Gera magic link e redireciona para /arcano-cloner (ferramenta)
        |
        v
Usuario usa a ferramenta (creditos sao consumidos normalmente)
        |
        v
Quando balance chega a 0 E source era 'landing_cloner_trial':
  -> Modal exclusivo "Seu teste foi concluido! Compre creditos"
```

---

## Detalhes Tecnicos

### 1. Nova Tabela: `landing_cloner_trials`

Tabela completamente separada de `arcano_cloner_free_trials` e `landing_page_trials`.

| Coluna | Tipo | Descricao |
|---|---|---|
| id | uuid PK | ID unico |
| email | text UNIQUE | Email (normalizado) |
| name | text | Nome |
| whatsapp | text | WhatsApp |
| token | uuid | Token de confirmacao |
| token_expires_at | timestamptz | Expiracao do token (24h) |
| confirmed_at | timestamptz NULL | Quando confirmou |
| user_id | uuid NULL | ID do usuario criado |
| credits_granted | integer DEFAULT 0 | Creditos concedidos |
| credits_expire_at | timestamptz NULL | Quando os 240 creditos expiram |
| created_at | timestamptz DEFAULT now() | Criacao |

- RLS habilitado, apenas service_role tem acesso
- Indice unico em `email` para prevenir duplicidade

### 2. Coluna adicional em `upscaler_credits`: `landing_trial_expires_at`

Nova coluna `landing_trial_expires_at` (timestamptz NULL) na tabela `upscaler_credits`. Quando preenchida, indica que o usuario tem creditos de teste da landing page que expiram nessa data. Usado para:
- Verificar se creditos expiraram (antes de qualquer consumo)
- Mostrar o modal de "teste concluido" quando balance = 0 e essa coluna existe

### 3. Edge Function: `send-landing-trial-email`

Recebe: `{ name, email, whatsapp }`

Acoes:
- Normaliza email
- Verifica se ja existe em `landing_cloner_trials`:
  - Se ja confirmado: retorna erro "ja cadastrado"
  - Se existe mas nao confirmado: reenvia email (rate limit 2 min)
- Insere registro com token UUID
- Monta HTML do email com template unico (tema roxo/fuchsia, "Ative seu Teste Gratis", "240 creditos por 24h")
- Envia via SendPulse
- Retorna success

### 4. Edge Function: `confirm-landing-trial`

Recebe: `?token=UUID` (via GET, link do email)

Acoes:
- Valida token na tabela `landing_cloner_trials`
- Verifica se nao expirado e nao usado
- Marca `confirmed_at = now()`
- Cria usuario via `supabaseAdmin.auth.admin.createUser()` com email e senha = email
- Cria profile com `email_verified: true`
- Insere 240 creditos mensais via:
  - UPSERT em `upscaler_credits` com `monthly_balance = 240`
  - Seta `landing_trial_expires_at = NOW + 24h`
- Registra transacao com `description = 'landing_cloner_trial_240'` e `transaction_type = 'bonus'`
- Gera magic link e redireciona para pagina da ferramenta Arcano Cloner

### 5. Frontend: Sessao de Cadastro no ArcanoClonerTeste

Nova sessao entre "Resultados de Usuarios" e "FAQ":
- Titulo: "Teste gratis agora mesmo"
- Subtitulo: "Cadastre-se e receba 240 creditos para testar o Arcano Cloner por 24 horas"
- Formulario com 3 campos: Nome, Email, WhatsApp
- Botao "Ativar Teste Gratis"
- Apos envio com sucesso: troca formulario por mensagem "Verifique seu email para ativar o teste!" com icone de email

### 6. Modal de Teste Concluido

Novo componente `LandingTrialExpiredModal`:
- Verificacao: quando `balance === 0` E usuario tem registro em `landing_cloner_trials` (verificado via flag `landing_trial_expires_at` nos creditos)
- Conteudo: "Seu teste gratis foi concluido! Gostou dos resultados? Adquira creditos para continuar usando todas as ferramentas de IA"
- Botao CTA: "Comprar Creditos" -> redireciona para pagina de compra
- Este modal so aparece para usuarios que vieram do teste da landing page

### 7. RPC: `check_landing_trial_status`

Funcao que verifica se um usuario e originario do teste da landing e se seus creditos expiraram:

```sql
CREATE FUNCTION check_landing_trial_status(_user_id uuid)
RETURNS TABLE(is_landing_trial boolean, credits_expired boolean)
```

Verifica `landing_trial_expires_at` em `upscaler_credits`.

### 8. Expiracao automatica dos creditos

Uma verificacao no hook `useUpscalerCredits` ou nas ferramentas de IA: se `landing_trial_expires_at` existe e ja passou, zera o `monthly_balance` automaticamente via RPC antes de permitir uso.

---

## Prevencao de Falhas

| Risco | Protecao |
|---|---|
| Duplicidade de creditos | Constraint UNIQUE em `landing_cloner_trials.email` + check antes de inserir |
| Reutilizacao do link | `confirmed_at` marcado na primeira confirmacao |
| Creditos nao expiram | `landing_trial_expires_at` verificado antes de cada consumo |
| Mistura com outros sistemas | Tabela separada, edge functions separadas, source tag unico |
| Spam de cadastros | Rate limit de 2 min entre reenvios |
| Email invalido | Validacao regex no frontend e backend |

---

## Arquivos a Criar/Modificar

| Arquivo | Acao |
|---|---|
| Migration SQL | Criar tabela `landing_cloner_trials` + coluna `landing_trial_expires_at` + RPC |
| `supabase/functions/send-landing-trial-email/index.ts` | Nova Edge Function |
| `supabase/functions/confirm-landing-trial/index.ts` | Nova Edge Function |
| `src/pages/ArcanoClonerTeste.tsx` | Adicionar sessao de cadastro |
| `src/components/arcano-cloner/LandingTrialExpiredModal.tsx` | Novo modal |
| `src/components/arcano-cloner/LandingTrialSignupSection.tsx` | Componente do formulario |
| Ferramentas de IA (ArcanoCloner, Upscaler, etc.) | Integrar modal de teste concluido |

