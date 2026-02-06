
# Correção: Erro de Upload + Imagem "Depois" Quebrada no Upscaler Arcano

## Problemas Identificados

### 1. Erro de Upload: "Unexpected token '<', '<html><h'..."
**Causa:** Após a compressão da imagem (que converte para `.webp`), o código ainda usa a extensão original do arquivo (`.png`, `.jpg`) para definir o `storagePath` e o `contentType`.

```typescript
// Linha 421-423 - BUG
const ext = (inputFileName || 'image.png').split('.').pop()?.toLowerCase() || 'png';
const storagePath = `upscaler/${user.id}/${tempId}.${ext}`;  // Usa extensão antiga
```

A função `optimizeForAI` sempre converte para WebP, então o arquivo resultante é WebP, mas estamos tentando fazer upload com extensão/content-type diferente. Isso pode causar problemas de proxy ou validação.

### 2. Imagem "Depois" Quebrada na Segunda Utilização
**Causa:** O `TransformWrapper` na linha 1162 não tem a prop `key={outputImage}`, então o componente de zoom não é remontado quando uma nova imagem é gerada. Isso faz com que mantenha referências ou estado da imagem anterior.

---

## Soluções

### Correção 1: Forçar extensão .webp no upload

**Arquivo:** `src/pages/UpscalerArcanoTool.tsx`

**Mudança nas linhas 421-431:**

```typescript
// ANTES (bugado):
const ext = (inputFileName || 'image.png').split('.').pop()?.toLowerCase() || 'png';
const storagePath = `upscaler/${user.id}/${tempId}.${ext}`;
// ...
contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`

// DEPOIS (corrigido):
// Como optimizeForAI sempre converte para webp, forçar a extensão
const storagePath = `upscaler/${user.id}/${tempId}.webp`;
// ...
contentType: 'image/webp'
```

### Correção 2: Adicionar key no TransformWrapper

**Arquivo:** `src/pages/UpscalerArcanoTool.tsx`

**Mudança na linha 1162:**

```typescript
// ANTES (bugado):
<TransformWrapper
  initialScale={1}

// DEPOIS (corrigido):
<TransformWrapper
  key={outputImage}
  initialScale={1}
```

---

## Arquivos a Modificar

| Arquivo | Mudança | Linha |
|---------|---------|-------|
| `src/pages/UpscalerArcanoTool.tsx` | Forçar `.webp` no storagePath e contentType | 421-432 |
| `src/pages/UpscalerArcanoTool.tsx` | Adicionar `key={outputImage}` no TransformWrapper | 1162 |

---

## Impacto

- Correção de 2 locais no mesmo arquivo
- Não afeta nenhuma outra funcionalidade
- Resolve ambos os bugs reportados
- Segue o mesmo padrão já usado no Pose Changer (que tem `key={outputImage}`)
