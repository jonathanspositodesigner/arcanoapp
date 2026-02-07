

# Plano: Corrigir Alinhamento do Slider Antes/Depois no Upscaler

## Problema Identificado

Olhando as screenshots, o slider mostra as imagens ANTES e DEPOIS desalinhadas - elas deveriam estar perfeitamente sobrepostas para que ao arrastar o divisor, a comparação seja pixel-a-pixel.

### Causas Técnicas:

1. **ResilientImage usa `object-cover` internamente** (linha 258):
   ```typescript
   // ResilientImage.tsx linha 258
   className="w-full h-full object-cover"  // ERRADO para este caso
   ```

2. **O style prop não é passado para o img interno** - O `ResilientImage` recebe `style={{ objectFit: 'contain' }}` mas aplica no container, não na imagem

3. **Imagem ANTES usa img direto com `object-contain`** - enquanto DEPOIS usa ResilientImage com `object-cover` = desalinhamento

4. **TransformComponent envolve apenas a imagem DEPOIS** - criando diferença de posicionamento

---

## Solução

### Mudança 1: Corrigir ResilientImage para aceitar objectFit

Modificar o `ResilientImage` para passar o `objectFit` correto para a tag `<img>` interna:

```typescript
// ResilientImage.tsx
interface ResilientImageProps {
  // ... existing props
  objectFit?: 'contain' | 'cover' | 'fill' | 'none';  // NOVO
}

// Na tag img:
<img
  src={currentSrc}
  alt={alt}
  className={cn("w-full h-full", className)}
  style={{
    objectFit: objectFit || 'cover',  // Usar prop ou default
    opacity: isLoaded ? 1 : 0,
    ...style
  }}
/>
```

### Mudança 2: Corrigir estrutura no UpscalerArcanoTool

Garantir que AMBAS as imagens tenham exatamente a mesma estrutura e posicionamento:

```typescript
{/* AFTER image */}
<TransformComponent 
  wrapperStyle={{ width: '100%', height: '100%' }}
  contentStyle={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
>
  <ResilientImage 
    src={outputImage} 
    alt="Depois" 
    className="w-full h-full"
    objectFit="contain"  // NOVO PROP
    // ...
  />
</TransformComponent>

{/* BEFORE image - precisa estar na MESMA posição */}
<div 
  className="absolute inset-0 pointer-events-none overflow-hidden"
  style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
>
  <TransformComponent  // Usar MESMO wrapper
    wrapperStyle={{ width: '100%', height: '100%' }}
    contentStyle={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
  >
    <img 
      src={inputImage} 
      alt="Antes" 
      className="w-full h-full"
      style={{ objectFit: 'contain' }}
      draggable={false}
    />
  </TransformComponent>
</div>
```

### Mudança 3: Sincronizar transforms

O `beforeTransformRef` sincroniza o zoom, mas precisa estar dentro do mesmo sistema de coordenadas. Vou ajustar para que ambas as imagens usem o mesmo container base.

---

## Arquivos Modificados

| Arquivo | Mudança |
|---------|---------|
| `src/components/upscaler/ResilientImage.tsx` | Adicionar prop `objectFit` e aplicar na img |
| `src/pages/UpscalerArcanoTool.tsx` | Corrigir estrutura para ambas imagens ficarem perfeitamente sobrepostas |

---

## Detalhes Técnicos

### Estrutura Correta do Slider

```text
┌──────────────────────────────────────────────────────────────┐
│  Container (relative, w-full, h-full)                        │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  TransformComponent (position: absolute, inset: 0)     │  │
│  │  ┌──────────────────────────────────────────────────┐  │  │
│  │  │  IMG DEPOIS (object-contain, centered)           │  │  │
│  │  │                                                  │  │  │
│  │  │                    [IMAGEM]                      │  │  │
│  │  │                                                  │  │  │
│  │  └──────────────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Overlay Clipped (position: absolute, inset: 0)        │  │
│  │  clipPath: inset(0 50% 0 0)                            │  │
│  │  ┌──────────────────────────────────────────────────┐  │  │
│  │  │  IMG ANTES (object-contain, centered)            │  │  │
│  │  │  MESMA posição que DEPOIS                        │  │  │
│  │  │                    [IMAGEM]                      │  │  │
│  │  │                                                  │  │  │
│  │  └──────────────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌──┐  Slider Line (z-20)                                    │
│  │  │                                                        │
│  │  │                                                        │
│  │  │                                                        │
│  └──┘                                                        │
└──────────────────────────────────────────────────────────────┘
```

### Pontos Críticos:
1. Ambas as imagens DEVEM usar `object-fit: contain`
2. Ambas DEVEM estar no mesmo container com mesmas dimensões
3. A imagem ANTES usa `clipPath` para mostrar apenas a porção à esquerda
4. O zoom/pan deve ser sincronizado entre ambas

---

## Resultado Esperado

Ao arrastar o slider:
- A linha divisória move horizontalmente
- À esquerda: imagem ANTES (baixa resolução)
- À direita: imagem DEPOIS (alta resolução/upscaled)
- Ambas perfeitamente alinhadas pixel-a-pixel
- Funciona em mobile e desktop

