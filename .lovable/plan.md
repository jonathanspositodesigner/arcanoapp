
# Plano: Integrar WebApp "De Longe" para Upscaler Arcano

## Resumo
Quando o usuário selecionar "De Longe" no enquadramento de pessoas, vamos usar um WebApp diferente do RunningHub que é otimizado para fotos de corpo inteiro/distantes. Este WebApp só precisa de imagem e resolução (sem nível de detalhe e sem prompt).

## Arquivos a Modificar

### 1. Frontend: `src/pages/UpscalerArcanoTool.tsx`

**Mudanças na UI:**
- Esconder o card "Nível de Detalhes" quando `pessoasFraming === 'longe'`
- O card de "Tipo de Imagem" e "Resolução" continuam visíveis
- O card de prompt personalizado também fica escondido quando "De Longe" (já que não envia prompt)

**Mudanças na lógica:**
- Adicionar flag `isLongeMode` para facilitar as verificações
- Na função `processImage()`, passar um novo parâmetro `framingMode` para a edge function

### 2. Backend: `supabase/functions/runninghub-upscaler/index.ts`

**Adicionar novo WebApp ID:**
```text
WEBAPP_ID_LONGE = '2017343414227963905'
```

**Lógica condicional no `handleRun()`:**
- Se `framingMode === 'longe'`, usar o WebApp "de longe" com apenas:
  - nodeId: "1" → imagem
  - nodeId: "7" → resolução
- Caso contrário, manter lógica atual com detailDenoise e prompt

## Detalhes Técnicos

### Novo WebApp "De Longe"
- **WebApp ID:** `2017343414227963905`
- **Node IDs:**
  - `1` (fieldName: "image") → Caminho da imagem
  - `7` (fieldName: "value") → Resolução (2048 ou 4096)
- **Não envia:** detailDenoise, prompt

### Mudanças no Frontend

```tsx
// Nova flag para verificar modo "de longe"
const isLongeMode = promptCategory === 'pessoas_longe' || pessoasFraming === 'longe';

// Esconder Nível de Detalhes quando "de longe"
{!isLongeMode && (
  <Card>
    {/* Slider de Nível de Detalhes */}
  </Card>
)}

// Na chamada processImage(), adicionar framingMode
body: {
  jobId: job.id,
  fileName,
  detailDenoise: isLongeMode ? null : detailDenoise,
  resolution: resolution === '4k' ? 4096 : 2048,
  prompt: isLongeMode ? null : getFinalPrompt(),
  version: version,
  framingMode: isLongeMode ? 'longe' : 'perto',
}
```

### Mudanças no Backend

```typescript
// Novo WebApp ID
const WEBAPP_ID_LONGE = '2017343414227963905';

// Em handleRun(), verificar framingMode
if (framingMode === 'longe') {
  // Usar WebApp específico para fotos de longe
  const nodeInfoList = [
    { nodeId: "1", fieldName: "image", fieldValue: fileName },
    { nodeId: "7", fieldName: "value", fieldValue: String(resolution || 2048) },
  ];
  // Chamar WEBAPP_ID_LONGE
} else {
  // Manter lógica atual (PRO/Standard com detailDenoise e prompt)
}
```

## Fluxo Resumido

```text
Usuário seleciona "Pessoas" → Aparece seletor De Perto / De Longe

Se "De Perto":
├── Mostra: Tipo de Imagem, Nível de Detalhes, Resolução, Prompt (PRO)
├── WebApp: PRO (2015865378030755841) ou Standard (2017030861371219969)
└── Envia: image, detailDenoise, resolution, prompt

Se "De Longe":
├── Mostra: Tipo de Imagem, Resolução (ESCONDE Nível de Detalhes e Prompt)
├── WebApp: LONGE (2017343414227963905)
└── Envia: APENAS image + resolution
```

## Validações

- "De Longe" funciona em ambas as versões (Standard e PRO)
- Custo de créditos permanece igual (40 Standard / 60 PRO)
- UI adapta automaticamente escondendo controles não utilizados
