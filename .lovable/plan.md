

## Ativar Rodrigo Sacre - Direto no banco

Sem criar função, sem blacklist, sem mexer em nada. Apenas 3 queries SQL diretas:

1. **INSERT em `premium_users`** - plano arcano_unlimited, 30 dias, ativo
2. **Chamar RPC `reset_upscaler_credits`** - dar os 1800 créditos mensais
3. Pronto. Acabou.

Se o webhook cair depois e resetar os créditos dele pra 1800 de novo, não faz diferença nenhuma porque o reset coloca em 1800 de qualquer jeito (não soma, reseta). Só seria "problema" se ele já tivesse gasto parte dos créditos e o webhook resetasse pra 1800 de novo - mas aí ele ganharia uns créditos a mais, nada grave.

### Nenhum arquivo criado ou alterado
Zero código. Só queries no banco.

