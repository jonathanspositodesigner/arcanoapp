
# Plano: Corrigir Carregamento Lento e Download no Safari - Minhas Criações

## Diagnóstico dos Problemas

### Problema 1: Imagens demoram muito para carregar
**Causa raiz identificada:**
- O `CreationCard` usa `previewUrl = creation.thumbnail_url || creation.output_url`
- Alguns jobs têm `thumbnail_url: null` no banco de dados (verificado: jobs `c49bc619...` e `6037823a...`)
- Quando `thumbnail_url` é `null`, o código usa a `output_url` do CDN chinês RunningHub
- Essas imagens são HD (4-8MB) e ficam em servidor na China = lentidão extrema

**Por que alguns jobs não têm thumbnail?**
- O sistema `generate-thumbnail` é "fire-and-forget" - pode falhar silenciosamente
- Jobs mais antigos podem não ter sido processados

### Problema 2: Download não funciona no Safari (iOS/macOS)
**Causa raiz identificada:**
- O `CreationCard.handleDownload()` usa `fetch()` + `blob()` direto
- O CDN chinês (rh-images-1252422369.cos.ap-beijing.myqcloud.com) bloqueia CORS
- Safari é mais restritivo que Chrome com CORS
- A Edge Function `download-proxy` existe mas **NÃO está sendo usada** no CreationCard

**Solução existente que funciona:**
- O `useResilientDownload` hook já resolve isso com 5 métodos de fallback
- Usado no Upscaler, Pose Changer, Veste AI - funciona perfeitamente no Safari

---

## Solução

### Mudança 1: Usar `useResilientDownload` no CreationCard

Substituir o `handleDownload` manual pelo hook que já funciona:

```typescript
// ANTES (não funciona no Safari):
const handleDownload = async () => {
  const response = await fetch(creation.output_url);  // ❌ CORS error
  const blob = await response.blob();
  // ...
};

// DEPOIS (funciona em todos browsers):
import { useResilientDownload } from '@/hooks/useResilientDownload';

const { download, isDownloading } = useResilientDownload();

const handleDownload = () => {
  download({
    url: creation.output_url,
    filename: `${creation.tool_name.replace(/\s/g, '-')}-${creation.id.slice(0, 8)}.${isVideo ? 'mp4' : 'png'}`,
    mediaType: isVideo ? 'video' : 'image',
    timeout: 15000,
    locale: 'pt'
  });
};
```

### Mudança 2: Fallback inteligente para preview sem thumbnail

Para jobs que não têm thumbnail, usar o proxy Edge Function para carregar preview:

```typescript
// Usar proxy para imagens do CDN chinês quando não houver thumbnail local
const getProxyUrl = (originalUrl: string): string => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) return originalUrl;
  
  // Se já é do nosso storage, usar direto
  if (originalUrl.includes('supabase.co')) return originalUrl;
  
  // Usar proxy para CDN chinês
  return `${supabaseUrl}/functions/v1/download-proxy?url=${encodeURIComponent(originalUrl)}`;
};

const previewUrl = creation.thumbnail_url || getProxyUrl(creation.output_url);
```

**Benefício:** A Edge Function `download-proxy` faz o fetch server-side (sem CORS) e retorna a imagem.

---

## Arquivos Modificados

| Arquivo | Mudança |
|---------|---------|
| `src/components/ai-tools/creations/CreationCard.tsx` | Usar `useResilientDownload` + proxy para preview |

---

## Detalhes Técnicos

### Fluxo de Download Corrigido

```text
┌─────────────────────────────────────────────────────────────────┐
│                FLUXO DE DOWNLOAD (TODOS BROWSERS)               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Usuário clica "Baixar"                                         │
│       │                                                         │
│       ▼                                                         │
│  useResilientDownload.download()                                │
│       │                                                         │
│       ├─→ Método 0: Proxy Edge Function (melhor para iOS)       │
│       │     └─→ window.location.href = proxy URL                │
│       │         └─→ Edge Function faz fetch server-side         │
│       │             └─→ Retorna com Content-Disposition         │
│       │                                                         │
│       ├─→ Método 1: Fetch + ReadableStream (fallback)           │
│       ├─→ Método 2: Fetch + Cache Buster (fallback)             │
│       ├─→ Método 3: Anchor tag (fallback)                       │
│       ├─→ Método 4: Share API mobile (fallback)                 │
│       └─→ Final: Abre nova aba                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Fluxo de Preview Corrigido

```text
┌─────────────────────────────────────────────────────────────────┐
│                  FLUXO DE PREVIEW DE IMAGEM                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  CreationCard renderiza                                         │
│       │                                                         │
│       ▼                                                         │
│  Tem thumbnail_url?                                             │
│       │                                                         │
│       ├─→ SIM: Usar thumbnail (Supabase Storage, rápido)        │
│       │        https://xxx.supabase.co/storage/.../thumbnail    │
│       │                                                         │
│       └─→ NÃO: Usar proxy para output_url                       │
│                https://xxx.supabase.co/functions/v1/            │
│                download-proxy?url=CDN_CHINES_URL                │
│                                                                 │
│  Resultado: Imagem carrega via servidor (sem CORS)              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Código Completo da Mudança

```typescript
// CreationCard.tsx - Mudanças principais

import { useResilientDownload } from '@/hooks/useResilientDownload';

const CreationCard: React.FC<CreationCardProps> = ({ creation }) => {
  const [imageError, setImageError] = useState(false);
  const { download, isDownloading } = useResilientDownload();
  
  const { text: timeText, urgency } = formatTimeRemaining(creation.expires_at);
  const isVideo = creation.media_type === 'video';
  
  // Função para obter URL de preview via proxy quando necessário
  const getPreviewUrl = (): string => {
    // Se tem thumbnail local, usar (rápido, sem CORS)
    if (creation.thumbnail_url) {
      return creation.thumbnail_url;
    }
    
    // Se não tem thumbnail, usar proxy para buscar do CDN chinês
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) return creation.output_url;
    
    // Já é do nosso storage? Usar direto
    if (creation.output_url.includes('supabase.co')) {
      return creation.output_url;
    }
    
    // Usar proxy Edge Function
    return `${supabaseUrl}/functions/v1/download-proxy?url=${encodeURIComponent(creation.output_url)}`;
  };
  
  const previewUrl = getPreviewUrl();
  
  // Download usando hook resiliente (funciona no Safari)
  const handleDownload = () => {
    download({
      url: creation.output_url,
      filename: `${creation.tool_name.replace(/\s/g, '-')}-${creation.id.slice(0, 8)}.${isVideo ? 'mp4' : 'png'}`,
      mediaType: isVideo ? 'video' : 'image',
      timeout: 15000,
      locale: 'pt'
    });
  };

  // ... resto do componente
};
```

---

## Vantagens da Solução

| Problema | Solução | Benefício |
|----------|---------|-----------|
| Preview lento | Proxy server-side | Sem CORS, carrega em ~1-2s |
| Download falha Safari | useResilientDownload | 5 fallbacks automáticos |
| Código duplicado | Reutiliza hook existente | Menos manutenção |
| CDN chinês instável | Edge Function como intermediário | Mais confiável |

---

## Garantias de Segurança

| Item | Status |
|------|--------|
| Edge Functions | Reutiliza `download-proxy` existente |
| Banco de dados | Não é modificado |
| Autenticação | Não afetada |
| Outras ferramentas | Não afetadas |
| Jobs em andamento | Não afetados |
