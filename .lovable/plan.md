

## Teste End-to-End: Simulação de Compra + Estorno

O código das 3 edge functions e a RPC `revoke_lifetime_credits_on_refund` estão corretos e deployados. Para testar, preciso executar operações de escrita no banco.

### Plano do teste (3 passos)

**Passo 1 — Simular compra de 1500 créditos**
- Chamar `add_lifetime_credits` para o user `8f5fb835-...` com 1500 créditos e descrição "TESTE - Compra Pagar.me 1500 créditos"
- Saldo esperado: 993.049 + 1.500 = **994.549**

**Passo 2 — Simular estorno via `revoke_lifetime_credits_on_refund`**
- Chamar a RPC com 1500 créditos e descrição "TESTE - Reembolso Pagar.me 1500 créditos"
- Saldo esperado: 994.549 - 1.500 = **993.049** (volta ao original)

**Passo 3 — Validar**
- Confirmar saldo final = 993.049
- Confirmar que existem 2 transações de teste: +1500 (credit) e -1500 (refund)
- Limpar as transações de teste

### Como vou executar
Vou inserir os dados via migration tool (operações de escrita) e consultar o resultado via query de leitura.

