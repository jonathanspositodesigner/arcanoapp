

# Plano: Substituir Badges de Desconto por Custo por Imagem

## Resumo

Trocar os badges de percentual de desconto (-40%, -54%) por badges mostrando o custo por imagem em reais, com ícone de desconto.

## Mudanças Específicas

### 1. Atualizar Estrutura de Dados

```tsx
const creditPlans = [
  { 
    credits: 1500, 
    description: "~25 imagens", 
    price: "29,90",
    pricePerImage: "1,20", // R$ 29,90 / 25 = R$ 1,20
    // ...
  },
  { 
    credits: 4200, 
    description: "~70 imagens", 
    price: "39,90",
    originalPrice: "49,90",
    pricePerImage: "0,57", // R$ 39,90 / 70 = R$ 0,57
    // ...
  },
  { 
    credits: 10800, 
    description: "~180 imagens", 
    price: "99,90",
    originalPrice: "149,90",
    pricePerImage: "0,55", // R$ 99,90 / 180 = R$ 0,55
    // ...
  },
];
```

### 2. Novo Badge Visual

Layout do badge:

```text
┌──────────────────────┐
│ 🏷️ R$ 0,55/imagem!  │
└──────────────────────┘
```

- Ícone: `Tag` do lucide-react (🏷️ de desconto)
- Estilo: Badge com fundo gradiente sutil (fuchsia/purple) ou outline colorido
- Posicionado abaixo da descrição, antes do badge "Vitalício"

### 3. Código do Badge

```tsx
{/* Price Per Image Badge */}
<Badge className="bg-gradient-to-r from-fuchsia-500/20 to-purple-500/20 border border-fuchsia-500/40 text-fuchsia-300 text-xs mb-3 gap-1">
  <Tag className="w-3 h-3" />
  R$ {plan.pricePerImage}/imagem!
</Badge>
```

### 4. Remover Elementos Antigos

- Remover a propriedade `savings` dos planos
- Remover o `<span>` com `-{plan.savings}` da seção de preços

## Arquivo a Modificar

| Arquivo | Mudanças |
|---------|----------|
| `src/pages/PlanosCreditos.tsx` | Adicionar `pricePerImage` aos planos, trocar badge de desconto por custo por imagem, importar ícone `Tag` |

## Imports Necessários

```tsx
import { ..., Tag } from "lucide-react";
```

## Layout Final dos Cards

```text
┌─────────────────────┐
│    🔥 POPULAR       │
│                     │
│       ⚡            │
│    4.200 créditos   │
│    ~70 imagens      │
│                     │
│  ┌───────────────┐  │
│  │🏷️ R$0,57/img!│  │
│  └───────────────┘  │
│   ♾️ Vitalício      │
│                     │
│   de R$ 49,90       │
│   R$ 39,90          │
│                     │
│  [Comprar Agora]    │
└─────────────────────┘
```

