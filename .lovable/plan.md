# 🔍 Auditoria — Modo Logo no MovieLed Maker

## 🎯 Causa raiz do erro

Você recebeu **"erro de edge function"** ao testar Kling 2.5 + Logo PNG transparente. Investiguei a fundo:

1. **Banco**: nenhum job em `content_mode='logo'` foi sequer criado — o erro travou *antes* de chegar ao DB.
2. **Edge logs**: a função `runninghub-movieled-maker` **não tem nenhum log recente**, apesar de outras funções (queue-manager, arcano-cloner, etc.) estarem operando normalmente.
3. **HTTP trace**: a chamada `OPTIONS /functions/v1/runninghub-movieled-maker/run` retornou **503** às 17:55 UTC — exatamente no seu teste.

**Conclusão técnica**: a função `runninghub-movieled-maker` está com **deploy quebrado / não publicado** após as últimas alterações do modo Logo. O preflight CORS retorna 503 antes mesmo de o request chegar ao código, então o frontend mostra o erro genérico de "Edge Function".

O código em si (validações, upload, payload, roteamento no queue-manager) está correto após eu reler todos os arquivos. O problema é puramente de **runtime**.

---

## 📋 Plano de correção (3 frentes)

### 1. 🚀 Forçar redeploy das duas edge functions afetadas

- `runninghub-movieled-maker` (que está dando 503)
- `runninghub-queue-manager` (mexemos nela junto, garantir que o roteamento Logo está ativo na versão deployada)

Vou usar a tool `supabase--deploy_edge_functions` para deploy explícito imediato e em seguida `supabase--curl_edge_functions` para validar com um OPTIONS real que volta 200/204.

### 2. 🛡️ Endurecimento defensivo no edge function

Mesmo o redeploy resolvendo o 503, vou adicionar **3 proteções extras** em `runninghub-movieled-maker/index.ts` para evitar que erros silenciosos voltem a acontecer:

- **try/catch global no boot**: envolver `serve()` num bloco que loga `[MovieLedMaker] BOOT ERROR` se algo crashar na inicialização (hoje crashes de boot ficam invisíveis).
- **Validação extra do upload da logo**: se o `uploadImageToRunningHub('logo_image')` falhar, **estornar os créditos imediatamente** (hoje só estorna na falha do upload da imagem de referência, mas a lógica para a logo está confirmada — vou padronizar o tratamento).
- **Log explícito do contentMode**: adicionar `console.log('[MovieLedMaker] handleRun: contentMode=...', engine=..., hasLogo=...)` na entrada do `/run` para facilitar debug futuro.

### 3. 🧪 Validação do storage path

Confirmar que `artes-cloudinary/movieled-logos/{userId}/` aceita upload de JPEG sem precisar de policy nova (o bucket já é público, deve funcionar, mas vou rodar um SELECT nas policies pra ter certeza). Se faltar policy, criar migration.

---

## 🔬 O que NÃO precisa mudar (já validei)

- ✅ `src/lib/movieled-logo-processor.ts` — chroma key #00B140 + detecção de transparência está correto.
- ✅ UI do switch Nome/Logo, preview com badge, restrição de Veo 3.1 — tudo funcionando.
- ✅ WebApp IDs no queue-manager: `kling2.5_logo: 2047822588453326850` e `wan2.2_logo: 2048069532694093826` batem com a doc da RunningHub.
- ✅ NodeIds 155/160 (Kling) e 135/139 (Wan) estão corretos conforme doc.
- ✅ Coluna `content_mode` e `logo_image_url` existem na tabela.

---

## 📦 Arquivos impactados

1. ✏️ `supabase/functions/runninghub-movieled-maker/index.ts` — try/catch boot + logs extras + tratamento explícito de falha de upload da logo.
2. 🚀 Redeploy de `runninghub-movieled-maker` e `runninghub-queue-manager`.
3. 🧪 Verificação de policies do bucket (sem alteração esperada).
4. ✏️ `src/pages/Index.tsx` — bump `APP_BUILD_VERSION` → `1.4.7`.

---

## ⏱️ Tempo estimado de execução

~2 minutos (redeploy + edição mínima do edge function).

**Confirma que posso executar essa correção?**