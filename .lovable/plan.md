

# Nova Pagina de Vendas - Arcano Cloner (`/planos-arcanocloner`)

## Visao Geral
Criar uma landing page de vendas completa para o Arcano Cloner, inspirada no design da referencia (figmaispro.com/studio-ia) com tons de roxo/violeta e preto, usando a familia de fontes Space Grotesk. A pagina tera imagens placeholder para substituicao posterior.

## Estrutura da Pagina (de cima para baixo)

### 1. Hero Section
- Grid de fotos geradas ao fundo (placeholders) com efeito blur e gradiente roxo
- Titulo principal: "Crie ensaios fotograficos profissionais com IA" com destaque em gradiente roxo/fuchsia para "sem prompt, sem complicacao"
- Subtitulo: "Basta subir sua foto e escolher a referencia. Resultado pronto em segundos."
- Badge de social proof: "+5.000 pessoas ja estao usando"
- CTA principal: "QUERO O ARCANO CLONER" com seta
- Texto abaixo do CTA: "Por apenas R$ 47,00 - 56 fotos incluidas"
- Badges de confianca: "Sem prompt", "Pronto em segundos", "Facil de usar"

### 2. Secao de Dores (problemas atuais)
- Titulo: "Chega de..." com cards para cada dor:
  - Sessoes de fotos caras (R$300-R$1.000)
  - Precisar se deslocar ate um estudio
  - Comprar roupas novas para cada ensaio
  - Precisar escrever prompts complexos
  - Depender de fotografo e equipamento
- Card de solucao: "Com o Arcano Cloner voce resolve tudo isso" com destaque visual

### 3. Galeria de Imagens Geradas
- Titulo: "Veja o que o Arcano Cloner e capaz de fazer"
- Grid 2x3 ou 3x2 com imagens placeholder (divs com gradiente roxo e icone de imagem)
- Cada imagem com label tipo "Ensaio Corporativo", "Fashion", "Lifestyle" etc.

### 4. Como Funciona (Passo a Passo)
- Titulo: "Simples assim. Sem prompt. Sem complicacao."
- 4 passos com icones numerados:
  1. Suba uma foto do seu rosto
  2. Escolha uma foto de referencia
  3. Selecione o tamanho da imagem
  4. Clique em Gerar e pronto!
- Visual com cards conectados por linhas

### 5. Motor de Geracao
- Destaque: "Powered by NanoBanana Pro"
- "O motor de geracao de imagens mais avancado do mercado"
- Badge tecnico com visual premium

### 6. Bonus Section
- Biblioteca com +300 referencias profissionais (fotos de referencia prontas)
- Mini curso de apresentacao da ferramenta
- Upscaler gratuito para melhorar as imagens geradas

### 7. Secao Upscaler (Antes e Depois)
- Titulo: "Bonus: Upscaler gratuito para suas imagens"
- Slider antes/depois com imagens placeholder
- Texto explicativo sobre a melhoria de qualidade

### 8. Secao de Precos
- Plano unico com destaque visual forte
- Titulo: "Tudo isso por apenas"
- Preco: R$ 47,00 (pagamento unico)
- Lista do que esta incluso:
  - 56 fotos (4.500 creditos)
  - Acesso a biblioteca com +300 referencias
  - Mini curso de apresentacao
  - Upscaler gratuito
  - Acesso a todas as ferramentas de IA
  - Suporte via WhatsApp
- Countdown timer (1h persistente via localStorage)
- CTA: "Comprar Agora"

### 9. Garantia de 7 dias
- Card com icone de escudo
- Texto sobre garantia incondicional de 7 dias

### 10. Teste Gratuito
- Secao similar ao UpscalerTrialSection existente, mas adaptada para o Arcano Cloner
- Mockup borrado com botao "Fazer Teste Gratis"
- Verificacao por OTP via email (mesmo fluxo do upscaler)
- Nota: inicialmente sera um mockup visual; integracao real do trial em etapa futura

### 11. FAQ
- Perguntas frequentes em acordeao (mesmo estilo do upscaler):
  - O que e o Arcano Cloner?
  - Preciso saber usar prompt?
  - Quanto tempo leva para gerar uma foto?
  - Quantas fotos posso gerar?
  - Como funciona a biblioteca de referencias?
  - O que e o Upscaler bonus?
  - Tem garantia?

### 12. Footer
- Logo ArcanoApp + copyright (mesmo estilo do PlanosUpscalerCreditos)

## Arquivos a Criar

### `src/pages/PlanosArcanoCloner.tsx`
- Pagina principal com todas as secoes inline (como PlanosUpscalerCreditos)
- Usa os mesmos componentes de animacao (AnimatedSection, FadeIn, StaggeredAnimation)
- Meta Pixel tracking (ViewContent + InitiateCheckout)
- Countdown timer persistente
- Scroll suave para secao de precos

### `src/App.tsx`
- Adicionar lazy import e rota `/planos-arcanocloner`

## Design e Cores
- Background: gradiente de `#0f0a15` via `#1a0f25` para `#0a0510` (mesmo do upscaler)
- Acentos: gradiente fuchsia-500 para purple-600 (botoes e destaques)
- Cards: `bg-white/5` com `border-white/10` e `rounded-3xl`
- Fonte: Space Grotesk (ja configurada no projeto)
- Imagens placeholder: divs com gradiente roxo, icone central e label

## Detalhes Tecnicos
- Reutiliza hooks existentes: `useScrollAnimation`, `useIsMobile`, `appendUtmToUrl`
- Reutiliza componentes UI: Button, Card, Badge, Accordion
- Checkout via link externo (placeholder URL para ser substituido depois)
- Sem dependencia de dados do banco (pagina estatica)
- Lazy loading da pagina no App.tsx

