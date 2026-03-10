

## Problema

A atribuição de vendas nos níveis de **conjuntos** e **anúncios** está usando os campos UTM errados:

| Nível | Campo usado atualmente | Campo correto | Conteúdo real |
|---|---|---|---|
| Conjuntos (adsets) | `utm_term` | **`utm_medium`** | `"AD08 - ORGANICO\|120239632965100183"` |
| Anúncios (ads) | `utm_content` ✅ | `utm_content` | `"AD08 ORGANICO\|120239632965090183"` |

O `utm_term` contém o **placement** (ex: `Instagram_Feed`, `Instagram_Stories`), não o adset ID. O adset ID está em `utm_medium` (formato `"Nome|ID"`).

O nível de anúncios (`utm_content`) já está correto.

## Solução

### Arquivo: `src/components/admin/ads/useAdsHierarchy.ts`

Mudar a chamada de `attributeSalesToItems` para adsets de:
```ts
attributeSalesToItems(aggregated, sales, "utm_term")
```
Para:
```ts
attributeSalesToItems(aggregated, sales, "utm_medium")
```

Isso é a **única mudança necessária**. O `extractIdFromUtm` já sabe extrair o ID do formato `"Nome|ID"`, então vai funcionar automaticamente com `utm_medium`.

