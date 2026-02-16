

# Mostrar fotos da biblioteca em ordem aleatoria

## O que muda
Um unico arquivo: `src/components/arcano-cloner/PhotoLibraryModal.tsx` -- este componente e compartilhado pelo Arcano Cloner, Veste AI e Pose Changer.

## Como funciona hoje
As fotos sao buscadas do banco ordenadas por `created_at` (mais recentes primeiro), sempre na mesma ordem.

## Solucao
Após buscar as fotos do banco, embaralhar o array usando o algoritmo Fisher-Yates antes de exibir. Isso garante ordem aleatoria a cada abertura do modal ou troca de filtro.

## Detalhes tecnicos

### Arquivo: `src/components/arcano-cloner/PhotoLibraryModal.tsx`

1. Adicionar uma funcao utilitaria de embaralhamento (Fisher-Yates shuffle) no topo do arquivo
2. Apos receber os dados da query (linhas 82-86), embaralhar o array antes de salvar no state:
   - No `reset`: embaralhar `data` antes de `setPhotos`
   - No append (carregar mais): embaralhar apenas os novos itens antes de concatenar

Isso mantem a paginacao funcionando e garante que cada pagina carregada tambem venha em ordem aleatoria.

