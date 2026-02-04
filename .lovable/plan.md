
# Correção: Veste AI Travado na Fila

## Diagnóstico
Identificamos **dois problemas críticos** causando os jobs do Veste AI ficarem eternamente na fila:

### Problema Principal
O arquivo `supabase/functions/runninghub-webhook/index.ts` contém configuração desatualizada:
- Linha 17: `WEBAPP_ID_VESTE = 'PLACEHOLDER_WEBAPP_ID'`
- Linhas 409-410: Node IDs também são placeholders

Quando o webhook central tenta processar jobs da fila, ele verifica esse placeholder e **força o status "failed"** com a mensagem "Veste AI ainda não está configurada".

### Problema Secundário
O webhook não inclui `video_upscaler_jobs` na contagem de concorrência global, criando inconsistência com as Edge Functions dedicadas.

---

## Ações Imediatas

### 1. Limpar jobs travados no banco
Os 4 jobs "queued" não têm imagens válidas (campos `person_file_name` e `clothing_file_name` estão nulos). Precisam ser marcados como "failed" para liberar a visualização:

```sql
UPDATE veste_ai_jobs 
SET status = 'failed',
    error_message = 'Job incompleto - imagens não foram enviadas',
    completed_at = NOW()
WHERE status = 'queued' 
  AND (person_file_name IS NULL OR clothing_file_name IS NULL);
```

### 2. Marcar video_upscaler job travado
O job de video_upscaler está "running" há 24+ horas (bug separado):

```sql
UPDATE video_upscaler_jobs 
SET status = 'failed',
    error_message = 'Timeout - job travado por mais de 24h',
    completed_at = NOW()
WHERE status = 'running' 
  AND started_at < NOW() - INTERVAL '2 hours';
```

---

## Correção de Código

### Arquivo: `supabase/functions/runninghub-webhook/index.ts`

**Mudança 1: Atualizar WebApp ID do Veste AI (linha 17)**
```typescript
// De:
const WEBAPP_ID_VESTE = 'PLACEHOLDER_WEBAPP_ID';

// Para:
const WEBAPP_ID_VESTE = '2018755100210106369';
```

**Mudança 2: Atualizar Node IDs na função startVesteAIJob (linhas 409-410)**
```typescript
// De:
const NODE_ID_PERSON = 'PLACEHOLDER_PERSON_NODE';
const NODE_ID_CLOTHING = 'PLACEHOLDER_CLOTHING_NODE';

// Para:
const NODE_ID_PERSON = '41';
const NODE_ID_CLOTHING = '43';
```

**Mudança 3: Remover o bloco de verificação de placeholder (linhas 426-438)**
O bloco que força "failed" quando o webapp ID é placeholder deve ser removido, já que agora terá o ID correto.

**Mudança 4: Adicionar video_upscaler_jobs na contagem de concorrência (linhas 183-198)**
```typescript
const { count: videoUpscalerRunning } = await supabase
  .from('video_upscaler_jobs')
  .select('*', { count: 'exact', head: true })
  .eq('status', 'running');

const totalRunning = (upscalerRunning || 0) + (poseRunning || 0) + 
                     (vesteRunning || 0) + (videoUpscalerRunning || 0);
```

---

## Resultado Esperado
- Jobs do Veste AI serão processados corretamente pela fila quando um slot ficar disponível
- A contagem de concorrência será consistente entre todas as ferramentas
- Jobs antigos/incompletos serão limpos e não bloquearão a interface

---

## Arquivos Afetados
1. `supabase/functions/runninghub-webhook/index.ts` - Atualizar configuração do Veste AI e contagem de video_upscaler
2. Banco de dados - Limpar jobs travados via SQL
