

# Adicionar zoom direto no modal de visualizacao dos jobs

## Problema

No modal de visualizacao dos jobs em `/admin-prompts/custos-ia`, o componente `BeforeAfterSlider` nao tem zoom. O zoom so existe no `FullscreenModal` (aberto pelo botao de lupa). O usuario quer zoom com scroll do mouse, pinch e clicar-arrastar diretamente no modal principal.

## Solucao

Substituir o `BeforeAfterSlider` no modal do admin por uma versao inline com `TransformWrapper` (react-zoom-pan-pinch), igual ao que ja existe no `FullscreenModal`. Isso elimina a necessidade de abrir o fullscreen separado para ter zoom.

## Alteracoes

### Arquivo: `src/components/admin/AdminAIToolsUsageTab.tsx`

Na secao do Dialog (linhas 731-739), substituir o `BeforeAfterSlider` por um bloco inline que usa `TransformWrapper` + `TransformComponent` com o slider antes/depois dentro. O bloco tera:

- `TransformWrapper` com `wheel={{ step: 0.3 }}`, `maxScale={8}`, `doubleClick toggle`
- Controles de zoom flutuantes (ZoomIn, ZoomOut, Reset) iguais ao FullscreenModal
- Slider antes/depois com a mesma logica de arrastar apenas perto da linha divisoria
- Suporte a mouse (scroll zoom, click-drag pan) e touch (pinch zoom)

Isso replica exatamente o comportamento do `FullscreenModal`, mas embutido diretamente no Dialog, sem precisar abrir tela cheia.

### Detalhes tecnicos

1. Importar `TransformWrapper`, `TransformComponent` de `react-zoom-pan-pinch` e icones `ZoomIn`, `ZoomOut`, `Maximize2`
2. Adicionar estados locais para o slider position e refs para controle de drag
3. O slider drag so ativa quando o clique e proximo da linha divisoria (threshold de 8%), permitindo que cliques em outras areas ativem o pan do zoom
4. Manter o botao de zoom/lupa que abre o `FullscreenModal` como opcao adicional para tela cheia

