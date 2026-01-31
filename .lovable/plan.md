
# Plano: Unificar Identidade Visual das Ferramentas de IA

## Objetivo
Aplicar a mesma identidade visual roxa escura da Biblioteca de Prompts em todas as páginas de Ferramentas de IA e suas sub-páginas, preservando contraste, hierarquia visual e design limpo.

---

## Paleta de Cores (Referência: BibliotecaPrompts)

| Elemento | Classe/Valor |
|----------|-------------|
| Fundo principal | `bg-[#0D0221]` |
| Cards/containers | `bg-[#1A0A2E]/50` ou `bg-[#1A0A2E]` |
| Bordas | `border-purple-500/20` |
| Texto principal | `text-white` |
| Texto secundário | `text-purple-300` ou `text-purple-300/70` |
| Botões ghost | `text-purple-300 hover:text-white hover:bg-purple-500/20` |
| Header | `bg-[#0D0221]/95 backdrop-blur-lg border-b border-purple-500/20` |
| Loaders | `border-purple-500` ou `text-purple-400` |

---

## Páginas a Modificar (10 arquivos)

### 1. `src/pages/FerramentasIA.tsx` (MAIOR MUDANÇA)

**Classes atuais light mode:**
- `bg-gray-50` → `bg-[#0D0221]`
- `bg-white/90` (header) → `bg-[#0D0221]/95 backdrop-blur-lg border-purple-500/20`
- `bg-white` (cards) → `bg-[#1A0A2E]/50 border-purple-500/20`
- `text-gray-900` → `text-white`
- `text-gray-600`/`text-gray-800` → `text-purple-300`
- `text-purple-600` (loader) → `text-purple-400`
- `border-gray-200` → `border-purple-500/20`
- `bg-emerald-50/teal-50` → `bg-[#1A0A2E] border-purple-500/20`

**Mudanças específicas:**
- Header: fundo escuro com blur
- Cards de ferramentas: borda roxa sutil
- Seções: títulos em branco
- Modais: adaptar para tema escuro
- Loader central: cor roxa clara

---

### 2. `src/pages/FerramentasIAES.tsx` (Versão Espanhol)

**Mesmas mudanças que FerramentasIA.tsx:**
- `bg-gray-50` → `bg-[#0D0221]`
- `bg-white/90` (header) → `bg-[#0D0221]/95 backdrop-blur-lg border-purple-500/20`
- Cards e textos adaptados para tema escuro
- Modais com fundo escuro

---

### 3. `src/pages/FerramentaIAArtes.tsx` (Página dinâmica de ferramentas)

**Classes atuais:**
- `bg-background` → `bg-[#0D0221]`
- `bg-card border-border` (header) → `bg-[#1A0A2E] border-b border-purple-500/20`
- Cards genéricos → `bg-[#1A0A2E]/50 border-purple-500/20`
- `text-foreground` → `text-white`
- `text-muted-foreground` → `text-purple-300`

---

### 4. `src/pages/MudarPose.tsx`

**Classes atuais:**
- `bg-background` → `bg-[#0D0221]`
- `bg-card border-border` → `bg-[#1A0A2E]/50 border-purple-500/20`
- `text-foreground` → `text-white`
- `text-muted-foreground` → `text-purple-300`
- `text-primary` (ícone Play) → `text-purple-400`
- Loader: `border-primary` → `border-purple-500`
- Botão voltar: adicionar hover roxo

---

### 5. `src/pages/MudarRoupa.tsx`

**Mesmas mudanças que MudarPose.tsx** (estrutura idêntica)

---

### 6. `src/pages/ForjaSelos3D.tsx`

**Mesmas mudanças que MudarPose.tsx** (estrutura idêntica)

---

### 7. `src/pages/ForjaSelos3DArtes.tsx`

**Classes atuais:**
- `bg-background` → `bg-[#0D0221]`
- `bg-card border-border` (header) → `bg-[#1A0A2E] border-b border-purple-500/20`
- Cards genéricos → `bg-[#1A0A2E]/50 border-purple-500/20`

---

