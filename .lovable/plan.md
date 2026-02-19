
# Substituir Hero de /planos-upscaler-arcano

## Objetivo

Apagar a hero section atual da página `/planos-upscaler-arcano` e substituí-la pela hero section idêntica à da página `/planos-upscaler-creditos`, mantendo todas as configurações visuais e de layout.

---

## O que muda na Hero

### Hero atual (será removida):
- Fonte `font-bebas`, tamanho muito grande (`text-4xl md:text-5xl lg:text-6xl xl:text-7xl`)
- Sem social proof badge
- Slider sem restrição de largura especial (`max-w-[95vw] md:max-w-[60vw]`) com aspect ratio padrão
- Bloco de alerta vermelho "🔥 Últimos dias de venda do Upscaler na versão vitalícia"
- Sem feature badges (miojo, fácil de usar, imagens melhoradas)

### Hero nova (copiada da PlanosUpscalerCreditos):
- Fonte `font-space-grotesk font-bold`, tamanho moderno (`text-2xl md:text-3xl lg:text-4xl`)
- Social proof badge: avatares + "+5.000 profissionais já estão usando"
- Slider mais estreito: `w-[90vw] md:w-[50vw] lg:w-[42vw]` com override `!aspect-[5/3]` no desktop
- Feature badges: Clock "Mais rápido que um miojo" / MousePointerClick "Fácil de usar" / Star "+10.000 imagens melhoradas"
- Scroll Indicator mantido
- Layout `max-w-7xl mx-auto` centralizado

---

## Arquivo a editar

| Arquivo | Ação |
|---|---|
| `src/pages/PlanosUpscalerArcano.tsx` | Substituir toda a `<section>` da hero (linhas 378–428) pelo código da hero de `PlanosUpscalerCreditos` |

---

## Detalhes técnicos

- Adicionar import de `Clock, MousePointerClick, Star` no bloco de imports (Clock e Star já estão, MousePointerClick precisa ser adicionado)
- Substituir o bloco JSX da hero section (~50 linhas) pelo equivalente da página de referência
- Nenhuma alteração nas outras seções da página (dor, antes/depois, preços, etc.)
