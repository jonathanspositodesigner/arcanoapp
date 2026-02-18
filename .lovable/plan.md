
## Objetivo

Na seção "Veja o que o Arcano Cloner é capaz de fazer", o componente `ExpandingGallery` deve:
- **Mobile**: exibir as fotos em **coluna vertical**, uma abaixo da outra, sem setas de navegação
- **Desktop** (`md:` em diante): manter o comportamento atual de expanding gallery horizontal com setas

---

## Alteração: `src/components/combo-artes/ExpandingGallery.tsx`

### 1. Esconder as setas no mobile

As setas ficam dentro de uma `<div className="flex justify-end gap-2 mb-4">`. Basta adicionar `hidden md:flex` para que só apareçam no desktop:

```tsx
// De:
<div className="flex justify-end gap-2 mb-4">

// Para:
<div className="hidden md:flex justify-end gap-2 mb-4">
```

### 2. Layout vertical no mobile, horizontal no desktop

O container da galeria atualmente é `flex gap-2 h-[400px]...`. No mobile, precisamos mudar para `flex-col` com altura automática. No desktop, mantém o comportamento horizontal com altura fixa.

```tsx
// De:
<div className="flex gap-2 h-[400px] md:h-[500px] lg:h-[600px]">

// Para:
<div className="flex flex-col md:flex-row gap-3 md:gap-2 md:h-[500px] lg:h-[600px]">
```

### 3. Cards no mobile: altura fixa em bloco vertical, sem o expanding effect

No mobile, cada card deve ter uma altura fixa (como no print: ~200px) e ocupar largura total. No desktop, mantém o `flex-[6]` / `flex-[0.6]` do expanding effect.

```tsx
// De:
className={`relative overflow-hidden rounded-xl transition-all duration-500 ease-in-out ${
  isActive ? "flex-[6] grayscale-0" : "flex-[0.6] md:flex-[0.8] grayscale brightness-50 ..."
}`}

// Para:
className={`relative overflow-hidden rounded-xl transition-all duration-500 ease-in-out
  h-[200px] md:h-auto    ← altura fixa mobile
  md:${isActive ? "flex-[6] grayscale-0" : "flex-[0.8] grayscale brightness-50 hover:flex-[1.2] cursor-pointer"}
`}
```

Na prática, como o Tailwind não suporta classes dinâmicas condicionais com `md:` em template strings assim, vamos usar uma abordagem com `clsx`-style concatenation, usando `w-full` no mobile e os flex values apenas no md+.

---

## Resumo das mudanças

**Arquivo único**: `src/components/combo-artes/ExpandingGallery.tsx`

| Elemento | Mobile | Desktop |
|---|---|---|
| Setas de navegação | Ocultas (`hidden`) | Visíveis (`md:flex`) |
| Direção do container | Vertical (`flex-col`) | Horizontal (`md:flex-row`) |
| Altura do container | Automática | `md:h-[500px] lg:h-[600px]` |
| Altura dos cards | `h-[200px]` fixo | Controlada pelo flex expanding |
| Expanding effect (click) | Sem efeito | Mantido |
| Grayscale nos inativos | Sem grayscale (todos coloridos) | Mantido |
| Label/badge | Mostra em todos | Só no ativo |

No mobile, todas as fotos ficam empilhadas verticalmente com altura uniforme de ~200px, todas coloridas e com o label visível no canto inferior esquerdo — idêntico ao print enviado pelo usuário.
