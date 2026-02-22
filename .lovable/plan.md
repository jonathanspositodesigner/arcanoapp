

## Correcoes no Flyer Maker - 3 Problemas

### 1. Job preso em "processando" - Reconcile com API v2 incorreta

O endpoint `/reconcile` da Edge Function esta usando a API `openapi/v2/query` e esperando `queryData.status` e `queryData.results`, mas a resposta da API v2 retorna os dados dentro de `queryData.data` (ex: `queryData.data.taskStatus`, `queryData.data.outputFileList`). Por isso o reconcile nunca consegue encontrar o resultado e o job fica preso.

**Correcao no arquivo:** `supabase/functions/runninghub-flyer-maker/index.ts` (funcao `handleReconcile`)

Atualizar a logica de parsing da resposta do `/reconcile` para:
- Verificar `queryData.data?.taskStatus === 'SUCCESS'` em vez de `queryData.status === 'SUCCESS'`
- Buscar resultados em `queryData.data?.outputFileList` em vez de `queryData.results`
- Verificar falha com `queryData.data?.taskStatus === 'FAILED'`

### 2. Textos sempre em CAIXA ALTA (uppercase)

Os inputs de texto que o usuario digita devem ser convertidos para maiusculo automaticamente.

**Correcao no arquivo:** `src/pages/FlyerMakerTool.tsx`

Nas 5 linhas dos `onChange` dos inputs de texto, aplicar `.toUpperCase()`:
- `setDateTimeLocation(e.target.value.toUpperCase())`
- `setTitle(e.target.value.toUpperCase())`
- `setAddress(e.target.value.toUpperCase())`
- `setArtistNames(e.target.value.toUpperCase())`
- `setFooterPromo(e.target.value.toUpperCase())`

Tambem adicionar `uppercase` na className dos inputs para garantir a exibicao visual.

### 3. Nao duplicar fotos de artistas nos nodes vazios

Atualmente, se o usuario envia 2 fotos, o sistema preenche os nodes 3, 4 e 5 repetindo a primeira foto. O correto e enviar APENAS as fotos fornecidas e deixar os nodes restantes vazios (string vazia).

**Correcao no arquivo:** `supabase/functions/runninghub-flyer-maker/index.ts` (funcao `handleRun`)

Trocar a logica de preenchimento de:
```
const allArtistFiles = [
  artistFileNames[0] || firstArtist,
  artistFileNames[1] || firstArtist,
  ...
];
```

Para:
```
const allArtistFiles = [
  artistFileNames[0] || '',
  artistFileNames[1] || '',
  artistFileNames[2] || '',
  artistFileNames[3] || '',
  artistFileNames[4] || '',
];
```

E incluir apenas os nodes de artista que tem imagem no `nodeInfoList`:
```
// Nodes de artista - so inclui os que tem imagem
const artistNodes = [11, 12, 13, 14, 15];
for (let i = 0; i < artistNodes.length; i++) {
  if (artistFileNames[i]) {
    nodeInfoList.push({ nodeId: String(artistNodes[i]), fieldName: "image", fieldValue: artistFileNames[i] });
  }
}
```

### Resumo dos arquivos alterados

1. `supabase/functions/runninghub-flyer-maker/index.ts` - Corrigir reconcile API parsing + nao duplicar fotos de artistas
2. `src/pages/FlyerMakerTool.tsx` - Textos em uppercase

