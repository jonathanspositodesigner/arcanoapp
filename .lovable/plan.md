

# Correção: Vídeos travados na thumbnail sem autoplay no mobile

## Diagnóstico real

O problema está na lógica de overlay do `SecureVideo`:

1. **O vídeo começa com `opacity-0 blur-md`** — literalmente invisível
2. **Um overlay com a poster/thumbnail cobre o vídeo** enquanto `videoLoaded === false`
3. **No mobile (especialmente iOS Chrome/WebKit)**, com 16 cards carregando vídeos de 3-6MB simultaneamente, os eventos `loadeddata`/`canplay` demoram ou nunca disparam
4. **Resultado**: o overlay nunca some, o vídeo fica escondido atrás da thumbnail para sempre

O navegador mobile **consegue** fazer autoplay muted inline — o problema é que o código esconde o vídeo até receber um evento que nunca chega.

## Solução

Eliminar a lógica de overlay/opacity que esconde o vídeo. Usar o atributo nativo `poster` do `<video>` (que o browser já gerencia perfeitamente) e deixar o vídeo visível desde o início.

### 1. `SecureVideo` em `src/components/SecureMedia.tsx`

- **Remover** o state `videoLoaded` e todo o overlay condicional
- **Remover** as classes `blur-md opacity-0` / `blur-0 opacity-100` do vídeo
- **Manter** o atributo nativo `poster` no `<video>` — o browser mostra o poster automaticamente até o primeiro frame estar pronto
- **Manter** toda a lógica de autoplay programático (setAttribute muted/playsinline, `play()` em canplay/loadeddata)
- **Manter** a lógica de retry em `onError`
- O vídeo fica sempre visível; o browser nativamente mostra poster → primeiro frame → playback

### 2. `LazyVideo` em `src/components/LazyVideo.tsx`

- Sem mudanças necessárias (já passa poster para SecureVideo)

### 3. `BibliotecaPrompts.tsx`

- Sem mudanças necessárias (já passa thumbnailUrl como poster)

## Arquivos modificados

- `src/components/SecureMedia.tsx` — simplificar SecureVideo removendo overlay/opacity

## Por que funciona

O `<video poster="thumb.webp" autoplay muted playsinline loop>` é o padrão nativo que todos os browsers mobile suportam. O browser:
1. Mostra o poster imediatamente
2. Quando o vídeo carrega, substitui pelo primeiro frame automaticamente
3. Se autoplay funcionar, reproduz; se não, mostra o poster

Sem overlays React bloqueando, sem estados que nunca atualizam.

