
# Plano: Correção de Contraste dos Botões e Cards nas Páginas de Aulas

## Problema Identificado
Os botões e cards nas páginas de aulas do Upscaler (v1, v2) e ToolVersionLessons estão usando classes genéricas do Tailwind (`bg-card`, `bg-muted`, `border-border`, `variant="outline"`) que resultam em elementos brancos/claros que não combinam com o fundo escuro roxo (`#0D0221`).

Além disso, a página **TutorialArtes.tsx** ainda está com o tema light completo e precisa ser migrada.

---

## Arquivos a Modificar

### 1. `src/pages/UpscalerArcanoV1.tsx`

**Problemas:**
- Linha 214: `bg-[#1A0A2E]/50 border border-purple-500/20` está OK ✓
- Linha 226: `bg-muted` (barra de progresso vazia) → branco no dark mode
- Linha 298: `bg-card border-border` (tooltip) → branco no dark mode
- Linha 319: `<Card className="p-4">` (lesson info) → sem estilos dark
- Linha 332: `bg-muted` (video placeholder)
- Linhas 343-358: Botão "Marcar como assistido" com `variant="outline"` → branco no dark mode
- Linhas 387-426: Cards de lista de aulas com `bg-accent`, `bg-muted`, etc. → brancos

**Correções:**
- `bg-muted` → `bg-purple-900/30`
- `bg-card border-border` → `bg-[#1A0A2E] border-purple-500/20`
- Cards sem classes → `bg-[#1A0A2E]/50 border-purple-500/20`
- Botão outline não-marcado → `border-purple-500/30 text-purple-300 hover:bg-purple-500/20 hover:text-white hover:border-purple-400`

---

### 2. `src/pages/UpscalerArcanoV2.tsx`

**Problemas idênticos ao V1:**
- Linha 269: `bg-card border border-border` (progress bar container)
- Linha 281: `bg-muted` (barra vazia)
- Linha 355: `bg-card border-border` (tooltip)
- Linha 379: `<Card className="p-4">` (lesson info)
- Linha 392: `bg-muted` (video placeholder)
- Linhas 403-418: Botão "Marcar como assistido" outline
- Linhas 447-486: Cards de lista de aulas
- Linha 511: `bg-card border-border` (mensagem "em breve")

**Correções:** Mesmas do V1

---

### 3. `src/pages/ToolVersionLessons.tsx`

**Problemas:**
- Linha 508: `bg-card border border-border` (progress bar)
- Linha 520: `bg-muted` (barra vazia)
- Linha 594: `bg-card border-border` (tooltip)
- Linha 616: `<Card className="p-4">` (lesson info)
- Linhas 661-676: Botão "Marcar como assistido" outline
- Linhas 682-695: Botões de ação com `variant="outline"` e `className="gap-2"` → BRANCOS
- Linhas 706-745: Cards de lista de aulas

**Correções:**
- Botões de ação (linhas 682-695): `variant="outline"` + `className="gap-2 border-purple-500/30 text-purple-300 hover:bg-purple-500/20 hover:text-white"`

---

### 4. `src/pages/TutorialArtes.tsx`

**Problema: Página inteira com tema light**

**Correções:**
- Linha 94, 105: `bg-background` → `bg-[#0D0221]`
- Linha 107: `bg-card border-b border-border` → `bg-[#1A0A2E] border-b border-purple-500/20`
- Linha 109-115: Botão ghost sem classes → adicionar `text-purple-300 hover:text-white hover:bg-purple-500/20`
- Linha 117, 133: `text-foreground` → `text-white`
- Linha 120, 136, 148: `text-muted-foreground` → `text-purple-300`
- Linha 130, 144: `<Card>` sem classes → `bg-[#1A0A2E]/50 border-purple-500/20`
- Linha 132: `text-muted-foreground` (ícone Play) → `text-purple-400`

---

## Padrão de Cores Unificado

| Elemento | Classe Antes | Classe Depois |
|----------|-------------|---------------|
| Fundo página | `bg-background` | `bg-[#0D0221]` |
| Cards | `bg-card border-border` | `bg-[#1A0A2E]/50 border-purple-500/20` |
| Progress bar vazia | `bg-muted` | `bg-purple-900/30` |
| Tooltips | `bg-card border-border` | `bg-[#1A0A2E] border-purple-500/20` |
| Texto título | `text-foreground` | `text-white` |
| Texto secundário | `text-muted-foreground` | `text-purple-300` |
| Botão outline (padrão) | `variant="outline"` | `border-purple-500/30 text-purple-300 hover:bg-purple-500/20 hover:text-white` |
| Hover em cards | `hover:bg-accent` | `hover:bg-purple-500/10` |
| Card selecionado | `border-primary bg-primary/5` | `border-purple-400 bg-purple-500/10` |
| Número de aula inativo | `bg-muted text-muted-foreground` | `bg-purple-900/40 text-purple-400` |

---

## Resumo das Mudanças

| Arquivo | Mudanças Principais |
|---------|---------------------|
| `UpscalerArcanoV1.tsx` | Cards, botão outline, barra de progresso, tooltips |
| `UpscalerArcanoV2.tsx` | Mesmas do V1 |
| `ToolVersionLessons.tsx` | Cards, botões outline (incluindo os de ação), barra de progresso |
| `TutorialArtes.tsx` | Migração completa para tema escuro roxo |

---

## Resultado Esperado

- Todos os botões terão bordas roxas sutis em vez de brancas
- Todos os cards terão fundo roxo escuro transparente
- Barra de progresso terá fundo roxo escuro
- Tooltips terão fundo escuro
- Alto contraste entre texto branco/roxo claro e fundo escuro
- Experiência visual consistente com a Biblioteca de Prompts
