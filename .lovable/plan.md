

# Modal de Corte de Video - Implementacao com Audio e Duracao Exata

## Resumo

Quando o usuario faz upload de um video com duracao maior que 10 segundos, um modal aparece automaticamente para cortar o video. O corte deve:
- Manter a duracao EXATA do trecho selecionado
- Preservar o AUDIO original
- Nao acelerar nem desacelerar o video
- Funcionar 100% no navegador (sem custo de Cloud)

---

## Arquivos a Criar/Modificar

| Arquivo | Acao |
|---------|------|
| `src/components/video-upscaler/VideoTrimModal.tsx` | **NOVO** - Modal com player e slider de corte |
| `src/components/video-upscaler/VideoUploadCard.tsx` | Modificar para abrir modal quando video > 10s |
| `src/components/ui/slider.tsx` | Modificar para suportar dois thumbs (dual slider) |

---

## Fluxo do Usuario

```text
1. Usuario faz upload do video
       |
       v
2. Sistema valida:
   - Se <= 10s --> Aceita direto (comportamento atual)
   - Se > 10s --> Abre Modal de Corte
       |
       v
3. No Modal:
   - Video aparece com player
   - Barra de trimming com dois handles (inicio/fim)
   - Range maximo fixo em 10s
   - Ao arrastar handle, video pula pro ponto selecionado
       |
       v
4. Clica "Salvar Video"
   - Sistema corta o video usando seeking manual + MediaRecorder
   - Captura video E audio
   - Gera novo arquivo com o trecho exato
   - Fecha modal
   - Video cortado aparece no card de entrada
```

---

## Detalhes Tecnicos

### 1. Novo Componente: VideoTrimModal.tsx

```typescript
interface VideoTrimModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoFile: File;
  videoDuration: number;
  onSave: (trimmedFile: File, metadata: VideoMetadata) => void;
}
```

**Funcionalidades:**
- Player de video com `<video>` nativo
- Dual slider (dois thumbs para inicio/fim)
- Sincronizacao: ao arrastar slider, `video.currentTime` atualiza
- Limite fixo de 10s entre os handles
- Botao "Salvar Video" inicia o processo de corte

### 2. Logica de Corte - Duracao Exata COM Audio

A abordagem correta para garantir duracao exata e preservar audio:

1. **Seeking Manual Frame-by-Frame**: Em vez de usar `video.play()` (que pode variar velocidade), avancamos manualmente o `currentTime` em intervalos fixos (1/30s para 30 FPS)

2. **Captura de Audio**: Usar `captureStream()` no elemento `<video>` (captura video + audio junto) em vez de `canvas.captureStream()` (que captura apenas video)

```typescript
const trimVideoWithAudio = async (
  file: File, 
  startTime: number, 
  endTime: number
): Promise<File> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.src = URL.createObjectURL(file);
    video.muted = false; // IMPORTANTE: nao mutar para capturar audio
    video.volume = 0; // Volume 0 para nao tocar durante gravacao

    video.onloadedmetadata = async () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d')!;

      // Capturar stream do canvas (video) + audio do video element
      const canvasStream = canvas.captureStream(30);
      
      // Capturar audio do video usando captureStream
      const videoStream = (video as any).captureStream();
      const audioTracks = videoStream.getAudioTracks();
      
      // Combinar video do canvas + audio do video
      audioTracks.forEach(track => canvasStream.addTrack(track));

      const recorder = new MediaRecorder(canvasStream, { 
        mimeType: 'video/webm;codecs=vp9,opus' 
      });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const trimmedFile = new File(
          [blob], 
          `trimmed-${file.name.replace(/\.[^/.]+$/, '')}.webm`, 
          { type: 'video/webm' }
        );
        URL.revokeObjectURL(video.src);
        resolve(trimmedFile);
      };

      // Posicionar no inicio
      video.currentTime = startTime;
      await new Promise(r => video.onseeked = r);

      const FPS = 30;
      const frameInterval = 1 / FPS;
      const duration = endTime - startTime;
      const totalFrames = Math.ceil(duration * FPS);
      let frameCount = 0;

      recorder.start();

      // Funcao que avanca frame por frame manualmente
      const processFrame = async () => {
        if (frameCount >= totalFrames) {
          recorder.stop();
          return;
        }

        // Desenhar frame atual no canvas
        ctx.drawImage(video, 0, 0);
        frameCount++;

        // Avancar para proximo frame usando seeking manual
        const nextTime = startTime + (frameCount * frameInterval);
        if (nextTime <= endTime) {
          video.currentTime = nextTime;
          await new Promise(r => video.onseeked = r);
        }

        // Pequeno delay para dar tempo do MediaRecorder capturar
        setTimeout(processFrame, 1000 / FPS);
      };

      processFrame();
    };

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error('Erro ao carregar video'));
    };
  });
};
```

