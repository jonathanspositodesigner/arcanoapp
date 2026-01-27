
# Plano de Otimização de Performance - Combo Artes Arcanas

## Resumo do Problema

A página `/combo-artes-arcanas` apresenta alertas de cache ineficiente no PageSpeed Insights com **economia estimada de 2.735 KiB**. Os maiores ofensores são:

- **4 vídeos MP4 de depoimentos** (~2.2 MB total) sem cache
- **10+ vídeos de motions** carregando metadados
- **100+ imagens** vindas do WordPress sem controle de cache
- **Scripts de terceiros** (Meta Pixel, Clarity) com cache curto

## Estratégia de Otimização

### Fase 1: Otimização de Vídeos de Depoimentos

**O que vamos fazer:**
- Substituir os vídeos embutidos por thumbnails estáticas (primeiro frame)
- Carregar vídeo apenas quando o usuário clicar para assistir
- Usar `poster` com imagem WebP leve em vez de `preload="metadata"`

**Impacto esperado:** Economia de ~2.2 MB no carregamento inicial

```text
┌─────────────────────────────────────────────────────────────┐
│                    ANTES (Atual)                            │
├─────────────────────────────────────────────────────────────┤
│  [Video 1]    [Video 2]    [Video 3]    [Video 4]          │
│  preload=     preload=     preload=     preload=           │
│  metadata     metadata     metadata     metadata           │
│                                                            │
│  ↓ Carrega ~500KB de metadados de cada vídeo               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    DEPOIS (Otimizado)                       │
├─────────────────────────────────────────────────────────────┤
│  [Poster 1]   [Poster 2]   [Poster 3]   [Poster 4]         │
│  ~20KB cada   ~20KB cada   ~20KB cada   ~20KB each         │
│                                                            │
│  ↓ Vídeo carrega apenas ao clicar (on-demand)              │
└─────────────────────────────────────────────────────────────┘
```

### Fase 2: Lazy Loading Agressivo para Seções Abaixo do Fold

**O que vamos fazer:**
- Aplicar React.lazy() + Suspense nas seções pesadas:
  - `MotionsGallerySection` (10 thumbnails + vídeos)
  - `TestimonialsSection` (4 imagens + 4 vídeos)
  - `Selos3DSection` (26 imagens)
  - `BonusFimDeAnoSection` (7 imagens)
- Usar IntersectionObserver para carregar apenas quando visível

**Impacto esperado:** Redução de ~60% no payload inicial

### Fase 3: Cache de Service Worker para Assets Externos

**O que vamos fazer:**
- Adicionar regra de runtimeCaching no Workbox para:
  - Imagens do WordPress (`voxvisual.com.br/wp-content/*`)
  - Vídeos externos (cache com 7 dias após primeiro acesso)

**Configuração:**
```text
urlPattern: /^https:\/\/(lp\.)?voxvisual\.com\.br\/.*\.(webp|jpg|png|mp4)$/i
handler: CacheFirst
maxAge: 7 dias
```

### Fase 4: Otimização de Carrosséis

**O que vamos fazer:**
- Carregar apenas 3-5 imagens iniciais visíveis no carrossel
- Lazy load das demais à medida que o usuário navega
- Implementar `loading="lazy"` em todas as imagens (já presente, mas confirmar)

---

## Detalhes Técnicos

### Arquivos a serem modificados:

| Arquivo | Alteração |
|---------|-----------|
| `vite.config.ts` | Adicionar runtimeCaching para assets externos do WordPress |
| `TestimonialsSection.tsx` | Substituir vídeos por posters estáticos + carregamento on-demand |
| `ComboArtesArcanas.tsx` | Implementar React.lazy para seções abaixo do fold |
| `MotionsGallerySection.tsx` | Já usa thumbnails - apenas confirmar otimização |

### Criação de novos arquivos:

| Arquivo | Propósito |
|---------|-----------|
| `src/components/combo-artes/LazySection.tsx` | Wrapper com IntersectionObserver para lazy loading de seções |

---

## Resultados Esperados

| Métrica | Antes | Depois |
|---------|-------|--------|
| Payload inicial | ~3 MB | ~800 KB |
| Vídeos carregados | 4 (on load) | 0 (on demand) |
| Imagens above fold | ~60 | ~15 |
| Cache hit rate | ~30% | ~85% |

---

## Limitações

Os seguintes itens estão **fora do nosso controle**:

1. **Cache de scripts do Facebook/Clarity** - Definido pelos servidores de terceiros
2. **Headers de cache do WordPress** - O servidor `voxvisual.com.br` define os headers

A solução via Service Worker mitiga parcialmente esses problemas ao cachear localmente após o primeiro acesso.

---

## Ordem de Implementação

1. Otimizar vídeos de depoimentos (maior impacto imediato)
2. Adicionar lazy loading de seções
3. Configurar cache de Service Worker para externos
4. Ajustar carrosséis para carregamento progressivo
