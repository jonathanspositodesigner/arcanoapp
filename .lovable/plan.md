
Objetivo: corrigir de forma definitiva os vídeos da categoria “Movies para Telão” no mobile (tela preta + botão play + sem autoplay).

Diagnóstico (causa raiz confirmada no código + rede):
1) `SecureVideo` marca vídeo como “carregado” em `onLoadedMetadata` (cedo demais). Em mobile isso remove o placeholder antes do 1º frame e deixa tela preta.
2) A lógica de retry por `networkState === 3` força remounts (`key` com `retryCount`), gerando vários `ERR_ABORTED` e comportamento instável em celular.
3) O autoplay programático existe, mas falta endurecer compatibilidade iOS (atributos/propriedades inline/muted no DOM antes do `play()`).
4) A tela de cards não usa `poster` mesmo tendo `thumbnail_url`, então quando autoplay falha o usuário vê preto.

Plano de implementação:
1) `src/components/SecureMedia.tsx`
- Remover carregamento por `onLoadedMetadata` (usar só `loadeddata/canplay/play` para `videoLoaded`).
- Remover a checagem agressiva de `networkState===3` (evitar retry falso).
- Reforçar autoplay mobile:
  - setar no elemento: `muted=true`, `defaultMuted=true`, `playsInline=true`
  - `setAttribute('muted','')`, `setAttribute('playsinline','')`, `setAttribute('webkit-playsinline','true')`
  - tentar `play()` em `loadeddata`, `canplay`, e quando visível.
- Manter retry só em `onError` real, com limite baixo.
- Adicionar prop `poster?: string`.

2) `src/components/LazyVideo.tsx`
- Adicionar prop opcional `poster`.
- Passar `poster` para `SecureVideo`.
- Ajustar preload para reduzir travamentos em mobile (sem múltiplos reloads).

3) `src/pages/BibliotecaPrompts.tsx`
- Passar `thumbnailUrl` para `LazyVideo` nos cards.
- Passar `thumbnailUrl` como `poster` no `SecureVideo` do modal.

Escopo do impacto:
- Afeta principalmente iOS Safari/PWA e parte de Android em rede/dispositivo limitados.
- Como a falha está no componente compartilhado (`SecureVideo`), o ajuste melhora geral para todos os vídeos mobile, com foco imediato em “Movies para Telão”.

Critérios de aceite (validação real):
1) iPhone Safari: vídeos da grade iniciam mutados/inline sem botão de play.
2) Android Chrome: comportamento igual ao desktop (autoplay estável).
3) Sem tela preta inicial (thumbnail aparece enquanto carrega).
4) Redução clara de requisições de mídia abortadas e sem loop de retries.
5) Modal continua funcionando com controles quando aberto.
