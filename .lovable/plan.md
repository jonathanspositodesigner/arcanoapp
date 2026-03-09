

# Atualizar Token do Meta Ads

## Passos

1. **Atualizar o secret `META_ACCESS_TOKEN`** com o novo token fornecido
2. **Executar a função `exchange-token`** para trocar esse token de curta duração por um de longa duração (~60 dias)
3. **Atualizar o secret novamente** com o token de longa duração retornado
4. **Testar a sincronização** chamando a função `fetch` para confirmar que os dados estão sendo puxados

## Observação
Este token parece ser de curta duração (~1h). A função `exchange-token` já existente no sistema vai convertê-lo automaticamente para um de longa duração (60 dias). Para um token **permanente**, siga o passo a passo do System User que enviei anteriormente.

