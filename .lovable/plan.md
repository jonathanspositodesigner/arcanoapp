

# Plano: Reduzir Cards de Upload em 72%

## Problema Atual
Os cards de upload "Sua Foto" e "Referência de Pose" estão muito grandes, fazendo o botão ficar fora da área visível da tela.

---

## Alterações no ImageUploadCard.tsx

### Reduzir área de upload
- Mudar aspect ratio de `aspect-[4/3]` para **`h-16`** (altura fixa de 64px)
- Diminuir padding do header de `px-3 py-2` para `px-2 py-1`
- Diminuir ícone de upload de `w-10 h-10` para `w-8 h-8`
- Diminuir ícone interno de `w-5 h-5` para `w-4 h-4`
- Diminuir textos e gaps
- Botão biblioteca de `h-7` para `h-6`

### Antes vs Depois (altura estimada)
| Componente | Antes | Depois |
|------------|-------|--------|
| Header | ~36px | ~24px |
| Upload area | ~150px | ~64px |
| Botão biblioteca | ~44px | ~32px |
| **Total por card** | **~230px** | **~120px** |

---

## Alterações no PoseChangerTool.tsx

### Layout mais compacto
- Reduzir gap entre cards de `gap-3` para `gap-2`
- Reduzir padding vertical de `py-3` para `py-2`
- Botão principal de `py-4` para `py-2`
- Remover informação de créditos que ocupa espaço extra

---

## Resultado Esperado

Todo o layout ficará visível na tela sem scroll:
- Header
- 2 cards de upload compactos
- Botão de ação
- Área de resultado

