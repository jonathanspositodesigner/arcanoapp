

# Plano: Otimização PageSpeed da /planos-upscaler-arcano (sem mexer nos pixels/clarity)

## Análise do que é viável vs. não viável

**Já está feito (não precisa mexer):**
- Cache de assets: o `_headers` já tem `/assets/*` com `max-age=31536000, immutable` e `/images/*` com cache de 30 dias. `/sounds/*` não tem regra — adicionar.
- `PreCheckoutModal` já é `React.lazy` (linha 30)
- `ScrollDrivenGallery`, `MobileBeforeAfterGallery`, `BeforeAfterGalleryPT` já são lazy (linhas 39-42)
- `ResilientImage` já suporta `loading`, `fetchPriority`, `width`, `height`
- Fontes já carregam com preload async (linhas 35-41)
- Lucide icons já importa individualmente (linha 21)
- CSS purge do Tailwind já está configurado via `content` no config

**Não vou mexer (por instrução do usuário):**
- Facebook Pixel e Microsoft Clarity — manter como estão

**Não é viável sem risco de quebra:**
- Remover Supabase do bundle — a página usa `supabase` para `fetchToolData` e `usePremiumArtesStatus`
- CSS code splitting por rota — Vite SPA não suporta CSS splitting automático por rota sem mudança arquitetural significativa

## Correções a implementar

### 1. Cache para `/sounds/*` no `_headers`
Adicionar regra de cache para arquivos de áudio (notification.mp3 sem cache atualmente).

### 2. Viewport meta — permitir zoom (acessibilidade)
Remover `maximum-scale=1.0, user-scalable=no` do `index.html` — melhora score de Práticas Recomendadas.

### 3. Limpar preconnects desnecessários
- **Remover**: `images.unsplash.com` (não é usado na página)
- **Remover**: `api.pagar.me` (só usado se o usuário clicar em comprar, preconnect desperdiça conexão)
- **Manter**: Supabase, Google Fonts

### 4. Headers de segurança no `_headers`
Adicionar ao `_headers`:
- `X-Frame-Options: SAMEORIGIN`
- `Cross-Origin-Opener-Policy: same-origin`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`

### 5. Corrigir URL da fonte com 404
A URL `https://fonts.gstatic.com/s/bebasneue/v14/JTUSjIg69CK48gW7PXooxW5rygbi49c.woff2` pode estar desatualizada. Atualizar o preload para a versão correta consultando o Google Fonts atual.

### 6. FullscreenModal para lazy load
O `FullscreenModal` (definido inline nas linhas 68-186) é renderizado condicionalmente mas está no bundle principal. Extrair para arquivo separado e usar `React.lazy`.

## Arquivos modificados

| Arquivo | Alteração |
|---|---|
| `index.html` | Corrigir viewport meta; remover preconnects não usados; atualizar URL preload da fonte |
| `public/_headers` | Adicionar cache para `/sounds/*`; adicionar headers de segurança globais |
| `src/components/upscaler/FullscreenModal.tsx` | Extrair componente do PlanosUpscalerArcano |
| `src/pages/PlanosUpscalerArcano.tsx` | Importar FullscreenModal via React.lazy |

