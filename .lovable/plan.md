

## Remover créditos automaticamente em reembolso/chargeback

### Problema atual

Quando um cliente pede reembolso de uma compra de creditos (Upscaler/Arcano), os webhooks recebem o evento de `refunded` ou `chargeback`, mas NAO removem os creditos do usuario. O codigo atual simplesmente loga "creditos lifetime nao podem ser revertidos" e segue em frente. Isso significa que o cliente fica com os creditos mesmo apos o reembolso.

### Solucao

Criar uma nova RPC no banco para revogar creditos lifetime em contexto de reembolso (sem exigir admin) e atualizar os dois webhooks para chamar essa RPC quando receberem um reembolso de produto de creditos.

### O que sera feito

1. **Nova RPC `revoke_credits_on_refund`** - Uma funcao de banco SECURITY DEFINER que:
   - Recebe user_id e amount
   - Remove do saldo lifetime (ate zerar, sem ficar negativo)
   - Registra a transacao como `refund` na tabela de auditoria
   - NAO exige role de admin (sera chamada pelo service_role via Edge Function)

2. **`webhook-greenn-creditos/index.ts`** - No bloco de refunded/chargeback (linhas 300-318):
   - Buscar o usuario pelo email
   - Identificar quantos creditos foram concedidos pelo produto (via `PRODUCT_CREDITS`)
   - Chamar a RPC `revoke_credits_on_refund` para remover os creditos
   - Registrar o resultado no webhook_logs

3. **`webhook-greenn-artes/index.ts`** - No bloco de refunded/chargeback (linhas 686-727):
   - Alem de desativar o acesso a packs (que ja faz), verificar se o produto reembolsado esta no `CREDITS_PRODUCT_MAPPING`
   - Se for produto de creditos, buscar o usuario e chamar `revoke_credits_on_refund`
   - Registrar o resultado

### Detalhes tecnicos

**Nova RPC (migracao SQL):**

```text
revoke_credits_on_refund(_user_id UUID, _amount INT, _description TEXT)
  -> Busca saldo lifetime atual
  -> Remove min(_amount, saldo_atual) do lifetime_balance
  -> Insere transacao tipo 'refund' com credit_type 'lifetime'
  -> Retorna success, new_balance, amount_revoked
```

**Logica no webhook de creditos (refund):**

```text
1. Identificar email do payload
2. Buscar usuario na tabela profiles pelo email
3. Mapear productId -> quantidade de creditos (PRODUCT_CREDITS)
4. Chamar revoke_credits_on_refund(userId, creditAmount, "Reembolso: {produto}")
5. Se chargeback, adicionar a blacklist (ja faz)
6. Atualizar webhook_logs com resultado
```

**Logica no webhook de artes (refund de creditos):**

```text
1. Verificar se productId esta no CREDITS_PRODUCT_MAPPING
2. Se sim, buscar usuario e revogar creditos (mesma logica)
3. Continuar com a desativacao de packs normalmente
```

### Arquivos modificados

| Arquivo | Alteracao |
|---------|-----------|
| Nova migracao SQL | Criar RPC `revoke_credits_on_refund` |
| `supabase/functions/webhook-greenn-creditos/index.ts` | Revogar creditos no bloco refunded/chargeback |
| `supabase/functions/webhook-greenn-artes/index.ts` | Revogar creditos quando produto de creditos for reembolsado |

