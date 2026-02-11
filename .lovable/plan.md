

## Migrar creditos do resgate de 1500 de Mensal para Vitalicio

### Situacao atual

- A Edge Function `claim-promo-credits` usa a RPC `add_upscaler_credits`, que adiciona ao `monthly_balance`
- Todos os ~50 usuarios que ja resgataram tem os creditos (ou o que sobrou deles) no `monthly_balance`
- Nenhum deles tem `lifetime_balance` vindo dessa promo (alguns tem 60 de outras fontes)

### O que sera feito

#### 1. Migracao SQL - Transferir saldo restante de monthly para lifetime

Para cada usuario que resgatou a promo UPSCALER_1500:
- Pegar o `monthly_balance` atual (que pode ser menor que 1500 se ja gastou)
- Mover esse valor para `lifetime_balance`
- Zerar o `monthly_balance` (somente a parte da promo)
- Registrar a transacao em `upscaler_credit_transactions` para auditoria

**Logica**: Como o monthly_balance pode conter SOMENTE creditos da promo (nenhum outro sistema adiciona monthly), transferimos o monthly_balance inteiro para lifetime.

```text
Para cada usuario com promo UPSCALER_1500:
  lifetime_balance += monthly_balance
  monthly_balance = 0
  Registrar transacao de debito monthly e credito lifetime
```

#### 2. Alterar Edge Function `claim-promo-credits`

Mudar a chamada de `add_upscaler_credits` (monthly) para `add_lifetime_credits` (vitalicio), e atualizar o `credit_type` no registro da `promo_claims` para `'lifetime'`.

### Mudancas tecnicas

| Tipo | Arquivo | Detalhe |
|------|---------|---------|
| Migracao SQL | Nova migracao | Transfere monthly_balance para lifetime_balance para todos que resgataram UPSCALER_1500, com registro em upscaler_credit_transactions |
| Modificar | `supabase/functions/claim-promo-credits/index.ts` | Trocar RPC de `add_upscaler_credits` para `add_lifetime_credits`, e credit_type de `monthly` para `lifetime` |

### Seguranca

- A migracao usa UPDATE direto com JOIN na promo_claims, afetando SOMENTE os usuarios que resgataram
- Usuarios que ja gastaram tudo (monthly_balance = 0) nao serao afetados negativamente
- Transacoes de auditoria serao registradas para rastreabilidade
- Nenhum credito duplicado sera criado - apenas transferencia do que ja existe