### 8. `src/pages/UpscalerArcanoVersionSelect.tsx`

**Classes atuais (parcialmente dark):**
- `bg-background` → `bg-[#0D0221]`
- Telas de login/sem acesso: adaptar para tema escuro
- Textos: `text-foreground` → `text-white`
- `text-muted-foreground` → `text-purple-300`
- Loader: `border-primary` → `border-purple-500`

**Nota:** Os cards de versão já têm gradientes escuros, manter.

---

### 9. `src/pages/UpscalerArcanoV1.tsx` (Aulas v1)

**Classes atuais:**
- `bg-background` → `bg-[#0D0221]`
- `bg-card border-border` → `bg-[#1A0A2E]/50 border-purple-500/20`
- `text-foreground` → `text-white`
- `text-muted-foreground` → `text-purple-300`
- Progress bar: manter gradiente roxo existente
- Botão ghost: adicionar hover roxo

---

### 10. `src/pages/UpscalerArcanoV2.tsx` (Aulas v2)

**Mesmas mudanças que UpscalerArcanoV1.tsx** (estrutura similar)

---

### 11. `src/pages/ToolVersionLessons.tsx` (Aulas dinâmicas)

**Classes atuais:**
- `bg-background` → `bg-[#0D0221]`
- `bg-card border-border` → `bg-[#1A0A2E]/50 border-purple-500/20`
- `text-foreground` → `text-white`
- `text-muted-foreground` → `text-purple-300`
- AlertDialogs: adaptar cores de fundo

---

## Padrões de Componentes Unificados

### Header Padrão (dark)
```jsx
<header className="sticky top-0 z-50 bg-[#0D0221]/95 backdrop-blur-lg border-b border-purple-500/20">
```

### Card Padrão (dark)
```jsx
<Card className="bg-[#1A0A2E]/50 border-purple-500/20">
```

### Botão Ghost (dark)
```jsx
<Button variant="ghost" className="text-purple-300 hover:text-white hover:bg-purple-500/20">
```

### Badge "Liberado" (dark)
```jsx
<Badge className="bg-green-500/30 text-green-300 border-0">
```

### Loader (dark)
```jsx
<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500" />
```

### Ícones secundários
```jsx
<Play className="h-5 w-5 text-purple-400" />
```

---

## Elementos Preservados

- Gradientes de botões de ação (amarelo/laranja para CTAs externos)
- Gradiente verde para "Primeiro Acesso"
- Badge verde para "Liberado" (adaptado para dark mode)
- Hierarquia visual existente
- Layout responsivo
- **NÃO MEXER EM:** `src/pages/UpscalerArcanoTool.tsx` (já possui tema correto)

---

## Resumo de Arquivos

| Arquivo | Complexidade | Principal Mudança |
|---------|-------------|-------------------|
| `FerramentasIA.tsx` | Alta | Refazer todo o tema light para dark |
| `FerramentasIAES.tsx` | Alta | Mesmo que FerramentasIA |
| `FerramentaIAArtes.tsx` | Média | Header, cards, textos |
| `MudarPose.tsx` | Baixa | Fundo, cards, textos |
| `MudarRoupa.tsx` | Baixa | Fundo, cards, textos |
| `ForjaSelos3D.tsx` | Baixa | Fundo, cards, textos |
| `ForjaSelos3DArtes.tsx` | Baixa | Fundo, cards, textos |
| `UpscalerArcanoVersionSelect.tsx` | Média | Telas de estado, fundo |
| `UpscalerArcanoV1.tsx` | Média | Fundo, cards, progress bar |
| `UpscalerArcanoV2.tsx` | Média | Fundo, cards, progress bar |
| `ToolVersionLessons.tsx` | Média | Fundo, cards, modais |

---

## Resultado Esperado

Todas as páginas terão:
- Fundo escuro roxo (`#0D0221`) consistente
- Cards com bordas sutis roxas (`border-purple-500/20`)
- Textos em branco/roxo claro com alto contraste
- Headers com backdrop blur e borda sutil
- Transição visual suave entre Biblioteca de Prompts e Ferramentas
- Experiência visual unificada e premium
