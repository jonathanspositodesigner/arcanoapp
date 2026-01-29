

## Parar o App de Atualizar Sozinho

### Problema Identificado

O hook `useServiceWorkerUpdate.ts` está causando reloads automáticos através do evento `controllerchange`:

```typescript
// Linha 75-77 - ESTA É A CAUSA
const handleControllerChange = () => {
  window.location.reload();
};
```

**Fluxo do problema:**
1. Usuário abre o app
2. Hook verifica se tem SW novo a cada 30 segundos OU quando:
   - App fica visível (`visibilitychange`)
   - Janela ganha foco (`focus`)
   - Navegação back/forward (`pageshow`)
3. Se detecta SW novo, manda `SKIP_WAITING`
4. SW novo ativa → dispara `controllerchange` → **RELOAD**

Combinado com as configs do `vite.config.ts`:
```typescript
skipWaiting: true,    // SW novo ativa imediatamente
clientsClaim: true,   // SW assume controle de todas as abas
```

Isso cria um ciclo de atualizações forçadas.

---

### Solução

**Remover o listener de `controllerchange`** que força o reload. O app vai continuar funcionando normalmente e usará os novos assets no próximo carregamento natural (quando o usuário navegar ou abrir o app novamente).

---

### Mudanças no Código

**Arquivo:** `src/hooks/useServiceWorkerUpdate.ts`

Remover as linhas 74-77 e 82 e 88:

```typescript
// REMOVER ESSAS LINHAS:
// Listen for controller change (new SW activated) - reload immediately
const handleControllerChange = () => {
  window.location.reload();
};

// REMOVER ESTA LINHA:
navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

// REMOVER ESTA LINHA DO CLEANUP:
navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
```

---

### Resultado

- App para de recarregar sozinho
- Service Worker continua sendo atualizado silenciosamente em background
- Usuário só vê nova versão quando recarregar a página manualmente ou abrir o app de novo
- Nenhum impacto na funcionalidade do PWA

