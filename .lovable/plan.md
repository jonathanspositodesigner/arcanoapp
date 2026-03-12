

## Problema

Usuários acessam `/prevenda-pack4` e veem 404 porque o navegador tem cache antigo do PWA (service worker servindo versão desatualizada que não conhece essa rota). Um reload forçado com limpeza de cache resolve.

## Plano

**Arquivo: `src/pages/NotFound.tsx`**

No `useEffect`, antes de mostrar o 404 visualmente:

1. Checar `sessionStorage` por uma flag `"404_reload_attempted"` para evitar loop infinito
2. Se a flag **não existe**:
   - Setar a flag no `sessionStorage`
   - Limpar caches do service worker via `caches.keys()` + `caches.delete()`
   - Chamar `registration.update()` no service worker (se existir)
   - Fazer `window.location.reload()` (força o navegador buscar assets frescos)
3. Se a flag **já existe** (já tentou reload):
   - Remover a flag
   - Mostrar a tela de 404 normalmente (é um 404 real)

Isso garante que toda vez que alguém cai em 404 por cache antigo, o app tenta **uma única vez** limpar o cache e recarregar. Se depois do reload ainda for 404, aí mostra a página de erro normalmente.

Nenhuma migração de banco necessária. Apenas edição de `src/pages/NotFound.tsx`.

