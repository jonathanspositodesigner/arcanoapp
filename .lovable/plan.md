
## Alterar Slider de Criatividade: 1-6 para 0-100

### Mudancas

**1. Componente `src/components/arcano-cloner/CreativitySlider.tsx`**
- Mudar `min` de 1 para 0, `max` de 6 para 100, `step` de 1 para 1
- Valor padrao ja vem do pai (sera 0)
- Trocar label "Mais fiel" por "Mais fiel" (manter), "Muito criativo" por "Muito criativo" (manter)
- Adicionar texto de recomendacao abaixo do slider: "Recomendado: entre 0 e 30"

**2. Frontend `src/pages/ArcanoClonerTool.tsx`**
- Mudar `useState(4)` para `useState(0)` na linha 71

**3. Edge function `supabase/functions/runninghub-arcano-cloner/index.ts`** (linha 720)
- Mudar o clamp de `Math.min(6, Math.max(1, ...))` para `Math.min(100, Math.max(0, ...))`
- Mudar fallback de `4` para `0`

**4. Edge function `supabase/functions/runninghub-queue-manager/index.ts`** (linha 1143)
- Mudar fallback de `4` para `0`

### O que NAO muda
- O nodeId 133 continua sendo usado
- O valor enviado continua sendo um numero inteiro em string
- Tudo mais (fotos, prompt, aspect ratio) fica igual
