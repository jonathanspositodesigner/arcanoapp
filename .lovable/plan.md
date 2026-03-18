

## Remover o menu flutuante (dock) das páginas da Biblioteca de Artes

O menu flutuante (`FloatingToolsNav`) está aparecendo na `/biblioteca-artes` porque essa rota está listada no array `showOnPaths`. Essa plataforma é isolada e não deveria ter esse menu.

### Alteração

**Arquivo: `src/components/FloatingToolsNav.tsx`** (linha 47)

Remover `"/biblioteca-artes"` do array `showOnPaths`. Também adicionar todas as rotas de biblioteca de artes ao array `excludedPaths` por segurança (para cobrir sub-rotas):

- Adicionar ao `excludedPaths`: `"/biblioteca-artes"`, `"/biblioteca-artes-hub"`, `"/biblioteca-artes-musicos"`, `"/planos-artes"`, `"/login-artes"`, `"/login-artes-musicos"`
- Remover do `showOnPaths`: `"/biblioteca-artes"`

Isso garante que o dock nunca apareça em nenhuma página da Biblioteca de Artes, que é uma plataforma completamente separada.

