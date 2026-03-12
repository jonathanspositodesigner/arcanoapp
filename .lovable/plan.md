

## Diagnóstico: Por que o reembolso AINDA não remove créditos

### Problema encontrado

As edge functions `refund-pagarme` e `webhook-pagarme` **não foram redeployadas** após a última edição. O código novo (com `revoke_lifetime_credits_on_refund`) existe nos arquivos, mas as funções em produção ainda rodam o código antigo.

**Evidência direta do banco:**
- Existem **3 transações** de `+1500 créditos` (compras Pagar.me) para o usuário jonathan.lifecazy@gmail.com
- Existe **zero** transações de revogação com "Reembolso Pagar.me" — a nova RPC nunca foi chamada
- A race condition da compra **também voltou** — duas adições de 1500 no mesmo segundo (19:10:42)
- Saldo atual: **997.549** lifetime (deveria ser 997.549 - 3.000 = 994.549 se os reembolsos tivessem funcionado, ou menos dependendo do fluxo exato)

### Ação necessária

1. **Deploy das edge functions** — `refund-pagarme`, `webhook-pagarme`, `webhook-mercadopago` precisam ser redeployadas para que o novo código entre em produção

2. **Correção de saldo** — Remover os 3.000 créditos das 2 compras reembolsadas que ficaram sem revogação (1.500 × 2), ajustando o saldo de 997.549 para 994.549

3. **Investigar a race condition da compra** — O lock atômico `pending → processing` também não está funcionando em produção (mesma razão: código antigo). O deploy resolve.

### Resumo
O fix do código está correto. Só precisa ser deployado e corrigir o saldo manualmente.

