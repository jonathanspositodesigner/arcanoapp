
# Plano: Auto-scroll nos Carrosséis de Arte (Mobile E Desktop)

## Resumo
Adicionar passagem automática a cada 2 segundos em **TODOS** os carrosséis de artes, funcionando tanto em mobile quanto em desktop.

---

## Carrosséis Afetados

1. **FlyersGallerySection.tsx** - 6 categorias de artes (pagode, forró, sertanejo, funk, cavalgada, variadas)
2. **BonusFimDeAnoSection.tsx** - Carrossel de artes de Carnaval
3. **Selos3DSection.tsx** - Carrossel de selos 3D

---

## O que será feito

Todos os carrosséis acima irão passar automaticamente para a próxima imagem a cada 2 segundos, em qualquer dispositivo.

### Comportamento:
- Auto-scroll ativo em **mobile E desktop**
- Loop infinito (já está configurado)
- O usuário ainda poderá usar os botões de navegação manualmente

---

## Detalhes Tecnicos

### Alterações em cada arquivo:

**1. FlyersGallerySection.tsx**
- Adicionar `useEffect` ao componente `CategoryCarousel`
- O efeito cria um `setInterval` de 2000ms que chama `emblaApi.scrollNext()`
- Cleanup do intervalo no retorno do useEffect

**2. BonusFimDeAnoSection.tsx**
- Mesmo padrão: adicionar `useEffect` com `setInterval`

**3. Selos3DSection.tsx**
- Mesmo padrão: adicionar `useEffect` com `setInterval`

### Codigo a ser adicionado em cada carrossel:

```tsx
import { useCallback, useEffect } from "react";

// Dentro do componente, após definir emblaApi:
useEffect(() => {
  if (!emblaApi) return;
  
  const interval = setInterval(() => {
    emblaApi.scrollNext();
  }, 2000);
  
  return () => clearInterval(interval);
}, [emblaApi]);
```

---

## Resultado Esperado

- Todas as galerias de artes passam automaticamente a cada 2 segundos
- Funciona tanto em celular quanto em computador
- O usuario ainda pode clicar nos botoes de navegacao normalmente
