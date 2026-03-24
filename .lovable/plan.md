

# Plano: Trocar posição das seções na página planos-upscaler-arcano

## Alteração

No `src/pages/PlanosUpscalerArcano.tsx`, trocar a ordem de duas seções:

**Ordem atual (linhas 603-655):**
1. "Melhorado com o Upscaler Arcano" (ScrollDrivenGallery) — linhas 603-618
2. "Para quem é" — linhas 620-649
3. "Funciona com qualquer imagem" (BeforeAfterGalleryPT) — linhas 651-655

**Nova ordem:**
1. "Funciona com qualquer imagem" (BeforeAfterGalleryPT)
2. "Para quem é"
3. "Melhorado com o Upscaler Arcano" (ScrollDrivenGallery)

Apenas mover os blocos JSX — nenhuma lógica ou estilo muda.

| Arquivo | Alteração |
|---|---|
| `src/pages/PlanosUpscalerArcano.tsx` | Reordenar blocos das seções (linhas 603-655) |

