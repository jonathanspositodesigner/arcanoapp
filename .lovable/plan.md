

# Correção: Vídeos não reproduzem automaticamente no celular

## Problema
Os vídeos da Biblioteca de Prompts usam `LazyVideo` → `SecureVideo` com `autoPlay={true}`, `muted={true}`, `playsInline={true}`. No desktop funciona, mas no mobile (especialmente iOS) o autoplay via atributo HTML é bloqueado pelos navegadores, resultando em tela preta.

## Causa raiz
Navegadores mobile bloqueiam autoplay via atributo HTML. A solução é chamar `.play()` programaticamente no elemento de vídeo após ele estar carregado, garantindo que `muted` e `playsInline` estejam definidos como propriedades do elemento antes de tentar reproduzir.

## Solução

### 1. Atualizar `SecureVideo` em `src/components/SecureMedia.tsx`
- Adicionar um `useEffect` que, quando `autoPlay` e `muted` estão habilitados, chama `videoRef.current.play()` programaticamente nos eventos `onCanPlay`/`onLoadedData`
- Garantir que `muted` e `playsInline` sejam definidos como propriedades do elemento DOM (não apenas atributos JSX) antes de chamar `.play()`
- Tratar a promise rejeitada do `.play()` silenciosamente (alguns browsers ainda podem bloquear)

### 2. Atualizar `LazyVideo` em `src/components/LazyVideo.tsx`
- Sem mudanças necessárias — já passa os atributos corretos para `SecureVideo`

## Arquivos modificados
- `src/components/SecureMedia.tsx` — adicionar lógica de autoplay programático para mobile

