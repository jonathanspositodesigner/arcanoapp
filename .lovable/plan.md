
Você tem razão: a implementação não estava completa. A auditoria real mostrou 3 faltas e 1 regressão importante.

O que falta de verdade
1. `useNotificationTokenRecovery` foi “tipado” para `bg_remover_jobs`, mas não recupera essa tabela na lógica. Hoje o link de notificação com `?nt=` não restaura o resultado do Remover Fundo. O mesmo hook também está incompleto para `flyer_maker_jobs`.
2. Falta o registro de `Remover Fundo` em `ai_tool_settings` com custo 5. No momento o valor 5 está só como fallback no frontend, não como configuração real do backend/admin.
3. A migration nova recriou funções compartilhadas e removeu `arcano_cloner_jobs` de `mark_pending_job_as_failed` e `user_cancel_ai_job`. Isso é regressão e pode quebrar cancelamento/watchdog do Cloner.
4. O resto principal da integração está no lugar: rota, card, página, fila central, webhook, tabela e relatórios/admin.

Como vou corrigir
1. Criar uma migration corretiva para:
- inserir `Remover Fundo` em `ai_tool_settings` com `credit_cost = 5`
- recriar `mark_pending_job_as_failed` com todas as ferramentas atuais, incluindo `arcano_cloner_jobs` e `bg_remover_jobs`
- recriar `user_cancel_ai_job` com todas as ferramentas atuais, incluindo `arcano_cloner_jobs` e `bg_remover_jobs`

2. Corrigir o hook compartilhado de recuperação por notificação:
- adicionar busca real para `bg_remover_jobs`
- aproveitar para fechar também `flyer_maker_jobs`
- idealmente transformar isso em um mapa central de tabela -> campos selecionados, para não esquecer ferramentas novas de novo

3. Fazer uma revisão final dos pontos compartilhados:
- todos os mapas baseados em `ToolType`
- hooks de sync/watchdog/recovery
- custo dinâmico no painel/admin
- exibição em Custos IA

Validação final
- build TypeScript sem erro
- fluxo completo: upload/compressão -> job -> fila -> conclusão -> download
- fluxo de retorno por notificação `?nt=`
- job aparecendo em Custos IA
- confirmar que Arcano Cloner não ficou quebrado pelo ajuste das RPCs compartilhadas

Resultado esperado
- Remover Fundo fica realmente completo
- custo de 5 créditos fica configurado no backend, não só no frontend
- notificação abre e recupera o resultado corretamente
- a regressão no Arcano Cloner é revertida sem mexer na lógica das outras ferramentas
