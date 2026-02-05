

# Plano: Forçar Atualização do PWA com Botão Manual

## O Problema no iOS

O iOS tem um comportamento muito agressivo de cache para PWAs:
- O Service Worker fica em cache por mais tempo
- Mesmo com `skipWaiting`, o iOS pode ignorar
- A única forma 100% garantida é fechar e reabrir o app

## Solução em 2 Partes

### Parte 1: Banner "Atualização Disponível" (Frontend)

Criar um componente que:
1. Detecta quando há um novo Service Worker esperando
2. Mostra um banner fixo no topo da tela
3. Ao clicar, executa uma atualização completa

### Parte 2: Notificação Push para Forçar Atualização

Enviar uma notificação push para todos os usuários com:
- Título: "🔄 Atualização Disponível"
- Corpo: "Toque aqui para atualizar o app"
- URL: Uma rota especial que força limpeza de cache

---

## Mudanças Técnicas

### Arquivo 1: Criar `src/components/UpdateAvailableBanner.tsx`

```typescript
import { useState, useEffect } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { cleanOldCaches } from '@/hooks/useServiceWorkerUpdate';

export const UpdateAvailableBanner = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const checkForWaitingWorker = async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration?.waiting) {
        setShowBanner(true);
      }
    };

    // Check immediately
    checkForWaitingWorker();

    // Listen for new service workers
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      // New SW took control - reload automatically
      window.location.reload();
    });

    // Check when updatefound fires
    navigator.serviceWorker.ready.then((registration) => {
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version available
              setShowBanner(true);
            }
          });
        }
      });
    });
  }, []);

  const handleUpdate = async () => {
    setIsUpdating(true);
    
    try {
      // 1. Clean ALL caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        console.log('[Update] All caches cleared');
      }

      // 2. Tell waiting SW to skip waiting
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration?.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      // 3. Unregister and re-register SW
      if (registration) {
        await registration.unregister();
        console.log('[Update] SW unregistered');
      }

      // 4. Force reload without cache
      // Use cache-busting query param for iOS
      const url = new URL(window.location.href);
      url.searchParams.set('_v', Date.now().toString());
      window.location.href = url.toString();
      
    } catch (error) {
      console.error('[Update] Error:', error);
      // Fallback: hard reload
      window.location.reload();
    }
  };

  if (!showBanner) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white px-4 py-3 shadow-lg">
      <div className="flex items-center justify-between max-w-screen-xl mx-auto">
        <div className="flex items-center gap-2">
          <RefreshCw className={`w-5 h-5 ${isUpdating ? 'animate-spin' : ''}`} />
          <span className="text-sm font-medium">
            {isUpdating ? 'Atualizando...' : 'Nova versão disponível!'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleUpdate}
            disabled={isUpdating}
            className="bg-white text-fuchsia-600 px-4 py-1.5 rounded-full text-sm font-semibold hover:bg-fuchsia-100 transition-colors disabled:opacity-50"
          >
            Atualizar Agora
          </button>
          <button
            onClick={() => setShowBanner(false)}
            className="text-white/80 hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
```

### Arquivo 2: Criar rota `/force-update` em `src/pages/ForceUpdate.tsx`

Uma página especial que força limpeza de cache quando acessada via notificação push:

```typescript
import { useEffect, useState } from 'react';
import { RefreshCw, CheckCircle } from 'lucide-react';

const ForceUpdate = () => {
  const [status, setStatus] = useState<'cleaning' | 'done'>('cleaning');

  useEffect(() => {
    const forceCleanAndReload = async () => {
      try {
        // 1. Delete ALL caches
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          console.log('[ForceUpdate] Deleting caches:', cacheNames);
          await Promise.all(cacheNames.map(name => caches.delete(name)));
        }

        // 2. Unregister ALL service workers
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (const registration of registrations) {
            await registration.unregister();
            console.log('[ForceUpdate] Unregistered SW:', registration.scope);
          }
        }

        // 3. Clear localStorage timestamp to force fresh check
        localStorage.removeItem('sw-last-check-at');

        setStatus('done');

        // 4. Redirect to home after 1 second
        setTimeout(() => {
          // Use cache-busting param
          window.location.href = '/?_v=' + Date.now();
        }, 1000);

      } catch (error) {
        console.error('[ForceUpdate] Error:', error);
        window.location.href = '/';
      }
    };

    forceCleanAndReload();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0a15] via-[#1a0f25] to-[#0a0510] flex flex-col items-center justify-center text-white p-4">
      {status === 'cleaning' ? (
        <>
          <RefreshCw className="w-16 h-16 text-fuchsia-500 animate-spin mb-4" />
          <h1 className="text-2xl font-bold mb-2">Atualizando...</h1>
          <p className="text-gray-400">Limpando cache e baixando nova versão</p>
        </>
      ) : (
        <>
          <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
          <h1 className="text-2xl font-bold mb-2">Atualizado!</h1>
          <p className="text-gray-400">Redirecionando...</p>
        </>
      )}
    </div>
  );
};

export default ForceUpdate;
```

