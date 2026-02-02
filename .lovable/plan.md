

# Plano: Banner de Promoção na Página de Ferramentas IA

## Objetivo
Adicionar uma tarja promocional abaixo do header na página `/ferramentas-ia-aplicativo` seguindo o estilo da imagem de referência (fundo rosa/magenta) com:
- Badge "OFERTA LIMITADA" no início
- Texto: "comece agora mesmo a usar nossas ferramentas de ia com 30% de desconto"
- Opção de fechar (X)

---

## Mudanças Planejadas

### 1. Criar Componente `PromoToolsBanner`
**Arquivo:** `src/components/PromoToolsBanner.tsx` (novo)

Estrutura do componente:
- Fundo com gradiente rosa/magenta similar à imagem de referência
- Badge destacado com ícone de tag e texto "OFERTA LIMITADA"
- Texto promocional à direita do badge
- Botão X para fechar o banner
- Responsivo para mobile e desktop
- Efeito shimmer animado (igual ao PromoNatalBanner)

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ [Tag] OFERTA LIMITADA   comece agora mesmo a usar nossas...  30% OFF  X │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2. Integrar na Página `FerramentasIAAplicativo`
**Arquivo:** `src/pages/FerramentasIAAplicativo.tsx`

- Importar o novo componente `PromoToolsBanner`
- Inserir logo abaixo do `<ToolsHeader>`
- O banner será exibido apenas nesta página específica

---

## Detalhes Técnicos

### Estilo Visual
- **Fundo:** Gradiente rosa/magenta (`from-pink-600 via-pink-500 to-pink-600`)
- **Badge:** Fundo escuro semi-transparente com borda, ícone de tag (Lucide `Tag`)
- **Texto:** Branco com peso médio
- **Botão fechar:** Ícone X com hover state

### Comportamento
- Banner pode ser fechado (estado local com `useState`)
- Não persiste após refresh (fecha temporariamente na sessão)
- Layout responsivo:
  - Desktop: Linha única centralizada
  - Mobile: Duas linhas (badge em cima, texto embaixo)

### Animação
- Efeito shimmer sutil no background (reutilizando estilo do PromoNatalBanner)

