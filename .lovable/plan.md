
# Plano: Workflows Dedicados para Foto Antiga e Comida/Objeto

## Resumo

Modificar o Upscaler Arcano para que as categorias **Foto Antiga** e **Comida/Objeto** usem workflows completamente separados no RunningHub, com controles específicos para cada tipo.

---

## Documentação dos Novos Workflows

### Workflow: Foto Antiga
| Propriedade | Valor |
|-------------|-------|
| WebApp ID | `2018913880214343681` |
| Node Imagem | nodeId: `139`, fieldName: `image` |
| Outros inputs | **Nenhum** (apenas a foto) |

### Workflow: Comida/Objeto
| Propriedade | Valor |
|-------------|-------|
| WebApp ID | `2015855359243587585` |
| Node Imagem | nodeId: `50`, fieldName: `image` |
| Node Detalhes | nodeId: `48`, fieldName: `value` (range: 0.70-1.00) |

---

## Mudanças no Frontend

### Arquivo: `src/pages/UpscalerArcanoTool.tsx`

### 1. Renomear Labels dos Botões

**Linha ~630** - Alterar os labels:

| Botão Atual | Novo Label |
|-------------|------------|
| Comida | Comida/Objeto |
| Antiga | Foto Antiga |

```text
'comida' → 'Comida/Objeto'
'fotoAntiga' → 'Foto Antiga'
```

### 2. Novo State para Slider de Comida/Objeto

Adicionar um novo state para o slider específico de criatividade (range 0.70-1.00):

```text
const [comidaDetailLevel, setComidaDetailLevel] = useState(0.85);
```

### 3. Lógica de Controles Especiais

Criar flag para identificar workflows especiais:

```text
const isSpecialWorkflow = promptCategory === 'fotoAntiga' || promptCategory === 'comida';
const isFotoAntigaMode = promptCategory === 'fotoAntiga';
const isComidaMode = promptCategory === 'comida';
```

### 4. Esconder Controles por Categoria

| Controle | Pessoas | Comida/Objeto | Foto Antiga | Logo/3D |
|----------|---------|---------------|-------------|---------|
| Framing (Perto/Longe) | Mostra | Esconde | Esconde | Esconde |
| Detail Denoise (PRO) | Mostra | **Slider Especial** | Esconde | Mostra |
| Resolution (2K/4K) | Mostra | Esconde | Esconde | Mostra |
| Custom Prompt (PRO) | Mostra | Esconde | Esconde | Mostra |

### 5. Slider Especial para Comida/Objeto

Quando `promptCategory === 'comida'`:

- **Mostrar slider travado entre 70-100** (valores 0.70 a 1.00)
- **Labels**: "Mais Fiel" (70) ↔ "Mais Criativo" (100)
- Usar `min={0.70}` e `max={1.00}` no Slider

```text
// Slider especial para Comida/Objeto
{isComidaMode && (
  <Card className="...">
    <span>Nível de Detalhes</span>
    <Slider
      value={[comidaDetailLevel]}
      onValueChange={([value]) => setComidaDetailLevel(value)}
      min={0.70}
      max={1.00}
      step={0.01}
    />
    <div className="flex justify-between">
      <span>Mais Fiel</span>
      <span>Mais Criativo</span>
    </div>
  </Card>
)}
```

### 6. Enviar Parâmetro de Categoria na Edge Function

Modificar a chamada da edge function para incluir `category`:

```text
body: {
  jobId: job.id,
  imageUrl: imageUrl,
  version: version,
  userId: user.id,
  creditCost: creditCost,
  category: promptCategory, // 'fotoAntiga', 'comida', 'pessoas_perto', etc.
  
  // Condicionais baseados na categoria:
  detailDenoise: isComidaMode ? comidaDetailLevel : (isFotoAntigaMode ? undefined : detailDenoise),
  resolution: isSpecialWorkflow ? undefined : resolutionValue,
  prompt: isSpecialWorkflow ? undefined : getFinalPrompt(),
  framingMode: isSpecialWorkflow ? undefined : framingMode,
}
```

---

## Mudanças no Backend

### Arquivo: `supabase/functions/runninghub-upscaler/index.ts`

### 1. Adicionar Novos WebApp IDs

**Linha ~15-18**:

```text
// WebApp IDs existentes
const WEBAPP_ID_PRO = '2015865378030755841';
const WEBAPP_ID_STANDARD = '2017030861371219969';
const WEBAPP_ID_LONGE = '2017343414227963905';

// Novos WebApp IDs
const WEBAPP_ID_FOTO_ANTIGA = '2018913880214343681';
const WEBAPP_ID_COMIDA = '2015855359243587585';
```

### 2. Receber Parâmetro `category`

Na função de validação, aceitar o novo parâmetro:

```text
const { 
  jobId, imageUrl, fileName, detailDenoise, prompt, 
  resolution, version, framingMode, userId, creditCost,
  category  // NOVO
} = body;
```

### 3. Nova Lógica de Seleção de Workflow

**Substituir linhas ~534-662** com lógica expandida:

