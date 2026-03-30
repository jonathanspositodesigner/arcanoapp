

# Plano: Substituir biblioteca customizada do MovieLed Maker pela mesma biblioteca padrão do Arcano Cloner

## Problema
O MovieLed Maker usa uma biblioteca inline customizada (modal feito na mão dentro do próprio arquivo). As outras ferramentas (Arcano Cloner, Veste AI, Pose Changer) usam o componente `ReferenceImageCard` + `PhotoLibraryModal` que são reutilizáveis e consistentes.

## O que vai ser feito

### 1. Criar `MovieLedLibraryModal` baseado no `PhotoLibraryModal`
- Novo arquivo: `src/components/movieled-maker/MovieLedLibraryModal.tsx`
- Cópia exata do layout/estilo do `PhotoLibraryModal` (Dialog, gender filter, search, grid, upload, premium, load more)
- **Diferença 1**: Query filtra por `category = 'Movies para Telão'` em vez de `'Fotos'`
- **Diferença 2**: Grid mostra `<video>` em aspect-ratio 16:9 em vez de `<img>` em 3:4
- **Diferença 3**: Título "Biblioteca de Telões" em vez de "Biblioteca de Fotos"
- **Diferença 4**: Aviso de 1920x1080 (16:9) no upload
- **Diferença 5**: `onSelectPhoto` retorna o item completo (com `reference_images` e `id`) para que o MovieLed possa usar a referência correta

### 2. Usar `ReferenceImageCard` no MovieLed Maker
- Importar o mesmo `ReferenceImageCard` de `src/components/arcano-cloner/ReferenceImageCard.tsx`
- Substituir todo o bloco inline de seleção de imagem (linhas ~468-543) pelo `ReferenceImageCard`
- Props: `title="Telão de Referência"`, `emptyLabel="Escolher Telão"`, `emptySubLabel="Da biblioteca ou envie sua imagem"`

### 3. Limpar código do MovieLedMakerTool.tsx
- Remover o modal inline (linhas 722-791)
- Remover estados `libraryItems`, `librarySearch`, `loadingLibrary`, `loadLibrary`
- Adicionar o `MovieLedLibraryModal` no final do JSX (igual Arcano Cloner faz com `PhotoLibraryModal`)
- Manter toda a lógica de `selectedLibraryItem` e `reference_images` como está

## Resultado
Interface 100% consistente com Arcano Cloner, Veste AI e Pose Changer: mesmo card de referência, mesmo estilo de modal, mesma experiência de upload.

