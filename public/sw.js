/* sw.js — Service Worker محدَّث v3 (Network-First للـ HTML + تحديث فوري).
 * التغييرات:
 *  - CACHE_NAME جديد → يُلغي الكاش القديم تلقائياً عند التفعيل.
 *  - skipWaiting + clientsClaim فورياً → SW جديد يتولى التحكم بدون انتظار.
 *  - HTML: Network-First (يجلب من الشبكة دائماً ثم يحدّث الكاش).
 *  - Assets: Stale-While-Revalidate (يُرجع من الكاش ويحدّث في الخلفية).
 */
const CACHE_NAME = 'albaqiyat-v1.0.3'
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './favicon.svg',
  './icon-512.svg',
]

// تثبيت: تخزين الأصول الأساسية + تفعيل فوري بدون انتظار
self.addEventListener('install', (event) => {
  // تفعيل النسخة الجديدة فوراً حتى لا تبقى نسخة قديمة معلّقة
  self.skipWaiting()
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting()), // ← يستبدل SW القديم فوراً
  )
})

// تفعيل: حذف كل الكاشات القديمة + السيطرة الفورية على جميع التبويبات
self.addEventListener('activate', (event) => {
  // السيطرة على جميع الصفحات المفتوحة فور التفعيل
  self.clients.claim()
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== CACHE_NAME)
            .map((k) => {
              console.log('[SW] حذف كاش قديم:', k)
              return caches.delete(k)
            }),
        ),
      )
      .then(() => self.clients.claim()), // ← يتحكم في التبويبات المفتوحة فوراً
  )
})

// جلب الطلبات: Network-First لـ HTML، Stale-While-Revalidate للباقي
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  const url = new URL(event.request.url)
  const isHTML =
    event.request.headers.get('accept')?.includes('text/html') ||
    url.pathname === '/' ||
    url.pathname.endsWith('.html')

  if (isHTML) {
    // HTML: اجلب دائماً من الشبكة أولاً (لضمان آخر نسخة)
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
          }
          return response
        })
        .catch(() => caches.match('./index.html')),
    )
  } else {
    // Assets: من الكاش مع تحديث في الخلفية (Stale-While-Revalidate)
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(event.request).then((cached) => {
          const networkFetch = fetch(event.request).then((response) => {
            if (response && response.status === 200 && response.type !== 'opaque') {
              cache.put(event.request, response.clone())
            }
            return response
          })
          return cached || networkFetch
        }),
      ),
    )
  }
})

// استقبال رسالة SKIP_WAITING من الصفحة (للتحديث اليدوي من الواجهة)
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
