

## Diagnóstico

O erro `validation_error | customer | Invalid CPF` do Pagar.me acontece porque **a validação de CPF no frontend e no backend só verifica se tem 11 dígitos**, mas **não valida se o CPF é matematicamente válido**.

CPFs como `000.000.000-00`, `111.111.111-11`, `123.456.789-00` etc. têm 11 dígitos mas são rejeitados pelo Pagar.me porque falham na validação do algoritmo de dígitos verificadores.

### Onde o problema está:

1. **Frontend** (`PreCheckoutModal.tsx` linha 161-167): só checa `cpfDigits.length !== 11`
2. **Backend checkout** (`create-pagarme-checkout/index.ts` linha 144-148): só checa `cleanCpf.length !== 11`
3. **Backend subscription** (`create-pagarme-subscription/index.ts` linha 114): sem nenhuma validação de CPF

---

## Plano de correção

### 1. Criar função de validação de CPF com algoritmo real
Implementar a validação padrão brasileira (módulo 11) que:
- Rejeita CPFs com todos os dígitos iguais (000.000.000-00, 111.111.111-11, etc.)
- Calcula e valida os dois dígitos verificadores
- Rejeita CPFs que falham na verificação matemática

### 2. Aplicar no frontend (`PreCheckoutModal.tsx`)
- Substituir a validação `length !== 11` pela função completa
- Mostrar erro "CPF inválido" antes de enviar ao servidor

### 3. Aplicar no backend (`create-pagarme-checkout/index.ts`)
- Adicionar a mesma validação após limpar o CPF
- Retornar erro 400 com mensagem clara se CPF inválido

### 4. Aplicar no backend (`create-pagarme-subscription/index.ts`)
- Adicionar validação de CPF (hoje não tem nenhuma)
- Retornar erro 400 se CPF inválido

