

## Correção: Bônus gratuito do Arcano Cloner não adiciona créditos

### Problema identificado

A Edge Function `claim-arcano-free-trial` tem **dois bugs críticos**:

1. **Campo obrigatório faltando**: A tabela `upscaler_credit_transactions` exige a coluna `balance_after` (NOT NULL, sem default). A Edge Function nao envia esse campo, fazendo o INSERT da transacao falhar silenciosamente.

2. **Sem verificacao de erro**: Nenhuma das operacoes de banco (update de creditos, insert de transacao) verifica se deu erro. Se o update de creditos falha, o codigo continua e registra o claim em `arcano_cloner_free_trials`, bloqueando qualquer nova tentativa.

### Resultado para o usuario

- O modal mostra "240 creditos adicionados!"
- Mas os creditos **nunca entram** no saldo
- O claim e registrado, entao o usuario nao pode tentar novamente
- Na tabela `upscaler_credit_transactions`, nao existe nenhum registro do tipo `arcano_free_trial`

### Solucao

Reescrever a Edge Function `claim-arcano-free-trial/index.ts` com:

1. **Verificacao de erro** em todas as operacoes de banco (update, insert)
2. **Calcular e enviar `balance_after`** no insert da transacao
3. **Enviar `credit_type`** (campo obrigatorio, default 'monthly')
4. **Ordem atomica**: registrar o claim SOMENTE apos confirmar que creditos e transacao foram salvos com sucesso
5. **Correcao retroativa**: rodar SQL para creditar os usuarios que ja fizeram claim mas nao receberam os creditos

### Mudancas

| Tipo | Detalhe |
|------|---------|
| Edge Function | Reescrever `claim-arcano-free-trial/index.ts` com verificacao de erros e campo `balance_after` |
| Migration SQL | Creditar retroativamente os usuarios afetados (jonathan.lifecazy e jonathandesigner1993) |

### Detalhes tecnicos da Edge Function corrigida

- Buscar saldo atual antes do update
- Calcular `new_balance = current_balance + totalCredits`
- Fazer update em `upscaler_credits` e verificar erro
- Inserir transacao com `balance_after = new_balance` e `credit_type = 'monthly'`
- Verificar erro do insert da transacao
- So entao registrar o claim em `arcano_cloner_free_trials`
- Se qualquer etapa falhar, retornar erro sem registrar o claim

### Correcao retroativa (SQL)

Creditar os 2 usuarios que ja foram afetados:
- jonathan.lifecazy@gmail.com (user_id: 8f5fb835...) - 240 creditos
- jonathandesigner1993@gmail.com (user_id: d5f2c429...) - 240 creditos

Usando update direto no `upscaler_credits` + insert na tabela de transacoes com `balance_after` correto.
