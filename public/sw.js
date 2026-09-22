/* sw.js — Service Worker v4 (Offline-First كامل + تحديث فوري).
 *  - CACHE_NAME جديد → يُلغي الكاش القديم تلقائياً عند التفعيل.
 *  - Precaching موسّع: HTML + Manifest + Icons + كل أصول اللعبة
 *    (صور، أيقونات SVG، ملفات audio المستقبلية) ليعمل التطبيق بلا إنترنت مطلقاً.
 *  - HTML: Network-First (آخر نسخة عند توفر الشبكة، وFallback للكاش أوفلاين).
 *  - Assets: Cache-First مع تحديث في الخلفية (يعمل كاملاً و بسرعة أوفلاين).
 */
const CACHE_NAME = 'albaqiyat-v1.8.0'

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
  // خلفيات المرحلة الثانية (عشب أخضر) - ليلي ونهاري
  './game/green_grass_mor.jfif',
  './game/green_grass_ni.jfif',
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
  // أزرار اللعبة الجديدة (Game UI Buttons) — أيقونات بيضاء تُرسم فوق أزرار Phaser المجسّمة
  './game/icons/settings-gbtn.svg',
  './game/icons/theme-gbtn.svg',
  './game/icons/farm-gbtn.svg',
  './game/icons/quran-gbtn.svg',
  './game/icons/pause-gbtn.svg',
  './game/icons/play-gbtn.svg',
  './game/icons/arrow-gbtn.svg',
  // مكوّن الأزرار الأصلية + صفحة المعاينة التفاعلية
  './game/icons/gbtn.css',
  './game/icons/gbtn.js',
  './game/icons/preview.html',
  // الأيقونات السابقة (مستخدمة في رؤوس النوافذ)
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

// جلب الطلبات: Cache-First لكل شيء (HTML, JS, CSS, صور, أصوات) — أوفلاين 100%،
// مع تحديث في الخلفية عند توفر الشبكة (Stale-While-Revalidate).
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

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(event.request).then((cached) => {
        // الكاش أولاً: أعد الاستجابة فوراً إن وُجدت (تعمل أوفلاين وفورياً)
        if (cached) {
          // تحديث خلفي صامت للتأكد من آخر نسخة عند توفر الشبكة
          fetch(event.request)
            .then((response) => {
              if (response && response.status === 200) {
                cache.put(event.request, response.clone())
              }
            })
            .catch(() => {})
          return cached
        }
        // لا يوجد في الكاش: اجلب من الشبكة وخزّنه للمرة القادمة
        return fetch(event.request)
          .then((response) => {
            if (response && response.status === 200) {
              cache.put(event.request, response.clone())
            }
            return response
          })
          .catch(() =>
            // صفحة HTML طُلبت ولم تُخزَّن بعد — حاول صفحة التطبيق المخزنة
            caches.match('./index.html').then((fallback) => fallback || Response.error()),
          )
      }),
    ),
  )
})

// إعادة تنزيل كل الأصول اليدوياً (يُستدعى من زر "تثبيت للأوفلاين" في الإعدادات)
async function runManualPrecache() {
  const cache = await caches.open(CACHE_NAME)
  let ok = 0
  await Promise.all(
    ASSETS.map((asset) =>
      fetch(asset)
        .then((response) => {
          if (response && response.status === 200) {
            cache.put(new Request(asset), response.clone())
            ok += 1
          }
        })
        .catch(() => {}),
    ),
  )
  return ok
}

// استقبال رسائل من الصفحة: SKIP_WAITING (تحديث) وPRECACHE (تنزيل كامل للأوفلاين)
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  } else if (event.data?.type === 'PRECACHE') {
    const reply = (payload) => {
      event.source?.postMessage(payload)
      self.clients.matchAll({ includeUncontrolled: true }).then((clients) => {
        clients.forEach((client) => client.postMessage(payload))
      })
    }
    reply({ type: 'PRECACHE_PROGRESS', done: 0, total: ASSETS.length })
    runManualPrecache().then((ok) =>
      reply({ type: 'PRECACHE_DONE', cached: ok, total: ASSETS.length }),
    )
  }
})

