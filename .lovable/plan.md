

# Plano: Corrigir billing_address obrigatório para assinaturas com cartão

## Diagnóstico

**Não há defeito específico no plano Ultimate** — todos os planos usam exatamente o mesmo código e configuração. O erro `billing | "value" is required` acontece porque o Pagar.me exige um `billing_address` dentro do objeto `card` no payload da subscription, e o código atual envia o `card_token` solto na raiz do payload, sem `billing_address`.

O usuário `osbatista@gmail.com` **tem** endereço no perfil (Serra/ES), mas o endereço só é enviado dentro de `customer.address` — o Pagar.me ignora isso para cobranças recorrentes e exige especificamente no nível do `card`.

## Correções

### 1. Adicionar campos de endereço ao CreditCardForm

Adicionar seção de endereço obrigatório no modal do cartão com os campos:
- **CEP** (busca automática via ViaCEP)
- **Rua + Número** (line_1)
- **Cidade**
- **Estado** (dropdown UFs)

O callback `onTokenGenerated` passa a retornar também os dados de endereço: `onTokenGenerated(token, addressData)`.

Validação: se qualquer campo de endereço estiver vazio, exibe erro "Preencha o endereço para continuar".

### 2. Atualizar Planos2.tsx

Modificar `handleCardTokenGenerated` para receber o endereço do CreditCardForm e usá-lo como `user_address` no payload enviado à edge function — priorizando o endereço digitado no momento do checkout sobre o do perfil.

### 3. Corrigir payload na Edge Function `create-pagarme-subscription`

Reestruturar o payload para incluir `billing_address` dentro de um objeto `card`:

```text
Antes:
  card_token: "tok_xxx"     ← solto na raiz
  customer.address: {...}   ← Pagar.me ignora para recorrência

Depois:
  card: {
    card_token: "tok_xxx",
    billing_address: {
      line_1: "Rua X, 123",
      zip_code: "29168680",
      city: "Serra",
      state: "ES",
      country: "BR"
    }
  }
```

Se o endereço não for fornecido, a edge function retorna erro 400 com mensagem clara.

## Arquivos modificados

| Arquivo | Alteração |
|---|---|
| `src/components/checkout/CreditCardForm.tsx` | Adicionar campos de endereço, alterar interface do callback |
| `src/pages/Planos2.tsx` | Ajustar `handleCardTokenGenerated` para receber endereço |
| `supabase/functions/create-pagarme-subscription/index.ts` | Reestruturar payload com `card.billing_address` |

