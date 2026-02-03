
# Correção do Upscaler Arcano - Endpoint /run

## Problema
A linha 451 do arquivo `src/pages/UpscalerArcanoTool.tsx` está chamando a edge function sem o endpoint `/run`:

```typescript
// ATUAL (linha 451) - QUEBRADO
const { data: response, error: fnError } = await supabase.functions.invoke('runninghub-upscaler', {
```

## Solução
Alterar para incluir o endpoint `/run`:

```typescript
// CORRIGIDO
const { data: response, error: fnError } = await supabase.functions.invoke('runninghub-upscaler/run', {
```

## Arquivo Afetado
- `src/pages/UpscalerArcanoTool.tsx` - linha 451

## Impacto
- **Upscaler Arcano**: Voltará a funcionar corretamente
- **Pose Changer**: Não será afetado (código completamente separado)

## Resultado Esperado
Após a correção, o fluxo do Upscaler funcionará:
1. Upload da imagem para storage ✓
2. Chamada da edge function com endpoint correto `/run` ✓
3. Processamento do upscale no RunningHub ✓
4. Retorno do resultado via webhook ✓
