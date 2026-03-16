

## Plano: Modal de Cadastro Free Trial na Landing do Arcano Cloner

### Resumo
O botão "Ir para o Arcano Cloner" vai abrir o modal `ArcanoClonerAuthModal` em vez de redirecionar. O modal usa `send-free-trial-confirmation-email` para enviar o email de confirmação. Tudo redireciona para `/ferramentas-ia-aplicativo` (mantido como está). Créditos: 300.

### Mudanças

#### 1. `LandingTrialSignupSection.tsx`
- Adicionar state `showModal` + importar `ArcanoClonerAuthModal`
- Botão abre o modal em vez de link externo
- `onAuthSuccess` redireciona para `https://arcanoapp.voxvisual.com.br/ferramentas-ia-aplicativo`

#### 2. `ArcanoClonerAuthModal.tsx`
- Trocar todos os textos de "180 créditos" para "300 créditos"
- No `handleSignup`: chamar `send-free-trial-confirmation-email` em vez de `send-confirmation-email` (para usar o fluxo de free trial com créditos)
- Texto do verify-email: "seus 300 créditos grátis"

#### 3. `confirm-email-free-trial/index.ts`
- Manter `REDIRECT_URL` como está (`/ferramentas-ia-aplicativo`) -- sem alteração
- Mudar todos os valores de 180 para 300 (credits_granted, monthly_balance, balance, amount na transaction, textos do HTML)

#### 4. `send-free-trial-confirmation-email/index.ts`
- Mudar "180 créditos grátis" para "300 créditos grátis" no HTML do email e no subject

#### 5. Deploy
- Redeployar `confirm-email-free-trial` e `send-free-trial-confirmation-email`

