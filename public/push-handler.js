// Push notification handler for PWA Service Worker
// This file is imported by the PWA service worker via workbox.importScripts

// Listener para forçar skipWaiting quando solicitado
self.addEventListener('message', function(event) {
  if (event.data?.type === 'SKIP_WAITING') {
    console.log('[Push Handler] Received SKIP_WAITING, activating immediately');
    self.skipWaiting();
  }
});

self.addEventListener('push', function(event) {
  console.log('[Push Handler] Push event received');
  
  let data = { title: 'Nova notificação', body: 'Você tem uma nova notificação' };
  
  if (event.data) {
    try {
      data = event.data.json();
      console.log('[Push Handler] Push data:', data);
    } catch (e) {
      console.error('[Push Handler] Error parsing push data:', e);
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body || 'Você tem uma nova notificação',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/'
    },
    actions: [
      { action: 'open', title: 'Abrir' },
      { action: 'close', title: 'Fechar' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'ArcanoApp', options)
  );
});

self.addEventListener('notificationclick', function(event) {
  console.log('[Push Handler] Notification click received');
  
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const urlToOpen = event.notification.data?.url || '/';
  
  // Detectar se é uma atualização forçada
  const isForceUpdate = urlToOpen.includes('/force-update');
  
  // Para force-update, adicionar parâmetros de cache busting
  const finalUrl = isForceUpdate 
    ? `${urlToOpen}?force=${Date.now()}&hard=1` 
    : urlToOpen;

  event.waitUntil(
    (async function() {
      // Para force-update, SEMPRE abrir nova janela para evitar cache da aba antiga
      if (isForceUpdate && clients.openWindow) {
        console.log('[Push Handler] Force update detected, opening new window:', finalUrl);
        return clients.openWindow(finalUrl);
      }
      
      // Para outras notificações, tentar focar janela existente
      const clientList = await clients.matchAll({ type: 'window', includeUncontrolled: true });
      
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(finalUrl);
          return client.focus();
        }
      }
      
      // Abrir nova janela se nenhuma encontrada
      if (clients.openWindow) {
        return clients.openWindow(finalUrl);
      }
    })()
  );
});

console.log('[Push Handler] Push handler loaded successfully (v5.4.0 - Force Update Fix)');
