

## Otimizações de velocidade para Remover Fundo

### Fluxo atual e gargalos

```text
CLIENTE (bloqueante):
  [0.5s] getImageDimensions ← REDUNDANTE (já feito no processFile)
  [2-3s] uploadToStorage (Supabase) ← GARGALO PRINCIPAL
  [0.5s] insert job record
  [0.5s] invoke edge function

EDGE FUNCTION (bloqueante):
  [1-2s] download imagem do Supabase ← REDUNDANTE (acabou de subir)
  [2-3s] upload para RunningHub
  [0.5s] consume credits
  [1s]   check queue (síncrono)
  [1s]   start AI app

RUNNINGHUB: [5s]
WEBHOOK → REALTIME: [2s]
```

### 4 otimizações sem quebrar nada

#### 1. Cachear dimensões do `processFile` (ganho: ~0.5s)
As dimensões já são calculadas em `processFile` (linhas 169-192) mas não são salvas. No `handleProcess` (linha 245), `getImageDimensions` carrega a imagem de novo. Solução: guardar width/height em state quando a imagem é selecionada e reusar no `handleProcess`.

**Arquivo**: `src/pages/RemoverFundoTool.tsx`

#### 2. Enviar base64 direto para a edge function (ganho: ~3-5s)
Maior otimização. Em vez de: Client → Storage → Edge → Download → RunningHub, fazer: Client converte para base64 → Edge recebe → Upload direto para RunningHub. O upload para Storage (para histórico na página de custos) é feito em background pela edge function após iniciar o job.

**Arquivos**: `src/pages/RemoverFundoTool.tsx` + `supabase/functions/runninghub-bg-remover/index.ts`

Mudanças no client:
- Converter `fileToUpload` para base64
- Enviar `imageBase64` + `fileName` no body do `/run` em vez de `inputImageUrl`
- Não chamar `uploadToStorage` no caminho crítico

Mudanças na edge function `handleRun`:
- Aceitar `imageBase64` + `fileName` como alternativa a `inputImageUrl`
- Se base64 fornecido: fazer upload direto para RunningHub (já existe lógica no `handleUpload`)
- Remover validação de URL obrigatória quando base64 está presente
- Fazer upload para Supabase Storage em background (para manter `input_url` no registro do job)

#### 3. Queue check em paralelo com upload RunningHub (ganho: ~1s)
Na edge function, o queue check (linhas 222-234) e o upload para RunningHub são sequenciais. Podem rodar em `Promise.all` pois são independentes.

**Arquivo**: `supabase/functions/runninghub-bg-remover/index.ts`

#### 4. Criar job record em paralelo com conversão base64 (ganho: ~0.3s)
No client, o job record pode ser inserido sem `input_url` (preenchido depois pela edge function em background), permitindo que a conversão base64 e o insert rodem em paralelo.

**Arquivo**: `src/pages/RemoverFundoTool.tsx`

### Resultado esperado

```text
ANTES:  ~23 segundos
DEPOIS: ~12-14 segundos

Detalhamento da economia:
  Dimensões cacheadas:              -0.5s
  Elimina storage upload (cliente): -2.5s
  Elimina download storage (edge):  -1.5s  
  Queue check em paralelo:          -1.0s
  Job insert em paralelo:           -0.3s
  Total economia:                   ~5-6s
```

### O que NÃO muda
- Upload para Storage continua existindo (feito em background pela edge function para manter histórico)
- Rate limiting inalterado
- Consumo de créditos inalterado
- Webhook/realtime inalterado
- Validação de imagem inalterada
- Todas as outras ferramentas de IA inalteradas

