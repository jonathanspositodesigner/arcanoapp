
# Plano: Sistema Global de Download e Visualização Resiliente para Todas as Ferramentas de IA

## Escopo Global

Criar componentes e hooks **reutilizáveis** que serão o padrão para **TODAS** as ferramentas de IA atuais e futuras.

---

## Ferramentas de IA Afetadas

| Ferramenta | Tipo de Mídia | Arquivo |
|------------|---------------|---------|
| Upscaler Arcano V3 | Imagem | `UpscalerArcanoTool.tsx` |
| Pose Changer | Imagem | `PoseChangerTool.tsx` |
| Veste AI | Imagem | `VesteAITool.tsx` |
| Video Upscaler | Vídeo | `VideoUpscalerTool.tsx` |
| **Futuras ferramentas** | Qualquer | Usarão os mesmos hooks |

---

## Arquitetura Global

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                    COMPONENTES GLOBAIS PARA AI TOOLS                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  src/hooks/                                                                 │
│  └── useResilientDownload.ts  ← Hook global para download                  │
│                                                                             │
│  src/components/ai-tools/                                                   │
│  ├── DownloadProgressOverlay.tsx  ← Overlay global de progresso            │
│  ├── ResilientMediaViewer.tsx     ← Viewer global (imagem/vídeo)           │
│  └── index.ts                     ← Exports atualizados                    │
│                                                                             │
│  src/components/upscaler/                                                   │
│  └── ResilientImage.tsx           ← (já existe) Para sliders               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Hook Global: `useResilientDownload`

**Localização:** `src/hooks/useResilientDownload.ts`

Suporta **imagens E vídeos** com 4 métodos de fallback silenciosos:

```tsx
interface DownloadOptions {
  url: string;
  filename: string;
  mediaType?: 'image' | 'video';  // Detecta automaticamente se não informado
  timeout?: number;               // Padrão: 10000 (10 segundos)
  onSuccess?: () => void;
  onFallback?: () => void;        // Chamado quando abre em nova aba
}

interface DownloadState {
  isDownloading: boolean;
  progress: number;  // 0-100 (só progresso, sem tentativas visíveis)
}

const { isDownloading, progress, download, cancel } = useResilientDownload();
```

**Métodos de fallback (SILENCIOSOS):**

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  Método 1: Fetch + ReadableStream (progresso real)                         │
│       ↓ silencioso (timeout 10s)                                           │
│  Método 2: Fetch + Cache Buster (?_t=timestamp)                            │
│       ↓ silencioso (timeout 10s)                                           │
│  Método 3: Anchor tag direta (navegação)                                   │
│       ↓ silencioso                                                         │
│  Método 4: Share API (mobile - iOS/Android)                                │
│       ↓ silencioso                                                         │
│  Fallback: Abre em nova aba + Toast "Segure para salvar"                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Componente Global: `DownloadProgressOverlay`

**Localização:** `src/components/ai-tools/DownloadProgressOverlay.tsx`

Design **LIMPO** - só progresso, SEM tentativas:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                    ┌──────────────────────┐                                │
│                    │                      │                                │
│                    │         75%          │  ← Progresso circular          │
│                    │                      │                                │
│                    └──────────────────────┘                                │
│                                                                             │
│                  Baixando imagem HD...                                      │
│                                                                             │
│                      [ Cancelar ]                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

SEM "Tentativa X de Y" - usuário não vê nada sobre fallbacks
```

**Props:**
```tsx
interface DownloadProgressOverlayProps {
  isVisible: boolean;
  progress: number;
  onCancel?: () => void;
  mediaType?: 'image' | 'video';  // Muda texto: "imagem HD" ou "vídeo HD"
  locale?: 'pt' | 'es';
}
```

---

## 3. Atualização do `ResilientImage` (já existe)

O componente `ResilientImage.tsx` já foi criado para sliders. Apenas garantir que:
- Funciona com `onDownloadClick` para chamar o hook global
- Suporta localização (pt/es)

---

## 4. Modificações por Ferramenta

### 4.1 UpscalerArcanoTool.tsx

```tsx
// ANTES (linha 556-566):
const downloadResult = useCallback(() => {
  const link = document.createElement('a');
  link.href = outputImage;
  link.download = `upscaled-${Date.now()}.png`;
  link.click();
}, [outputImage]);

// DEPOIS:
import { useResilientDownload } from '@/hooks/useResilientDownload';
import { DownloadProgressOverlay } from '@/components/ai-tools';

const { isDownloading, progress, download, cancel } = useResilientDownload();

const downloadResult = useCallback(async () => {
  if (!outputImage) return;
  await download({
    url: outputImage,
    filename: `upscaled-${Date.now()}.png`,
    mediaType: 'image',
    timeout: 10000,
    onSuccess: () => toast.success(t('upscalerTool.toast.downloaded'))
  });
}, [outputImage, download, t]);

// No JSX:
<DownloadProgressOverlay
  isVisible={isDownloading}
  progress={progress}
  onCancel={cancel}
  mediaType="image"
  locale={locale}
/>
```

### 4.2 PoseChangerTool.tsx

```tsx
// ANTES (linha 437-446):
const handleDownload = () => {
  const link = document.createElement('a');
  link.href = outputImage;
  link.download = `pose-changer-${Date.now()}.png`;
  link.click();
};

