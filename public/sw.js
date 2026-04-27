self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activated');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // 간단한 PWA 등록용 패스스루 핸들러입니다.
  // 실제 오프라인 캐싱은 원하실 경우 여기에 추가할 수 있습니다.
});
