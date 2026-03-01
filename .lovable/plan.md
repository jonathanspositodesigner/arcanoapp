

# Corrigir imagens cortadas no ZoomableBeforeAfter

## Problema

O componente `ResilientImage` tem uma prop `objectFit` que por padrao e `'cover'` (linha 47). O `style={{ objectFit: 'contain' }}` passado pelo `ZoomableBeforeAfter` e aplicado no wrapper `<div>`, nao no `<img>` interno. O `<img>` usa a prop `objectFit` que continua como `'cover'`, cortando a imagem.

## Solucao

No `src/components/admin/ZoomableBeforeAfter.tsx`, passar a prop `objectFit="contain"` diretamente no `ResilientImage` (nas duas instancias - antes e depois). Remover `objectFit` do `style` inline pois e redundante.

Isso faz com que o `<img>` interno use `contain` ao inves de `cover`, mostrando a imagem inteira sem corte.

