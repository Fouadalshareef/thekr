/* sw.js — Service Worker v4 (Offline-First كامل + تحديث فوري).
 *  - CACHE_NAME جديد → يُلغي الكاش القديم تلقائياً عند التفعيل.
 *  - Precaching موسّع: HTML + Manifest + Icons + كل أصول اللعبة
 *    (صور، أيقونات SVG، ملفات audio المستقبلية) ليعمل التطبيق بلا إنترنت مطلقاً.
 *  - HTML: Network-First (آخر نسخة عند توفر الشبكة، وFallback للكاش أوفلاين).
 *  - Assets: Cache-First مع تحديث في الخلفية (يعمل كاملاً و بسرعة أوفلاين).
 */
const CACHE_NAME = 'albaqiyat-v1.4.1'

// قائمة أصول البناء المُجزَّأة (JS/CSS hashed) — تُحقن تلقائياً عند كل build
// بواسطة إضافة vite-plugin-precache في vite.config.ts.
const BUILD_ASSETS = __PRECACHE_MANIFEST__

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './favicon.svg',
  './icon-512.svg',
  './icon.jpg?v=1.0.4',
  // خلفيات اللعبة
  './game/logo.jfif',
  './game/mor.jfif',
  './game/ni.jfif',
  './game/mor.png',
  // أصوات الأذكار الحقيقية (.mpeg)
  './game/sounds/subhanallah.mpeg',
  './game/sounds/alhamdulillah.mpeg',
  './game/sounds/la_ilaha_illallah.mpeg',
  './game/sounds/allahu_akbar.mpeg',
  './game/sounds/hawqala.mpeg',
  './game/sounds/subhanallah_wa_bihamdihi.mpeg',
  './game/sounds/salawat.mpeg',
  './game/sounds/astaghfirullah.mpeg',
  // أيقونات HUD/MODAL (كل الـ SVG)
  './game/icons/close.svg',
  './game/icons/farm-v2.svg',
  './game/icons/index.svg',
  './game/icons/pause-v2.svg',
  './game/icons/play-v2.svg',
  './game/icons/quran-v2.svg',
  './game/icons/settings-v2.svg',
  './game/icons/theme-v2.svg',
  ...BUILD_ASSETS,
]

// تثبيت: تخزين كل الأصول الأساسية + تفعيل فوري بدون انتظار
self.addEventListener('install', (event) => {
  // تفعيل النسخة الجديدة فوراً حتى لا تبقى نسخة قديمة معلّقة
  self.skipWaiting()
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        // addAll قد يفشل لو ملف مفقود — نلتقط كل ملف على حدة لضمان التثبيت
        Promise.allSettled(ASSETS.map((url) => cache.add(url).catch(() => null))),
      )
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

// جلب الطلبات: Network-First لـ HTML، وCache-First للباقي (أوفلاين كامل)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  // تجاهل طلبات chrome-extension وغير http(s) (تسبب أخطاء في الكاش)
  let url
  try {
    url = new URL(event.request.url)
  } catch {
    return
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return

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
    // Assets (JS/CSS/Images/Audio/Fonts): من الكاش أولاً — يعمل أوفلاين وفورياً،
    // مع تحديث في الخلفية عند توفر الشبكة (Cache-First + Background Revalidate)
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(event.request).then((cached) => {
          const networkFetch = fetch(event.request)
            .then((response) => {
              if (response && response.status === 200) {
                cache.put(event.request, response.clone())
              }
              return response
            })
            .catch(() => cached)
          // أوفلاين: أعد الكاش فوراً. أونلاين: الكاش فوراً + تحديث خلفي.
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

