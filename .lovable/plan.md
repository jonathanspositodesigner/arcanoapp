
# Plano: Workflows Dedicados para Logo e Arte + Selos 3D

## Resumo

Implementar dois workflows especializados que eliminam o uso de prompts e funcionam como Foto Antiga e Comida/Objeto:

| Categoria | WebApp ID | Node Imagem | Node Detalhe | Padrão | Recomendado |
|-----------|-----------|-------------|--------------|--------|-------------|
| **Logo e Arte** | `2019239272464785409` | 39 | 33 | 0.40 | 0.30 a 0.60 |
| **Selos 3D** | `2019234965992509442` | 301 | 300 | 0.80 | 0.70 a 0.90 |

**Comportamento**: Slider de Nível de Detalhe só aparece na versão PRO.

---

## Mudanças Técnicas

### Arquivo 1: Backend - `supabase/functions/runninghub-upscaler/index.ts`

#### 1.1 Adicionar constantes de WebApp IDs

```text
const WEBAPP_ID_LOGO = '2019239272464785409';
const WEBAPP_ID_RENDER3D = '2019234965992509442';
```

#### 1.2 Adicionar detecção dos novos modos

```text
const isLogoMode = category === 'logo';
const isRender3dMode = category === 'render3d';
```

#### 1.3 Atualizar seleção de WebApp ID

```text
let webappId: string;
if (isFotoAntigaMode) {
  webappId = WEBAPP_ID_FOTO_ANTIGA;
} else if (isComidaMode) {
  webappId = WEBAPP_ID_COMIDA;
} else if (isLogoMode) {
  webappId = WEBAPP_ID_LOGO;
} else if (isRender3dMode) {
  webappId = WEBAPP_ID_RENDER3D;
} else if (isLongeMode) {
  webappId = WEBAPP_ID_LONGE;
} else {
  webappId = version === 'pro' ? WEBAPP_ID_PRO : WEBAPP_ID_STANDARD;
}
```

#### 1.4 Adicionar construção de nodeInfoList para Logo e Arte

```text
} else if (isLogoMode) {
  // === LOGO E ARTE ===
  // Node 39: image, Node 33: value (detail level)
  nodeInfoList = [
    { nodeId: "39", fieldName: "image", fieldValue: rhFileName },
  ];
  
  // Detail level only for PRO version
  if (version === 'pro' && detailDenoise !== undefined) {
    nodeInfoList.push({ 
      nodeId: "33", 
      fieldName: "value", 
      fieldValue: String(detailDenoise) 
    });
  }
  
  console.log(`[RunningHub] Using LOGO workflow - version: ${version}, detail: ${detailDenoise}`);
}
```

#### 1.5 Adicionar construção de nodeInfoList para Selos 3D

```text
} else if (isRender3dMode) {
  // === SELOS 3D ===
  // Node 301: image, Node 300: value (detail level)
  nodeInfoList = [
    { nodeId: "301", fieldName: "image", fieldValue: rhFileName },
  ];
  
  // Detail level only for PRO version
  if (version === 'pro' && detailDenoise !== undefined) {
    nodeInfoList.push({ 
      nodeId: "300", 
      fieldName: "value", 
      fieldValue: String(detailDenoise) 
    });
  }
  
  console.log(`[RunningHub] Using RENDER3D workflow - version: ${version}, detail: ${detailDenoise}`);
}
```

---

### Arquivo 2: Frontend - `src/pages/UpscalerArcanoTool.tsx`

#### 2.1 Adicionar estados para níveis de detalhe

```text
const [logoDetailLevel, setLogoDetailLevel] = useState(0.40);
const [render3dDetailLevel, setRender3dDetailLevel] = useState(0.80);
```

#### 2.2 Atualizar flags de workflows especiais

```text
const isSpecialWorkflow = promptCategory === 'fotoAntiga' || promptCategory === 'comida' || promptCategory === 'logo' || promptCategory === 'render3d';
const isFotoAntigaMode = promptCategory === 'fotoAntiga';
const isComidaMode = promptCategory === 'comida';
const isLogoMode = promptCategory === 'logo';
const isRender3dMode = promptCategory === 'render3d';
```

#### 2.3 Atualizar chamada à edge function

```text
detailDenoise: isComidaMode 
  ? comidaDetailLevel 
  : isLogoMode 
    ? (version === 'pro' ? logoDetailLevel : undefined)
    : isRender3dMode
      ? (version === 'pro' ? render3dDetailLevel : undefined)
      : (isSpecialWorkflow ? undefined : detailDenoise),
```

#### 2.4 Adicionar slider de Logo e Arte (PRO only)

```text
{/* Logo/Arte Detail Level Slider - PRO only */}
{isLogoMode && version === 'pro' && (
  <Card className="bg-[#1A0A2E]/50 border-purple-500/20 p-3">
    <div className="flex items-center justify-between mb-1">
      <div className="flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5 text-purple-400" />
        <span className="text-xs font-medium text-white">Nível de Detalhe</span>
      </div>
      <span className="text-xs text-purple-300 font-mono">{logoDetailLevel.toFixed(2)}</span>
    </div>
    <Slider
      value={[logoDetailLevel]}
      onValueChange={([value]) => setLogoDetailLevel(value)}
      min={0.01}
      max={1.00}
      step={0.01}
      className="w-full"
    />
    <div className="flex justify-between text-[10px] text-purple-300/50 mt-1">
      <span>Mais Fidelidade</span>
      <span>Mais Criatividade</span>
    </div>
    <p className="text-[9px] text-purple-300/40 mt-1 text-center">
      Recomendado: 0,30 a 0,60
    </p>
  </Card>
)}
```

