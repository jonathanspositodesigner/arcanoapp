
# Plano: Adicionar Seletor de Resolução 2K/4K

## O que será feito

Adicionar dois botões de seleção para resolução de saída:
- **2K (2048px)** - Padrão, já selecionado ao abrir
- **4K (4096px)** - Para alta resolução

O valor será enviado para a API via `nodeId: "73"` conforme especificado.

## Mudanças na Interface

Na seção de controles (após o slider de Detail Denoise), adicionar um novo card com dois botões lado a lado usando ToggleGroup:

```
┌──────────────────────────────────────────────────┐
│ 📐 Resolução                                     │
│                                                  │
│    [ 2K (2048) ]  [ 4K (4096) ]                  │
│    ^^^^selecionado por padrão                    │
└──────────────────────────────────────────────────┘
```

## Arquivos a Modificar

### 1. `src/pages/UpscalerArcanoTool.tsx`

**Adicionar state para resolução:**
```typescript
const [resolution, setResolution] = useState<'2k' | '4k'>('2k');
```

**Adicionar UI do seletor** (linha ~800, após o card de Detail Denoise):
```typescript
<Card className="bg-[#1A0A2E]/50 border-purple-500/20 p-4">
  <div className="flex items-center gap-2 mb-3">
    <span className="font-medium text-white">Resolução</span>
  </div>
  <ToggleGroup 
    type="single" 
    value={resolution} 
    onValueChange={(val) => val && setResolution(val as '2k' | '4k')}
    className="justify-start"
  >
    <ToggleGroupItem value="2k" className="...">
      2K (2048px)
    </ToggleGroupItem>
    <ToggleGroupItem value="4k" className="...">
      4K (4096px)
    </ToggleGroupItem>
  </ToggleGroup>
</Card>
```

**Adicionar resolução na chamada da edge function:**
```typescript
const runResponse = await supabase.functions.invoke('runninghub-upscaler/run', {
  body: {
    jobId: job.id,
    fileName,
    detailDenoise,
    resolution: resolution === '4k' ? 4096 : 2048, // NOVO
    prompt: useCustomPrompt ? customPrompt : null,
  },
});
```

### 2. `supabase/functions/runninghub-upscaler/index.ts`

**Extrair o parâmetro resolution:**
```typescript
const { 
  jobId,
  fileName, 
  detailDenoise,
  resolution,  // NOVO
  prompt
} = await req.json();
```

**Adicionar ao nodeInfoList:**
```typescript
const nodeInfoList: any[] = [
  { nodeId: "26", fieldName: "image", fieldValue: fileName },
  { nodeId: "25", fieldName: "value", fieldValue: detailDenoise || 0.15 },
  { nodeId: "73", fieldName: "value", fieldValue: String(resolution || 2048) }, // NOVO
];
```

## Resumo

| Mudança | Arquivo |
|---------|---------|
| State `resolution` (2k padrão) | UpscalerArcanoTool.tsx |
| UI com ToggleGroup 2K/4K | UpscalerArcanoTool.tsx |
| Enviar resolution no body | UpscalerArcanoTool.tsx |
| Extrair resolution | runninghub-upscaler |
| Adicionar node 73 | runninghub-upscaler |

## Resultado

- Usuário vê dois botões: 2K e 4K
- 2K já vem marcado por padrão
- Ao processar, envia o valor correto para nodeId "73"
