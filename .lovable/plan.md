

## Plano: Tratar vendas já reembolsadas no Pagar.me

### Situação atual

Quando você clica "Reembolsar" numa venda que já foi reembolsada diretamente no painel do Pagar.me, a API retorna erro (ex: `charge already voided/refunded`) e o sistema mostra uma mensagem genérica de erro. O status da ordem no seu sistema continua como `paid` e o acesso do usuário não é revogado.

### Solução

**1. Edge Function `refund-pagarme/index.ts`:**
- Quando a API do Pagar.me retornar erro, verificar se o erro indica que a charge já foi estornada (status `voided`, `refunded`, ou mensagens como "already voided")
- Se sim, em vez de retornar erro, **prosseguir normalmente**: revogar acesso, atualizar status para `refunded`, logar — e retornar um response especial `{ success: true, already_refunded: true }`
- Se o erro for de outro tipo (ex: charge não encontrada, erro de rede), aí sim retornar erro

**2. Frontend `SaleDetailDialog.tsx`:**
- Detectar `data.already_refunded` na resposta e exibir toast diferenciado: "Venda já estava reembolsada no Pagar.me. Status atualizado e acesso revogado."

### Detalhes técnicos

No bloco de erro da API Pagar.me (linha ~98), antes de retornar erro:

```typescript
// Verificar se a charge já foi estornada
if (!pagarmeResponse.ok) {
  let alreadyRefunded = false
  try {
    const parsed = JSON.parse(pagarmeBody)
    // Pagar.me retorna status da charge no body ou erro específico
    const chargeStatus = parsed?.status || parsed?.last_transaction?.status
    if (['voided', 'refunded', 'canceled'].includes(chargeStatus) ||
        pagarmeBody.includes('already') || pagarmeBody.includes('voided')) {
      alreadyRefunded = true
    }
  } catch {}

  if (alreadyRefunded) {
    // Prosseguir com revogação local e marcar como refunded
    // ... (mesma lógica de revogação)
    return Response({ success: true, already_refunded: true, message: '...' })
  }
  // Senão, retornar erro normalmente
}
```

Também adicionar uma verificação GET na charge antes do void para detectar proativamente:

```typescript
// Antes de tentar o void, consultar status atual da charge
const checkResponse = await fetch(
  `https://api.pagar.me/core/v5/charges/${chargeId}`,
  { headers: { 'Authorization': `Basic ${basicAuth}` } }
)
const chargeData = await checkResponse.json()
if (['voided', 'refunded'].includes(chargeData?.status)) {
  // Já reembolsada — só atualizar local
}
```

