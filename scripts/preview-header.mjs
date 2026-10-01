/**
 * preview-header.mjs — لقطة شاشة للشريط العلوي من البناء الحقيقي (dist/).
 *
 * الغرض: التحقق البصري من محاذاة عناصر الهيدر مع فتحات الشريط بعد استبدال
 * الصورة. القياس الرقمي (measure-banner) يخبرنا أين الفتحات، لكنه لا يخبرنا
 * هل النص المرسوم فوقها يقع داخلها فعلاً ولا يخرج منها — هذه اللقطة تجيب.
 *
 * التشغيل:  node scripts/preview-header.mjs [مجلد الإخراج]
 */
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIST = path.join(ROOT, 'dist')
const OUT_DIR = path.resolve(process.argv[2] ?? path.join(ROOT, 'scripts'))

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jfif': 'image/jpeg',
  '.webmanifest': 'application/manifest+json',
}

/** خادم ثابت صغير لخدمة dist/ (نفس نمط smoke-test.mjs). */
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

async function resolveBrowser() {
  const candidates = []
  let puppeteerPath = null
  try {
    const p = await puppeteer.executablePath()
    if (typeof p === 'string') puppeteerPath = p
  } catch { /* غير مُنزَّل — نكمل بالمسارات الأخرى */ }

  const home = process.env.USERPROFILE ?? process.env.HOME ?? ''
  const cacheDir = path.join(home, '.cache', 'puppeteer', 'chrome')
  if (fs.existsSync(cacheDir)) {
    for (const v of fs.readdirSync(cacheDir)) {
      candidates.push(path.join(cacheDir, v, 'chrome-win64', 'chrome.exe'))
    }
  }
  if (puppeteerPath) candidates.unshift(puppeteerPath)
  candidates.push(
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  )
  return candidates.filter((p) => typeof p === 'string' && p).find((p) => fs.existsSync(p))
}

async function main() {
  if (!fs.existsSync(path.join(DIST, 'index.html'))) {
    console.error('مجلد dist/ غير موجود — نفّذ npm run build أولاً.')
    process.exit(1)
  }
  const browserPath = await resolveBrowser()
  if (!browserPath) {
    console.error('لم يُعثر على Chrome/Edge. حدّد CHROME_PATH.')
    process.exit(1)
  }

  const server = await startServer(DIST)
  const url = `http://127.0.0.1:${server.address().port}/`
  const browser = await puppeteer.launch({ executablePath: browserPath, headless: 'new', args: ['--no-sandbox'] })
  const page = await browser.newPage()

  // نمنع Service Worker: هنا نختبر البناء نفسه لا كاش المتصفح.
  await page.setRequestInterception(true)
  page.on('request', (req) => (req.url().includes('sw.js') ? req.abort() : req.continue()))

  // نقيس على عرضَي شاشة مختلفين لأن الأحجام بوحدة cqw تتوسّع مع العرض.
  for (const width of [430, 320]) {
    await page.setViewport({ width, height: 900 })
    await page.goto(url, { waitUntil: 'networkidle2' })
    await page.waitForSelector('#top-header', { timeout: 15000 }).catch(() => {})

    // الشريط مخفي حتى يفعّله MainScene؛ نكشفه يدوياً ببيانات نموذجية للتصوير.
    await page.evaluate(() => {
      const h = document.getElementById('top-header')
      if (!h) return
      h.style.display = 'block'
      const lvl = document.getElementById('top-header-level')
      const name = document.getElementById('top-header-name')
      const total = document.getElementById('top-header-total')
      if (lvl) lvl.textContent = '12'
      if (name) name.textContent = 'عبد الله'
      if (total) total.textContent = '34567'
    })
    await new Promise((r) => setTimeout(r, 400))

    const box = await page.evaluate(() => {
      const h = document.getElementById('top-header')
      if (!h) return null
      const r = h.getBoundingClientRect()
      return { x: r.x, y: r.y, width: r.width, height: r.height }
    })
    if (!box) {
      console.error('لم يُعثر على #top-header')
      continue
    }
    const file = path.join(OUT_DIR, `header-${width}.png`)
    await page.screenshot({ path: file, clip: box })
    console.log(`✓ ${file}  (${Math.round(box.width)}×${Math.round(box.height)})`)
  }

  await browser.close()
  server.close()
}

main()