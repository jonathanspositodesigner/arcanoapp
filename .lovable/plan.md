
## Correcoes: Modo Refinar no Flyer Maker

### Problema 1: Inputs nao somem ao clicar em Refinar
Atualmente o `RefinePanel` aparece JUNTO com todos os inputs (referencia, fotos, logo, textos, botao Gerar). O correto e: ao clicar em "Refinar", esconder todos os controles de geracao e mostrar APENAS o RefinePanel.

**Correcao em `src/pages/FlyerMakerTool.tsx`:**
Envolver todos os inputs iniciais (linhas 577-692) com `{!refineMode && (...)}` e mover o RefinePanel para fora desse bloco, de modo que quando `refineMode === true`, so apareca o RefinePanel.

### Problema 2: Edge function nao reconhece `flyer_maker_refine`
O `generate-image` Edge Function so trata `source === "arcano_cloner_refine"` com custo fixo de 30 creditos. O source `flyer_maker_refine` cai no `else` e cobra 80-100 creditos (preco de geracao normal). 

**Correcao em `supabase/functions/generate-image/index.ts`:**
Adicionar `flyer_maker_refine` na condicao junto com `arcano_cloner_refine`:

```
if (source === "arcano_cloner_refine" || source === "flyer_maker_refine") {
  creditCost = 30;
  toolDescription = source === "flyer_maker_refine" 
    ? "Refinamento Flyer Maker" 
    : "Refinamento Arcano Cloner";
}
```

### Resumo

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/FlyerMakerTool.tsx` | Esconder inputs quando `refineMode === true`, mostrar so RefinePanel |
| `supabase/functions/generate-image/index.ts` | Adicionar `flyer_maker_refine` com custo fixo 30 creditos |
