
## Objetivo
Bloquear uploads de imagens com dimensões acima de **2000 pixels** (largura OU altura) em **todas as ferramentas de IA**, exibindo uma mensagem clara pedindo para o usuário carregar uma foto menor ou redimensionar.

---

## Abordagem

### 1. Criar função de validação global no `useImageOptimizer.ts`

Adicionar uma nova função `validateImageDimensions` que:
- Recebe um `File`
- Carrega a imagem em um `Image()` temporário
- Verifica se `width > 2000` ou `height > 2000`
- Retorna `{ valid: boolean, width: number, height: number, error?: string }`

```typescript
// Nova constante
export const MAX_AI_DIMENSION = 2000;

// Nova função
export const validateImageDimensions = async (file: File): Promise<{
  valid: boolean;
  width: number;
  height: number;
  error?: string;
}> => {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      
      if (img.width > MAX_AI_DIMENSION || img.height > MAX_AI_DIMENSION) {
        resolve({
          valid: false,
          width: img.width,
          height: img.height,
          error: `Imagem muito grande (${img.width}x${img.height}). Máximo permitido: ${MAX_AI_DIMENSION}x${MAX_AI_DIMENSION} pixels.`,
        });
      } else {
        resolve({ valid: true, width: img.width, height: img.height });
      }
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ valid: false, width: 0, height: 0, error: 'Não foi possível carregar a imagem.' });
    };
    
    img.src = url;
  });
};
```

---

### 2. Integrar validação no `ImageUploadCard.tsx` (Pose Changer + Veste AI)

No `handleFileSelect`:
- Chamar `validateImageDimensions` ANTES de processar
- Se inválido, mostrar `toast.error` com a mensagem
- Bloquear o upload (return early)

---

### 3. Integrar validação no `UpscalerArcanoTool.tsx`

No `handleFileSelect`:
- Chamar `validateImageDimensions` ANTES do `optimizeForAI`
- Se inválido, mostrar erro e bloquear

---

## Arquivos a modificar

| Arquivo | Mudança |
|---------|---------|
| `src/hooks/useImageOptimizer.ts` | Adicionar `MAX_AI_DIMENSION` e `validateImageDimensions` |
| `src/components/pose-changer/ImageUploadCard.tsx` | Importar e chamar validação no `handleFileSelect` |
| `src/pages/UpscalerArcanoTool.tsx` | Importar e chamar validação no `handleFileSelect` |

---

## Mensagem de erro (exemplo)

> ❌ **Imagem muito grande (3500x2800 pixels)**
> 
> O limite máximo é 2000x2000 pixels. Por favor, redimensione a imagem antes de enviar.

---

## Resultado esperado

- **Upscaler Arcano**: Bloqueia imagens > 2000px
- **Pose Changer**: Bloqueia imagens > 2000px (pessoa e referência)
- **Veste AI**: Bloqueia imagens > 2000px (pessoa e roupa)
- **Todas usam a mesma função global** — fácil manutenção
