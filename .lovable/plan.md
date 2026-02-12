
# Plano: Integrar Upscaler Real na Seção de Teste Gratuito

## Resumo
Transformar o mockup estático da seção de teste gratuito em uma ferramenta funcional com as mesmas categorias e configurações do Upscaler Arcano Standard, incluindo seleção de enquadramento (Perto/Longe) para fotos de pessoas e compressão automática de imagens grandes.

## Configuração dos Botões (Standard)

Cada categoria usa um workflow diferente na API:

| Categoria | Prompt Automático | Controles Extras |
|-----------|-------------------|------------------|
| **Pessoas** | Sim (portrait/full-body) | Escolha Perto/Longe, Resolução 2K |
| **Comida/Objeto** | Nenhum | Slider de detalhe (0.70-1.00) |
| **Foto Antiga** | Nenhum | Nenhum (apenas imagem) |
| **Selo 3D** | Nenhum | Nenhum (apenas imagem) |
| **Logo/Arte** | Nenhum | Nenhum (apenas imagem) |

Quando "Pessoas" estiver selecionado, aparece um sub-seletor com "De Perto" e "De Longe" (com ícones SVG), exatamente como no Upscaler principal.

## Compressão Automática de Imagens

Quando o usuário enviar uma imagem com dimensao maior que 2000x2000px:
- Abrir o modal `ImageCompressionModal` (ja existe no projeto)
- Mostrar dimensao original vs. limite
- Comprimir para no maximo 1999px mantendo proporcao
- Usar a funcao `compressToMaxDimension` que ja existe em `useImageOptimizer`

## Mudanças Técnicas

### 1. `UpscalerMockup.tsx` - Refatoracao completa
- Trocar as categorias mockup por categorias reais: `pessoas`, `comida`, `fotoAntiga`, `render3d`, `logo`
- Adicionar sub-seletor Perto/Longe quando "Pessoas" estiver ativo
- Adicionar slider de detalhe para Comida/Objeto (0.70-1.00)
- Expor `selectedCategory` e `pessoasFraming` via callbacks/props
- Integrar validacao de dimensao e modal de compressao na selecao de arquivo
- Aceitar prop `onCompressionNeeded` para acionar o modal

### 2. `UpscalerTrialSection.tsx` - Integrar API real
- Importar `ImageCompressionModal`, `getImageDimensions`, `MAX_AI_DIMENSION`, `compressToMaxDimension`
- Adicionar estados: `selectedCategory`, `pessoasFraming`, `comidaDetailLevel`, `showCompressionModal`, `pendingFile`, `pendingDimensions`
- No `handleFileSelect`: verificar dimensoes -> se maior que 2000px, mostrar `ImageCompressionModal`
- No `handleGenerate`: montar o body da chamada `runninghub-upscaler/run` com os parametros corretos baseados na categoria:
  - `category`: a categoria selecionada (ex: `pessoas_perto`, `comida`, `fotoAntiga`, `logo`, `render3d`)
  - `version`: sempre `'standard'`
  - `detailDenoise`: valor do slider para comida (0.85 padrao), ou 0.15 para pessoas
  - `resolution`: 2048 para pessoas, `undefined` para workflows especiais
  - `prompt`: prompt automatico para pessoas, `undefined` para workflows especiais
  - `framingMode`: `'perto'` ou `'longe'` para pessoas, `undefined` para o resto
- Manter `trial_mode: true` para que o backend saiba que e um teste

### 3. Nenhuma alteracao no backend
O Edge Function `runninghub-upscaler/run` ja suporta todos os parametros e categorias. Apenas o frontend precisa enviar os dados corretos.

## Fluxo do Usuário

```text
1. Usuário seleciona categoria (Pessoas, Comida, Foto Antiga, Selo 3D, Logo)
2. Se "Pessoas" -> escolhe Perto ou Longe
3. Se "Comida" -> ajusta slider de detalhe (opcional)
4. Faz upload da foto
5. Se foto > 2000px -> modal de compressão aparece -> comprime
6. Clica "Melhorar Imagem"
7. Sistema envia para API com parâmetros corretos da categoria
8. Resultado aparece na tela
```