#### 2.5 Adicionar slider de Selos 3D (PRO only)

```text
{/* Selos 3D Detail Level Slider - PRO only */}
{isRender3dMode && version === 'pro' && (
  <Card className="bg-[#1A0A2E]/50 border-purple-500/20 p-3">
    <div className="flex items-center justify-between mb-1">
      <div className="flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5 text-purple-400" />
        <span className="text-xs font-medium text-white">Nível de Detalhe</span>
      </div>
      <span className="text-xs text-purple-300 font-mono">{render3dDetailLevel.toFixed(2)}</span>
    </div>
    <Slider
      value={[render3dDetailLevel]}
      onValueChange={([value]) => setRender3dDetailLevel(value)}
      min={0.01}
      max={1.00}
      step={0.01}
      className="w-full"
    />
    <div className="flex justify-between text-[10px] text-purple-300/50 mt-1">
      <span>Mais Fidelidade</span>
      <span>Mais Criatividade</span>
    </div>
    <p className="text-[9px] text-purple-300/40 mt-1 text-center">
      Recomendado: 0,70 a 0,90
    </p>
  </Card>
)}
```

---

## Fluxo de Dados

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                            LOGO E ARTE                                  │
├─────────────────────────────────────────────────────────────────────────┤
│  Standard: Apenas imagem                                                │
│  PRO: Imagem + Slider (0.01-1.00, padrão 0.40)                         │
│                                                                         │
│  → WebApp ID: 2019239272464785409                                       │
│  → Node 39: image                                                       │
│  → Node 33: value (PRO only)                                            │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                            SELOS 3D                                     │
├─────────────────────────────────────────────────────────────────────────┤
│  Standard: Apenas imagem                                                │
│  PRO: Imagem + Slider (0.01-1.00, padrão 0.80)                         │
│                                                                         │
│  → WebApp ID: 2019234965992509442                                       │
│  → Node 301: image                                                      │
│  → Node 300: value (PRO only)                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Interface Visual

### Versão Standard (ambas categorias)
```text
┌─────────────────────────────────┐
│ [Tipo de Imagem: Logo e Arte]  │
│                                 │
│ ┌─────────────────────────────┐ │
│ │      Upload de Imagem       │ │
│ │         (apenas)            │ │
│ └─────────────────────────────┘ │
│                                 │
│ [Processar Imagem]              │
└─────────────────────────────────┘
```

### Versão PRO (ambas categorias)
```text
┌─────────────────────────────────┐
│ [Tipo de Imagem: Selos 3D]     │
│                                 │
│ ┌─────────────────────────────┐ │
│ │      Upload de Imagem       │ │
│ └─────────────────────────────┘ │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ Nível de Detalhe      0.80  │ │
│ │ ────────────●───────────    │ │
│ │ Mais Fidelidade  Mais Criat.│ │
│ │    Recomendado: 0,70 a 0,90 │ │
│ └─────────────────────────────┘ │
│                                 │
│ [Processar Imagem]              │
└─────────────────────────────────┘
```

---

## Resumo das Mudanças

| Arquivo | Tipo | Mudança |
|---------|------|---------|
| `runninghub-upscaler/index.ts` | Backend | + `WEBAPP_ID_LOGO` e `WEBAPP_ID_RENDER3D` |
| `runninghub-upscaler/index.ts` | Backend | + Detecção `isLogoMode` e `isRender3dMode` |
| `runninghub-upscaler/index.ts` | Backend | + nodeInfoList para Logo (Nodes 39, 33) |
| `runninghub-upscaler/index.ts` | Backend | + nodeInfoList para Selos 3D (Nodes 301, 300) |
| `UpscalerArcanoTool.tsx` | Frontend | + Estados `logoDetailLevel` e `render3dDetailLevel` |
| `UpscalerArcanoTool.tsx` | Frontend | + Flags `isLogoMode` e `isRender3dMode` |
| `UpscalerArcanoTool.tsx` | Frontend | + Sliders de detalhe para ambas categorias (PRO) |
| `UpscalerArcanoTool.tsx` | Frontend | Atualizar lógica de `detailDenoise` na requisição |

---

## Categorias Finais com Workflows Dedicados

| Categoria | Workflow Dedicado | Controles Visíveis |
|-----------|-------------------|-------------------|
| Pessoas | ❌ (usa Standard/PRO) | Resolução, Prompt, Enquadramento, Detalhe |
| Paisagem/Ambiente | ❌ (usa Standard/PRO) | Resolução, Prompt, Enquadramento, Detalhe |
| Foto Antiga | ✅ WebApp Próprio | Apenas Imagem |
| Comida/Objeto | ✅ WebApp Próprio | Imagem + Slider PRO |
| Logo e Arte | ✅ WebApp Próprio | Imagem + Slider PRO |
| Selos 3D | ✅ WebApp Próprio | Imagem + Slider PRO |
