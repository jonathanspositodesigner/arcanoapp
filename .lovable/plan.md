

# Plano: Otimizar performance da página /planos-upscaler-arcano (sem mexer nos pixels)

Mantendo Facebook Pixel e Microsoft Clarity exatamente como estão.

## 1. Lazy load de imagens + dimensões (PlanosUpscalerArcano.tsx)

- Avatars do hero social proof (linhas 539-541): já têm `width`/`height`, adicionar `loading="lazy"`
- Avatars da seção de stats (linha 863): adicionar `loading="lazy"`
- Adicionar `fetchpriority="high"` nas imagens do hero via `ResilientImage`

## 2. Adicionar prop `loading` ao ResilientImage

O componente `ResilientImage` renderiza um `<img>` interno sem atributo `loading`. Adicionar prop opcional `loading?: 'eager' | 'lazy'` que é passada ao `<img>`.

## 3. Lazy load de avatars no SocialProofSectionPT

Na `TestimonialCard` (linha 42): adicionar `loading="lazy"` e `width="40" height="40"` no `<img>` do avatar.

## 4. Lazy load do PreCheckoutModal e FullscreenModal

- `PreCheckoutModal` (importado na linha 30): mover para `React.lazy` — só é necessário quando o usuário clica "Comprar"
- `FullscreenModal` (definido inline nas linhas 68-186): extrair para componente lazy ou renderizar condicionalmente (já é condicional com `modalImages`)

## 5. SEO: meta tags específicas para a página

Adicionar `useEffect` em `PlanosUpscalerArcano` para injetar:
- `<meta name="robots" content="index, follow">`
- `<link rel="canonical" href="https://arcanoapp.voxvisual.com.br/planos-upscaler-arcano">`
- Atualizar `document.title` e meta description com keywords de upscaler
- Schema.org JSON-LD com os 4 planos de preço

## 6. Otimizar Google Fonts (index.html)

Adicionar `&subset=latin` na URL do Google Fonts para reduzir payload.

## 7. Preconnect para Pagar.me (index.html)

Adicionar `<link rel="preconnect" href="https://api.pagar.me">` para o checkout.

## Arquivos modificados

| Arquivo | Alteração |
|---|---|
| `index.html` | Adicionar `&subset=latin` nas fontes; preconnect pagar.me |
| `src/components/upscaler/ResilientImage.tsx` | Adicionar prop `loading` |
| `src/pages/PlanosUpscalerArcano.tsx` | Lazy load PreCheckoutModal; `loading="lazy"` nos avatars; SEO meta tags + JSON-LD via useEffect |
| `src/components/upscaler/sections/SocialProofSectionPT.tsx` | `loading="lazy"` + dimensões nos avatars |
| `src/components/upscaler/HeroBeforeAfterSlider.tsx` | Passar `loading="eager"` ao ResilientImage do hero |

