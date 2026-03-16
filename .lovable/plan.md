

## Problemas Encontrados

### 1. Edge Function não estava deployada
A função `send-free-trial-confirmation-email` **não estava deployada** — por isso nenhum email foi enviado. Já deployei agora.

### 2. SignupForm exige 3 etapas completas (CPF, telefone, endereço)
O `SignupForm` usado no modal é o formulário completo de checkout do Pagar.me com 3 etapas obrigatórias:
- Etapa 1: Email + Senha
- Etapa 2: Nome + Telefone + CPF (validação obrigatória)
- Etapa 3: CEP + Endereço + Cidade + Estado

Para um teste grátis isso é absurdo. O usuário só quer testar, não precisa dar CPF e endereço.

### 3. Tela de "verifique seu email" já existe no modal
O step `verify-email` (linhas 334-357) já mostra a mensagem correta com ícone de email e instruções. O problema é que o usuário nunca chega lá porque tem que preencher 3 etapas antes.

---

## Plano de Correção

### Simplificar o cadastro no modal do Arcano Cloner

No `ArcanoClonerAuthModal.tsx`, **substituir o `SignupForm` por um formulário inline simples** com apenas:
- Email
- Senha
- Confirmar senha
- Nome (opcional)

Sem CPF, sem telefone, sem endereço. Ao submeter, o fluxo atual de `handleSignup` já funciona (cria conta, envia email, mostra tela de verificação).

### Mudanças técnicas:
1. **`ArcanoClonerAuthModal.tsx`** — Remover o `SignupForm` importado e criar um formulário simples inline no step `signup` com apenas email + senha + confirmar senha + nome opcional
2. **Nenhuma outra mudança necessária** — O `handleSignup`, o step `verify-email`, e a edge function já estão corretos

