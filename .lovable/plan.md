
# Hero com Carrossel de Fotos + Foto PNG - Arcano Cloner

## O que sera feito

Redesenhar o hero da pagina `/planos-arcanocloner` para ficar igual ao print de referencia (Studio IA): um carrossel de fotos passando ao fundo com iluminacao roxa, e a foto PNG do usuario (sem fundo) centralizada por cima.

## Estrutura visual

```text
+----------------------------------------------------------+
|  [foto1] [foto2] [foto3] [FOTO PNG] [foto4] [foto5] [foto6]  |  <-- carrossel ao fundo
|                          (sem fundo)                          |
|                     brilho roxo atras                         |
|                                                               |
|              Badge social proof (+5000 pessoas)               |
|                                                               |
|            Crie ensaios fotograficos profissionais...          |
|                                                               |
|              Trust badges (Sem prompt, etc)                    |
+----------------------------------------------------------+
```

## Detalhes da implementacao

### 1. Copiar a foto PNG para o projeto
- Copiar `user-uploads://nanobanana-RECORDADA.webp` para `public/images/arcano-cloner-hero.webp`

### 2. Novo componente `src/components/combo-artes/HeroCarouselBackground.tsx`
- Renderiza duas fileiras de fotos (ou uma unica fileira) que se movem horizontalmente com animacao CSS infinita (`@keyframes scroll`)
- As fotos sao placeholders por enquanto (imagens Unsplash de retratos/ensaios)
- Aplica `opacity-30` e leve `blur-[2px]` para ficar como fundo suave
- As fotos ficam em cards arredondados tipo o print de referencia

### 3. Glow roxo atras da foto PNG
- Um `div` com `bg-fuchsia-500/30 blur-[100px]` posicionado atras da foto PNG para criar o efeito de iluminacao roxa

### 4. Foto PNG centralizada
- A imagem `arcano-cloner-hero.webp` aparece centralizada, sobreposta ao carrossel
- Tamanho grande, sem fundo, com `object-contain`
- Posicionada com `relative z-10`

### 5. Alteracoes em `src/pages/PlanosArcanoCloner.tsx`
- Substituir o bloco "Background grid placeholder" (linhas 142-149) pelo novo componente `HeroCarouselBackground`
- Adicionar a foto PNG entre o carrossel e o badge social proof
- Manter todo o conteudo de texto abaixo (headline, subtitle, trust badges)
- A section hero ganha `relative overflow-hidden` para conter o carrossel

### 6. Animacao CSS do carrossel
- Usar `@keyframes` com `translateX` para scroll continuo infinito
- Duplicar as imagens no DOM para efeito de loop sem cortes
- Velocidade lenta (~30s por ciclo) para ser sutil

## Fotos do carrossel
Usarei 6-8 placeholders de retratos profissionais (Unsplash) que podem ser trocados depois conforme voce pediu.
