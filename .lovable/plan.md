

# Plano: Substituir galeria scroll-driven por galeria manual no mobile

## O que muda

No mobile, o `ScrollDrivenGallery` atual ocupa `N * 100vh` de altura e usa o scroll da página para mover o slider automaticamente. Isso será substituído por uma galeria compacta com:

- **Setas esquerda/direita** para navegar entre as imagens
- **Slider antes/depois manual** (arraste com o dedo) em cada imagem
- **Scroll normal da página** — sem sequestro do scroll

No desktop, tudo permanece igual (ScrollDrivenGallery funciona como está).

## Alterações

### 1. Criar `MobileBeforeAfterGallery.tsx`

Novo componente com:
- Estado `currentIndex` para navegar entre os items
- Duas setas (← →) nos lados da imagem para trocar de slide
- Cada slide é um before/after com slider **manual por toque/arraste** (o usuário controla o slider arrastando com o dedo, usando `onTouchMove` / `onMouseMove`)
- Dots de progresso embaixo
- Altura fixa (~70vh) sem ocupar múltiplas telas

### 2. Atualizar `PlanosUpscalerArcano.tsx` (linhas 641-651)

Condicionar pelo `isMobile`:
- **Mobile**: renderizar `MobileBeforeAfterGallery` com `galleryItemsMobile`
- **Desktop**: manter `ScrollDrivenGallery` com `galleryItemsDesktop`

## Arquivos

| Arquivo | Alteração |
|---|---|
| `src/components/upscaler/MobileBeforeAfterGallery.tsx` | Criar — galeria com setas e slider manual |
| `src/pages/PlanosUpscalerArcano.tsx` | Condicionar mobile vs desktop na seção da galeria |

