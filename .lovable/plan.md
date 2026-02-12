

## Problema

O saldo de creditos no topo da pagina nao atualiza imediatamente apos gerar uma imagem ou video porque existem **duas instancias separadas** do hook `useUpscalerCredits`:

1. Uma no `AppLayout` (que alimenta o badge de creditos no topo)
2. Outra em cada pagina de ferramenta (GerarImagemTool, GerarVideoTool, etc.)

Quando a ferramenta chama `refetchCredits()`, so atualiza o estado **local da pagina** da ferramenta. O badge do topo depende da subscription de realtime do Postgres, que pode ter atraso ou falhar silenciosamente.

## Solucao

Criar um **contexto global de creditos** (`CreditsContext`) que compartilha uma unica instancia de `useUpscalerCredits` entre o AppLayout e todas as ferramentas. Assim, quando qualquer ferramenta chama `refetch`, o saldo atualiza em todos os lugares ao mesmo tempo.

## Passos

### 1. Criar `src/contexts/CreditsContext.tsx`

- Criar um React Context que encapsula o hook `useUpscalerCredits`
- Expor `CreditsProvider` e `useCredits()`
- O provider recebe o `userId` e instancia o hook uma unica vez
- Todas as paginas e o AppTopBar leem do mesmo estado

### 2. Integrar o `CreditsProvider` no `AppLayout.tsx`

- Envolver o conteudo do AppLayout com `<CreditsProvider userId={user?.id}>`
- Remover a chamada direta de `useUpscalerCredits` do AppLayout
- O AppTopBar passa a usar `useCredits()` do contexto

### 3. Atualizar `AppTopBar.tsx`

- Remover as props `credits` e `creditsLoading`
- Consumir os creditos diretamente via `useCredits()`

### 4. Atualizar as paginas de ferramentas

- `GerarImagemTool.tsx` - trocar `useUpscalerCredits(user?.id)` por `useCredits()`
- `GerarVideoTool.tsx` - mesma mudanca
- As demais ferramentas que usam AppLayout tambem se beneficiam automaticamente

### 5. Atualizar `CreditsPreviewPopover.tsx`

- Remover as props `credits` e `creditsLoading` (virao do contexto via `useCredits()`)

---

### Detalhes tecnicos

**CreditsContext** expoe:
```
- balance (number)
- breakdown ({ total, monthly, lifetime })
- isLoading (boolean)  
- refetch() 
- consumeCredits()
- checkBalance()
```

Como todas as ferramentas e o top bar compartilham a mesma instancia, quando `refetch()` e chamado apos uma geracao, o `setBalance()` interno atualiza o estado compartilhado, e o `useAnimatedNumber` no `CreditsPreviewPopover` detecta a mudanca e roda a animacao imediatamente.

A subscription de realtime continua ativa como fallback para atualizacoes vindas de outros dispositivos ou processos em background.

