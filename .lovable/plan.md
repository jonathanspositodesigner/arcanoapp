

## Problema identificado: Endpoint errado na API do Pagar.me

A edge function `refund-pagarme` está usando o endpoint **errado** para estornar cobranças.

**Código atual (ERRADO):**
```
POST /charges/{charge_id}/void
```

**Endpoint correto segundo a documentação do Pagar.me v5:**
```
DELETE /charges/{charge_id}
```

A documentação oficial do Pagar.me v5 mostra que cancelar/estornar uma cobrança usa o método **DELETE** no path `/charges/{charge_id}` — não existe endpoint `/void` na API v5. Por isso o reembolso sempre falha.

Sobre a questão da senha: no dashboard do Pagar.me, o sistema pede senha como confirmação de segurança. Via API, a autenticação é feita pela `PAGARME_SECRET_KEY` (Basic Auth), então **não precisa de senha** — a secret key já autoriza o estorno.

## Plano

### Arquivo: `supabase/functions/refund-pagarme/index.ts`

1. **Trocar o endpoint de estorno** de `POST /charges/{charge_id}/void` para `DELETE /charges/{charge_id}` (sem body)
2. **Trocar o endpoint de verificação** — o GET em `/charges/{charge_id}` está correto e pode continuar
3. **Adicionar suporte a estorno parcial via body** — para cartão de crédito, o DELETE aceita um body com `amount` (em centavos). Para estorno total, basta o DELETE sem body
4. **Para boleto PSP** — estornos de boleto precisam dos dados bancários do cliente no body. Por agora, focaremos em estorno total (cartão + PIX), que é o caso mais comum

### Mudança específica na edge function:

```typescript
// ANTES (errado):
const pagarmeResponse = await fetch(`https://api.pagar.me/core/v5/charges/${chargeId}/void`, {
  method: 'POST',
  headers: { 'Authorization': `Basic ${basicAuth}`, 'Content-Type': 'application/json' },
})

// DEPOIS (correto):
const pagarmeResponse = await fetch(`https://api.pagar.me/core/v5/charges/${chargeId}`, {
  method: 'DELETE',
  headers: { 'Authorization': `Basic ${basicAuth}`, 'Content-Type': 'application/json' },
})
```

Apenas 2 linhas mudam no arquivo. O resto da lógica (verificação de status, revogação de acesso, logs) está correto.

