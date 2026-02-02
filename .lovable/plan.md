
# Plano: Remoção do UpscalerArcanoV3 + Otimização do Upload

## Parte 1: Remoção Completa do UpscalerArcanoV3

### Arquivos a Deletar
| Arquivo | Ação |
|---------|------|
| `src/pages/UpscalerArcanoV3.tsx` | DELETAR (736 linhas) |

### Arquivos a Modificar

**`src/App.tsx`** - Remover referências:
- Linha 120: Remover import `const UpscalerArcanoV3 = lazy(...)`
- Linha 281: Remover rota `<Route path="/upscaler-arcano-v3" element={<UpscalerArcanoV3 />} />`

### Limpeza Adicional
- Remover `upscaler_v3_session_id` do localStorage (se existir)
- A pasta `upscaler-v3/` no bucket `artes-cloudinary` pode ser limpa manualmente depois

---

## Parte 2: Análise do Upload no UpscalerArcanoTool

### Fluxo Atual (Já Otimizado)

```
Usuário → Compressão WebP (client) → Upload direto Storage → URL → Edge Function → RunningHub
```

**O que já está bom:**
1. Compressão agressiva antes do upload (max 2MB, WebP)
2. Upload direto para Supabase Storage (não passa Base64 para Edge Function)
3. Edge Function recebe apenas `imageUrl` e faz download + re-upload para RunningHub

### Problema Identificado: Double Download

**Fluxo atual na Edge Function (linha 183-224):**
```
Storage (public URL) → Edge Function baixa → Re-upload para RunningHub
```

Isso consome bandwidth DUAS VEZES:
- Egress do Storage → Edge Function
- Ingress/Egress da Edge Function → RunningHub

### Melhoria Possível: Verificar se RunningHub aceita URL direta

Infelizmente, após análise da API do RunningHub, o endpoint `/openapi/v2/run/ai-app/{webappId}` aceita APENAS `fileName` (referência interna do RunningHub), não URLs externas.

**Conclusão:** O fluxo atual é o mais otimizado possível dado a limitação da API do RunningHub.

### Melhorias Menores Identificadas

#### 1. Endpoint `/upload` Obsoleto
O endpoint `handleUpload` (linhas 67-139) ainda existe mas não é mais usado pelo frontend. Pode ser marcado como deprecated ou removido.

#### 2. Logging Excessivo Pode Ser Reduzido
Múltiplos `console.log` com dados JSON grandes aumentam ligeiramente o compute time.

---

## Resumo das Ações

| Prioridade | Ação | Impacto |
|------------|------|---------|
| CRÍTICA | Deletar `UpscalerArcanoV3.tsx` | Reduz código morto |
| CRÍTICA | Remover import e rota do `App.tsx` | Evita erros |
| BAIXA | Deprecar endpoint `/upload` na Edge Function | Limpeza de código |

---

## Seção Técnica

### Arquivos Modificados
1. `src/pages/UpscalerArcanoV3.tsx` - DELETAR
2. `src/App.tsx` - Remover import (linha 120) e rota (linha 281)
3. `supabase/functions/runninghub-upscaler/index.ts` (opcional) - Deprecar endpoint `/upload`

### Código a Remover do App.tsx

**Import (linha 120):**
```typescript
// REMOVER:
const UpscalerArcanoV3 = lazy(() => import("./pages/UpscalerArcanoV3"));
```

**Rota (linha 281):**
```typescript
// REMOVER:
<Route path="/upscaler-arcano-v3" element={<UpscalerArcanoV3 />} />
```

### Análise do Upload Atual (UpscalerArcanoTool)

**handleFileSelect (linhas 312-356):**
- Compressão agressiva com `browser-image-compression`
- Max 2MB, WebP, 4096px max dimension
- OK - não precisa de mudanças

**processImage (linhas 385-527):**
- Upload direto para Storage (não Base64 para Edge)
- Envia `imageUrl` para Edge Function
- OK - fluxo otimizado

**Edge Function (runninghub-upscaler):**
- Recebe `imageUrl`, baixa, re-envia para RunningHub
- Necessário devido à API do RunningHub (não aceita URLs externas)
- O endpoint `/upload` não é mais usado e pode ser removido
