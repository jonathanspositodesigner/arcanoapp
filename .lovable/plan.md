
Objetivo
- Fazer o endpoint de webhook “responder rápido” (em milissegundos) para a Hotmart, evitando 408 (timeout) e a cascata de 502 (gateway) causada por execução lenta.
- Depois de responder, fazer o processamento pesado (criar/buscar usuário, liberar acesso, enviar e-mail) em segundo plano, sem travar a resposta do webhook.
- Garantir que, mesmo respondendo rápido, o sistema não “perca” eventos: salvar imediatamente um registro no banco (durável) antes de responder.

O que eu encontrei no seu projeto (causa real do problema)
1) `webhook-hotmart-artes` hoje faz tudo “antes de responder”
- Cria/acha usuário (inclui fallback com `listUsers` paginado até 10 páginas).
- Faz upsert em `profiles`.
- Faz select/insert/update em `user_pack_purchases`.
- Só então chama `sendWelcomeEmail()` que faz múltiplas chamadas externas (token + envio SendPulse).
- Só depois retorna 200 para a Hotmart.
Isso é o cenário clássico de 408/502 quando o provedor espera resposta rápida e você está fazendo trabalho pesado dentro da request.

2) `webhook-greenn-artes`, `webhook-greenn` e `webhook-greenn-musicos` seguem o mesmo padrão (processamento pesado dentro da request).

3) Existe uma tabela pronta para “log durável” (`webhook_logs`) e ela tem `payload jsonb NOT NULL`
- Hoje os webhooks Greenn tiveram o logging desativado no código (“logs desativados”), por isso o rastro parou em 2026-01-22.
- Essa tabela já tem índices por email/platform/received_at/result, então dá para usar sem reinventar tudo.

Estratégia de correção (o que vai mudar no comportamento)
Padrão “ACK rápido + processamento em background”
1) Recebe o webhook
2) Faz o mínimo indispensável:
   - parse do payload
   - grava uma linha em `webhook_logs` com `result='received'` (isso é a prova de que chegou e também vira a “fila”)
3) Responde 200 imediatamente para a Hotmart (em < 300ms na prática)
4) Processa tudo “depois” (no mesmo request, mas fora do caminho crítico) usando `EdgeRuntime.waitUntil(...)`
5) Atualiza `webhook_logs` para `result='success' | 'ignored' | 'blocked' | 'failed'` e `error_message` quando der erro

Ponto importante (para não perder venda)
- Eu NÃO vou responder 200 se eu não conseguir gravar a linha em `webhook_logs`.
  - Se falhar a gravação (ex.: instabilidade de banco), eu retorno 500 rapidamente para a Hotmart tentar novamente (retry).
  - Isso evita o pior cenário: responder 200 e “sumir” com o evento.

Escopo de implementação (arquivos que vou mexer)
1) Backend functions (webhooks)
- `supabase/functions/webhook-hotmart-artes/index.ts`  (principal do seu problema)
- `supabase/functions/webhook-greenn-artes/index.ts`   (mesma correção para não repetir o problema)
- `supabase/functions/webhook-greenn/index.ts`
- `supabase/functions/webhook-greenn-musicos/index.ts`

2) Banco (para performance e estabilidade do processamento)
- Criar índice em `profiles` por email (hoje NÃO existe; isso degrada lookup conforme cresce):
  - `create index ... on profiles (lower(email))`
- Criar índice em `user_pack_purchases` para acelerar o “já tem acesso?”:
  - `(user_id, pack_slug, platform)` (ou no mínimo `(user_id, pack_slug)`)
- Criar índice em `user_pack_purchases(greenn_contract_id)` (já existe em hotmart_transaction, mas não em greenn_contract_id)

Observação: Esses índices não são “luxo”; eles reduzem tempo de execução e ajudam a evitar que o processamento em background demore e falhe por lentidão.

Detalhamento por webhook (o que exatamente vou alterar)

A) `webhook-hotmart-artes` (Hotmart ES)
1) Separar em duas camadas dentro do mesmo arquivo:
- Handler “rápido” (ingest):
  - `payload = await req.json()`
  - extrai `event`, `email`, `productId`, `transaction` (se houver)
  - insere em `webhook_logs`:
    - payload (inteiro)
    - platform: `'hotmart-es'`
    - email
    - product_id
    - status: event
    - result: `'received'`
  - agenda `EdgeRuntime.waitUntil(processHotmartWebhook(payload, logId, requestId))`
  - retorna 200 imediatamente

