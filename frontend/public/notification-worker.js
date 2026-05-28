self.addEventListener('push', (event) => {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {
      title: 'Yeloo+',
      body: event.data ? event.data.text() : 'Nouvelle notification',
    };
  }

  const title = payload.title || 'Yeloo+';
  const options = {
    body: payload.body || 'Nouvelle notification',
    tag: payload.tag || undefined,
    icon: payload.icon || '/icons/icon-192.png',
    badge: payload.badge || '/icons/icon-192.png',
    data: {
      url: payload.url || '/',
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';
  const url = new URL(targetUrl, self.location.origin).href;

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        const existing = clients.find((client) => client.url === url);
        if (existing) {
          return existing.focus();
        }
        return self.clients.openWindow(url);
      })
  );
});
