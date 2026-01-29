

# Plano: Remover Seleção de Resolução 2K/4K do Upscaler

## Objetivo

Remover as opções de seleção de resolução (2K e 4K) do upscaler, já que a documentação da API não possui esses inputs.

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/pages/UpscalerArcanoTool.tsx` | Remover estado, tipo e UI de resolução |
| `supabase/functions/runninghub-upscaler/index.ts` | Remover parâmetros de resolução |
| `src/locales/pt/tools.json` | Remover string de tradução (se existir) |

## Detalhes Técnicos

### 1. UpscalerArcanoTool.tsx

**Remover:**

1. Linha 16: `type Resolution = 2048 | 4096;`
2. Linha 34: `const [resolution, setResolution] = useState<Resolution>(4096);`
3. Linhas 774-800: Card inteiro de seleção de resolução (2K/4K)
4. Remover `resolution` das chamadas para:
   - Inserção no banco (linha 294)
   - Chamada ao edge function (linha 347)

**Antes:**
```typescript
type Resolution = 2048 | 4096;
const [resolution, setResolution] = useState<Resolution>(4096);
```

**Depois:**
```typescript
// Removido completamente
```

**UI a remover (linhas 774-800):**
```tsx
{/* Resolution */}
<Card className="bg-[#1A0A2E]/50 border-purple-500/20 p-4">
  <div className="flex items-center gap-2 mb-3">
    <ZoomIn className="w-4 h-4 text-purple-400" />
    <span className="font-medium">{t('upscalerTool.controls.finalResolution')}</span>
  </div>
  <div className="flex gap-2">
    <Button ... onClick={() => setResolution(2048)}>2K (2048px)</Button>
    <Button ... onClick={() => setResolution(4096)}>4K (4096px)</Button>
  </div>
</Card>
```

### 2. Edge Function (runninghub-upscaler/index.ts)

**Remover:**

1. Linha 156: `resolution` do destructuring
2. Linhas 239-240: `max_width` e `max_height` do `nodeInfoList`

**Antes:**
```typescript
const { jobId, fileName, resolution, detailDenoise, prompt } = await req.json();

const nodeInfoList: any[] = [
  { nodeId: "1", fieldName: "image", fieldValue: fileName },
  { nodeId: "136:1", fieldName: "max_width", fieldValue: resolution || 4096 },
  { nodeId: "136:1", fieldName: "max_height", fieldValue: resolution || 4096 },
  { nodeId: "165", fieldName: "value", fieldValue: detailDenoise || 0.15 },
];
```

**Depois:**
```typescript
const { jobId, fileName, detailDenoise, prompt } = await req.json();

const nodeInfoList: any[] = [
  { nodeId: "1", fieldName: "image", fieldValue: fileName },
  { nodeId: "165", fieldName: "value", fieldValue: detailDenoise || 0.15 },
];
```

### 3. Banco de Dados

A coluna `resolution` na tabela `upscaler_jobs` pode ser mantida por enquanto (não causa problemas), ou podemos criar uma migration para removê-la depois se desejar.

## Impacto

- UI mais simples e alinhada com a documentação da API
- Menos parâmetros para gerenciar
- A resolução final será determinada automaticamente pelo workflow do RunningHub

