
# Plano: Otimização de Imagem do Slider para Preview Mobile

## Contexto do Problema

No **mobile**, as imagens do slider (antes/depois) estão sendo exibidas em tamanho original (que pode ser 4K+), causando lentidão no carregamento e travamentos em dispositivos com pouca memória.

## Solução

Criar versões otimizadas das imagens (máximo 1500px) apenas para o **preview do slider no mobile**. As imagens originais continuam disponíveis para download e visualização em fullscreen.

---

## Arquitetura

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                    FLUXO MOBILE DO SLIDER                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Job Completo (status = 'completed')                                       │
│       ↓                                                                     │
│  [Desktop] → Exibe imagens originais diretamente                           │
│       ↓                                                                     │
│  [Mobile] → isOptimizingForSlider = true (mostra loading)                  │
│       ↓                                                                     │
│  Comprime inputImage e outputImage para 1500px (paralelo)                  │
│       ↓                                                                     │
│  Armazena em optimizedInputImage e optimizedOutputImage                    │
│       ↓                                                                     │
│  isOptimizingForSlider = false → Exibe slider com imagens otimizadas      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Mudanças Técnicas

### 1. Novos Estados no UpscalerArcanoTool.tsx

```tsx
// Estados para imagens otimizadas do slider (apenas mobile)
const [optimizedInputImage, setOptimizedInputImage] = useState<string | null>(null);
const [optimizedOutputImage, setOptimizedOutputImage] = useState<string | null>(null);
const [isOptimizingForSlider, setIsOptimizingForSlider] = useState(false);
```

### 2. Detectar Mobile

Adicionar import do hook `useIsMobile`:

```tsx
import { useIsMobile } from '@/hooks/use-mobile';

// No componente:
const isMobile = useIsMobile();
```

### 3. Função de Otimização para Slider

Criar função que comprime imagens para 1500px usando `compressToMaxDimension`:

```tsx
const SLIDER_PREVIEW_MAX_PX = 1500;

const optimizeImagesForSlider = useCallback(async (
  inputUrl: string,
  outputUrl: string
) => {
  setIsOptimizingForSlider(true);
  
  try {
    // Fetch ambas as imagens em paralelo
    const [inputResponse, outputResponse] = await Promise.all([
      fetch(inputUrl),
      fetch(outputUrl)
    ]);
    
    const [inputBlob, outputBlob] = await Promise.all([
      inputResponse.blob(),
      outputResponse.blob()
    ]);
    
    // Criar Files a partir dos blobs
    const inputFile = new File([inputBlob], 'input.webp', { type: inputBlob.type });
    const outputFile = new File([outputBlob], 'output.webp', { type: outputBlob.type });
    
    // Comprimir para 1500px em paralelo
    const [optimizedInput, optimizedOutput] = await Promise.all([
      compressToMaxDimension(inputFile, SLIDER_PREVIEW_MAX_PX),
      compressToMaxDimension(outputFile, SLIDER_PREVIEW_MAX_PX)
    ]);
    
    // Criar URLs para as imagens otimizadas
    setOptimizedInputImage(URL.createObjectURL(optimizedInput.file));
    setOptimizedOutputImage(URL.createObjectURL(optimizedOutput.file));
    
    console.log('[Upscaler] Slider images optimized for mobile preview');
  } catch (error) {
    console.error('[Upscaler] Failed to optimize slider images:', error);
    // Fallback: usar imagens originais
    setOptimizedInputImage(inputUrl);
    setOptimizedOutputImage(outputUrl);
  } finally {
    setIsOptimizingForSlider(false);
  }
}, []);
```

### 4. Trigger de Otimização Quando Job Completa

No callback `onStatusChange` do `useJobStatusSync`, após detectar `completed`:

```tsx
if (update.status === 'completed' && update.outputUrl) {
  // ... código existente ...
  
  // Otimizar imagens para slider no mobile
  if (isMobile && inputImage) {
    optimizeImagesForSlider(inputImage, update.outputUrl);
  }
}
```

### 5. Lógica de Exibição do Slider

Modificar a condição de exibição para:

```tsx
{/* No mobile: espera otimização concluir antes de mostrar slider */}
{status === 'completed' && outputImage && (!isMobile || !isOptimizingForSlider) ? (
  // Slider component...
  // Usar optimizedInputImage/optimizedOutputImage no mobile
  // Usar inputImage/outputImage no desktop
) : null}

{/* Loading de otimização no mobile */}
{status === 'completed' && isMobile && isOptimizingForSlider && (
  <div className="flex flex-col items-center gap-3">
    <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
    <p className="text-sm text-purple-300">Preparando visualização...</p>
  </div>
)}
```

### 6. Uso das Imagens Corretas no Slider

```tsx
{/* AFTER image */}
<ResilientImage 
  src={isMobile ? (optimizedOutputImage || outputImage) : outputImage} 
  alt="Depois"
  // ... props existentes
/>

{/* BEFORE image */}
<img 
  src={isMobile ? (optimizedInputImage || inputImage || '') : (inputImage || '')}
  alt="Antes"
  // ... props existentes
/>
```

### 7. Cleanup de Object URLs

No unmount ou reset do componente, liberar as URLs criadas:

```tsx
useEffect(() => {
  return () => {
    // Cleanup object URLs para evitar memory leaks
    if (optimizedInputImage?.startsWith('blob:')) {
      URL.revokeObjectURL(optimizedInputImage);
    }
    if (optimizedOutputImage?.startsWith('blob:')) {
      URL.revokeObjectURL(optimizedOutputImage);
    }
  };
}, [optimizedInputImage, optimizedOutputImage]);
```

### 8. Reset ao Iniciar Novo Job

Na função `handleUpscale`, limpar estados anteriores:

```tsx
const handleUpscale = async () => {
  // ... validações ...
  
  // Limpar imagens otimizadas anteriores
  if (optimizedInputImage?.startsWith('blob:')) {
    URL.revokeObjectURL(optimizedInputImage);
  }
  if (optimizedOutputImage?.startsWith('blob:')) {
    URL.revokeObjectURL(optimizedOutputImage);
  }
  setOptimizedInputImage(null);
  setOptimizedOutputImage(null);
  
  // ... resto do código ...
};
```

---

## Arquivo Modificado

| Arquivo | Ação |
|---------|------|
| `src/pages/UpscalerArcanoTool.tsx` | Adicionar estados, função de otimização, lógica condicional de exibição |

---

## Comportamento Final

| Dispositivo | Imagens no Slider | Download |
|-------------|-------------------|----------|
| **Desktop** | Originais (full-res) | Originais |
| **Mobile** | Otimizadas (1500px max) | Originais |

---

## Garantias

| Item | Status |
|------|--------|
| Desktop não afetado | ✅ Continua usando imagens originais |
| Download não afetado | ✅ Sempre baixa imagem original |
| Performance mobile | ✅ Slider carrega mais rápido |
| Edge Functions | ❌ Nenhuma alteração |
| Banco de dados | ❌ Nenhuma alteração |
| Créditos | ❌ Nenhuma alteração |
