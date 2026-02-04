
Objetivo: parar o “Processando…” infinito no cortador de vídeo e fazer o botão “Salvar Vídeo” sempre finalizar (gerar o arquivo cortado) ou, no pior caso, falhar com mensagem clara e liberar a tela (nunca travar).

## O que está acontecendo (causa real do travamento)
Hoje o corte roda num loop que faz:
- desenha um frame no canvas
- faz `video.currentTime = próximoFrame`
- fica esperando `seeked` (`await new Promise(... onseeked ...)`)
Se por qualquer motivo o navegador não disparar `seeked` em algum passo (isso acontece às vezes com seeks muito pequenos, vídeo pesado, buffering, ou timing), o `await` nunca resolve, o loop para no meio e o `MediaRecorder` nunca recebe `stop()`. Resultado: a Promise do corte nunca termina e o modal fica eternamente em “Processando…”.

Além disso, não existe “timeout de segurança” para abortar e destravar a UI.

## Mudanças para fazer “funcionar de verdade” (sem complicar a UX)
### 1) Tornar o corte impossível de travar (timeout + abort)
No `VideoTrimModal.tsx`:
- Envolver o `trimVideo()` em um `Promise.race()` com timeout (ex.: 60s).
- Se estourar o tempo: aborta a gravação (se estiver ativa), limpa recursos e mostra erro para o usuário (toast), e principalmente seta `isProcessing=false`.

Resultado: nunca mais fica infinito.

### 2) Corrigir o loop de frames para não depender de um `onseeked` que pode falhar
Trocar o esquema atual por um “seek helper” robusto:

- Criar função `seekTo(video, time, timeoutMs)` que:
  - registra listener com `addEventListener('seeked', ..., { once: true })`
  - seta `video.currentTime = time`
  - resolve no `seeked`
  - se não vier `seeked` dentro do timeout (ex.: 1500–2000ms), rejeita (para cair no fallback automaticamente)

Isso elimina o travamento silencioso.

### 3) Fallback automático (para garantir que o usuário sempre consegue salvar)
Se o método “frame a frame” falhar (timeout de seek / erro de recorder), cair automaticamente para um método mais estável:

**Fallback (bem estável): gravar o trecho tocando o vídeo**
- `video.currentTime = start`
- espera `seeked`
- `const stream = video.captureStream(30)` (pega vídeo+áudio do elemento)
- `recorder = new MediaRecorder(stream, mimeType suportado)`
- `recorder.start()`
- `await video.play()` (clique no botão já é gesto do usuário)
- parar quando `video.currentTime >= end` (checando em `requestAnimationFrame` + também um `setTimeout` de segurança)
- `recorder.stop()`

Isso preserva áudio e não acelera. A duração fica extremamente próxima do recorte; e com o stop baseado no `currentTime` ela fica no tamanho correto do corte na prática. (E principalmente: não trava.)

### 4) Garantir compatibilidade do MediaRecorder (evitar erros escondidos)
Antes de criar o `MediaRecorder`, escolher o melhor mimeType suportado:
- tentar `video/webm;codecs=vp9,opus`
- senão `video/webm;codecs=vp8,opus`
- senão `video/webm`
Se nenhum suportar, mostrar erro (“Seu navegador não suporta exportar vídeo. Use Chrome/Edge.”).

### 5) Feedback e saída limpa (UX de “funcionou”)
No `handleSave()` do modal:
- mostrar progresso real (ex.: “Processando… 35%”) baseado em:
  - frameCount/totalFrames (método frame-a-frame)
  - ou (currentTime-start)/(end-start) no fallback
- adicionar botão “Cancelar” (opcional, mas recomendado) para o usuário destravar manualmente caso queira
- sempre limpar:
  - `URL.revokeObjectURL(...)`
  - `video.pause()`
  - parar tracks do stream (`stream.getTracks().forEach(t => t.stop())`) quando terminar

### 6) Onde mexer (arquivos)
- `src/components/video-upscaler/VideoTrimModal.tsx`
  - Reescrever a função `trimVideo()` com:
    - `seekTo()` com timeout
    - timeout global do processamento (Promise.race)
    - fallback automático “play+captureStream”
    - seleção de mimeType suportado
    - progresso/cleanup
- `src/components/video-upscaler/VideoUploadCard.tsx`
  - Sem mudanças obrigatórias para corrigir o travamento (só se quiser melhorar mensagens/toasts).
- `src/components/ui/slider.tsx`
  - Sem mudanças (já está ok para dois thumbs).

## Critérios de pronto (o que vai ser testado)
1) Upload de vídeo > 10s → modal abre → escolher trecho → clicar “Salvar Vídeo”:
   - não pode ficar infinito em “Processando…”
   - deve gerar um novo arquivo e voltar pro card com o vídeo já cortado
2) O vídeo cortado:
   - tem áudio
   - não fica acelerado/desacelerado
   - fica com a duração do trecho selecionado (10s quando selecionado 10s)
3) Repetir com vídeos diferentes (mp4, mov) e com trechos diferentes (início/meio/fim).

## Notas técnicas (para evitar regressão)
- Nunca deixar Promise do trim depender de evento sem timeout.
- Sempre ter um timeout global do processamento para liberar UI.
- Sempre ter fallback automático para o método “play+captureStream” se o frame-a-frame falhar.
