

## 🐛 Bug Encontrado: Force Update Remove Parâmetros da URL

### Problema
O mecanismo de atualização silenciosa que acabamos de implementar está **destruindo todos os parâmetros da URL** quando faz o reload.

**Linha problemática** (`ForceUpdateModal.tsx:88`):
```javascript
window.location.href = window.location.href.split('?')[0] + '?v=' + Date.now();
```

Isso remove `colecao`, `mcp_token` e qualquer outro parâmetro, substituindo por apenas `?v=...`.

O `fbclid` que aparece é adicionado pelo Facebook automaticamente quando links são clicados em posts/anúncios do Meta.

### Solução

Modificar o `performSilentUpdate` para **preservar todos os parâmetros originais** e apenas adicionar o `?v=` para cache busting:

```typescript
const performSilentUpdate = async () => {
  console.log('[ForceUpdate] Performing silent update...');
  
  try {
    // Clear all caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      console.log('[ForceUpdate] Caches cleared');
    }

    // Unregister all service workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(reg => reg.unregister()));
      console.log('[ForceUpdate] Service workers unregistered');
    }

    // Clear localStorage update keys
    localStorage.removeItem('sw-last-update-check');
    localStorage.removeItem('sw-last-check-at');
    
    // Mark as updated to prevent loop
    sessionStorage.setItem('force-update-completed', 'true');
    
    // CORRIGIDO: Preservar todos os parâmetros existentes e adicionar cache bust
    const url = new URL(window.location.href);
    url.searchParams.set('v', Date.now().toString());
    window.location.href = url.toString();
  } catch (err) {
    console.error('[ForceUpdate] Update failed:', err);
  }
};
```

### Diferença

| Antes | Depois |
|-------|--------|
| `split('?')[0] + '?v=...'` | `URLSearchParams.set('v', ...)` |
| Remove TODOS os parâmetros | **Mantém** todos os parâmetros |
| Perde `colecao`, `mcp_token` | Preserva tudo |

### Arquivo a Editar
- `src/components/ForceUpdateModal.tsx` - linha 88

