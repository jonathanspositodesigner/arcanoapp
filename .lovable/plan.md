
# Animação CSS Interativa do Passo a Passo — Seção "Simples assim"

## O que será feito

Substituir a seção "HOW IT WORKS" atual (4 cards estáticos com ícones) por uma **animação CSS fluida e automática** que simula a interface real do Arcano Cloner em funcionamento — mostrando os 4 passos de forma visual e cinematic, em loop.

## Componente novo: `ClonerDemoAnimation.tsx`

Um componente standalone com animação puramente em CSS/React state, sem dependências externas. Ele roda em loop automático e mostra:

**Etapa 1 — Upload da Foto (0–2s)**
- Interface do mockup aparece
- Cursor animado clica na área "Sua Foto"
- Foto de rosto aparece preenchendo o card com animação de fade-in
- Badge pulsante "Passo 1" aceso

**Etapa 2 — Escolha da Referência (2–4s)**
- Cursor move para o card de Referência
- Uma miniatura de biblioteca aparece brevemente (simulando o modal)
- Foto de referência preenche o card com animação
- Badge "Passo 2" aceso

**Etapa 3 — Seleção do Tamanho (4–5.5s)**
- AspectRatio selector animado — destaque no botão "1:1" com click visual
- Badge "Passo 3" aceso

**Etapa 4 — Gerar + Resultado (5.5–9s)**
- Botão "Gerar Imagem" pisca e é "clicado" (escala)
- Loading bar aparece com progresso real
- Resultado aparece à direita com animação de reveal (slide + glow fuchsia)
- Confetti/sparkle visual no resultado
- Loop reinicia

## Layout Visual

```text
┌─────────────────────────────────────────────────────────┐
│           Simples assim. Sem prompt. Sem complicação.   │
│                 4 passos e seu ensaio está pronto        │
│                                                         │
│  [1●] [2○] [3○] [4○]  ← indicadores de etapa           │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  INTERFACE MOCKUP ANIMADA (fiel ao Cloner real)  │   │
│  │                                                  │   │
│  │  [ Sua Foto ] [ Referência ]  →  [ Resultado ]  │   │
│  │  [  Ratio   ] [ Criativ.   ]                    │   │
│  │  [    Botão Gerar Imagem   ]                    │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  "Passo X de 4 — Upload da sua foto"  ← legenda        │
└─────────────────────────────────────────────────────────┘
```

## Detalhes de Implementação Técnica

**Estado da animação:**
```typescript
const [step, setStep] = useState(0); // 0-3
const [progress, setProgress] = useState(0);
const [showResult, setShowResult] = useState(false);
```

**Loop automático com `useEffect` + `setInterval`** — cada etapa dura ~2 segundos, o ciclo completo ~9 segundos, depois reseta.

**Transições visuais:**
- Fade-in das imagens nos cards: `opacity + scale` via CSS transition
- "Click" no botão: `transform: scale(0.95)` por 200ms
- Loading bar: width de 0 → 100% em 1.5s via CSS transition
- Reveal do resultado: `translateX(20px) → 0` + opacity + box-shadow glow fuchsia
- Indicadores de etapa: bolinha colorida com `ring` pulsante na etapa ativa

**Imagens usadas (já existem no projeto):**
- Foto do rosto: `/images/arcano-cloner-hero.webp` ou gallery image
- Referências: `/images/refs/ref-1.jpg`
- Resultado: `/images/gallery/gallery-1.webp`

**Identidade visual fiel ao Cloner:**
- Background: `bg-[#1A0A2E]/80`
- Border: `border border-purple-500/30`
- Rounded: `rounded-2xl`
- Cards internos com `border-dashed border-purple-500/30`
- Botão: gradiente `from-fuchsia-600 to-purple-600`
- Fonte e cores: `text-fuchsia-400`, `text-purple-300/70`

**Legenda descritiva por etapa** abaixo do mockup:
1. "📸 Faça o upload da sua foto"
2. "🖼️ Escolha uma referência profissional da biblioteca"
3. "📐 Selecione o tamanho da imagem"
4. "✨ Clique em Gerar e receba o resultado em segundos"

## Arquivo criado

- `src/components/arcano-cloner/ClonerDemoAnimation.tsx` — componente novo com animação

## Arquivo modificado

- `src/pages/PlanosArcanoCloner.tsx` — substituir a `<StaggeredAnimation>` de cards estáticos (linhas 335–351) pelo `<ClonerDemoAnimation />`, mantendo o título existente

## Posição na página (sem mudança estrutural)

```text
[Título] Simples assim. Sem prompt. Sem complicação.
[Subtítulo] 4 passos e seu ensaio está pronto

[NOVO] ClonerDemoAnimation — animação CSS em loop
       (substitui os 4 cards de ícone estáticos)
```