```text
// Determinar qual WebApp usar baseado na categoria
let webappId: string;
let nodeInfoList: any[];

if (category === 'fotoAntiga') {
  // === FOTO ANTIGA ===
  // Apenas imagem, sem outros parâmetros
  webappId = WEBAPP_ID_FOTO_ANTIGA;
  nodeInfoList = [
    { nodeId: "139", fieldName: "image", fieldValue: rhFileName }
  ];
  console.log(`[RunningHub] Using FOTO ANTIGA workflow`);

} else if (category === 'comida') {
  // === COMIDA/OBJETO ===
  // Imagem + nível de detalhes (0.70-1.00)
  webappId = WEBAPP_ID_COMIDA;
  nodeInfoList = [
    { nodeId: "50", fieldName: "image", fieldValue: rhFileName },
    { nodeId: "48", fieldName: "value", fieldValue: String(detailDenoise || 0.85) }
  ];
  console.log(`[RunningHub] Using COMIDA/OBJETO workflow, detail: ${detailDenoise}`);

} else if (framingMode === 'longe') {
  // === DE LONGE ===
  webappId = WEBAPP_ID_LONGE;
  nodeInfoList = [
    { nodeId: "1", fieldName: "image", fieldValue: rhFileName },
    { nodeId: "7", fieldName: "value", fieldValue: String(resolution || 2048) }
  ];
  console.log(`[RunningHub] Using DE LONGE workflow`);

} else {
  // === PADRÃO (Pessoas Perto, Logo, 3D) ===
  webappId = version === 'pro' ? WEBAPP_ID_PRO : WEBAPP_ID_STANDARD;
  const resolutionNodeId = version === 'pro' ? "73" : "75";
  
  nodeInfoList = [
    { nodeId: "26", fieldName: "image", fieldValue: rhFileName },
    { nodeId: "25", fieldName: "value", fieldValue: detailDenoise || 0.15 },
    { nodeId: resolutionNodeId, fieldName: "value", fieldValue: String(resolution || 2048) }
  ];
  
  if (prompt) {
    nodeInfoList.push({ nodeId: "128", fieldName: "text", fieldValue: prompt });
  }
  console.log(`[RunningHub] Using STANDARD/PRO workflow`);
}
```

---

## Fluxo Visual das Categorias

```text
Usuário seleciona categoria
         │
         ├── "Pessoas" ──────────► Workflow PRO/Standard
         │     │                   (Framing, Detail, Resolution, Prompt)
         │     ├── De Perto ─────► WEBAPP_ID_PRO ou WEBAPP_ID_STANDARD
         │     └── De Longe ─────► WEBAPP_ID_LONGE
         │
         ├── "Foto Antiga" ──────► WEBAPP_ID_FOTO_ANTIGA
         │                         (Apenas imagem)
         │                         Esconde: Detail, Resolution, Prompt, Framing
         │
         ├── "Comida/Objeto" ────► WEBAPP_ID_COMIDA
         │                         (Imagem + Detail Level 70-100%)
         │                         Esconde: Resolution, Prompt, Framing
         │
         ├── "Logo" ─────────────► Workflow PRO/Standard
         │                         (Detail, Resolution, Prompt)
         │
         └── "3D" ───────────────► Workflow PRO/Standard
                                   (Detail, Resolution, Prompt)
```

---

## UI Comparativa

### Antes (Modo Comida):
```text
┌─────────────────────────────────┐
│ [Pessoas] [Comida] [Antiga] ... │  ← Labels atuais
├─────────────────────────────────┤
│ Detail Denoise: 0.15 [────●───] │  ← Slider PRO padrão
├─────────────────────────────────┤
│ Resolução: [2K] [4K]            │  ← Seletor de resolução
├─────────────────────────────────┤
│ Prompt Personalizado: [toggle]  │  ← Toggle PRO
└─────────────────────────────────┘
```

### Depois (Modo Comida/Objeto):
```text
┌────────────────────────────────────────────┐
│ [Pessoas] [Comida/Objeto] [Foto Antiga]... │  ← Novos labels
├────────────────────────────────────────────┤
│ Nível de Detalhes           0.85           │
│ Mais Fiel [──────────●────] Mais Criativo  │  ← Slider 70-100%
└────────────────────────────────────────────┘
  (Sem Resolution, sem Prompt, sem Framing)
```

### Depois (Modo Foto Antiga):
```text
┌────────────────────────────────────────────┐
│ [Pessoas] [Comida/Objeto] [Foto Antiga]... │
└────────────────────────────────────────────┘
  (Apenas a imagem - nenhum outro controle)
```

---

## Arquivos a Modificar

| Arquivo | Modificações |
|---------|--------------|
| `src/pages/UpscalerArcanoTool.tsx` | Labels, novo state, lógica de visibilidade, slider especial, parâmetros |
| `supabase/functions/runninghub-upscaler/index.ts` | WebApp IDs, receber category, nova lógica de seleção |

---

## Detalhes Técnicos

### Node Mappings Completos

| Categoria | WebApp ID | Nodes |
|-----------|-----------|-------|
| Foto Antiga | `2018913880214343681` | `139:image` |
| Comida/Objeto | `2015855359243587585` | `50:image`, `48:value` (0.70-1.00) |
| De Longe | `2017343414227963905` | `1:image`, `7:value` (resolution) |
| PRO (Pessoas/Logo/3D) | `2015865378030755841` | `26:image`, `25:value`, `73:value`, `128:text` |
| Standard (Pessoas/Logo/3D) | `2017030861371219969` | `26:image`, `25:value`, `75:value`, `128:text` |

### Validação do Slider de Comida

- **Mínimo**: 0.70 (Mais Fiel)
- **Máximo**: 1.00 (Mais Criativo)
- **Default**: 0.85
- **Step**: 0.01
