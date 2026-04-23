
Objetivo: corrigir de forma definitiva o bug que está fazendo os últimos jobs de Nano Banana e Upscaler Arcano terminarem como timeout mesmo quando o provedor conclui com sucesso.

1. Diagnóstico comprovado
- Verifiquei os últimos jobs de `image_generator_jobs` (Nano Banana) e `upscaler_jobs`.
- Casos recentes:
  - Nano Banana: `5fe83f38-5d0f-4fbe-8589-18f099af9e5f`, `735fc267-45ae-4304-bd82-74de5faded70`, `7fb424d0-02f3-483e-9930-3eae58824628`, `21d01055-116c-407d-94d2-4d7f4df15b3c`
  - Upscaler Arcano: `91e7c2dc-3f1c-4b41-b8e3-752c161d74df`, `5a5b637d-b112-43de-b38d-8a4a34d34db7`
- Em todos eles:
  - o provider retornou `TASK_END / SUCCESS`
  - `raw_webhook_payload` foi salvo com URL de saída
  - `step_history` chegou em `webhook_received`
  - mas o job não foi finalizado como `completed`
  - depois foi morto pelo cleanup com `Job timed out - cancelled automatically after 10 minutes`

2. Causa raiz
É bug da plataforma, não do provider.
O bug foi introduzido no fluxo de finalização do `runninghub-queue-manager/finish`.

Hoje o `/finish` faz:
- `select('user_id, user_credit_cost, credits_charged, credits_refunded, status, reference_prompt_id')`

Só que:
- `image_generator_jobs` não tem coluna `reference_prompt_id`
- `upscaler_jobs` também não tem coluna `reference_prompt_id`

Resultado:
- quando o webhook tenta finalizar esses jobs, o `/finish` falha na leitura inicial
- o webhook não trata resposta HTTP não-ok do `/finish`
- o job fica preso em `running`/`webhook_received`
- o cleanup de 10 minutos entra depois e marca como `failed`

3. Risco adicional identificado
Mesmo depois da correção principal, há fragilidades que podem fazer bug parecido voltar:
- o webhook não valida `response.ok` ao chamar `/finish`
- o cleanup usa regra agressiva baseada em antiguidade do job e pode matar job que já recebeu webhook, se a finalização central falhar
- o reconcile do queue manager não está robusto para respostas do provider em formatos diferentes
- o frontend ainda tem watchdog de timeout que pode piorar estados intermediários se o backend não estiver blindado

4. Plano de correção definitiva
Passo 1 — Corrigir o `/finish` para ser schema-safe
- remover o `reference_prompt_id` do select base comum
- fazer leitura em 2 etapas:
  - etapa A: buscar sempre apenas campos universais
  - etapa B: só buscar `reference_prompt_id` nas tabelas que realmente suportam collaborator prompt earnings
- criar um registry explícito de tabelas com `reference_prompt_id`, em vez de assumir que todas têm a coluna

Passo 2 — Blindar o webhook contra falha silenciosa
- ao chamar `runninghub-queue-manager/finish`, validar `response.ok`
- se `/finish` retornar erro, registrar log forte com jobId/taskId/tabela
- aplicar fallback direto no próprio webhook para persistir `completed` + `output_url` quando já houver output confirmado
- nunca deixar webhook “achar que finalizou” sem conferir sucesso real

Passo 3 — Tornar o cleanup à prova de falso timeout
- impedir que `cleanup_all_stale_ai_jobs` marque como failed jobs que já tenham:
  - `raw_webhook_payload` preenchido, ou
  - `current_step = 'webhook_received'`, ou
  - `output_url` já disponível
- preferir usar `started_at` para timeout operacional real, não apenas `created_at`
- adicionar uma etapa de reconciliação final antes do fail automático

Passo 4 — Endurecer o reconcile
- ajustar `/reconcile` para aceitar múltiplos formatos de resposta do provider
- se o provider responder sucesso mas sem estrutura completa, tentar extrair output de todos os formatos conhecidos
- se encontrar output, finalizar pelo mesmo pipeline seguro do `/finish`

Passo 5 — Proteger o frontend contra regressão
- revisar `useJobStatusSync`
- impedir cancelamento/finish forçado quando o backend já sinalizou webhook recebido
- transformar timeout do cliente em “pedir reconciliação”, não “matar job” sem confirmação

Passo 6 — Auditoria e observabilidade permanentes
- adicionar logs estruturados em 4 pontos:
  - webhook recebeu sucesso do provider
  - `/finish` começou
  - `/finish` concluiu atualização
  - cleanup ignorou ou cancelou job e por quê
- incluir motivo explícito nos logs: `finish_schema_error`, `finish_http_error`, `cleanup_skipped_webhook_received`, etc.
- manter isso apenas no fluxo técnico, sem atrapalhar a ferramenta nem mexer na UX principal

Passo 7 — Testes para esse bug nunca voltar
- criar testes para `runninghub-queue-manager/finish` cobrindo:
  - tabela com `reference_prompt_id`
  - tabela sem `reference_prompt_id`
  - job já terminal
  - webhook com sucesso e output válido
- criar teste de integração do fluxo:
  - provider SUCCESS
  - webhook salva payload
  - `/finish` persiste `completed`
  - cleanup não cancela
- adicionar caso específico para:
  - `image_generator_jobs`
  - `upscaler_jobs`

5. Validação após implementação
Vou validar com dados reais e pelos logs:
- os últimos jobs quebrados deixam de parar em `webhook_received`
- novos jobs de Nano Banana e Upscaler passam para `completed`
- `output_url` aparece no banco imediatamente após webhook
- cleanup não cancela jobs já concluídos no provider
- reconcile funciona como rede de segurança real
- créditos não ficam em estado incoerente

6. Resultado esperado
Depois dessa correção:
- sucesso do provider não vira mais timeout falso
- webhook não falha silenciosamente
- cleanup deixa de matar job que já está pronto
- Nano Banana e Upscaler Arcano voltam a concluir normalmente
- o mesmo bug não reaparece em outras ferramentas por diferença de schema entre tabelas

Detalhes técnicos
- Arquivos principais a ajustar:
  - `supabase/functions/runninghub-queue-manager/index.ts`
  - `supabase/functions/runninghub-webhook/index.ts`
  - `src/hooks/useJobStatusSync.ts`
  - migration para endurecer `cleanup_all_stale_ai_jobs`
- Causa técnica central:
  - regressão por leitura de coluna opcional (`reference_prompt_id`) em tabelas que não possuem essa coluna
- Estratégia de prevenção:
  - registry explícito por tabela
  - fallback seguro no webhook
  - cleanup defensivo
  - testes de schema heterogêneo
