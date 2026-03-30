
Objetivo: fazer o MovieLed Maker aparecer em “Minhas Criações” agora e refatorar a arquitetura para que qualquer ferramenta de IA atual ou futura entre automaticamente no feed, com expiração padrão de 24h e limpeza consistente.

1. Corrigir o bug imediato do MovieLed Maker
- Atualizar a RPC `get_user_ai_creations` para incluir `movieled_maker_jobs`.
- Incluir também `movieled_maker_jobs` na RPC `delete_user_ai_creation`.
- Incluir `movieled_maker_jobs` na rotina `cleanup_expired_ai_jobs`.
- Confirmar o mesmo prazo de expiração de 24h via `completed_at + interval '24 hours'`.

2. Fechar as lacunas que já existem hoje
- A mesma auditoria mostrou que `flyer_maker_jobs` e `bg_remover_jobs` também não estão no feed central, apesar de terem `user_id`, `status`, `output_url`, `thumbnail_url` e `completed_at`.
- Vou incluir essas tabelas também no mesmo ciclo para não deixar o problema só parcialmente resolvido.

3. Refatorar para não depender de “editar UNION toda vez”
- Criar uma tabela de catálogo central, algo como `ai_tool_registry`, com:
  - `table_name`
  - `tool_name`
  - `media_type`
  - `enabled`
  - `expiry_hours` (default 24)
- Popular essa tabela com as ferramentas atuais.
- Reescrever `get_user_ai_creations`, `delete_user_ai_creation` e `cleanup_expired_ai_jobs` para iterarem sobre esse catálogo dinamicamente, em vez de manter listas fixas no SQL.
- Regra do catálogo: só entram tabelas de jobs que sigam o contrato mínimo:
  - `user_id`
  - `status`
  - `output_url`
  - `thumbnail_url` opcional
  - `created_at`
  - `completed_at`

4. Padronizar o contrato das tabelas de jobs
- Revisar as tabelas de IA existentes para garantir o contrato mínimo comum.
- Onde faltar, alinhar schema/nomenclatura para o padrão central.
- Isso evita que cada nova IA precise de exceção manual para aparecer em “Minhas Criações”.

5. Padronizar a limpeza de arquivos e registros
- Expandir `cleanup-ai-storage` para cobrir pastas de upload de todas as ferramentas que geram assets temporários, incluindo MovieLed (`movieled/...`) e qualquer outra pasta ainda fora da lista.
- Garantir que a limpeza de banco (`cleanup_expired_ai_jobs`) e a limpeza de storage andem juntas no mesmo TTL de 24h.
- Manter thumbnails e outputs consistentes com a exclusão dos registros expirados.

6. Ajuste leve no frontend
- `useMyCreations` pode continuar usando a RPC, mas vou revisar para assumir que o backend já entrega tudo centralizado.
- Se necessário, adiciono um campo opcional de origem/tabela no retorno para debug interno sem mudar a UI.
- A UI em si deve continuar funcionando sem mudança visual relevante.

7. Compatibilidade futura
- Definir um padrão claro para novas ferramentas:
  - toda nova IA cria tabela no formato padrão
  - registra a ferramenta no catálogo central
  - automaticamente passa a aparecer em “Minhas Criações”
  - automaticamente entra na limpeza de 24h
- Assim, quando surgir uma IA nova, não precisa mais mexer manualmente na listagem.

8. Validação após implementação
- Testar com jobs reais concluídos de:
  - MovieLed Maker
  - Gerar Vídeo
  - Gerar Imagem
  - pelo menos 1 ferramenta de imagem antiga
- Validar:
  - aparece em “Minhas Criações”
  - filtro imagem/vídeo funciona
  - download continua funcionando
  - exclusão manual remove corretamente
  - itens expirados somem do feed
  - limpeza não quebra thumbnails nem previews

Diagnóstico já confirmado
- O problema não é no modal nem no hook.
- O problema está no backend central: `get_user_ai_creations` hoje ainda só faz `UNION` de algumas tabelas antigas e das de geração, mas não inclui `movieled_maker_jobs`.
- No seu banco já existem jobs do MovieLed concluídos com `output_url` e `thumbnail_url`, então eles estão prontos para aparecer — só estão ficando de fora da RPC.
- Também vi que `cleanup_expired_ai_jobs` e `delete_user_ai_creation` ainda estão presos numa lista manual, o que explica por que isso continua quebrando sempre que nasce uma IA nova.

Detalhe técnico da refatoração
```text
Hoje:
job tables -> RPC manual com UNION -> Minhas Criações

Depois:
job tables padronizadas
      + registro no catálogo central
      -> RPC dinâmica
      -> exclusão dinâmica
      -> limpeza dinâmica
      -> Minhas Criações
```

Se você aprovar, eu implemento já de forma definitiva, não só remendo pro MovieLed.
