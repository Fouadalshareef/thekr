/**
 * smoke-test.mjs — اختبار دخان آلي لواجهة اللعبة (بلا أي اعتماديات إضافية).
 *
 * يخدم الملفات المبنية في dist/ عبر خادم محلي بسيط، ثم يفتح اللعبة بمتصفح حقيقي
 * ويتحقق من:
 *   1. عدم وجود أي خطأ JavaScript وقت التشغيل.
 *   2. وجود قماش Phaser فعلاً في الصفحة.
 *   3. أن الشاشة ليست فارغة (كشف "الشاشة الفارغة") — بمقارنة مناطق مختلفة من الشاشة.
 *   4. الانتقال من شاشة البداية إلى المشهد الرئيسي وظهور المحتوى.
 *   5. فتح قائمة الأنماط واختيار "أذكار الصباح" وظهور بطاقة الذكر.
 *   6. عدم تعطّل المشهد الرئيسي عند إيقاف اللعبة من الإعدادات
 *      (localStorage: game_enabled=false) — وهي الحالة التي كانت تُظهر شاشة فارغة.
 *
 * التشغيل:  npm test          (يتطلب تنفيذ npm run build أولاً)
 *           node scripts/smoke-test.mjs [--url http://localhost:5174/]
 */
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIST = path.join(ROOT, 'dist')

/** إيجاد متصفح Chrome قابل للتشغيل: متغير بيئة → Puppeteer → كاش Puppeteer → متصفح النظام. */
async function resolveBrowser() {
  const candidates = [
    process.env.CHROME_PATH,
    await safeExecutablePath(),
    ...scanPuppeteerCache(),
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ]
  return candidates.filter((p) => typeof p === 'string' && p).find((p) => fs.existsSync(p))
}

/**
 * مسار المتصفح الذي يتوقعه Puppeteer.
 * ملاحظة: في Puppeteer 25 تُرجع executablePath() وعداً (Promise) وليس نصاً،
 * كما أنها ترمي استثناءً إذا لم تكن النسخة المطلوبة مُنزَّلة بعد.
 */
async function safeExecutablePath() {
  try {
    const p = await puppeteer.executablePath()
    return typeof p === 'string' ? p : null
  } catch {
    return null
  }
}

/** فحص مجلد كاش Puppeteer لالتقاط أي نسخة Chrome مُنزَّلة. */
function scanPuppeteerCache() {
  const home = process.env.USERPROFILE ?? process.env.HOME ?? ''
  const dir = path.join(home, '.cache', 'puppeteer', 'chrome')
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .map((v) => path.join(dir, v, 'chrome-win64', 'chrome.exe'))
    .filter((p) => fs.existsSync(p))
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jfif': 'image/jpeg',
}

/** خادم ثابت صغير لخدمة dist/. */
function startServer(root) {
  const server = http.createServer((req, res) => {
    let rel = decodeURIComponent(req.url.split('?')[0])
    if (rel === '/') rel = '/index.html'
    const file = path.join(root, rel)
    if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404).end('not found')
      return
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] ?? 'application/octet-stream' })
    fs.createReadStream(file).pipe(res)
  })
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)))
}

const failures = []
const check = (cond, msg) => {
  if (cond) {
    console.log(`  [PASS] ${msg}`)
  } else {
    failures.push(msg)
    console.log(`  [FAIL] ${msg}`)
  }
}

/** نقر بإحداثيات مساحة اللعبة (480×854) مع تحويلها لإحداثيات الصفحة. */
async function clickGame(page, gx, gy) {
  const p = await page.evaluate(
    (x, y) => {
      const c = document.querySelector('canvas')
      const r = c.getBoundingClientRect()
      return { x: r.left + (x / 480) * r.width, y: r.top + (y / 854) * r.height }
    },
    gx,
    gy,
  )
  await page.mouse.click(p.x, p.y)
  await new Promise((r) => setTimeout(r, 1200))
}

/**
 * إحصاءات الشاشة: متوسط الإضاءة ومعامل التباين.
 * تُستخدم لكشف "الشاشة الفارغة": عند فشل إنشاء المشهد يتوقف العرض على خلفية
 * موحّدة داكنة (تباين ≈ 0)، بينما الشاشات الحقيقية تحتوي سماءً/عناصر متباينة.
 */
async function screenStats(page) {
  const b64 = await page.screenshot({ encoding: 'base64' })
  return page.evaluate(async (dataUrl) => {
    const img = new Image()
    img.src = dataUrl
    await img.decode()
    const canvas = document.createElement('canvas')
    const w = (canvas.width = 120)
    const h = (canvas.height = 240)
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0, w, h)
    const data = ctx.getImageData(0, 0, w, h).data
    let sum = 0
    let sumSq = 0
    let n = 0
    for (let i = 0; i < data.length; i += 4) {
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
      sum += lum
      sumSq += lum * lum
      n++
    }
    const mean = sum / n
    const stddev = Math.sqrt(Math.max(0, sumSq / n - mean * mean))
    return { mean, stddev }
  }, `data:image/png;base64,${b64}`)
}

/** هل الشاشة تعرض محتوى فعلياً (ليست فارغة/سوداء موحّدة)؟
 *  القياس على شاشة فارغة: تباين ≈ 3 — وعلى الشاشات الحقيقية: تباين 20+. */
async function hasContent(page) {
  const { mean, stddev } = await screenStats(page)
  return stddev > 8 && mean > 8
}

