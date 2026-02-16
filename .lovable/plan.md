

# Corrigir Hero - Exatamente igual ao print de referencia

## Problemas identificados
1. **Foto PNG nao foi trocada** - ainda esta usando a antiga, precisa usar `nanobanana-RECORDADA-2.webp`
2. **Foto PNG muito pequena e separada** - no print ela e ENORME, ocupa quase toda a altura, sobrepoe as fotos do carrossel
3. **Texto nao passa por cima da foto** - no print o logo, headline e subtitulo ficam POR CIMA da parte inferior da foto PNG
4. **Degradê roxo fraco** - precisa de um glow roxo forte atras da pessoa, subindo de baixo

## O que sera feito

### 1. Trocar a foto PNG
- Copiar `nanobanana-RECORDADA-2.webp` para `public/images/arcano-cloner-hero.webp` (substituir)

### 2. Reestruturar o layout do Hero completamente
No print de referencia, tudo e uma unica composicao sobreposta:
- Carrossel de fotos ao fundo (fileira unica, sem blur)
- Foto PNG GIGANTE centralizada por cima, ocupando quase toda a altura
- Glow roxo forte atras da pessoa
- Gradiente suave de baixo pra cima (roxo/escuro)
- Texto (social proof, headline, subtitle, CTA) fica na parte inferior, SOBREPONDO a parte de baixo da foto PNG

### 3. Mudancas em `HeroCarouselBackground.tsx`
- Manter fileira unica (ja esta correto)
- Manter fotos sem blur com brightness-75 (ja esta correto)
- Ajustar gradientes para ficar mais suave

### 4. Mudancas em `PlanosArcanoCloner.tsx`
- Remover a separacao entre o bloco visual e o bloco de texto
- Tudo fica dentro de uma unica section com position relative
- A foto PNG fica com position absolute, centralizada, MUITO grande (tipo `max-w-2xl` ou `w-[500px] md:w-[600px] lg:w-[700px]`)
- O conteudo de texto (social proof, headline, subtitle, trust badges) fica com z-index ACIMA da foto, posicionado na parte inferior da section
- Isso faz o texto "passar por cima" da parte de baixo da foto, igual no print
- Glow roxo grande e difuso atras da foto

### Estrutura final
```text
section (relative, altura grande ~700px)
  |-- HeroCarouselBackground (absolute, fundo)
  |-- Glow roxo (absolute, centro)
  |-- Foto PNG (absolute, centro, muito grande, z-10)
  |-- Gradiente de baixo pra cima (absolute, z-15)
  |-- Conteudo texto (relative, z-20, flex col, justify-end, padding-bottom)
       |-- Social proof badge
       |-- Headline
       |-- Subtitle
       |-- Trust badges
```

### Arquivos alterados
- `public/images/arcano-cloner-hero.webp` - substituir pela foto nova
- `src/components/combo-artes/HeroCarouselBackground.tsx` - ajustes finos nos gradientes
- `src/pages/PlanosArcanoCloner.tsx` - reestruturar hero para composicao sobreposta com texto passando por cima da foto

