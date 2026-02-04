

# Modal de Corte de Vídeo para 10 Segundos

## Resumo da Funcionalidade

Quando o usuário faz upload de um vídeo com duração maior que 10 segundos, um modal aparece automaticamente com:
- Preview do vídeo
- Barra de trimming (dual slider) para selecionar o trecho de 10 segundos
- Preview em tempo real do trecho selecionado
- Botao "Salvar Vídeo" que corta e salva o trecho

## Fluxo do Usuário

```text
1. Usuário faz upload do vídeo
       ↓
2. Sistema valida:
   - Se <= 10s → Aceita direto (comportamento atual)
   - Se > 10s → Abre Modal de Corte
       ↓
3. No Modal:
   - Vídeo aparece com player
   - Barra de trimming com dois handles (início/fim)
   - Ao arrastar, vídeo pula pro ponto selecionado
   - Range máximo fixo em 10s
       ↓
4. Clica "Salvar Vídeo"
   - Sistema corta o vídeo usando Canvas + MediaRecorder
   - Gera novo arquivo com o trecho
   - Fecha modal
   - Vídeo cortado aparece no card de entrada
       ↓
5. Usuário pode clicar "Upscale"
```

---

## Arquivos a Criar/Modificar

| Arquivo | Acao |
|---------|------|
| `src/components/video-upscaler/VideoTrimModal.tsx` | **NOVO** - Modal com player e slider de corte |
| `src/components/video-upscaler/VideoUploadCard.tsx` | Modificar para abrir modal quando video > 10s |
| `src/components/ui/slider.tsx` | Modificar para suportar dois thumbs (dual slider) |

---

## Detalhes Tecnicos

### 1. Novo Componente: VideoTrimModal.tsx

```typescript
interface VideoTrimModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoFile: File;
  onSave: (trimmedFile: File, metadata: VideoMetadata) => void;
}
```

**Funcionalidades:**
- Player de video com `<video>` nativo
- Dual slider usando Radix (dois thumbs para inicio/fim)
- Sincronizacao: ao arrastar slider, `video.currentTime` atualiza
- Limite fixo de 10s entre os handles
- Geracao de thumbnails para mostrar na timeline (opcional para v1)

### 2. Logica de Corte do Video

Usar `MediaRecorder` + `canvas` para renderizar o trecho selecionado:

```typescript
const trimVideo = async (file: File, startTime: number, endTime: number): Promise<File> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.src = URL.createObjectURL(file);
    video.muted = true;
    
    video.onloadedmetadata = async () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      
      const stream = canvas.captureStream(30); // 30 FPS
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      const chunks: Blob[] = [];
      
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const trimmedFile = new File([blob], `trimmed-${file.name}`, { type: 'video/webm' });
        resolve(trimmedFile);
      };
      
      video.currentTime = startTime;
      await new Promise(r => video.onseeked = r);
      
      recorder.start();
      video.play();
      
      // Parar quando atingir endTime
      const checkEnd = () => {
        if (video.currentTime >= endTime) {
          video.pause();
          recorder.stop();
        } else {
          ctx.drawImage(video, 0, 0);
          requestAnimationFrame(checkEnd);
        }
      };
      checkEnd();
    };
  });
};
```

### 3. Modificacao no VideoUploadCard.tsx

**Mudanca na validacao:**

```typescript
// ANTES: Rejeita videos > 10s
if (duration > MAX_DURATION) {
  resolve({ valid: false, error: `Video muito longo...` });
}

// DEPOIS: Aceita e sinaliza que precisa de trim
if (duration > MAX_DURATION) {
  resolve({ valid: true, needsTrim: true, metadata: { width, height, duration } });
}
```

**Novo state e modal:**

```typescript
const [showTrimModal, setShowTrimModal] = useState(false);
const [pendingFile, setPendingFile] = useState<File | null>(null);

// Se video precisa de trim, abre modal
if (validation.needsTrim) {
  setPendingFile(file);
  setShowTrimModal(true);
  return;
}

// Callback quando usuario salva o trim
const handleTrimSave = (trimmedFile: File, metadata: VideoMetadata) => {
  const url = URL.createObjectURL(trimmedFile);
  setMetadata(metadata);
  onVideoChange(url, trimmedFile, metadata);
  setShowTrimModal(false);
  setPendingFile(null);
};
```

### 4. Modificacao no Slider para Dual Handles

O Radix Slider ja suporta multiplos valores nativamente. So precisamos renderizar dois thumbs:

```typescript
// slider.tsx
const Slider = React.forwardRef<...>(({ className, ...props }, ref) => {
  // Detecta se e array (dual) ou single
  const values = Array.isArray(props.value) ? props.value : 
                 Array.isArray(props.defaultValue) ? props.defaultValue : [0];
  
  return (
    <SliderPrimitive.Root ...>
      <SliderPrimitive.Track ...>
        <SliderPrimitive.Range ... />
      </SliderPrimitive.Track>
      {/* Renderiza um Thumb para cada valor */}
      {values.map((_, index) => (
        <SliderPrimitive.Thumb key={index} ... />
      ))}
    </SliderPrimitive.Root>
  );
});
```

---

## UI do Modal

```text
┌────────────────────────────────────────────────────┐
│  Cortar Video                               [X]    │
├────────────────────────────────────────────────────┤
│                                                    │
│    ┌──────────────────────────────────────────┐    │
│    │                                          │    │
│    │           [VIDEO PLAYER]                 │    │
│    │                                          │    │
│    │          ▶ 00:02 / 00:45                │    │
│    └──────────────────────────────────────────┘    │
│                                                    │
│    Selecione 10 segundos do video:                 │
│                                                    │
│    [●━━━━━━━━━━●─────────────────────────────]     │
│    0s        10s                            45s    │
│                                                    │
│    Trecho: 00:00 → 00:10  (10s)                   │
│                                                    │
├────────────────────────────────────────────────────┤
│                               [ Salvar Video ]     │
└────────────────────────────────────────────────────┘
```

---

## Consideracoes Importantes

1. **Corte em WebM**: O `MediaRecorder` gera WebM por padrao. O backend do RunningHub deve aceitar esse formato (ja listado como suportado).

2. **Performance**: O corte acontece no navegador do usuario, nao gasta Cloud.

3. **Audio**: O `canvas.captureStream()` nao captura audio por padrao. Para v1, video sera mudo. Para incluir audio, precisaria usar `AudioContext` + `MediaStreamAudioDestinationNode`.

4. **Fallback**: Se o navegador nao suportar `MediaRecorder` (raro), exibir erro pedindo outro navegador.

---

## Resultado Esperado

| Antes | Depois |
|-------|--------|
| Videos > 10s rejeitados com erro | Modal abre para cortar |
| Usuario precisa editar fora do app | Usuario corta dentro do app |
| UX frustrante | UX igual ao Facebook Ads Manager |