/** تجهيز صفحة جديدة مع منع Service Worker وتسجيل أخطاء التشغيل. */
async function newPage(browser, errors, storageInit) {
  const page = await browser.newPage()
  await page.setViewport({ width: 430, height: 900 })
  page.on('pageerror', (e) => errors.push(e.message.split('\n')[0]))
  await page.setRequestInterception(true)
  page.on('request', (req) => (req.url().includes('sw.js') ? req.abort() : req.continue()))
  if (storageInit) {
    await page.evaluateOnNewDocument(() => {
      try {
        localStorage.setItem('game_enabled', 'false')
        localStorage.setItem('has_update', 'false')
      } catch {}
    })
  }
  return page
}

async function main() {
  const urlArgIdx = process.argv.indexOf('--url')
  let server = null
  let url = urlArgIdx > -1 ? process.argv[urlArgIdx + 1] : null

  if (!url) {
    if (!fs.existsSync(path.join(DIST, 'index.html'))) {
      console.error('مجلد dist/ غير موجود — نفّذ npm run build أولاً.')
      process.exit(1)
    }
    server = await startServer(DIST)
    url = `http://127.0.0.1:${server.address().port}/`
  }

  const browserPath = await resolveBrowser()
  if (!browserPath) {
    console.error('لم يتم العثور على Chrome/Edge. حدّد المسار عبر متغير البيئة CHROME_PATH.')
    process.exit(1)
  }
  console.log(`المتصفح: ${browserPath}\nالعنوان: ${url}\n`)

  const browser = await puppeteer.launch({
    executablePath: browserPath,
    headless: 'new',
    args: ['--no-sandbox'],
  })
  const errors = []

  // ---------- الحالة 1: تشغيل عادي ----------
  console.log('الحالة 1: تشغيل عادي')
  const page = await newPage(browser, errors)
  await page.goto(url, { waitUntil: 'networkidle2' })
  await new Promise((r) => setTimeout(r, 4500))

  check((await page.$('canvas')) !== null, 'قماش Phaser موجود في الصفحة')
  check(await hasContent(page), 'شاشة البداية تعرض محتوى (ليست فارغة)')

  await clickGame(page, 240, 500) // الانتقال إلى المشهد الرئيسي
  await page.evaluate(() => document.querySelector('#advice-close')?.click())
  await new Promise((r) => setTimeout(r, 1000))
  check(await hasContent(page), 'المشهد الرئيسي يعرض محتوى بعد إغلاق نافذة النصائح')

  await clickGame(page, 56, 62) // فتح القائمة الجانبية بزر السهم
  await clickGame(page, 56, 234) // فتح قائمة الأنماط (الزر الثاني تحت السهم)
  check(await hasContent(page), 'قائمة الأنماط تُفتح وتُعرض')

  await clickGame(page, 240, 581) // اختيار "أذكار الصباح"
  check(await hasContent(page), 'نمط أذكار الصباح يعرض بطاقة الذكر')

  for (let i = 0; i < 3; i++) await clickGame(page, 240, 387) // نقرات على البطاقة
  check(await hasContent(page), 'النقر على بطاقة الذكر يعمل دون أخطاء')

  // ---------- الحالة 2: اللعبة موقوفة من الإعدادات (حماية من الشاشة الفارغة) ----------
  console.log('\nالحالة 2: اللعبة موقوفة من الإعدادات (game_enabled=false)')
  const page2 = await newPage(browser, errors, true)
  await page2.goto(url, { waitUntil: 'networkidle2' })
  await new Promise((r) => setTimeout(r, 4500))
  await clickGame(page2, 240, 500)
  await page2.evaluate(() => document.querySelector('#advice-close')?.click())
  await new Promise((r) => setTimeout(r, 1000))
  const stats2 = await screenStats(page2)
  check(
    stats2.stddev > 8 && stats2.mean > 8,
    `المشهد الرئيسي يظهر (لا شاشة فارغة) واللعبة موقوفة — إضاءة=${stats2.mean.toFixed(1)} تباين=${stats2.stddev.toFixed(1)}`,
  )

  // ---------- الحالة 3: قائمة النمط المخصص (تخصيص) ----------
  console.log('\nالحالة 3: قائمة النمط المخصص (تخصيص)')
  const page3 = await newPage(browser, errors)
  await page3.goto(url, { waitUntil: 'networkidle2' })
  await new Promise((r) => setTimeout(r, 4500))
  await clickGame(page3, 240, 500)
  await page3.evaluate(() => document.querySelector('#advice-close')?.click())
  await new Promise((r) => setTimeout(r, 1000))
  await clickGame(page3, 56, 62) // فتح القائمة الجانبية بزر السهم
  await clickGame(page3, 56, 234) // قائمة الأنماط
  await clickGame(page3, 240, 505) // "تخصيص"
  check(await hasContent(page3), 'لوحة اختيار الذكر المخصص تُفتح')
  await clickGame(page3, 240, 283) // اختيار أول ذكر في القائمة
  check(await hasContent(page3), 'اختيار ذكر مخصص يعمل ويعود للمشهد')

  // ---------- النتيجة ----------
  check(errors.length === 0, `لا أخطاء JavaScript وقت التشغيل${errors.length ? ` — ${errors.join(' | ')}` : ''}`)

  await browser.close()
  if (server) server.close()

  console.log(`\n${failures.length ? `${failures.length} حالة فاشلة` : 'كل الحالات ناجحة ✅'}`)
  process.exit(failures.length ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})