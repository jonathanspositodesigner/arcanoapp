// Push notification handler for PWA Service Worker
// This file is imported by the PWA service worker via workbox.importScripts

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

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // Try to focus an existing window
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(urlToOpen);
          return client.focus();
        }
      }
      // Open new window if none found
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

console.log('[Push Handler] Push handler loaded successfully');
