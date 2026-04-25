<final-text>
Auditoria concluída. A raiz do problema da receita do MovieLed não é cobrança da Gisele: ela foi cobrada corretamente no Kling 2.5.

O problema real está no painel Custos IA: ele zera a receita de qualquer usuário marcado como Unlimited, mesmo quando o job foi realmente debitado. Como Kling 2.5 deve cobrar Unlimited, a linha aparece com receita R$ 0,00 embora exista transação de -900 créditos.

Achados confirmados:
- Gisele está Unlimited, mas o Kling 2.5 dela teve transação real: -900 créditos em “MovieLed Maker (Kling 2.5 Turbo)”. Não precisa cobrar de novo.
- O Wan 2.2 dela não teve transação, e isso está correto porque Wan entra no Unlimited.
- Existem 2 jobs antigos de Kling 2.5 da Herica sem transação real, total de 1.800 créditos a cobrar retroativo.
- Existem jobs antigos com engine `gemini-lite` em `movieled_maker_jobs`, e isso deve sair da operação/relatório como legado desativado.
- O painel também está errando custo: MovieLed tem custo fixo hardcoded de R$ 2,00 e ainda soma custo de vídeo por engine, causando cálculo inconsistente/dobrado.

Plano de correção:

1. Corrigir a receita do painel Custos IA
- Trocar a lógica de receita por “créditos realmente debitados”, usando as transações de consumo de crédito como fonte de verdade.
- Parar de zerar receita apenas porque o usuário é Unlimited.
- Regra correta para MovieLed:
  - Kling 2.5: cobra e gera receita, inclusive Unlimited.
  - Veo 3.1: cobra e gera receita, inclusive Unlimited.
  - Wan 2.2: se Unlimited e não houve débito, receita R$ 0,00; se houve débito real, mostra receita.
- Atualizar a tabela para mostrar créditos cobrados/reembolsados de forma explícita, não inferida só pelo plano atual do usuário.

2. Corrigir custo do MovieLed no painel
- Remover o custo fixo hardcoded de MovieLed Maker no componente de custos.
- Zerar/ignorar `ai_tool_settings` de MovieLed como custo fixo por job.
- Usar `rh_cost` real/registrado do job para custo de RunningHub.
- Remover a soma duplicada “MovieLed R$2 + custo por segundo”.
- Para Wan 2.2, custo externo fica somente o que vier registrado no job; não inventar custo.
- Para Kling, usar custo real salvo no webhook; fallback por engine só se o job antigo não tiver custo salvo.

3. Corrigir captura de custo real da RunningHub
- Ajustar `runninghub-webhook` para extrair `consumeCoins` de `taskUsageList`/`usage` do payload da RunningHub.
- Salvar esse valor em `rh_cost` no job.
- Parar de calcular custo por tempo de processamento quando a RunningHub já envia consumo real.
- Manter fallback por tempo apenas para payloads antigos sem consumo.

4. Cobrança retroativa correta
- Cobrar somente os 2 jobs de Kling 2.5 que realmente ficaram sem transação:
  - `herica@admin.com`: 2 jobs x 900 = 1.800 créditos.
- Inserir as transações retroativas de consumo com descrição clara.
- Atualizar saldo da usuária de forma transacional.
- Não cobrar Wan 2.2 Unlimited, porque Wan é o único liberado no Unlimited.

5. Remover Gemini da operação
- Remover/deletar funções e trechos mortos relacionados a chave/API Gemini antiga, incluindo `admin-update-google-key` se não houver uso ativo.
- Remover comentários/labels “Gemini” de funções legadas que hoje só redirecionam para outros fluxos.
- Criar uma migração defensiva para remover qualquer cron/função residual `reconcile_stuck_gemini_video_jobs`, se existir no ambiente.
- Renomear engines históricos `gemini-lite` em MovieLed para um valor legado desativado, para parar de aparecer “Gemini” em auditorias e relatórios.
- Revisar `translate-prompt-chinese`, que ainda chama endpoint com modelo Gemini via Evolink, e trocar para rota sem Gemini ou remover se não for mais usada.

6. Blindagem para não voltar a quebrar
- Adicionar uma auditoria no Custos IA para listar inconsistências:
  - Kling/Veo concluído com `credits_charged=true` mas sem transação real.
  - Jobs com receita R$ 0,00 apesar de débito real.
  - Jobs com custo duplicado ou custo ausente.
  - Engines legadas/desativadas ainda aparecendo.
- Atualizar o alerta de erros para incluir engines legadas/desativadas e falhas de MovieLed.

7. Verificação final
- Validar no banco:
  - Gisele Kling: receita aparece baseada nos 900 créditos debitados.
  - Gisele Wan: continua R$ 0,00 de receita se não houve débito, porque Wan entra no Unlimited.
  - Herica Kling: retroativo de 1.800 créditos registrado.
  - Nenhum job ativo/novo aparece com `gemini-lite`.
- Validar no painel /custosia:
  - MovieLed Maker mostra receita por job corretamente.
  - Resumo total usa créditos realmente cobrados.
  - Custo não soma MovieLed duas vezes.
  - Lucro = receita real - custo real.

Arquivos/áreas que serão alterados:
- `src/components/admin/AdminAIToolsUsageTab.tsx`
- `supabase/functions/runninghub-webhook/index.ts`
- funções/migrações de auditoria do painel Custos IA
- limpeza de funções/código legado Gemini
- `src/pages/Index.tsx` para incrementar versão do build
</final-text>