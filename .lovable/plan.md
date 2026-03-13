

## Plan: Recreate `/pack-agendas` page

The page and all 12 components were previously deleted. They exist in the **Landing Page Hub** project and need to be copied here.

### Files to create

1. **`src/pages/PackAgendas.tsx`** - Main page file (from the uploaded code)

2. **12 component files** under `src/components/pack-agendas/`:
   - `TopBanner.tsx`
   - `HeroSectionAgendas.tsx`
   - `ValueSection.tsx`
   - `EdicaoFacilSection.tsx`
   - `BonusExclusivoSection.tsx`
   - `PricingSection.tsx`
   - `BonusLibrarySection.tsx`
   - `GuaranteeSection.tsx`
   - `TestimonialsAgendas.tsx`
   - `FloatingCTAAgendas.tsx`
   - `AboutSectionAgendas.tsx`
   - `FAQSectionAgendas.tsx`

   All sourced from the Landing Page Hub project. They use `appendUtmToUrl` from `@/lib/utmUtils` (already exists here) and standard UI components like `Accordion` (already exists).

3. **`src/App.tsx`** - Add lazy import for `PackAgendas` and a `<Route path="/pack-agendas">` entry.

### No database or backend changes needed

This is purely a frontend page restoration.

