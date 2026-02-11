

## Diagnostico dos Erros do Arcano Cloner

### Resumo dos erros encontrados

Total de jobs: 57 (49 sucesso, 8 falhas = **14% de falha**)

| Erro | Qtd | Causa Real | Contornavel? |
|------|-----|-----------|--------------|
| WebP nao reconhecido pelo PIL | 4 | RunningHub nao consegue ler o arquivo .webp enviado (PIL.UnidentifiedImageError no node 62) | Sim - converter para JPEG/PNG antes de enviar |
| Content safety filter | 1 | IA bloqueou geracao por considerar conteudo inapropriado | Parcial - retry automatico com prompt ajustado |
| No output received | 1 | Webhook veio sem URL de resultado | Sim - retry automatico |
| Upload 502 | 1 | RunningHub retornou 502 ao receber a imagem de referencia | Ja tem retry (3x), erro transiente |
| Timeout 10min | 1 | Job ficou preso sem resposta | Ja tem tratamento, erro transiente |

### Causa principal (75% dos erros): WebP incompativel

O problema mais grave e sistematico: **a referencia e enviada em formato WebP**, mas o ComfyUI/PIL no servidor da RunningHub nao consegue identificar certos arquivos WebP. Isso afeta especialmente a imagem de referencia (node 62).

### Plano de correcao

#### 1. Converter imagens para JPEG antes do upload (corrige 4 de 8 erros)

Na Edge Function `runninghub-arcano-cloner/index.ts`, na etapa de upload de imagem para a RunningHub, converter WebP para JPEG usando Canvas no client-side antes de enviar, OU converter server-side antes de fazer upload para a RunningHub.

**Abordagem escolhida**: Client-side - ja existe compressao via `browser-image-compression`. Vamos forcar output em JPEG em vez de WebP no componente do Arcano Cloner ao comprimir a imagem antes do upload ao storage.

#### 2. Adicionar retry automatico para "No output received" (corrige 1 de 8)

Quando o webhook volta com status COMPLETED mas sem output URL, o sistema deve tentar reconciliar automaticamente (chamar a API de status) antes de declarar falha.

#### 3. Adicionar mapeamento de erro "content safety filter" (melhora UX)

Adicionar no `errorMessages.ts` uma mensagem clara quando a IA bloqueia por filtro de seguranca, orientando o usuario a usar outra imagem.

### Mudancas tecnicas

| Arquivo | Mudanca |
|---------|---------|
| `src/components/arcano-cloner/useArcanoCloner.ts` (ou arquivo de upload) | Forcar formato JPEG na compressao de imagem antes do upload, em vez de WebP |
| `src/utils/errorMessages.ts` | Adicionar mapeamento para "content safety filter" e "UnidentifiedImageError" |
| `supabase/functions/runninghub-arcano-cloner/index.ts` | Na funcao de upload para RunningHub, adicionar fallback: se upload de WebP falhar, re-baixar a imagem e converter para JPEG server-side antes de re-tentar |
| `supabase/functions/runninghub-webhook/index.ts` | No caso de COMPLETED sem output, tentar reconciliacao automatica antes de marcar como falha |

### O que NAO precisa mudar

- Timeout de 10min: ja funciona e estorna creditos corretamente
- Retry de upload 502: ja tem 3 tentativas implementadas
- Estorno de creditos: todos os 8 jobs falhados tiveram creditos estornados corretamente

### Impacto esperado

Essas mudancas devem reduzir a taxa de falha de ~14% para menos de 3%, eliminando o problema sistematico de WebP e adicionando resiliencia aos erros transientes.