### Arquivo 3: Atualizar `src/App.tsx`

Adicionar o banner e a nova rota:

```typescript
// Adicionar imports
import { UpdateAvailableBanner } from './components/UpdateAvailableBanner';
const ForceUpdate = lazy(() => import("./pages/ForceUpdate"));

// No AppContent, adicionar o banner logo após o Sonner:
<UpdateAvailableBanner />

// Adicionar rota:
<Route path="/force-update" element={<ForceUpdate />} />
```

### Arquivo 4: Atualizar `src/hooks/useServiceWorkerUpdate.ts`

Adicionar listener para `controllerchange`:

```typescript
// Adicionar no useEffect principal:
// Listen for controller change (new SW took over)
navigator.serviceWorker.addEventListener('controllerchange', () => {
  console.log('[SW] New service worker activated, reloading...');
  // The UpdateAvailableBanner will handle the reload
});
```

---

## Como Funciona

### Cenário 1: Usuário Abre o App

```text
┌─────────────────────────────────────────────────────────────────┐
│ 1. App inicia e verifica Service Worker                        │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. Se há SW aguardando (nova versão disponível):                │
│    → Mostra banner roxo no topo: "Nova versão disponível!"      │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. Usuário clica "Atualizar Agora":                             │
│    → Limpa TODOS os caches                                      │
│    → Desregistra Service Worker                                 │
│    → Recarrega página com cache-buster                          │
└─────────────────────────────────────────────────────────────────┘
```

### Cenário 2: Notificação Push

```text
┌─────────────────────────────────────────────────────────────────┐
│ 1. Admin envia push: "Atualização Disponível"                   │
│    URL: /force-update                                           │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. Usuário toca na notificação                                  │
│    → Abre /force-update                                         │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. Página /force-update executa:                                │
│    → Mostra "Atualizando..." com spinner                        │
│    → Deleta todos os caches                                     │
│    → Desregistra todos os SWs                                   │
│    → Redireciona para / com cache-buster                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Ação Imediata: Enviar Push de Atualização

Após implementar, você pode ir em **Admin > Push Notifications** e enviar:

| Campo | Valor |
|-------|-------|
| **Título** | 🔄 Atualização Importante! |
| **Mensagem** | Toque aqui para atualizar o ArcanoApp para a versão mais recente |
| **URL** | /force-update |

Todos que receberem e tocarem na notificação serão forçados a limpar o cache e baixar a versão nova.

---

## Limitação Conhecida do iOS

Mesmo com tudo isso, o iOS pode ainda cachear agressivamente. A solução **100% garantida** para iOS é instruir o usuário a:

1. Fechar o app completamente (deslizar para cima no multitarefa)
2. Reabrir o app

Podemos adicionar essa instrução no banner quando detectamos iOS:

```typescript
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

// No banner, mostrar texto extra para iOS:
{isIOS && (
  <p className="text-xs text-white/70 mt-1">
    Se não funcionar, feche o app e abra novamente
  </p>
)}
```

---

## Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `src/components/UpdateAvailableBanner.tsx` | **CRIAR** - Banner de atualização |
| `src/pages/ForceUpdate.tsx` | **CRIAR** - Página de force update |
| `src/App.tsx` | **MODIFICAR** - Adicionar banner e rota |
| `src/hooks/useServiceWorkerUpdate.ts` | **MODIFICAR** - Adicionar listener |

---

## Resultado Esperado

1. Usuários verão um **banner roxo** no topo quando houver atualização
2. Ao clicar "Atualizar Agora", o app limpa cache e recarrega
3. Via **push notification** para `/force-update`, usuários são forçados a atualizar
4. No iOS, se ainda não funcionar, o banner mostra instrução para fechar e reabrir

