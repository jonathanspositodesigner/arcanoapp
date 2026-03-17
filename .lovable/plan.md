

## Problema

O modal de checkout usa uma implementacao manual com `div` ao inves do componente `Dialog` do Radix. O overlay tem `document.body.style.overflow = 'hidden'` que trava o scroll da pagina, e o container interno usa `max-h-[95vh] overflow-y-auto` com `flex items-center justify-center` no overlay. Quando o conteudo do modal e mais alto que a viewport (especialmente em mobile ou com todos os campos visiveis), o modal fica cortado e o usuario nao consegue rolar.

## Correcao em `PreCheckoutModal.tsx`

1. **Trocar o overlay de `flex items-center justify-center`** para `overflow-y-auto` no proprio overlay, permitindo que o usuario role o overlay inteiro quando o modal e maior que a tela.

2. **Usar margin auto no container interno** em vez de flex centering, para que o modal fique centralizado quando cabe na tela, mas role naturalmente quando nao cabe.

3. **Manter `document.body.style.overflow = 'hidden'`** para evitar scroll duplo (pagina + overlay), mas garantir que o overlay em si seja rolavel.

Mudanca concreta na linha 370-372:
```
// DE:
<div className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-4 bg-black/80 backdrop-blur-sm" ...>
  <div className="... max-h-[95vh] overflow-y-auto" ...>

// PARA:
<div className="fixed inset-0 z-50 overflow-y-auto p-2 md:p-4 bg-black/80 backdrop-blur-sm" ...>
  <div className="... mx-auto my-auto min-h-full flex items-center justify-center" ...>
    <div className="... w-full max-w-md ..." ...>
```

Ou de forma mais simples, manter a estrutura atual mas:
- No overlay: adicionar `overflow-y-auto` e trocar `flex items-center justify-center` por `flex items-start justify-center py-8`
- No container: remover `max-h-[95vh] overflow-y-auto` (o scroll fica no overlay)

Isso garante que:
- O modal sempre aparece visivel (centralizado quando cabe, no topo com scroll quando nao cabe)
- O usuario sempre consegue rolar para ver todo o conteudo
- Nao trava navegacao

## Arquivo alterado
- `src/components/upscaler/PreCheckoutModal.tsx` (linhas 370-372)

