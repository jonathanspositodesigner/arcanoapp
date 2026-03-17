

## Plano: Motor de Busca Robusto com Sinônimos

### Problema Atual
A busca atual faz apenas `title.ilike` e `tags.cs` diretamente no banco. Não tem inteligência para sinônimos (ex: "homem" vs "rapaz", "festa" vs "balada"), e cada componente implementa sua própria lógica de busca isoladamente.

### Arquitetura Proposta

**1. Criar um hook reutilizável `useSmartSearch`**

Um hook centralizado em `src/hooks/useSmartSearch.ts` que:
- Recebe o termo digitado pelo usuário
- Expande automaticamente com sinônimos usando um dicionário local
- Retorna uma lista de termos expandidos para uso em queries

**2. Dicionário de sinônimos local**

Arquivo `src/lib/synonyms.ts` com um mapa de sinônimos em português relevantes ao contexto (fotos, moda, eventos, etc):

```text
"homem" -> ["rapaz", "garoto", "masculino", "cara", "boy"]
"mulher" -> ["garota", "moça", "feminino", "girl"]
"festa" -> ["balada", "party", "evento", "celebração"]
"roupa" -> ["vestimenta", "traje", "outfit", "look"]
"casamento" -> ["noiva", "noivo", "wedding", "matrimônio"]
// ... ~50-80 grupos de sinônimos
```

**3. Lógica de expansão de busca no `useSmartSearch`**

- Usuário digita "rapaz elegante"
- O hook identifica "rapaz" como sinônimo de "homem", "garoto", etc.
- Gera termos expandidos: ["rapaz", "homem", "garoto", "elegante", "sofisticado", "chique"]
- Retorna esses termos para o componente construir a query

**4. Função de busca genérica `smartSearchQuery`**

Em `src/lib/smartSearch.ts`, uma função utilitária que:
- Aceita os termos expandidos
- Constrói o filtro `.or()` com múltiplos `ilike` para título e `cs` para tags
- Funciona com qualquer tabela (admin_prompts, admin_artes, etc.)

**5. Aplicar nos componentes existentes**

- `PhotoLibraryModal.tsx` (Arcano Cloner / Veste AI / Pose Changer) - substituir a busca atual pelo `useSmartSearch`
- `FlyerLibraryModal.tsx` (Flyer Maker) - mesma coisa
- Qualquer outro componente com busca no futuro usa o mesmo hook

### Arquivos a Criar/Editar

| Arquivo | Ação |
|---|---|
| `src/lib/synonyms.ts` | Criar - dicionário de sinônimos PT-BR |
| `src/hooks/useSmartSearch.ts` | Criar - hook com debounce + expansão de sinônimos |
| `src/components/arcano-cloner/PhotoLibraryModal.tsx` | Editar - usar `useSmartSearch` |
| `src/components/flyer-maker/FlyerLibraryModal.tsx` | Editar - usar `useSmartSearch` |

### Exemplo de Uso no Componente

```tsx
const { expandedTerms, debouncedSearch } = useSmartSearch(searchTerm);

// Na query:
if (expandedTerms.length > 0) {
  const orFilters = expandedTerms
    .map(t => `title.ilike.%${t}%,tags.cs.{${t}}`)
    .join(',');
  query = query.or(orFilters);
}
```

### Benefícios
- Busca centralizada e reutilizável em qualquer parte do site
- Sinônimos em português expandem resultados automaticamente
- Sem dependência de API externa (tudo local, instantâneo)
- Fácil de expandir o dicionário no futuro

