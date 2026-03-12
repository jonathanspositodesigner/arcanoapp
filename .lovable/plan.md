

# Corrigir acesso à chave pública do Pagar.me no front-end

## Problema
O `CreditCardForm.tsx` usa `import.meta.env.VITE_PAGARME_PUBLIC_KEY`, mas essa variável não existe no `.env` (que é gerenciado automaticamente e não pode ser editado). O secret `PAGARME_PUBLIC_KEY` existe no backend mas não é acessível pelo front-end.

## Solução
Como a chave pública do Pagar.me é **segura para expor no browser** (é uma publishable key, como `pk_XXXX`), vamos criar uma mini edge function que retorna essa chave para o front-end.

### Mudanças:

**1. Nova Edge Function `get-pagarme-public-key`**
- Lê o secret `PAGARME_PUBLIC_KEY` do ambiente
- Retorna `{ publicKey: "pk_XXXX" }` 
- Sem autenticação necessária (é uma chave pública)

**2. Atualizar `CreditCardForm.tsx`**
- Remover `import.meta.env.VITE_PAGARME_PUBLIC_KEY`
- Ao abrir o formulário, chamar a edge function para obter a chave
- Cachear o valor para não chamar toda vez

Isso elimina a necessidade de mexer no `.env` completamente.