**Por que essa abordagem funciona:**
- `video.currentTime = X` + aguardar `onseeked` garante precisao
- Cada frame e desenhado no canvas depois de confirmar seek
- O intervalo de 1000/30ms entre frames garante 30 FPS exatos
- Duracao final = totalFrames / FPS = exatamente o que foi cortado
- Audio e capturado via `video.captureStream()` e combinado com o canvas

### 3. Modificacao no VideoUploadCard.tsx

**Mudanca na validacao:**

```typescript
// ANTES: Rejeita videos > 10s
if (duration > MAX_DURATION) {
  resolve({ valid: false, error: `Video muito longo...` });
}

// DEPOIS: Aceita e sinaliza que precisa de trim
if (duration > MAX_DURATION) {
  resolve({ 
    valid: true, 
    needsTrim: true, 
    metadata: { width, height, duration } 
  });
}
```

**Novo state e modal:**

```typescript
const [showTrimModal, setShowTrimModal] = useState(false);
const [pendingFile, setPendingFile] = useState<File | null>(null);
const [pendingDuration, setPendingDuration] = useState(0);

// Se video precisa de trim, abre modal
if (validation.needsTrim) {
  setPendingFile(file);
  setPendingDuration(validation.metadata.duration);
  setShowTrimModal(true);
  return;
}

// Callback quando usuario salva o trim
const handleTrimSave = (trimmedFile: File, metadata: VideoMetadata) => {
  const url = URL.createObjectURL(trimmedFile);
  setMetadata(metadata);
  setThumbnailUrl(null); // Gerar novo thumbnail
  onVideoChange(url, trimmedFile, metadata);
  setShowTrimModal(false);
  setPendingFile(null);
};
```

### 4. Modificacao no Slider para Dual Handles

O Radix Slider ja suporta multiplos valores. So precisamos renderizar os thumbs dinamicamente:

```typescript
const Slider = React.forwardRef<...>(({ className, ...props }, ref) => {
  // Detecta quantidade de valores para renderizar thumbs
  const values = Array.isArray(props.value) ? props.value : 
                 Array.isArray(props.defaultValue) ? props.defaultValue : [0];
  
  return (
    <SliderPrimitive.Root ref={ref} className={cn(...)} {...props}>
      <SliderPrimitive.Track className="...">
        <SliderPrimitive.Range className="..." />
      </SliderPrimitive.Track>
      {values.map((_, index) => (
        <SliderPrimitive.Thumb key={index} className="..." />
      ))}
    </SliderPrimitive.Root>
  );
});
```

---

## UI do Modal

```text
+----------------------------------------------------+
|  Cortar Video                               [X]    |
|----------------------------------------------------|
|                                                    |
|    +------------------------------------------+    |
|    |                                          |    |
|    |           [VIDEO PLAYER]                 |    |
|    |                                          |    |
|    |          00:02 / 00:45                   |    |
|    +------------------------------------------+    |
|                                                    |
|    Selecione 10 segundos do video:                 |
|                                                    |
|    [O==========O-------------------------]         |
|    0s        10s                        45s        |
|                                                    |
|    Trecho: 00:00 -> 00:10  (10s)                   |
|                                                    |
|----------------------------------------------------|
|                               [ Salvar Video ]     |
+----------------------------------------------------+
```

---

## Garantias de Qualidade

| Requisito | Como e garantido |
|-----------|------------------|
| Duracao exata | Seeking manual frame-by-frame (nao depende de playback speed) |
| Audio preservado | `video.captureStream()` captura audio + combinacao com canvas stream |
| Sem aceleracao | Interval fixo de 1000/FPS ms entre frames |
| Tamanho correto | totalFrames = ceil(duracao * FPS), cada frame e processado |

---

## Consideracoes

1. **Formato WebM**: O MediaRecorder gera WebM. RunningHub aceita esse formato.

2. **Performance**: O processo de corte pode levar alguns segundos (proporcional a duracao do trecho). Mostrar loading durante o processamento.

3. **Compatibilidade**: `video.captureStream()` e suportado em Chrome, Firefox, Edge. Safari tem suporte limitado.

4. **Custo Cloud**: Zero. Todo processamento acontece no navegador.

---

## Resultado Esperado

| Antes | Depois |
|-------|--------|
| Videos > 10s rejeitados com erro | Modal abre para cortar |
| Usuario precisa editar fora do app | Usuario corta dentro do app |
| N/A | Video cortado tem duracao EXATA |
| N/A | Audio e preservado |
| N/A | Velocidade normal (sem acelerar) |

