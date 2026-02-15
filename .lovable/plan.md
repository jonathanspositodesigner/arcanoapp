
# Relatorio: Diferenças entre o Upscaler Original e o Teste Gratuito

## Status Geral

A integração está **quase correta**, mas existem alguns problemas que podem causar falhas ou comportamento inesperado.

---

## Problemas Encontrados

### 1. CRITICO - Job insert com `user_id: null` vs Edge Function com `TRIAL_USER_ID`

**Original:** Insere job com `user_id: user.id` (UUID real do usuario)
**Trial:** Insere job com `user_id: null`

Porem o Edge Function define `effectiveUserId = TRIAL_USER_ID` (`00000000-0000-0000-0000-000000000000`) para o trial. Se a Edge Function ou o webhook tentarem atualizar o job filtrando por `user_id`, pode haver inconsistencia. O job foi criado com `null`, mas o backend espera o UUID fixo de trial.

**Correcao:** Inserir com `user_id: '00000000-0000-0000-0000-000000000000'` (o mesmo TRIAL_USER_ID da Edge Function).

### 2. MEDIO - Campos faltando no insert do job

**Original insere:**
- `detail_denoise`: valor do slider
- `prompt`: texto do prompt
- `input_file_name`: nome do arquivo

**Trial insere:**
- Nenhum desses campos

Isso impacta o mecanismo de **fallback automatico "De Longe -> Perto"**, que depende do campo `category`, `version`, e `resolution` gravados no job para tentar novamente com outro workflow. Os campos `category`, `version` e `resolution` estao presentes, entao o fallback deve funcionar. Mas `detail_denoise` e `prompt` faltando podem causar problemas se o webhook precisar deles.

**Correcao:** Adicionar `detail_denoise`, `prompt` e `input_file_name` ao insert.

### 3. MENOR - `creditCost: 60` fixo (deveria ser 0 ou nao enviado)

**Original:** `creditCost` varia (50 para Logo, 60 para Standard, 80 para Pro)
**Trial:** Sempre envia `60`

Como `trial_mode: true` faz o backend pular a validacao de `creditCost`, isso nao causa erro. Mas para Logo deveria ser 50 por consistencia.

**Correcao:** Nenhuma necessaria (backend ignora), mas por clareza, pode-se enviar `creditCost: 0` no trial.

### 4. MENOR - `consumeUse()` chamado no callback de sucesso

No trial, `consumeUse()` e chamado quando o job completa (no `statusCallbackRef`). Mas o uso do trial ja foi consumido no passo 1 (`landing-trial-code/consume`). Isso significa que `consumeUse()` esta decrementando o contador local uma segunda vez?

**Verificar:** Se `consumeUse()` faz uma chamada ao backend ou apenas decrementa state local. Se for state local, esta correto (sincroniza a UI com o backend). Se chamar o backend novamente, esta consumindo 2 usos por processamento.

### 5. OK - Parametros da API estao corretos

Os parametros enviados para cada categoria estao corretos e seguem a mesma logica do original:
- `detailDenoise`: 0.15 para pessoas (fixo Standard), slider para comida, undefined para especiais -- OK
- `resolution`: 2048 para pessoas, undefined para especiais -- OK
- `prompt`: prompt automatico para pessoas, undefined para especiais -- OK
- `framingMode`: perto/longe para pessoas, undefined para especiais -- OK
- `version: 'standard'` -- OK
- `trial_mode: true` -- OK

### 6. OK - Compressao correta

O fluxo de compressao esta correto:
1. Se > 2000px -> `ImageCompressionModal`
2. Sempre -> `optimizeForAI()` (JPEG, 1536px, 2MB)

### 7. OK - Categorias e controles da UI

As 5 categorias, o sub-seletor Perto/Longe, e o slider de Comida/Objeto estao implementados corretamente.

### 8. OK - `useJobStatusSync` e tratamento de erros

O hook de sincronizacao esta corretamente configurado com callback estabilizado via `useRef`.

---

## Correcoes Necessarias

1. **Trocar `user_id: null` por `user_id: '00000000-0000-0000-0000-000000000000'`** no insert do job (alinhar com o TRIAL_USER_ID do backend)
2. **Adicionar `detail_denoise`, `prompt` e `input_file_name`** ao insert do job para compatibilidade com o fallback De Longe
3. **Verificar se `consumeUse()` esta duplicando** o consumo de testes

### Detalhes Tecnicos das Correcoes

**Arquivo:** `src/components/upscaler/trial/UpscalerTrialSection.tsx`

**Correcao 1 - Job insert (linhas 232-244):**
Adicionar ao insert:
- `user_id: '00000000-0000-0000-0000-000000000000'` (ao inves de null)
- `detail_denoise: detailDenoise calculado`
- `prompt: prompt calculado`
- `input_file_name: storagePath.split('/').pop()`

**Correcao 2 - consumeUse():**
Verificar o hook `useTrialState` para confirmar se `consumeUse()` faz chamada ao backend ou apenas decrementa o state. Se for apenas state local, manter. Se chamar backend, remover do callback de sucesso (ja foi consumido no passo 1).
