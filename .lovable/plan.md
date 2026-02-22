

## Correcao do Layout e Adicao do Refinar no Flyer Maker

### Problema 1: Imagem por cima dos botoes
A area de resultado usa `TransformComponent` com classes CSS simples (`wrapperClass` / `contentClass`), que nao restringem o tamanho corretamente. O Arcano Cloner usa `wrapperStyle` e `contentStyle` com `width/height: 100%` e flexbox, e os botoes de acao ficam posicionados com `absolute bottom-3` por cima da imagem, nao abaixo dela.

**Correcoes no output (linhas 550-598):**
- Trocar `wrapperClass`/`contentClass` do `TransformComponent` por `wrapperStyle`/`contentStyle` iguais ao Arcano Cloner
- Mover os botoes de acao (Nova, Baixar HD) para `absolute bottom-3` dentro da area de resultado, igual ao Arcano Cloner
- Adicionar botao "Refinar" entre Nova e Baixar HD
- Adicionar `RefinementTimeline` abaixo da area de resultado
- Adicionar estado de "refinando" no placeholder (spinner com icone Wand2)

### Problema 2: Funcao de Refinar ausente
O componente ja importa `RefinePanel`, `RefinementTimeline` e tem os states (`refineMode`, `refinePrompt`, etc.) mas falta:

1. A funcao `handleRefine` - copiar a logica do Arcano Cloner adaptada (usa `generate-image` edge function com `source: 'flyer_maker_refine'`)
2. As funcoes auxiliares `imageUrlToBase64` e `fileToBase64`
3. A funcao `handleSelectVersion` para a timeline
4. Renderizar o `RefinePanel` no painel de inputs quando `refineMode === true`
5. Renderizar o `RefinementTimeline` no card de resultado

**Arquivo:** `src/pages/FlyerMakerTool.tsx`

### Alteracoes detalhadas

#### A. Adicionar funcoes auxiliares (antes do return, ~linha 430)

```typescript
// Convert image URL to base64
const imageUrlToBase64 = async (url: string) => {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise<{ base64: string; mimeType: string }>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const [header, base64] = dataUrl.split(',');
      const mimeType = header.match(/:(.*?);/)?.[1] || 'image/png';
      resolve({ base64, mimeType });
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const fileToBase64 = async (file: File) => {
  return new Promise<{ base64: string; mimeType: string }>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const [header, base64] = dataUrl.split(',');
      const mimeType = header.match(/:(.*?);/)?.[1] || 'image/png';
      resolve({ base64, mimeType });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};
```

#### B. Adicionar handleRefine (apos as funcoes auxiliares)

```typescript
const handleRefine = async () => {
  if (!outputImage || !refinePrompt.trim() || !user?.id) return;
  const REFINE_COST = 30;
  const freshCredits = await checkBalance();
  if (freshCredits < REFINE_COST) {
    setNoCreditsReason('insufficient');
    setShowNoCreditsModal(true);
    return;
  }
  setIsRefining(true);
  try {
    const currentImage = await imageUrlToBase64(outputImage);
    const referenceImages = [currentImage];
    if (refineReferenceFile) {
      referenceImages.push(await fileToBase64(refineReferenceFile));
    }
    if (refinementHistory.length === 0) {
      setRefinementHistory([{ url: outputImage, label: 'Original' }]);
    }
    const { data, error } = await supabase.functions.invoke('generate-image', {
      body: {
        prompt: refinePrompt.trim(),
        model: 'pro',
        aspect_ratio: imageSize === '9:16' ? '9:16' : '3:4',
        reference_images: referenceImages,
        source: 'flyer_maker_refine',
      },
    });
    // ... error handling e atualizacao do historico (igual Arcano Cloner)
  } catch (err) { ... }
  finally { setIsRefining(false); }
};

const handleSelectVersion = (index: number) => {
  setSelectedHistoryIndex(index);
  if (refinementHistory[index]) setOutputImage(refinementHistory[index].url);
};
```

#### C. Renderizar RefinePanel no painel de inputs

Quando `refineMode === true`, mostrar o RefinePanel no lugar dos inputs (ou acima deles), igual ao Arcano Cloner.

#### D. Corrigir o output card

- TransformComponent com `wrapperStyle`/`contentStyle` em vez de classes
- Botoes de acao (Nova, Refinar, Baixar HD) posicionados `absolute bottom-3`
- RefinementTimeline adicionado abaixo da area de resultado
- Estado de "refinando" com spinner + icone Wand2

### Resumo

Apenas 1 arquivo alterado: `src/pages/FlyerMakerTool.tsx`
- ~40 linhas novas para funcoes auxiliares e handleRefine
- ~15 linhas alteradas no layout do output
- ~10 linhas para renderizar RefinePanel condicionalmente
