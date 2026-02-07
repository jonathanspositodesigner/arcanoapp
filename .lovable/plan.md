
# Plano: Corrigir Sistema de Atualização Forçada do PWA

## Diagnóstico do Problema

Quando você clica no botão "Forçar Update Global" e depois na notificação:

1. A notificação abre `/force-update`
2. A página limpa os caches e faz unregister do Service Worker
3. **MAS** o Service Worker antigo ainda está ativo controlando a página
4. O reload busca o `index.html` que ainda está cacheado pelo SW antigo
5. Resultado: app continua na versão antiga

### Problema específico do iOS/Safari
- O `unregister()` do SW não é imediato no Safari
- O cache do SW pode persistir mesmo após unregister

---

## Solução

### Abordagem Multi-Camada

Para garantir que funcione em todos os dispositivos (Android, iOS, Desktop):

1. **Forçar `skipWaiting()` no Service Worker** - Ativar o novo SW imediatamente
2. **Usar Headers HTTP para bypass de cache** - Garantir que o servidor entregue a versão nova
3. **Múltiplos reloads com cache busting** - Forçar o navegador a buscar do servidor
4. **Limpar localStorage e sessionStorage** - Remover qualquer estado antigo

---

## Mudanças Técnicas

### 1. MODIFICAR: `public/push-handler.js`

Ao clicar na notificação de update, abrir com parâmetro especial:

```javascript
// Quando é notificação de update forçado, adicionar parâmetro
const isForceUpdate = urlToOpen.includes('/force-update');
const finalUrl = isForceUpdate 
  ? `${urlToOpen}?force=${Date.now()}&hard=1` 
  : urlToOpen;

// Forçar abertura em nova janela (não reusar aba antiga com cache)
if (isForceUpdate && clients.openWindow) {
  return clients.openWindow(finalUrl);
}
```

### 2. MODIFICAR: `src/pages/ForceUpdate.tsx`

Implementar limpeza agressiva em múltiplas etapas:

```typescript
const forceCleanAndReload = async () => {
  // 1. Limpar TODOS os tipos de storage
  localStorage.clear();
  sessionStorage.clear();
  
  // 2. Deletar todos os caches
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map(name => caches.delete(name)));
  
  // 3. Forçar skipWaiting em qualquer SW waiting
  const registrations = await navigator.serviceWorker.getRegistrations();
  for (const reg of registrations) {
    if (reg.waiting) {
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    await reg.unregister();
  }
  
  // 4. Aguardar um momento para garantir cleanup
  await new Promise(r => setTimeout(r, 500));
  
  // 5. Fazer hard reload com fetch de origem
  const response = await fetch('/', { 
    cache: 'no-store',
    headers: { 'Cache-Control': 'no-cache' }
  });
  
  // 6. Redirecionar com cache busting extremo
  window.location.replace(`/?_force=${Date.now()}&_nocache=1`);
};
```

### 3. CRIAR: Listener no SW gerado pelo Vite

Adicionar ao `vite.config.ts` um script inline que escuta mensagens de SKIP_WAITING:

```typescript
// Em workbox config:
additionalManifestEntries: [],
// Adicionar listener para SKIP_WAITING via importScripts ou inline
```

**Alternativa melhor**: Adicionar ao `public/push-handler.js`:

```javascript
// Listener para forçar skipWaiting
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    console.log('[Push Handler] Received SKIP_WAITING, activating immediately');
    self.skipWaiting();
  }
});
```

### 4. MODIFICAR: `vite.config.ts`

Reativar `skipWaiting` e `clientsClaim` apenas quando solicitado:

```typescript
workbox: {
  // ... existing config
  clientsClaim: true,  // Voltar para true
  skipWaiting: false,  // Manter false para controle manual
}
```

---

## Fluxo Corrigido

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│                    FLUXO DE ATUALIZAÇÃO FORÇADA                              │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Admin clica "Forçar Update Global"                                         │
│       │                                                                      │
│       ▼                                                                      │
│  Push notification enviada para todos dispositivos                           │
│       │                                                                      │
│       ▼                                                                      │
│  Usuário clica na notificação                                                │
│       │                                                                      │
│       ▼                                                                      │
│  push-handler.js abre /force-update?force=123&hard=1                        │
│  (abre em NOVA janela para evitar cache da aba anterior)                    │
│       │                                                                      │
│       ▼                                                                      │
│  ForceUpdate.tsx executa:                                                    │
│    1. localStorage.clear() + sessionStorage.clear()                          │
│    2. caches.delete() em TODOS os caches                                    │
│    3. postMessage SKIP_WAITING para SW waiting                              │
│    4. unregister() de todos os SWs                                          │
│    5. Aguarda 500ms                                                          │
│    6. fetch('/') com cache: 'no-store'                                      │
│    7. location.replace com timestamp                                         │
│       │                                                                      │
│       ▼                                                                      │
│  App carrega versão NOVA do servidor!                                        │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Arquivos Modificados

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `public/push-handler.js` | **MODIFICAR** | Abrir nova janela + listener SKIP_WAITING |
| `src/pages/ForceUpdate.tsx` | **MODIFICAR** | Limpeza multi-etapa mais agressiva |
| `vite.config.ts` | **MODIFICAR** | Reativar clientsClaim: true |

---

## Por Que Vai Funcionar Agora

| Problema Anterior | Solução |
|-------------------|---------|
| SW antigo ainda controla a página | Abre nova janela sem cache |
| Unregister não é imediato | Envia SKIP_WAITING antes do unregister |
| Cache HTTP persiste | Fetch com cache: 'no-store' |
| iOS Safari teimoso | Múltiplas camadas de cache busting |
| LocalStorage com estado antigo | localStorage.clear() |

---

## Garantias de Segurança

| Item | Status |
|------|--------|
| Edge Functions | Não são modificadas |
| Banco de dados | Não é modificado |
| Autenticação | Usuário precisará fazer login novamente (localStorage limpo) |
| Jobs de IA em progresso | Não afetados (o update é sob demanda) |
| Push Notifications | Continuam funcionando |
