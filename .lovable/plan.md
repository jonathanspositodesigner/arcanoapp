
# Correção: Animação sumindo + cursor fora do botão 1:1

## Problema 1 — Resultado some antes de ser visto

O timer do step 3 (`STEP_DURATIONS[3] = 3200ms`) começa a contar do início do step, mas a sequência interna é:
- ~200ms delay inicial do cursor
- ~600ms movimento do cursor
- ~250ms clique
- ~300ms delay após clique para iniciar loading
- ~1600ms loading (100 ticks de 40ms com +2.5%)
- ~200ms reveal do resultado

Total interno: ~3150ms — quase igual ao timer. O resultado aparece por menos de 100ms antes do reset.

**Correção:** Aumentar `STEP_DURATIONS[3]` de `3200` para `5500ms` para o resultado ficar visível por ~2 segundos antes de reiniciar o loop.

## Problema 2 — Cursor posicionado errado no botão Quadrado

No step 2, o cursor vai para `animateCursor(38, 72, ...)`. O botão "1:1 Quadrado" é o **segundo botão** numa grade de 4 botões iguais dentro do seletor de proporção. Com base no layout:

- O seletor ocupa a largura do painel esquerdo (`md:col-span-3` de 5 = ~60% da largura total)
- Os 4 botões dividem esse espaço em 4 colunas iguais
- O botão "Quadrado" (índice 1) está aproximadamente em **~28% do horizontal** (dentro do col-span-3)
- Verticalmente, o seletor fica depois das duas cards e tem sua posição em torno de **~70% do container**

**Correção:** Ajustar cursor de `(38, 72)` para `(22, 72)` — movendo para a esquerda para cair no segundo botão da grade (Stories=col1, Quadrado=col2).

Na realidade, o painel esquerdo vai de 0% a ~60% da largura total do mockup. O botão Quadrado é o 2º de 4 no painel esquerdo, então sua posição horizontal absoluta no mockup fica em torno de:
- Painel: 0-60%, grid col 2/4 = botão em ~22.5% a ~37.5% do painel = centro ~30% do painel = ~18% do total

**Valor ajustado:** `(18, 72)` — cursor vai cair no centro do botão Quadrado.

## Mudanças no arquivo

**`src/components/arcano-cloner/ClonerDemoAnimation.tsx`**

| Linha | Mudança |
|---|---|
| 6 | `STEP_DURATIONS[3]`: `3200` → `5500` |
| 81 | `animateCursor(38, 72, ...)` → `animateCursor(18, 72, ...)` |

Duas linhas apenas, cirúrgico e preciso.
