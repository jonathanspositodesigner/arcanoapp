

## Plan: Add "Ver mais" expandable button to the gallery

### What will be done

Add a collapsible section below the current 20 images in `FlyersGallerySection.tsx`. The 10 new uploaded images will be hidden by default and revealed when clicking a "Ver mais" button. When expanded, the page scrolls down to show the new images, and the button text changes to "Ver menos".

### Technical approach

1. **Copy 10 new images** to `public/images/pack4/` with clean filenames:
   - `mexicomigo.webp`, `exclusive-night.webp`, `feriadinho-domingo.webp`, `festa-do-branco.webp`, `fogo-parquinho.webp`, `forro-piseiro.webp`, `forrozinho-delas.webp`, `i-love-baile-funk.webp`, `life-party-fest.webp`, `live-sunset.webp`

2. **Update `FlyersGallerySection.tsx`**:
   - Add `useState` for expanded/collapsed toggle
   - Split images into two arrays: `galleryImages` (current 20) and `extraImages` (new 10)
   - Render `extraImages` in a conditionally visible grid below the main one
   - Add a styled "Ver mais" / "Ver menos" button between the grids
   - Use `useRef` + `scrollIntoView` to scroll down when expanded

### Files changed
- `src/components/combo-artes/FlyersGallerySection.tsx` (edit)
- 10 new image files in `public/images/pack4/` (create)

