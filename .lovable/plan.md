
## Diagnóstico objetivo (onde está travando de verdade)

Pelo fluxo atual do Pose Changer, o ponto que está quebrando “do nada” não é mais upload/permissão. Agora o travamento principal é este:

1) O front cria o job no banco (`pose_changer_jobs`).
2) Faz upload das 2 imagens pro storage (isso está funcionando; eu confirmei que os arquivos existem em `pose-changer/<user_id>/...`).
3) Chama a função `runninghub-pose-changer/run`.
4) Dentro dessa função, na etapa de “transferir” as imagens pro RunningHub, ela faz:
   - `const personData = await personUpload.json()`
   - `const refData = await refUpload.json()`

Quando o RunningHub responde com **HTML** (Cloudflare/502/403/429 etc), o `.json()` quebra com:
- `Unexpected token '<' ... is not valid JSON`

Resultado:
- o backend responde 500 e o front só mostra “non-2xx”
- o job pode ficar “queued/running” sem erro gravado (estado zumbi), o que dá a sensação de “toda vez quebra uma coisa diferente”.

Importante: eu consegui disparar o endpoint `/openapi/v2/run/ai-app/2018451429635133442` via função e receber `taskId` com sucesso em teste. Então a integração está “no caminho certo”, mas falta robustez e tratamento correto quando o provedor responde erro/HTML.

---

## Objetivo das correções (sem “cabuloso”)

1) Parar de quebrar em `.json()` quando a resposta não for JSON.
2) Retornar pro front um erro útil (status + trecho do corpo), em vez de “non-2xx”.
3) Quando falhar em qualquer passo, **marcar o job como `failed`** com `error_message` (para não ficar travado).
4) Fortalecer também o `/run/ai-app/...` (mesmo problema: hoje faz `response.json()` direto).
5) (Bonus bem simples) Melhorar o front para mostrar o erro retornado pela função.

---

## Mudanças propostas (implementação)

### A) Blindar parsing/erros no `runninghub-pose-changer` (principal)
**Arquivo:** `supabase/functions/runninghub-pose-changer/index.ts`

1. Criar helper interno para ler resposta com segurança:
   - ler `content-type`
   - ler `text()` sempre
   - se parecer JSON, fazer `JSON.parse(text)` (try/catch)
   - se for HTML ou parse falhar: lançar erro com:
     - `endpoint`, `status`, `content-type`, `bodySnippet` (200–400 chars)

2. Aplicar esse helper em:
   - upload da person image (`/task/openapi/upload`)
   - upload da reference image (`/task/openapi/upload`)
   - start do app (`/openapi/v2/run/ai-app/...`)

3. Checar `response.ok` antes de parsear e tratar:
   - 429/502/503/504: retry simples (2–3 tentativas, backoff curto 500ms/1000ms/2000ms)
   - demais: falha imediata com mensagem clara

4. **No catch de IMAGE_TRANSFER_ERROR**, além de retornar o erro, atualizar o job:
   - `status = 'failed'`
   - `error_message = 'IMAGE_TRANSFER_ERROR: <mensagem curta>'`
   - `completed_at = now()`
   Isso mata o “job zumbi” e o realtime do front vai refletir.

5. Também ajustar CORS headers para o formato padrão (incluindo os headers longos), para evitar preflight estranho no browser em alguns cenários.

**Resultado esperado:** nunca mais “Unexpected token ‘<’” derrubando tudo; quando o provedor der pau, o erro volta explicado e o job vira failed.

---

### B) Blindar o `runninghub-upscaler` (mesmo bug, mesmo remédio)
**Arquivo:** `supabase/functions/runninghub-upscaler/index.ts`

Ele tem o mesmo padrão perigoso (`await uploadResponse.json()` / `await response.json()`). Vamos reaproveitar a mesma abordagem de:
- ler `text()`, validar JSON, logar snippet
- retry para 429/502/503/504

**Resultado:** evita o mesmo inferno reaparecer em outra ferramenta.

---

### C) Melhorar o front para mostrar o erro real (e não “non-2xx”)
**Arquivo:** `src/pages/PoseChangerTool.tsx`

1. Ao receber `runError` do `supabase.functions.invoke`, tentar extrair detalhes do erro retornado pela função (quando existir) e mostrar no toast algo do tipo:
   - “RunningHub retornou HTML (502). Tente novamente em 30s.”
   - “Rate limit (429). Aguarde e tente de novo.”
2. Subscribing mais cedo:
   - Assinar updates do job logo após criar o job (antes do upload e do invoke), assim qualquer `failed` gravado no backend aparece mesmo se o invoke falhar no meio.

**Resultado:** você vê exatamente “qual passo falhou” sem ter que adivinhar.

---

### D) Verificação do fluxo passo a passo (critério de aceite)
Depois de implementar:

1) Abrir `/pose-changer-tool`
2) Selecionar 2 imagens (pessoa + referência)
3) Clicar “Gerar Pose”
4) Confirmar no console/network:
   - uploads para storage OK (200/201)
   - invoke do `runninghub-pose-changer/run`:
     - em sucesso: retorna `{ taskId }` e o job fica `running`
     - em falha: o front mostra status e snippet; o job vira `failed` com `error_message`
5) Aguardar término:
   - webhook atualiza para `completed` com `output_url` (se o provedor estiver ok)
   - se não chegar callback: pelo menos não fica travado silenciosamente (e teremos logs melhores para diagnosticar o callback)

---

## Arquivos que serão alterados
- `supabase/functions/runninghub-pose-changer/index.ts`
- `supabase/functions/runninghub-upscaler/index.ts`
- `src/pages/PoseChangerTool.tsx`

---

## Observações (importante)
- Eu não vou “enfiar mais proibição”; o foco aqui é remover os crashes e deixar o sistema resiliente quando o provedor responde fora do padrão.
- A API que você mandou (`/run/ai-app/2018451429635133442`) já está sendo usada; o que faltou foi tratar corretamente quando o provedor não entrega JSON (o que acontece na vida real).

