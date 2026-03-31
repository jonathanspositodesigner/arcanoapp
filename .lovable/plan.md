
Objetivo

Deixar todos os botões das páginas `/upscalerarcanov3`, `/upscalerarcanov3-es` e `/upscalerarcanov3-teste` responderem de forma imediata, inclusive “Ver Planos” e os CTAs de compra.

Diagnóstico confirmado

- Não é só checkout. Eu conferi o código e o botão “Ver Planos” chama apenas `scrollToPrice()`, que faz `getElementById("v3-pricing")` + `window.scrollTo(...)`. Então esse atraso não vem do checkout.
- O problema principal está na própria landing page: as 3 páginas têm praticamente a mesma estrutura pesada e ficam rerenderizando o tempo todo.
- Principais causas reais encontradas:
  1. `requestAnimationFrame` atualizando `sliderPct` em loop dentro do componente principal.
  2. vários `setInterval`/`setTimeout` rodando ao mesmo tempo (`turboCount`, `batchLoaded`, notificações, countdown).
  3. componente gigante com muito JSX + um `<style>` enorme dentro do render.
  4. arrays e objetos estáticos sendo recriados a cada render.
  5. efeitos visuais caros durante scroll: `position: fixed`, `backdrop-filter`, overlay fullscreen e muitas transições.
- No navegador, o clique em si respondeu rápido, mas a página acumulou recálculo/layout/script em excesso. Ou seja: o botão recebe o clique, mas a tela está pesada e a reação visual fica com cara de lenta.

Plano de correção

1. Cortar os rerenders contínuos do componente raiz
- Tirar o auto-slide do hero do componente principal.
- Mover slider, countdown, batch animation e popup social para componentes isolados.
- Fazer esses blocos atualizarem só eles mesmos, não a página inteira.

2. Reduzir animações decorativas que estão custando performance
- Simplificar ou remover o loop de `batchLoaded`.
- Simplificar o contador turbo e popup social para não dispararem rerender global.
- Manter animação só onde realmente ajuda conversão.

3. Baratear o scroll dos botões internos
- Trocar o `behavior: "smooth"` atual por um scroll mais rápido/curto ou salto direto para preços nessas 3 páginas.
- Isso melhora imediatamente “Ver Planos”, sticky CTA e botão final.

4. Diminuir custo de pintura e composição
- Reduzir/remover `backdrop-filter` dos elementos fixos.
- Simplificar/remover o overlay fullscreen `.v3-page::before`.
- Revisar efeitos fixos que repintam a tela durante scroll.

5. Diminuir o trabalho do React em cada atualização
- Tirar o `<style>` gigante de dentro do componente e mover para CSS estático compartilhado.
- Hoistar arrays estáticos para fora do componente.
- Memoizar cards/sliders que não precisam rerenderizar.

6. Só depois revisar o checkout, se ainda sobrar atraso
- Se após limpar a landing ainda houver lentidão no envio para pagamento, aí eu ataco a parte do checkout.
- Hoje, pelo que vi, o gargalo principal é frontend dessas páginas, não só a chamada de pagamento.

Arquivos alvo

- `src/pages/UpscalerArcanoV3.tsx`
- `src/pages/UpscalerArcanoV3Es.tsx`
- `src/pages/UpscalerArcanoV3Teste.tsx`
- possivelmente um CSS compartilhado para essas páginas
- checkout só entra no escopo se ainda existir atraso depois do cleanup visual

Validação depois da implementação

- testar desktop e mobile nas 3 páginas
- confirmar resposta imediata em:
  - topbar “Ver Planos”
  - sticky CTA
  - botão final da página
  - botões de compra abrindo modal sem sensação de travamento
- reavaliar performance para confirmar queda forte de rerenders, layout recalculation e script time

Detalhes técnicos

- O maior vilão hoje é `requestAnimationFrame -> setSliderPct(...)` no componente da página, porque isso força rerender contínuo da landing inteira.
- O segundo vilão é o conjunto de timers (`setInterval`/`setTimeout`) somado ao componente enorme com muito JSX e `<style>` inline.
- O scroll parece “lento” porque atravessa uma página pesada e com muitos repaints, não porque o clique do botão está demorando para ser capturado.
