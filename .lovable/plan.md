
# Plano: Compactar Layout Mobile da Página Upscaler Selection

## Problemas Identificados

1. **Hero Section muito grande** - Ícone de 80px, título e descrição longa ocupam muito espaço
2. **Cards muito grandes** - Padding p-8, ícones 64px, descrições longas
3. **"Max 1280px" não é um feature** - Trocar por "Max 10 segundos"
4. **Texto inferior desnecessário no mobile** - A frase final ocupa espaço

---

## Mudanças Planejadas

### Arquivo: `src/pages/UpscalerSelectionPage.tsx`

### 1. Hero Section - Compactar no Mobile

| Elemento | Antes | Depois (Mobile) |
|----------|-------|-----------------|
| Ícone container | `w-20 h-20` | `w-12 h-12 sm:w-20 sm:h-20` |
| Ícone interno | `w-10 h-10` | `w-6 h-6 sm:w-10 sm:h-10` |
| Margin bottom | `mb-6` | `mb-3 sm:mb-6` |
| Título | `text-3xl` | `text-xl sm:text-3xl` |
| Margin título | `mb-4` | `mb-2 sm:mb-4` |
| Descrição | Texto longo | **Esconder no mobile** |
| Section margin | `mb-12` | `mb-6 sm:mb-12` |
| Padding top | `py-8` | `py-4 sm:py-8` |

### 2. Cards - Layout Compacto no Mobile

| Elemento | Antes | Depois (Mobile) |
|----------|-------|-----------------|
| Card padding | `p-8` | `p-4 sm:p-8` |
| Ícone container | `w-16 h-16` | `w-10 h-10 sm:w-16 sm:h-16` |
| Ícone interno | `w-8 h-8` | `w-5 h-5 sm:w-8 sm:h-8` |
| Margin ícone | `mb-6` | `mb-3 sm:mb-6` |
| Título | `text-2xl` | `text-lg sm:text-2xl` |
| Margin título | `mb-3` | `mb-1.5 sm:mb-3` |
| Descrição | Texto longo | **Texto curto no mobile** |
| Margin descrição | `mb-6` | `mb-3 sm:mb-6` |
| Tags | `text-sm` | `text-xs sm:text-sm` |
| Gap grid | `gap-6` | `gap-3 sm:gap-6` |

### 3. Descrições Resumidas (Mobile)

**Imagem - Antes:**
> "Aumente a resolução de suas imagens até 4x mantendo a qualidade e nitidez. Ideal para fotos, artes digitais e ilustrações."

**Imagem - Depois (Mobile):**
> "Aumente até 4x a resolução das suas imagens"

**Vídeo - Antes:**
> "Melhore a qualidade de vídeos curtos com IA. Perfeito para clips, reels e vídeos de até 10 segundos."

**Vídeo - Depois (Mobile):**
> "Melhore a qualidade de vídeos curtos"

### 4. Trocar Feature Tag do Vídeo

```text
// Antes
<Zap /> Max 1280px

// Depois
<Zap /> Max 10 segundos
```

### 5. Esconder Texto Inferior no Mobile

```text
// Antes
<p className="text-center text-purple-400/60 text-sm mt-12 max-w-md mx-auto">
  Ambos os upscalers utilizam...
</p>

// Depois
<p className="hidden sm:block text-center text-purple-400/60 text-sm mt-12 max-w-md mx-auto">
  ...
</p>
```

---

## Comparação Visual

### Antes (Mobile):
```text
┌────────────────────────┐
│                        │
│      (  ✨  )          │  ← Ícone grande
│                        │
│   Upscaler Arcano V3   │  ← Título grande
│                        │
│  Escolha o tipo de     │
│  mídia que deseja...   │  ← Descrição longa
│                        │
├────────────────────────┤
│                        │
│   [🖼️]                 │  ← Card Imagem
│   Upscaler de Imagem   │
│                        │
│   Aumente a resolução  │
│   de suas imagens...   │  ← Muito texto
│   (continua...)        │
│                        │
│   [Até 4x] [60-80 cr]  │
│                        │
│   Selecionar →         │
│                        │
├────────────────────────┤
│         ⬇️              │  ← PRECISA ROLAR!
│   [🎬] Card Vídeo      │
└────────────────────────┘
```

### Depois (Mobile):
```text
┌────────────────────────┐
│   (✨)  Upscaler V3    │  ← Compacto
│                        │
├────────────────────────┤
│ [🖼️] Upscaler Imagem   │
│ Aumente até 4x         │  ← Texto curto
│ [4x] [60-80 cr] →      │
├────────────────────────┤
│ [🎬] Upscaler Vídeo    │
│ Melhore vídeos curtos  │  ← Texto curto
│ [10s] [150 cr] →       │  ← Max 10 segundos
└────────────────────────┘
  ↑ TUDO VISÍVEL SEM ROLAR
```

---

## Código Principal das Mudanças

### Hero Compacto
```text
<div className="text-center mb-6 sm:mb-12">
  <div className="inline-flex ... w-12 h-12 sm:w-20 sm:h-20 ... mb-3 sm:mb-6">
    <Sparkles className="w-6 h-6 sm:w-10 sm:h-10" />
  </div>
  <h1 className="text-xl sm:text-3xl md:text-4xl ... mb-2 sm:mb-4">
    Upscaler Arcano V3
  </h1>
  {/* Descrição escondida no mobile */}
  <p className="hidden sm:block text-purple-300 ...">
    Escolha o tipo de mídia...
  </p>
</div>
```

### Descrições Responsivas
```text
{/* Imagem */}
<p className="...">
  <span className="hidden sm:inline">
    Aumente a resolução de suas imagens até 4x mantendo a qualidade e nitidez. 
    Ideal para fotos, artes digitais e ilustrações.
  </span>
  <span className="sm:hidden">
    Aumente até 4x a resolução das suas imagens
  </span>
</p>

{/* Vídeo */}
<p className="...">
  <span className="hidden sm:inline">
    Melhore a qualidade de vídeos curtos com IA. 
    Perfeito para clips, reels e vídeos de até 10 segundos.
  </span>
  <span className="sm:hidden">
    Melhore a qualidade de vídeos curtos
  </span>
</p>
```

### Feature Tag Corrigida
```text
{/* Antes */}
<Zap /> Max 1280px

{/* Depois */}
<Zap /> Max 10 segundos
```

---

## Resumo das Mudanças

| Área | Mudança |
|------|---------|
| Hero | Ícone menor, título menor, descrição escondida no mobile |
| Cards | Padding menor, ícones menores, descrições curtas |
| Feature Vídeo | "Max 1280px" → "Max 10 segundos" |
| Texto inferior | Escondido no mobile |
| Grid gap | Reduzido de 6 para 3 no mobile |

---

## Arquivo a Modificar

`src/pages/UpscalerSelectionPage.tsx`
