

# Plano: Sistema Resiliente de Carregamento de Imagens para Slider Antes/Depois

## Entendimento Confirmado

1. **Download HD NÃO será tocado** - O `downloadResult()` continua usando `outputImage` original
2. **Mudanças são APENAS para visualização no slider**
3. **Auto-compressão silenciosa** - se a imagem original não carregar, criar versão leve (2000px + webp)
4. **Fallback amigável** - Se tudo falhar, mostra mensagem "Visualização indisponível" + botão "Baixar em HD"

---

## Arquitetura da Solução

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                    FLUXO DE CARREGAMENTO RESILIENTE                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  outputImage (URL original do RunningHub)                                   │
│       │                                                                     │
│       ├──► Download HD: Usa URL original sempre ✓                          │
│       │                                                                     │
│       └──► Slider de Visualização:                                         │
│             │                                                               │
│             ▼                                                               │
│       ┌─────────────────────────────────────────────────────────────┐      │
│       │  ResilientImage - Tentativa 1: Carregar URL original        │      │
│       │       ↓ (falha ou timeout 8s)                               │      │
│       │  Tentativa 2: URL + cache buster (?_t=timestamp)            │      │
│       │       ↓ (falha ou timeout 8s)                               │      │
│       │  Tentativa 3: Fetch → Blob → Compressão 2000px/webp         │      │
│       │       ↓ (se ainda falhar)                                   │      │
│       │  Fallback: "Visualização indisponível" + Botão Baixar HD    │      │
│       └─────────────────────────────────────────────────────────────┘      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Fallback Final - Design Visual

```text
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│              ┌─────────────────────────┐                   │
│              │                         │                   │
│              │    📷  (ícone imagem)   │                   │
│              │                         │                   │
│              │  Visualização           │                   │
│              │  indisponível           │                   │
│              │                         │                   │
│              │  Sua imagem está pronta │                   │
│              │                         │                   │
│              │  ┌─────────────────┐    │                   │
│              │  │  ⬇ Baixar HD   │    │                   │
│              │  └─────────────────┘    │                   │
│              │                         │                   │
│              └─────────────────────────┘                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Componentes e Arquivos

### 1. CRIAR: `src/components/upscaler/ResilientImage.tsx`

Componente inteligente com fallback customizado:

```tsx
interface ResilientImageProps {
  src: string;                    // URL original (HD)
  originalSrc?: string;           // URL para download (caso diferente)
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  timeout?: number;               // ms por tentativa (padrão: 8000)
  maxRetries?: number;            // tentativas (padrão: 3)
  compressOnFailure?: boolean;    // comprime para 2000px no método 3
  showDownloadOnFail?: boolean;   // mostra botão download no fallback
  downloadFileName?: string;      // nome do arquivo para download
  onLoadSuccess?: () => void;
  onDownloadClick?: () => void;   // callback customizado para download
}
```

**Fallback Component (quando tudo falha):**
```tsx
const FallbackDisplay = ({ onDownload, downloadFileName }) => (
  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
    <div className="text-center p-6 space-y-4">
      <div className="w-16 h-16 mx-auto rounded-full bg-white/10 flex items-center justify-center">
        <ImageIcon className="w-8 h-8 text-white/60" />
      </div>
      <div className="space-y-1">
        <p className="text-white font-medium">Visualização indisponível</p>
        <p className="text-white/60 text-sm">Sua imagem está pronta!</p>
      </div>
      <Button
        onClick={onDownload}
        className="bg-gradient-to-r from-fuchsia-500 to-purple-600 hover:from-fuchsia-600 hover:to-purple-700"
      >
        <Download className="w-4 h-4 mr-2" />
        Baixar em HD
      </Button>
    </div>
  </div>
);
```

### 2. MODIFICAR: `src/components/upscaler/BeforeAfterSlider.tsx`

Adicionar props para o fallback com download:

```tsx
interface BeforeAfterSliderProps {
  beforeImage: string;
  afterImage: string;
  label?: string;
  size?: "default" | "large";
  onZoomClick?: () => void;
  locale?: 'pt' | 'es';
  aspectRatio?: string;
  onDownloadClick?: () => void;     // NOVO: callback para download
  downloadFileName?: string;         // NOVO: nome do arquivo
}
```

Usar `ResilientImage` com a prop de download:

```tsx
<ResilientImage
  src={afterImage}
  alt={locale === 'es' ? "Después" : "Depois"}
  className="absolute inset-0 w-full h-full object-cover"
  timeout={8000}
  compressOnFailure={true}
  showDownloadOnFail={true}
  onDownloadClick={onDownloadClick}
  downloadFileName={downloadFileName}
