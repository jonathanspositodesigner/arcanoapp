

## Historico de Refinamentos + Carrossel + Botoes Persistentes

### Problema Atual

Quando o usuario refina um avatar, o resultado antigo e simplesmente substituido pelo novo. Nao existe nenhum historico, nenhuma forma de comparar, e os botoes (Baixar, Refinar, Nova) ficam disponiveis mas sem contexto do que ja foi feito.

### Solucao

Adicionar um sistema de historico de refinamentos com carrossel visual e botoes de acao sempre visiveis apos a conclusao.

### Mudancas

#### 1. Estado de historico no GeradorPersonagemTool.tsx

Adicionar um array `refinementHistory` que acumula todas as versoes:

```text
refinementHistory: Array<{ url: string, label: string, timestamp: number }>
```

- Quando o primeiro avatar e gerado, ele e adicionado como "Original"
- Cada refinamento adiciona uma entrada "Refinamento #N"
- O `outputImage` continua apontando para o resultado mais recente
- A imagem atual do carrossel pode ser selecionada para visualizacao no viewer principal

#### 2. Componente RefinementCarousel (novo arquivo)

Criar `src/components/character-generator/RefinementCarousel.tsx`:

- Carrossel horizontal compacto abaixo da imagem resultado
- Mostra thumbnails de todas as versoes (Original + Refinamentos)
- A versao selecionada fica com borda destacada (fuchsia)
- Clicar em uma thumbnail troca a imagem principal no viewer
- Label embaixo de cada thumbnail ("Original", "Ref. #1", "Ref. #2"...)
- Scroll horizontal com botoes de navegacao se necessario
- Usa o componente Carousel do shadcn/ui ja existente

#### 3. Botoes de acao sempre visiveis apos conclusao

Reorganizar os botoes de acao na area de resultado para garantir que sempre aparecam apos qualquer refinamento:

- **Baixar HD** - baixa a imagem atualmente selecionada no viewer
- **Refinar** - abre o RefineSelector para refinar a partir da imagem mais recente
- **Nova** - reseta tudo e permite gerar um avatar do zero
- **Salvar** - salva a imagem atualmente visualizada

#### 4. Fluxo atualizado

```text
Gerar Avatar
    |
    v
Resultado Original aparece
Carrossel: [Original*]
Botoes: [Nova] [Refinar] [Salvar] [Baixar HD]
    |
    v (usuario clica Refinar)
RefineSelector abre
    |
    v (seleciona numeros e confirma)
Processando...
    |
    v
Resultado Refinado aparece
Carrossel: [Original] [Ref. #1*]
Botoes: [Nova] [Refinar] [Salvar] [Baixar HD]
    |
    v (refina de novo)
Carrossel: [Original] [Ref. #1] [Ref. #2*]
```

O usuario pode clicar em qualquer thumbnail do carrossel para ver/comparar versoes anteriores. O botao "Refinar" sempre usa a imagem MAIS RECENTE como base (nao a selecionada no carrossel).

### Detalhes Tecnicos

**Arquivos a criar:**
| Arquivo | Descricao |
|---------|-----------|
| `src/components/character-generator/RefinementCarousel.tsx` | Componente do carrossel de historico |

**Arquivos a modificar:**
| Arquivo | Descricao |
|---------|-----------|
| `src/pages/GeradorPersonagemTool.tsx` | Estado do historico, integracao do carrossel, logica de selecao |

**Logica chave:**
- `refinementHistory` e um `useState<Array<{url, label, timestamp}>>([])` 
- Quando `handleProcess` completa com sucesso, adiciona `{url: outputUrl, label: 'Original', timestamp: Date.now()}`
- Quando `handleRefine` completa com sucesso, adiciona `{url: outputUrl, label: 'Refinamento #N', timestamp: Date.now()}`
- `selectedHistoryIndex` controla qual imagem do carrossel esta sendo exibida no viewer
- `handleReset` limpa o `refinementHistory` inteiro
- O carrossel so aparece quando `refinementHistory.length > 0` e `status === 'completed'`
- Download e Save usam a imagem selecionada no carrossel (`refinementHistory[selectedHistoryIndex].url`)
- Refinar sempre usa `refinementHistory[refinementHistory.length - 1].url` (ultimo resultado)

