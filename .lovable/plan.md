

## Corrigir bug de imagem errada ao selecionar Avatar no Arcano Cloner

### Problema identificado
Existe uma **condicao de corrida** (race condition) no componente `PersonInputSwitch`. Quando o usuario clica em um avatar, o sistema:

1. Atualiza o ID selecionado imediatamente (visual)
2. Faz um `fetch` assincrono da imagem do avatar
3. Converte o blob em File + dataURL
4. Chama `onImageChange` com o resultado

Se o usuario clicar em "Herica Nagila" e antes o fetch de "Jonathan" (clicado anteriormente) ainda estiver em andamento, o resultado atrasado de "Jonathan" pode sobrescrever a imagem de "Herica Nagila". Nao existe nenhuma verificacao para descartar resultados de selecoes anteriores.

### Solucao

**Arquivo: `src/components/ai-tools/PersonInputSwitch.tsx`**

Adicionar um `useRef` que armazena o ID do ultimo avatar selecionado. Antes de chamar `onImageChange` no callback assincrono, verificar se o ID ainda corresponde a selecao atual. Se nao corresponder, descartar o resultado.

### Detalhes Tecnicos

1. Criar um `const latestSelectionRef = useRef<string | null>(null)`
2. No inicio de `handleSelectCharacter`, gravar `latestSelectionRef.current = char.id`
3. Antes de chamar `onImageChange` (tanto no `reader.onload` quanto no fallback), verificar: `if (latestSelectionRef.current !== char.id) return` -- descarta resultado obsoleto
4. Ao trocar de modo (`handleModeChange`), limpar o ref: `latestSelectionRef.current = null`

Isso garante que somente a ultima selecao do usuario seja aplicada, independente da ordem em que os fetches completam.

Nenhum outro arquivo precisa ser alterado.
