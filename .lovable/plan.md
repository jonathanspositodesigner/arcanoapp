

## Plano: Criar página `prevenda-pack4` como clone exato de `combo3em1`

### O que será feito

A página `combo3em1` já existe neste projeto como `ComboArtesArcanas.tsx`, usando os componentes de `src/components/combo-artes/`. O clone será uma cópia exata, apenas com rota e nome diferentes.

### Alterações

**1. Criar `src/pages/PrevendaPack4.tsx`**
- Cópia exata de `ComboArtesArcanas.tsx`
- Reutiliza todos os mesmos componentes de `combo-artes/` (mesmas imagens, mesmas seções, mesmo layout)
- Atualizar apenas o `content_name` do Meta Pixel para `"Prevenda Pack 4"` para tracking separado

**2. Atualizar `src/App.tsx`**
- Adicionar lazy import: `const PrevendaPack4 = lazy(() => import("./pages/PrevendaPack4"))`
- Adicionar rota: `<Route path="/prevenda-pack4" element={<PrevendaPack4 />} />`

### Resultado
- Página acessível em `/prevenda-pack4`
- 100% idêntica visualmente à `/combo-artes-arcanas` (mesmos componentes, imagens, links)
- Apenas nome interno e tracking diferenciados

