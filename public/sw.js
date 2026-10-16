// computer.pletig - Service Worker (Offline-First Cache)
const CACHE_NAME = 'pletig-offline-v1';

// Aset dasar yang langsung dicache saat aplikasi pertama kali diakses
const PRECACHE_ASSETS = [
  '/',
  '/absen',
  '/materi',
  '/tugas',
  '/manifest.json',
  '/favicon.ico',
  '/icon.png',
  '/logo.jpg',
  '/logo.png',
];

// 1. INSTALL EVENT: Simpan aset shell inti ke Cache Storage
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[SW] Pre-cache partial failure:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// 2. ACTIVATE EVENT: Bersihkan cache versi lama & ambil kontrol klien seketika
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. FETCH EVENT: Strategi Caching Pintar (Offline-First)
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Hanya proses request GET (jangan cache Server Action POST atau API mutasi)
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // Jangan cache WebSocket, API rekap, atau chrome-extension
  if (
    url.protocol.startsWith('ws') ||
    url.pathname.startsWith('/api/admin/rekap-excel') ||
    url.protocol === 'chrome-extension:'
  ) {
    return;
  }

  // A. NAVIGASI HALAMAN (HTML): Network-First dengan Fallback ke Cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          // Ketika offline, ambil versi halaman yang sudah tersimpan di cache
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }
          // Jika halaman spesifik belum dicache, fallback ke beranda utama
          const fallback = await caches.match('/');
          if (fallback) {
            return fallback;
          }
          // Fallback darurat
          return new Response(
            `<!DOCTYPE html>
            <html lang="id">
            <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Offline - computer.pletig</title></head>
            <body style="font-family:sans-serif;text-align:center;padding:3rem 1rem;background:#f8fafc;color:#1e293b;">
              <h2 style="color:#0f172a;">⚡ Mode Offline</h2>
              <p style="color:#64748b;">Perangkat Anda sedang tidak terhubung ke internet. Buka halaman yang pernah dikunjungi untuk melihat data tersimpan.</p>
              <button onclick="window.location.reload()" style="background:#2563eb;color:white;border:none;padding:0.75rem 1.5rem;border-radius:0.75rem;cursor:pointer;font-weight:bold;">Coba Lagi</button>
            </body>
            </html>`,
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        })
    );
    return;
  }

  // B. ASET STATIS NEXT.JS & MEDIA (_next/static, font, gambar, svg): Cache-First
  const isStaticAsset =
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|ico|webp|woff|woff2|ttf|css|js)$/i);

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Background revalidation (stale-while-revalidate)
          fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(request, networkResponse);
                });
              }
            })
            .catch(() => {});
          return cachedResponse;
        }

        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // C. REQUEST LAINNYA: Network First
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => caches.match(request))
  );
});
