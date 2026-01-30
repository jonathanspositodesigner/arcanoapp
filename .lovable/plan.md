
# Plano: Switcher Upscaler Arcano / Upscaler Arcano Pro

## Visão Geral

Implementar um seletor no topo da ferramenta para alternar entre duas versões:
- **Upscaler Arcano** - versão básica (usará um WEBAPP_ID diferente)
- **Upscaler Arcano Pro** - versão atual com todas as configurações (badge com gradiente azul/roxo)

O switch alterna entre as versões na mesma página sem recarregar.

## Design Visual do Header

```text
┌──────────────────────────────────────────────────────────────────┐
│  ←   Upscaler Arcano  [ Arcano ]  [ Arcano Pro ✨ ]             │
│                           ↑             ↑                        │
│                        básico     badge gradiente azul→roxo      │
└──────────────────────────────────────────────────────────────────┘
```

O badge "PRO" terá:
- Gradiente moderno azul (#3b82f6) para roxo (#8b5cf6)
- Ícone de estrela/sparkles
- Bordas arredondadas e efeito brilhante

## Arquivos a Modificar

### 1. `src/pages/UpscalerArcanoTool.tsx`

**Adicionar state para versão:**
```typescript
const [version, setVersion] = useState<'standard' | 'pro'>('pro');
```

**Modificar header (linhas 506-521):**
```typescript
<div className="sticky top-0 z-50 bg-[#0D0221]/80 backdrop-blur-lg border-b border-purple-500/20">
  <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
    <Button variant="ghost" size="icon" onClick={goBack}>
      <ArrowLeft className="w-5 h-5" />
    </Button>
    
    <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
      Upscaler Arcano
    </h1>
    
    {/* Version Switcher */}
    <ToggleGroup type="single" value={version} onValueChange={(v) => v && setVersion(v)}>
      <ToggleGroupItem value="standard" className="...">
        Arcano
      </ToggleGroupItem>
      <ToggleGroupItem value="pro" className="...">
        Arcano 
        <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded bg-gradient-to-r from-blue-500 to-purple-600 text-white">
          PRO
        </span>
      </ToggleGroupItem>
    </ToggleGroup>
  </div>
</div>
```

**Enviar versão para edge function:**
```typescript
const runResponse = await supabase.functions.invoke('runninghub-upscaler/run', {
  body: {
    jobId: job.id,
    fileName,
    detailDenoise,
    resolution: resolution === '4k' ? 4096 : 2048,
    prompt: useCustomPrompt ? customPrompt : null,
    version: version,  // NOVO: 'standard' ou 'pro'
  },
});
```

**Mostrar/ocultar controles avançados baseado na versão:**
- Versão Pro: mostra todos os controles (resolução, denoise, prompt)
- Versão Standard: mostra apenas controles básicos ou nenhum

### 2. `supabase/functions/runninghub-upscaler/index.ts`

**Adicionar constante para WEBAPP_ID alternativo:**
```typescript
const WEBAPP_ID_PRO = '2015865378030755841';     // Atual
const WEBAPP_ID_STANDARD = 'ID_DA_VERSAO_BASICA'; // A definir
```

**Extrair parâmetro version:**
```typescript
const { 
  jobId,
  fileName, 
  detailDenoise,
  resolution,
  prompt,
  version  // NOVO
} = await req.json();
```

**Selecionar WEBAPP_ID baseado na versão:**
```typescript
const webappId = version === 'pro' ? WEBAPP_ID_PRO : WEBAPP_ID_STANDARD;

const response = await fetch(`https://www.runninghub.ai/openapi/v2/run/ai-app/${webappId}`, {
  // ...
});
```

## Comportamento

| Versão | Controles Visíveis | WEBAPP_ID |
|--------|-------------------|-----------|
| Arcano (básico) | Apenas upload/download | A definir |
| Arcano Pro | Resolução, Denoise, Prompt | 2015865378030755841 |

## Resultado

- Switch elegante no header
- Badge PRO com gradiente azul→roxo moderno
- Troca instantânea sem reload
- Cada versão usa seu próprio motor/webapp no RunningHub
- Controles ajustados conforme a versão selecionada

## Nota

Preciso saber qual será o **WEBAPP_ID da versão básica** do Upscaler Arcano. Se ainda não tem, posso deixar como placeholder e você me passa depois.
