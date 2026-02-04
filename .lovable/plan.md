

# Correção: Vídeo Retornando em 2x Após Corte

## Problema Identificado

O vídeo cortado volta **mais rápido e com metade do tempo** porque o sistema de captura não está sincronizado corretamente.

### Causa Raiz

A função `trimVideoFile` usa `requestAnimationFrame` para desenhar frames, mas:

1. **Taxa de frames inconsistente**: `requestAnimationFrame` roda a ~60Hz, enquanto `captureStream(30)` captura a 30 FPS
2. **Sem controle de timing**: Os frames são desenhados "o mais rápido possível" em vez de respeitarem o timing real do vídeo
3. **Playback em tempo real**: O vídeo toca em 1x, mas a captura não garante sincronização frame-a-frame

**Resultado**: O MediaRecorder recebe frames em intervalos irregulares e gera um vídeo com duração incorreta.

---

## Solução

Usar um loop controlado por **timestamp** em vez de `requestAnimationFrame`, garantindo que cada frame seja capturado no momento correto:

### Mudanças no arquivo `src/components/video-upscaler/VideoTrimModal.tsx`

**Estratégia**: Capturar frames manualmente a cada ~33ms (30 FPS) usando `setInterval`, sincronizando com o `currentTime` do vídeo.

```typescript
// ANTES (problemático):
const renderFrame = () => {
  if (video.currentTime >= endTime || video.paused || video.ended) {
    video.pause();
    recorder.stop();
    return;
  }
  ctx.drawImage(video, 0, 0);
  requestAnimationFrame(renderFrame);
};
renderFrame();

// DEPOIS (corrigido):
const targetDuration = endTime - startTime;
const fps = 30;
const frameInterval = 1000 / fps;
let frameCount = 0;
const totalFrames = Math.ceil(targetDuration * fps);

// Pausar o vídeo - vamos controlar manualmente o currentTime
video.pause();

const captureFrame = () => {
  if (frameCount >= totalFrames) {
    clearInterval(intervalId);
    recorder.stop();
    return;
  }
  
  // Calcular o tempo exato deste frame
  const frameTime = startTime + (frameCount / fps);
  video.currentTime = frameTime;
  
  frameCount++;
};

// Esperar seek e desenhar
video.onseeked = () => {
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
};

// Capturar frame a cada intervalo
const intervalId = setInterval(captureFrame, frameInterval);
captureFrame(); // Iniciar com o primeiro frame
```

**A diferença**:
- Antes: vídeo tocava em tempo real, frames eram capturados quando disponíveis
- Depois: vídeo fica pausado, pulamos para cada frame específico (frame-by-frame)

---

## Por Que Isso Funciona

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Controle de timing | Nenhum (depende do playback) | Total (frame-by-frame) |
| Duração do output | Imprevisível | Exatamente `endTime - startTime` |
| Sincronização | Dessincronizado | Perfeita |
| Método | `video.play()` + rAF | `video.currentTime` manual |

---

## Arquivos a Modificar

| Arquivo | Ação |
|---------|------|
| `src/components/video-upscaler/VideoTrimModal.tsx` | Reescrever função `trimVideoFile` com captura frame-by-frame |

---

## Resultado Esperado

| Antes | Depois |
|-------|--------|
| Vídeo 2x mais rápido | Velocidade normal (1x) |
| Duração ~5s em vez de 10s | Duração exata do corte |
| Dessincronização | Sincronização perfeita |

