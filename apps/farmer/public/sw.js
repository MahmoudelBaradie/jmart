self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (e) => {
  // Clear ALL old caches on every new SW version
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

// Only cache static non-JS assets (not Next.js chunks!)
const STATIC_CACHE = 'jmart-static-v2';
const STATIC_ONLY = ['/manifest.json', '/icon-192.png', '/icon-512.png'];

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // NEVER cache Next.js JS/CSS chunks or API calls — let them always go to network
  if (
    url.pathname.startsWith('/_next/') ||
    url.pathname.startsWith('/api/') ||
    url.pathname.includes('.js') ||
    url.pathname.includes('.css')
  ) {
    return; // bypass — fetch directly from network
  }

  // Only cache explicitly listed static files
  if (STATIC_ONLY.includes(url.pathname)) {
    e.respondWith(
      caches.match(e.request).then(
        (cached) => cached || fetch(e.request).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(STATIC_CACHE).then((c) => c.put(e.request, clone));
          }
          return res;
        })
      )
    );
  }
});

self.addEventListener('push', (e) => {
  const data = e.data?.json() ?? { title: 'جمارت', body: 'إشعار جديد' };
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      dir: 'rtl',
      lang: 'ar',
      data: { url: data.url ?? '/' },
    })
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(self.clients.openWindow(e.notification.data.url));
});
