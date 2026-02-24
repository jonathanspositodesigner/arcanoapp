

## Correção: Créditos de indicação só após confirmação de email

### Problema

Atualmente, os créditos de indicação (300 para cada) são processados **no momento do cadastro**, antes da confirmação de email. Isso permite que alguém crie infinitos emails falsos e acumule créditos de graça.

### Solução

1. **Remover** o processamento de referral do fluxo de **signup** (linhas 391-418 do `useUnifiedAuth.ts`) -- o código que chama `process_referral` durante o cadastro será completamente removido.

2. **Manter** o processamento de referral apenas no fluxo de **login** (linhas 310-327) -- que já só executa **após** a verificação de `email_verified === true` (linhas 286-292). Ou seja, os créditos só serão dados quando o usuário confirmar o email e fizer login pela primeira vez.

### Detalhe técnico

**Arquivo:** `src/hooks/useUnifiedAuth.ts`

- Remover o bloco de `process_referral` dentro da função `signup` (linhas 391-418)
- O `referral_code` continua salvo no `localStorage` durante o cadastro
- No primeiro login (após confirmar email), o código existente nas linhas 310-327 processa o referral automaticamente

```text
Fluxo corrigido:

1. Usuario abre link ?ref=CODIGO
2. Codigo salvo no localStorage
3. Usuario se cadastra -> NÃO processa referral
4. Usuario confirma email
5. Usuario faz login -> email_verified = true -> processa referral -> creditos distribuidos
```

Nenhuma mudança no banco de dados é necessária.

