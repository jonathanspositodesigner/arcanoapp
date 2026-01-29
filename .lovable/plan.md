

## Corrigir Página AdminManageArtes em Branco

### Problema

A função `isVideoUrl` está sendo usada na linha 238 **antes** de ser definida na linha 388. Isso causa um erro fatal que quebra toda a página.

```typescript
// Linha 238 - USA a função
const isVideo = isVideoUrl(a.image_url);  // ❌ ERRO: isVideoUrl não existe ainda

// Linha 388 - DEFINE a função (tarde demais!)
const isVideoUrl = (url: string) => { ... }
```

---

### Solução

Mover a definição da função `isVideoUrl` para **antes** de ser usada. A função deve ser definida logo no início do componente, antes do `filteredAndSortedArtes`.

---

### Mudança no Código

**Arquivo:** `src/pages/AdminManageArtes.tsx`

1. **Remover** a função `isVideoUrl` das linhas 388-391

2. **Adicionar** a função `isVideoUrl` logo após a declaração dos estados (por volta da linha 86), antes de qualquer uso:

```typescript
// Mover para cima, antes de filteredAndSortedArtes
const isVideoUrl = (url: string) => {
  const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.m4v'];
  return videoExtensions.some(ext => url.toLowerCase().includes(ext));
};
```

---

### Resultado

- Página volta a funcionar normalmente
- Filtro de imagem/vídeo funciona corretamente
- Nenhuma outra funcionalidade afetada