/>
```

### 3. MODIFICAR: `src/components/upscaler/HeroBeforeAfterSlider.tsx`

Mesmo padrão, com suporte ao fallback de download.

### 4. MODIFICAR: `src/pages/UpscalerArcanoTool.tsx`

Passar o `downloadResult` como callback para o slider:

```tsx
// No slider de resultado (após processamento)
<BeforeAfterSlider
  beforeImage={inputPreview}
  afterImage={outputImage}
  onDownloadClick={downloadResult}  // Usa a função existente!
  downloadFileName={`upscaled-${Date.now()}.png`}
/>
```

### 5. ATUALIZAR: `src/components/upscaler/index.ts`

Adicionar export do novo componente:
```tsx
export { ResilientImage } from './ResilientImage';
```

---

## Especificação Técnica do ResilientImage

```tsx
const ResilientImage = ({
  src,
  originalSrc,
  alt,
  className,
  style,
  timeout = 8000,
  maxRetries = 3,
  compressOnFailure = true,
  showDownloadOnFail = false,
  downloadFileName,
  onLoadSuccess,
  onDownloadClick
}: ResilientImageProps) => {
  const [attempt, setAttempt] = useState(1);
  const [currentSrc, setCurrentSrc] = useState(src);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isFailed, setIsFailed] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const objectUrlRef = useRef<string | null>(null);

  // Limpa ObjectURLs na desmontagem
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  // Reset quando src muda
  useEffect(() => {
    setAttempt(1);
    setCurrentSrc(src);
    setIsLoaded(false);
    setIsFailed(false);
  }, [src]);

  // Timeout handler
  useEffect(() => {
    if (isLoaded || isFailed) return;

    const timer = setTimeout(() => {
      if (!isLoaded) {
        console.debug(`[ResilientImage] Timeout na tentativa ${attempt}`);
        handleRetry();
      }
    }, timeout);

    return () => clearTimeout(timer);
  }, [attempt, isLoaded, isFailed, timeout]);

  const handleRetry = async () => {
    if (attempt >= maxRetries) {
      setIsFailed(true);
      return; // Não seta fallback image, deixa o FallbackDisplay aparecer
    }

    const nextAttempt = attempt + 1;
    setAttempt(nextAttempt);

    if (nextAttempt === 2) {
      // Cache buster
      const buster = `${src}${src.includes('?') ? '&' : '?'}_t=${Date.now()}`;
      setCurrentSrc(buster);
    } else if (nextAttempt === 3 && compressOnFailure) {
      // Fetch + compress
      setIsCompressing(true);
      try {
        const response = await fetch(src, { mode: 'cors' });
        const blob = await response.blob();
        const file = new File([blob], 'temp.webp', { type: blob.type });
        const { file: compressed } = await compressToMaxDimension(file, 2000);
        
        if (objectUrlRef.current) {
          URL.revokeObjectURL(objectUrlRef.current);
        }
        
        const compressedUrl = URL.createObjectURL(compressed);
        objectUrlRef.current = compressedUrl;
        setCurrentSrc(compressedUrl);
      } catch (err) {
        console.error('[ResilientImage] Erro no fetch/compress:', err);
        setIsFailed(true);
      } finally {
        setIsCompressing(false);
      }
    }
  };

  const handleDownload = () => {
    if (onDownloadClick) {
      onDownloadClick();
    } else {
      // Download padrão se não tiver callback customizado
      const link = document.createElement('a');
      link.href = originalSrc || src;
      link.download = downloadFileName || `image-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Se falhou e tem opção de download, mostra fallback amigável
  if (isFailed && showDownloadOnFail) {
    return (
      <div className={cn("relative", className)} style={style}>
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg">
          <div className="text-center p-6 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-white/10 flex items-center justify-center">
              <ImageIcon className="w-8 h-8 text-white/60" />
            </div>
            <div className="space-y-1">
              <p className="text-white font-medium">Visualização indisponível</p>
              <p className="text-white/60 text-sm">Sua imagem está pronta!</p>
            </div>
            <Button
              onClick={handleDownload}
              size="sm"
              className="bg-gradient-to-r from-fuchsia-500 to-purple-600 hover:from-fuchsia-600 hover:to-purple-700"
            >
              <Download className="w-4 h-4 mr-2" />
              Baixar em HD
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)} style={style}>
      {/* Loading indicator durante compressão */}
      {isCompressing && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 z-10 rounded-lg">
          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}
      
      <img
        src={currentSrc}
        alt={alt}
        className="w-full h-full object-cover"
        style={{
          opacity: isLoaded ? 1 : 0,
          transition: 'opacity 0.3s ease-in-out'
        }}
        onLoad={() => {
          setIsLoaded(true);
          onLoadSuccess?.();
        }}
        onError={() => !isLoaded && handleRetry()}
        draggable={false}
      />
    </div>
  );
};
```

---

## Resultado Visual do Fallback

Quando todas as tentativas falharem, o usuário verá:

| Elemento | Descrição |
|----------|-----------|
| Ícone | Imagem estilizada (ImageIcon) |
| Título | "Visualização indisponível" |
| Subtítulo | "Sua imagem está pronta!" |
| Botão | Gradiente fuchsia → purple, ícone de download |
| Ação | Chama `downloadResult()` existente |

---

## Fluxo Completo

```text
┌──────────────────────────────────────────────────────────────────────────┐
│                          CELULAR COM FALHA TOTAL                        │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. Tentativa 1: Timeout                                                 │
│  2. Tentativa 2: Cache buster - Timeout                                  │
│  3. Tentativa 3: Fetch + Compress - Falha (sem internet?)                │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │                                                                     ││
│  │                     📷                                              ││
│  │                                                                     ││
│  │              Visualização indisponível                              ││
│  │              Sua imagem está pronta!                                ││
│  │                                                                     ││
│  │              ┌─────────────────────┐                                ││
│  │              │  ⬇ Baixar em HD    │  ← Clica e baixa outputImage   ││
│  │              └─────────────────────┘                                ││
│  │                                                                     ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                          │
│  Usuário baixa a imagem HD normalmente! ✓                               │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Garantias

| Item | Status |
|------|--------|
| Download HD preservado | Usa `downloadResult()` existente |
| Edge Functions | Nenhuma alteração |
| Webhooks | Nenhum alterado |
| Banco de dados | Nenhuma alteração |
| Lógica de cobrança | Intocada |

---

## Resumo de Alterações

| Arquivo | Ação | Impacto |
|---------|------|---------|
| `src/components/upscaler/ResilientImage.tsx` | CRIAR | Novo componente |
| `src/components/upscaler/BeforeAfterSlider.tsx` | MODIFICAR | Props + ResilientImage |
| `src/components/upscaler/HeroBeforeAfterSlider.tsx` | MODIFICAR | Props + ResilientImage |
| `src/pages/UpscalerArcanoTool.tsx` | MODIFICAR | Passa downloadResult |
| `src/components/upscaler/index.ts` | ATUALIZAR | Export novo componente |

