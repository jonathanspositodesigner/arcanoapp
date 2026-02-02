

# Plano: Ajustar Proporções das Colunas

## Alteração no Layout

Vou alterar o grid de **5 colunas** para **7 colunas** para ter mais granularidade:

### Antes (atual)
- Esquerda: `col-span-2` de 5 = **40%**
- Direita: `col-span-3` de 5 = **60%**

### Depois (proposto)
- Esquerda: `col-span-2` de 7 = **~28%** (30% menos que 40%)
- Direita: `col-span-5` de 7 = **~72%**

---

## Alterações no Arquivo

**`src/pages/PoseChangerTool.tsx`**

| Linha | Antes | Depois |
|-------|-------|--------|
| 109 | `lg:grid-cols-5` | `lg:grid-cols-7` |
| 112 | `lg:col-span-2` | `lg:col-span-2` (mantém) |
| 153 | `lg:col-span-3` | `lg:col-span-5` |

---

## Resultado Visual

```text
┌──────────────────────────────────────────────────────────────────┐
│                          HEADER                                   │
├────────────────┬─────────────────────────────────────────────────┤
│   CONTROLES    │                                                  │
│   (~28%)       │            RESULTADO                             │
│                │            (~72%)                                │
│  ┌──────────┐  │                                                  │
│  │Sua Foto  │  │                                                  │
│  └──────────┘  │                                                  │
│  ┌──────────┐  │                                                  │
│  │Referência│  │                                                  │
│  └──────────┘  │                                                  │
│  [GERAR]       │                                                  │
└────────────────┴─────────────────────────────────────────────────┘
```