- Processor (processHotmartWebhook):
  - Reaproveita a sua lógica atual de:
    - cancelar/refund
    - criar/buscar usuário
    - liberar acesso
    - enviar email
  - Mudanças importantes:
    1) Cancelamento/reembolso:
       - Primeiro tenta desativar acesso pelo `hotmart_transaction` (rápido e indexado).
       - Só se não tiver transaction ou não achar nada, tenta fallback por email/profiles/listUsers.
    2) Email SendPulse:
       - fica no background e SEMPRE em try/catch (falhar email não pode “matar” o acesso).
    3) Atualiza `webhook_logs` no final:
       - success/ignored/blocked/failed + error_message (se falhar)

B) `webhook-greenn-artes` (Greenn Artes / Eventos)
1) Mesmo padrão “ACK rápido + background”
- Handler rápido:
  - parse payload
  - insere em `webhook_logs`:
    - platform: `'artes-eventos'` (ou `'app'/'eventos'` conforme o seu padrão; hoje você calcula `fromApp` via UTM)
    - email/product_id/status/utm_source/from_app/mapping_type (se já conseguir calcular rápido; se não, coloca só o básico)
    - result='received'
  - responde 200
  - processa depois via waitUntil

2) Processor:
- Reaproveita a lógica existente (mapping, createUser, upsert profile, processPackPurchase, sendWelcomeEmail).
- Mudança crítica:
  - `sendWelcomeEmail` continua existindo, mas passa a acontecer depois de:
    - garantir que `user_pack_purchases` foi criado/atualizado
    - e depois de marcar `webhook_logs.result='success'` (para não “parecer falha” se o email travar)

C) `webhook-greenn` (PromptClub) e `webhook-greenn-musicos`
- Mesmo padrão.
- Benefício: uniformiza e reduz risco de vocês “tomarem” 408/502 em qualquer produto, não só Hotmart.

Como vou garantir que isso realmente resolve 408/502
- A Hotmart só liga para: “recebi HTTP 200 rápido”.
- O seu gargalo hoje é o tempo até o return.
- Com ACK rápido, o tempo de resposta vira:
  - parse JSON + insert 1 row no banco + return
  - sem chamadas externas (SendPulse) no caminho crítico
  - sem `listUsers` no caminho crítico

Plano de teste (sem depender de “reprocessar na Hotmart”)
1) Teste sintético (rápido)
- Disparar requisições de teste para `webhook-hotmart-artes` com payload real/simulado
- Confirmar:
  - resposta 200 em < 300ms
  - criação de linha em `webhook_logs` com `result='received'`
  - após alguns segundos, a mesma linha vira `result='success'` ou `failed` com `error_message`

2) Teste funcional (compra real)
- Na próxima compra real (ou no seu ambiente de teste), observar:
  - Hotmart não registra mais 408/502
  - usuário e acesso aparecem no banco
  - email pode falhar sem impedir o acesso (mas loga em `welcome_email_logs`)

Riscos e como vou mitigar
- Risco: “Respondi 200 mas o processamento em background falhou”
  - Mitigação 1 (principal): só respondo 200 se consegui gravar `webhook_logs` (evento durável).
  - Mitigação 2: background com try/catch + update do `webhook_logs` com erro.
  - Mitigação 3 (opcional, se você quiser depois): um job interno para reprocessar automaticamente `webhook_logs` com `result='failed'` (sem você precisar tocar na Hotmart). Não vou implementar isso agora porque você pediu explicitamente para não mexer com reprocessamento.

Entrega (sequência de implementação)
1) Migração do banco: índices (profiles email, user_pack_purchases composto, greenn_contract_id)
2) Refactor do `webhook-hotmart-artes` para ACK rápido + background
3) Replicar o mesmo padrão nos webhooks Greenn (artes, prompts, musicos)
4) Testes de resposta rápida + verificação em `webhook_logs`

Resultado esperado
- Hotmart para de acusar 408/502 por “endpoint lento”.
- O webhook passa a “chegar e ser confirmado” sempre (ou falhar antes, com 500 rápido para retry).
- O processamento pesado não bloqueia mais a resposta do webhook.
- Você volta a ter rastreabilidade pelo `webhook_logs` (que hoje ficou parado porque o logging foi removido do código).
