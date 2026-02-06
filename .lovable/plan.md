
# Plano: Melhorar Layout Mobile dos Cards de Ferramentas

## Problemas Identificados
1. **Cards muito pequenos no mobile** - Grid de 2 colunas deixa os cards apertados
2. **Botões muito grandes** - Os botões ocupam muito espaço visual
3. **Layout dos botões estranho** - O ícone Play está muito distante do texto
4. **Especialmente ruim no Upscaler Arcano** - Card com 2 botões fica ainda mais apertado

---

## Alterações Propostas

### Arquivo: `src/pages/FerramentasIAAplicativo.tsx`

**1. Grid: 1 card por linha no mobile (horizontal)**
```diff
- <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
+ <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-4">
```

**2. Card com layout horizontal no mobile**
```diff
- <div className="aspect-[4/5] sm:aspect-[3/4] relative overflow-hidden">
+ <div className="aspect-[16/9] sm:aspect-[3/4] relative overflow-hidden">
```
- No mobile: aspect ratio 16/9 (horizontal, mais largo)
- No desktop: mantém 3/4 (vertical)

**3. Botões menores e com layout corrigido**
```diff
- <Button size="sm" className="w-full text-xs sm:text-sm ...">
-   <Play className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
+ <Button size="sm" className="w-full text-[11px] sm:text-sm h-8 sm:h-9 ...">
+   <Play className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5" />
```
- Fonte menor no mobile: `text-[11px]`
- Altura fixa: `h-8` no mobile, `h-9` no desktop
- Espaçamento consistente do ícone: `mr-1.5`

**4. Gap menor entre os botões no mobile**
```diff
- <div className="flex flex-col gap-1.5 sm:gap-2 mt-2 sm:mt-3">
+ <div className="flex flex-col gap-1 sm:gap-2 mt-2 sm:mt-3">
```

---

## Resultado Visual Esperado

| Antes (Mobile) | Depois (Mobile) |
|----------------|-----------------|
| 2 cards por linha (apertado) | 1 card por linha (horizontal) |
| Cards verticais pequenos | Cards horizontais maiores |
| Botões grandes demais | Botões compactos e legíveis |
| Play icon longe do texto | Play icon próximo ao texto |

---

## Observação Técnica
- O layout desktop (2 colunas tablet, 4 colunas desktop) permanece inalterado
- Apenas a experiência mobile será otimizada com cards horizontais
