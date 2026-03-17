

## Explicação simples

**SIM, a API do Pagar.me permite gerar checkout sem NENHUMA informação do cliente.** A edge function já suporta isso — o problema é só no frontend que ainda exige nome, email, CPF e telefone antes de deixar o botão funcionar.

O que acontece hoje quando você clica "Cartão" e depois no botão de pagar:
1. O frontend chama `validate()` que exige nome, email, CPF e telefone
2. Como esses campos estão escondidos para cartão, a validação falha silenciosamente
3. O checkout nunca é chamado

O backend (edge function) já está pronto: se `billing_type === 'CREDIT_CARD'`, ele aceita a requisição sem email, sem nome, sem CPF, sem telefone. Envia só `type: 'individual'` pro Pagar.me e o gateway coleta tudo na página dele.

## Plano

### 1. `PreCheckoutModal.tsx` — Pular validação para cartão
- Na função `validate()` (linha 170-215): se `paymentMethod === 'CREDIT_CARD'`, retornar `true` direto sem checar nada
- No `handleSubmit` (linha 294-304): quando for cartão, enviar payload só com `product_slug` e `billing_type: 'CREDIT_CARD'`, sem email, nome, CPF ou telefone

Resultado: ao clicar no botão "Finalizar e Pagar" com cartão selecionado, o checkout é gerado instantaneamente só com o produto, e o Pagar.me coleta todos os dados do cliente na página hospedada dele.

Um arquivo alterado, duas mudanças pequenas.

