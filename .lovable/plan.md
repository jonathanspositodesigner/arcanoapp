
# Plano: Atualizar Página de Créditos com Promoções e Contador

## Resumo

Adicionar preços promocionais com preços riscados, contador regressivo de 47 minutos (estilo Planos2) e tarjas de economia comparadas ao pacote básico.

## Mudanças Específicas

### 1. Atualizar Estrutura de Preços

| Pacote | Preço Original | Preço Final | Promoção? | Economia vs Básico |
|--------|---------------|-------------|-----------|-------------------|
| 1.500 créditos | - | R$ 29,90 | ❌ Não | - (referência) |
| 4.200 créditos | R$ 49,90 | R$ 39,90 | ✅ Sim | Economize 40% |
| 10.800 créditos | R$ 149,90 | R$ 99,90 | ✅ Sim | Economize 54% |

### 2. Adicionar Contador Regressivo (47 min)

Implementar o mesmo sistema do Planos2:
- Estado com localStorage para persistir entre recarregamentos
- Contador de 47 minutos que reinicia ao chegar em zero
- Visual com boxes vermelho/escuro para horas:minutos:segundos
- Posicionado acima dos cards de preços

### 3. Renomear "upscales" para "imagens"

```tsx
// Antes
"~25 upscales Standard"

// Depois
"~25 imagens"
```

### 4. Adicionar Tarjas de Economia

Calcular economia baseada no custo por crédito:
- **Básico:** R$ 29,90 / 1.500 = R$ 0,01993 por crédito (referência)
- **Popular:** Custo sem desconto seria 4.200 × 0,01993 = R$ 83,71 → economiza ~R$ 44
- **Melhor Valor:** Custo sem desconto seria 10.800 × 0,01993 = R$ 215,27 → economiza ~R$ 115

## Código do Contador (baseado em Planos2)

```tsx
const [timeLeft, setTimeLeft] = useState(() => {
  const saved = localStorage.getItem('planos-creditos-countdown');
  if (saved) {
    const remaining = parseInt(saved, 10) - Date.now();
    if (remaining > 0) return remaining;
  }
  const initial = 47 * 60 * 1000; // 47 minutos
  localStorage.setItem('planos-creditos-countdown', String(Date.now() + initial));
  return initial;
});

useEffect(() => {
  const timer = setInterval(() => {
    setTimeLeft(prev => {
      if (prev <= 1000) {
        const newTime = 47 * 60 * 1000;
        localStorage.setItem('planos-creditos-countdown', String(Date.now() + newTime));
        return newTime;
      }
      return prev - 1000;
    });
  }, 1000);
  return () => clearInterval(timer);
}, []);
```

## Visual do Contador

```text
      ⏰ Essa oferta expira em
   ┌────┐   ┌────┐   ┌────┐
   │ 00 │ : │ 47 │ : │ 00 │
   └────┘   └────┘   └────┘
```

## Layout Final dos Cards

```text
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│                 │  │   🔥 POPULAR    │  │ ⭐ MELHOR VALOR │
│     💰 1.500    │  │                 │  │                 │
│     créditos    │  │     ⚡ 4.200    │  │     ⭐ 10.800   │
│                 │  │     créditos    │  │     créditos    │
│   ~25 imagens   │  │   ~70 imagens   │  │  ~180 imagens   │
│                 │  │                 │  │                 │
│  ♾️ Vitalício   │  │  ♾️ Vitalício   │  │  ♾️ Vitalício   │
│                 │  │ ┌─────────────┐ │  │ ┌─────────────┐ │
│                 │  │ │ ECONOMIZE   │ │  │ │ ECONOMIZE   │ │
│                 │  │ │    40%      │ │  │ │    54%      │ │
│                 │  │ └─────────────┘ │  │ └─────────────┘ │
│                 │  │  de R$ 49,90    │  │  de R$ 149,90   │
│   R$ 29,90      │  │  R$ 39,90       │  │  R$ 99,90       │
│                 │  │                 │  │                 │
│ [Comprar Agora] │  │ [Comprar Agora] │  │ [Comprar Agora] │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

## Arquivo a Modificar

| Arquivo | Mudanças |
|---------|----------|
| `src/pages/PlanosCreditos.tsx` | Adicionar contador, preços promocionais, tarjas de economia, renomear upscales → imagens |

## Detalhes Técnicos

### Estrutura Atualizada dos Planos
```tsx
const creditPlans = [
  { 
    credits: 1500, 
    description: "~25 imagens", 
    price: "29,90",
    originalPrice: null,
    savings: null,
    ...
  },
  { 
    credits: 4200, 
    description: "~70 imagens", 
    price: "39,90",
    originalPrice: "49,90",
    savings: "40%",
    popular: true,
    ...
  },
  { 
    credits: 10800, 
    description: "~180 imagens", 
    price: "99,90",
    originalPrice: "149,90",
    savings: "54%",
    bestValue: true,
    ...
  },
];
```

### Imports Necessários
- Adicionar `useState`, `useEffect` do React
- Manter `Clock` do lucide-react (já importado)
