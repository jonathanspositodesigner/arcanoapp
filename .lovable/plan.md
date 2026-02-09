

## Corrigir botao "Nova" do Arcano Cloner -- manter avatar e referencia ativos

### Problema

Quando o usuario clica em "Nova" apos uma geracao, o `handleReset` limpa TUDO, incluindo `userImage`, `userFile`, `referenceImage` e `referenceFile`. Porem o componente `PersonInputSwitch` mantem o estado interno `selectedCharacterId` (o avatar continua visualmente destacado), mas o `userImage` no componente pai fica `null`. Como o botao "Gerar Imagem" depende de `canProcess = userImage && referenceImage && status === 'idle'`, ele fica desabilitado.

### Solucao

Criar uma funcao `handleNewImage` separada do `handleReset`. A funcao "Nova" deve preservar as imagens de entrada (avatar + referencia) e limpar apenas o resultado e o estado de processamento.

### Detalhes Tecnicos

**Arquivo: `src/pages/ArcanoClonerTool.tsx`**

1. Criar nova funcao `handleNewImage` que limpa apenas:
   - `outputImage` (null)
   - `status` ('idle')
   - `progress` (0)
   - `zoomLevel` (1)
   - `jobId` (null)
   - `queuePosition` (0)
   - `currentStep` (null)
   - `failedAtStep` (null)
   - `debugErrorMessage` (null)
   - `isSubmitting` via `endSubmit()`
   - `clearGlobalJob()`

   NAO limpa: `userImage`, `userFile`, `referenceImage`, `referenceFile`, `aspectRatio`, `selectedCharacterId` (interno do PersonInputSwitch)

2. Alterar o botao "Nova" (linha 809) para usar `handleNewImage` em vez de `handleReset`

3. Manter `handleReset` como esta -- ele continua sendo usado no botao "Tentar novamente" (erro) onde faz sentido limpar tudo

### Resultado

- Ao clicar "Nova", avatar e referencia permanecem selecionados
- O botao "Gerar Imagem" fica ativo imediatamente (pois `userImage` e `referenceImage` continuam preenchidos)
- O usuario pode gerar outra imagem sem precisar re-selecionar nada
- O botao "Tentar novamente" (em caso de erro) continua limpando tudo como antes

