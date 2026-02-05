
# Plano: Corrigir Layout Mobile da Página Ferramentas-IA-Aplicativo

## Problemas Identificados

### 1. PromoToolsBanner (Faixa Promocional)
O banner está com layout quebrado no mobile:
- Badge "OFERTA LIMITADA" e texto estão lado a lado causando corte
- Botão X mal posicionado
- Espaçamento apertado demais

### 2. Cards das Ferramentas
Os cards estão completamente quebrados no mobile:
- Aspect ratio muito baixo (`aspect-[16/9]`) faz os cards achatados
- Texto dos botões "Acessar Ferramenta" cortado
- Padding interno insuficiente
- Layout geral desalinhado

---

## Mudanças Planejadas

### Arquivo 1: `src/components/PromoToolsBanner.tsx`

**Problema**: Layout flex em linha única causa sobreposição no mobile

**Solução**: Reorganizar para layout em coluna no mobile

| Antes | Depois |
|-------|--------|
| `flex items-center justify-center gap-2` | `flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-4` |
| Badge e texto na mesma linha | Badge em cima, texto embaixo no mobile |
| Botão X posicionado absolutamente | Botão X fixo no canto superior direito |

```text
// Estrutura atualizada
<div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-3">
  {/* Badge - centralizado no mobile */}
  <div className="...">OFERTA LIMITADA</div>
  
  {/* Texto - quebra linha no mobile */}
  <p className="text-white text-[11px] sm:text-sm ...">
    comece agora mesmo a usar nossas ferramentas de IA com 30% de desconto
  </p>
</div>

{/* Botão X - posição absoluta fixa */}
<button className="absolute top-1/2 right-2 -translate-y-1/2 ...">
  <X />
</button>
```

### Arquivo 2: `src/pages/FerramentasIAAplicativo.tsx`

**Problema 1**: Aspect ratio dos cards muito baixo no mobile
```text
// Antes
aspect-[16/9] sm:aspect-[3/4]

// Depois - cards mais altos no mobile
aspect-[3/4] sm:aspect-[3/4]
```

**Problema 2**: Padding interno dos cards insuficiente
```text
// Antes
p-4

// Depois - padding maior no mobile
p-3 sm:p-4
```

**Problema 3**: Texto dos botões cortado

O botão "Acessar Ferramenta" está sendo cortado porque:
- O ícone Play + texto são muito largos para cards pequenos
- Precisa ajustar o texto ou usar abreviação no mobile

```text
// Antes
<Button>
  <Play /> Acessar Ferramenta
</Button>

// Depois - texto mais curto no mobile
<Button className="text-xs sm:text-sm">
  <Play className="h-3 w-3 sm:h-4 sm:w-4" />
  <span className="hidden sm:inline">Acessar Ferramenta</span>
  <span className="sm:hidden">Acessar</span>
</Button>
```

**Problema 4**: Grid gap insuficiente
```text
// Antes
gap-4

// Depois - gap menor no mobile para mais espaço
gap-3 sm:gap-4
```

---

## Resumo Visual das Mudanças

### Banner - Antes vs Depois

```text
ANTES (mobile):
┌──────────────────────────────────────────┐
│ [OFERTA LIMITADA] texto cortado aqui... X│
└──────────────────────────────────────────┘

DEPOIS (mobile):
┌──────────────────────────────────────────┐
│        [OFERTA LIMITADA]               X │
│  comece agora mesmo a usar nossas        │
│  ferramentas de IA com 30% de desconto   │
└──────────────────────────────────────────┘
```

### Cards - Antes vs Depois

```text
ANTES (mobile):
┌─────────────┬─────────────┐
│   Imagem    │   Imagem    │  ← Cards muito baixos
│  [Acessar Fe│ [Em Br      │  ← Texto cortado
└─────────────┴─────────────┘

DEPOIS (mobile):
┌─────────────┬─────────────┐
│             │             │
│   Imagem    │   Imagem    │  ← Cards mais altos
│             │             │
│   Título    │   Título    │
│  [Acessar]  │ [Em Breve]  │  ← Texto completo
└─────────────┴─────────────┘
```

---

## Arquivos a Modificar

| Arquivo | Mudanças |
|---------|----------|
| `src/components/PromoToolsBanner.tsx` | Layout flex-col no mobile, reposicionar botão X |
| `src/pages/FerramentasIAAplicativo.tsx` | Aspect ratio, padding, texto dos botões, gap do grid |

---

## Detalhes Técnicos

### PromoToolsBanner.tsx - Mudanças Específicas

1. Container interno: `flex flex-col sm:flex-row`
2. Padding vertical aumentado: `py-3 sm:py-2`
3. Badge centralizado no mobile
4. Texto com `text-[11px] sm:text-sm` e `text-center`
5. Botão X com posição absoluta fixa: `absolute top-1/2 right-2 -translate-y-1/2`

### FerramentasIAAplicativo.tsx - Mudanças Específicas

1. Card aspect ratio: `aspect-[4/5]` no mobile (mais alto)
2. Overlay padding: `p-3 sm:p-4`
3. Título: `text-sm sm:text-lg`
4. Descrição: `text-[10px] sm:text-sm`
5. Botão: texto abreviado no mobile + tamanhos menores
6. Grid: `gap-3 sm:gap-4`
