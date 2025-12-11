// Push Notification Service Worker
// This runs separately from the main PWA service worker

self.addEventListener('push', (event) => {
  console.log('[Push SW] Push event received:', event);
  
  let data = { title: 'ArcanoApp', body: 'Você tem uma nova notificação!' };
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      console.error('[Push SW] Error parsing push data:', e);
    }
  }
  
  const options = {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/'
    },
    actions: data.url ? [
      { action: 'open', title: 'Abrir' }
    ] : []
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('[Push SW] Notification clicked:', event);
  
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Try to focus existing window
        for (const client of clientList) {
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

self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('[Push SW] Subscription changed:', event);
});