// DEPOIS:
import { useResilientDownload } from '@/hooks/useResilientDownload';
import { DownloadProgressOverlay } from '@/components/ai-tools';

const { isDownloading, progress, download, cancel } = useResilientDownload();

const handleDownload = useCallback(async () => {
  if (!outputImage) return;
  await download({
    url: outputImage,
    filename: `pose-changer-${Date.now()}.png`,
    mediaType: 'image',
    timeout: 10000,
    onSuccess: () => toast.success('Download concluído!')
  });
}, [outputImage, download]);

// No JSX:
<DownloadProgressOverlay
  isVisible={isDownloading}
  progress={progress}
  onCancel={cancel}
  mediaType="image"
/>
```

### 4.3 VesteAITool.tsx

```tsx
// ANTES (linha 437-446):
const handleDownload = () => {
  const link = document.createElement('a');
  link.href = outputImage;
  link.download = `veste-ai-${Date.now()}.png`;
  link.click();
};

// DEPOIS:
import { useResilientDownload } from '@/hooks/useResilientDownload';
import { DownloadProgressOverlay } from '@/components/ai-tools';

const { isDownloading, progress, download, cancel } = useResilientDownload();

const handleDownload = useCallback(async () => {
  if (!outputImage) return;
  await download({
    url: outputImage,
    filename: `veste-ai-${Date.now()}.png`,
    mediaType: 'image',
    timeout: 10000,
    onSuccess: () => toast.success('Download concluído!')
  });
}, [outputImage, download]);

// No JSX:
<DownloadProgressOverlay
  isVisible={isDownloading}
  progress={progress}
  onCancel={cancel}
  mediaType="image"
/>
```

### 4.4 VideoUpscalerTool.tsx

```tsx
// ANTES (linha 454-463):
const handleDownload = () => {
  const link = document.createElement('a');
  link.href = outputVideoUrl;
  link.download = `video-upscaler-${Date.now()}.mp4`;
  link.click();
};

// DEPOIS:
import { useResilientDownload } from '@/hooks/useResilientDownload';
import { DownloadProgressOverlay } from '@/components/ai-tools';

const { isDownloading, progress, download, cancel } = useResilientDownload();

const handleDownload = useCallback(async () => {
  if (!outputVideoUrl) return;
  await download({
    url: outputVideoUrl,
    filename: `video-upscaler-${Date.now()}.mp4`,
    mediaType: 'video',
    timeout: 10000,  // Vídeos podem precisar mais tempo
    onSuccess: () => toast.success('Download concluído!')
  });
}, [outputVideoUrl, download]);

// No JSX:
<DownloadProgressOverlay
  isVisible={isDownloading}
  progress={progress}
  onCancel={cancel}
  mediaType="video"
/>
```

---

## 5. Exportar no index.ts

**Atualizar:** `src/components/ai-tools/index.ts`

```tsx
export { default as ActiveJobBlockModal } from './ActiveJobBlockModal';
export { default as JobStepIndicator, STEP_LABELS } from './JobStepIndicator';
export { default as JobDebugModal } from './JobDebugModal';
export { default as JobDebugPanel } from './JobDebugPanel';
export { default as ImageCompressionModal } from './ImageCompressionModal';
export { DownloadProgressOverlay } from './DownloadProgressOverlay';  // NOVO
```

---

## Resumo de Arquivos

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/hooks/useResilientDownload.ts` | CRIAR | Hook global de download |
| `src/components/ai-tools/DownloadProgressOverlay.tsx` | CRIAR | Overlay de progresso |
| `src/components/ai-tools/index.ts` | ATUALIZAR | Export novo componente |
| `src/pages/UpscalerArcanoTool.tsx` | MODIFICAR | Usar hook global |
| `src/pages/PoseChangerTool.tsx` | MODIFICAR | Usar hook global |
| `src/pages/VesteAITool.tsx` | MODIFICAR | Usar hook global |
| `src/pages/VideoUpscalerTool.tsx` | MODIFICAR | Usar hook global |

---

## Padrão para Ferramentas Futuras

Qualquer nova ferramenta de IA deve seguir este padrão:

```tsx
// 1. Importar
import { useResilientDownload } from '@/hooks/useResilientDownload';
import { DownloadProgressOverlay } from '@/components/ai-tools';

// 2. Usar hook
const { isDownloading, progress, download, cancel } = useResilientDownload();

// 3. Função de download
const handleDownload = async () => {
  await download({
    url: outputUrl,
    filename: `nome-ferramenta-${Date.now()}.extensao`,
    mediaType: 'image' | 'video',
    timeout: 10000
  });
};

// 4. Overlay no JSX
<DownloadProgressOverlay
  isVisible={isDownloading}
  progress={progress}
  onCancel={cancel}
  mediaType="image"
/>
```

---

## Garantias

| Item | Status |
|------|--------|
| Edge Functions | Nenhuma alteração |
| Webhooks | Nenhum alterado |
| Banco de dados | Nenhuma alteração |
| Lógica de cobrança | Intocada |
| ResilientImage | Continua funcionando (sliders) |
| Código reutilizável | Hook + componente globais |
